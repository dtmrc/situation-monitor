/**
 * Power Outage Adapter
 *
 * Fetches power outage data from PowerOutage.us API.
 * Produces RawIncident[] for infrastructure correlation.
 * Filters by significance (1000+ customers by default).
 */

import { v4 as uuidv4 } from 'uuid';

import { db } from '../../../db';
import { powerOutages, type NewPowerOutage } from '../../../db/schema/infrastructure';
import {
  BaseFeedAdapter,
  type FeedConfig,
  type FeedFilterOptions,
  type FeedFetchResult,
  type NormalizedFeedItem,
  type FeedSeverity,
} from '../../adapter.interface';
import type { RawIncident, IncidentSeverity } from '../../types/critical-infrastructure.types';

// US State centroids for approximate location when county centroid unavailable
const STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  AL: { lat: 32.806671, lng: -86.79113 },
  AK: { lat: 61.370716, lng: -152.404419 },
  AZ: { lat: 33.729759, lng: -111.431221 },
  AR: { lat: 34.969704, lng: -92.373123 },
  CA: { lat: 36.116203, lng: -119.681564 },
  CO: { lat: 39.059811, lng: -105.311104 },
  CT: { lat: 41.597782, lng: -72.755371 },
  DE: { lat: 39.318523, lng: -75.507141 },
  FL: { lat: 27.766279, lng: -81.686783 },
  GA: { lat: 33.040619, lng: -83.643074 },
  HI: { lat: 21.094318, lng: -157.498337 },
  ID: { lat: 44.240459, lng: -114.478828 },
  IL: { lat: 40.349457, lng: -88.986137 },
  IN: { lat: 39.849426, lng: -86.258278 },
  IA: { lat: 42.011539, lng: -93.210526 },
  KS: { lat: 38.5266, lng: -96.726486 },
  KY: { lat: 37.66814, lng: -84.670067 },
  LA: { lat: 31.169546, lng: -91.867805 },
  ME: { lat: 44.693947, lng: -69.381927 },
  MD: { lat: 39.063946, lng: -76.802101 },
  MA: { lat: 42.230171, lng: -71.530106 },
  MI: { lat: 43.326618, lng: -84.536095 },
  MN: { lat: 45.694454, lng: -93.900192 },
  MS: { lat: 32.741646, lng: -89.678696 },
  MO: { lat: 38.456085, lng: -92.288368 },
  MT: { lat: 46.921925, lng: -110.454353 },
  NE: { lat: 41.12537, lng: -98.268082 },
  NV: { lat: 38.313515, lng: -117.055374 },
  NH: { lat: 43.452492, lng: -71.563896 },
  NJ: { lat: 40.298904, lng: -74.521011 },
  NM: { lat: 34.840515, lng: -106.248482 },
  NY: { lat: 42.165726, lng: -74.948051 },
  NC: { lat: 35.630066, lng: -79.806419 },
  ND: { lat: 47.528912, lng: -99.784012 },
  OH: { lat: 40.388783, lng: -82.764915 },
  OK: { lat: 35.565342, lng: -96.928917 },
  OR: { lat: 44.572021, lng: -122.070938 },
  PA: { lat: 40.590752, lng: -77.209755 },
  RI: { lat: 41.680893, lng: -71.51178 },
  SC: { lat: 33.856892, lng: -80.945007 },
  SD: { lat: 44.299782, lng: -99.438828 },
  TN: { lat: 35.747845, lng: -86.692345 },
  TX: { lat: 31.054487, lng: -97.563461 },
  UT: { lat: 40.150032, lng: -111.862434 },
  VT: { lat: 44.045876, lng: -72.710686 },
  VA: { lat: 37.769337, lng: -78.169968 },
  WA: { lat: 47.400902, lng: -121.490494 },
  WV: { lat: 38.491226, lng: -80.954453 },
  WI: { lat: 44.268543, lng: -89.616508 },
  WY: { lat: 42.755966, lng: -107.30249 },
  DC: { lat: 38.897438, lng: -77.026817 },
};

// PowerOutage.us API response structure
interface PowerOutageResponse {
  areas: Array<{
    id: string;
    name: string; // County name
    state: string;
    outages: number;
    tracked: number;
    percent: number;
    utilities: Array<{
      id: string;
      name: string;
      outages: number;
      tracked: number;
      percent: number;
    }>;
  }>;
  timestamp: string;
}

/**
 * Determine severity based on customer count
 */
function determineSeverity(customersAffected: number, percentageOut: number): IncidentSeverity {
  // Catastrophic: >100k customers or >50% of area
  if (customersAffected > 100000 || percentageOut > 50) {
    return 'catastrophic';
  }

  // Severe: >50k customers or >25% of area
  if (customersAffected > 50000 || percentageOut > 25) {
    return 'severe';
  }

  // Significant: >10k customers or >10% of area
  if (customersAffected > 10000 || percentageOut > 10) {
    return 'significant';
  }

  // Moderate: >1k customers or >5% of area
  if (customersAffected > 1000 || percentageOut > 5) {
    return 'moderate';
  }

  return 'minor';
}

/**
 * Map IncidentSeverity to FeedSeverity
 */
function toFeedSeverity(severity: IncidentSeverity): FeedSeverity {
  switch (severity) {
    case 'catastrophic':
      return 'critical';
    case 'severe':
      return 'high';
    case 'significant':
      return 'medium';
    case 'moderate':
      return 'low';
    default:
      return 'info';
  }
}

/**
 * Power Outage Feed Adapter
 */
export class PowerOutageAdapter extends BaseFeedAdapter {
  readonly type = 'infrastructure' as const;
  readonly name = 'Power Outage Tracker';
  readonly description = 'US power outage data from PowerOutage.us';
  readonly requiredConfig = [];

  // PowerOutage.us API URL (unofficial - may require adjustment)
  private readonly API_BASE = 'https://poweroutage.us/api';

  async fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    const options = config.options as Record<string, unknown>;
    const configFilters = config.filters as Record<string, unknown>;

    // Minimum customers threshold (default 1000)
    const minCustomers = (options.minCustomers as number) || 1000;

    // State filter
    const states = (configFilters?.states as string[]) || [];

    try {
      // Fetch outage data for each state (or all states)
      const targetStates = states.length > 0 ? states : Object.keys(STATE_CENTROIDS);
      const allOutages: Array<{
        county: string;
        state: string;
        utilityName: string;
        customersAffected: number;
        customersServed: number;
        percentageOut: number;
        timestamp: Date;
      }> = [];

      // Fetch in batches to avoid overwhelming the API
      const BATCH_SIZE = 10;
      for (let i = 0; i < targetStates.length; i += BATCH_SIZE) {
        const batch = targetStates.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map((state) => this.fetchStateOutages(state)));

        for (const result of results) {
          if (result) {
            allOutages.push(...result);
          }
        }
      }

      // Filter by minimum customers
      const significantOutages = allOutages.filter((o) => o.customersAffected >= minCustomers);

      const { items, rawIncidents, storedOutages } = this.processOutages(
        significantOutages,
        filters
      );

      // Store outages
      if (storedOutages.length > 0) {
        await this.storeOutages(storedOutages);
      }

      return {
        items,
        failedCount: 0,
        errors: [],
        hasMore: false,
        ...(rawIncidents.length > 0 && {
          metadata: { rawIncidents },
        }),
      };
    } catch (error) {
      return {
        items: [],
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'Power outage fetch failed'],
        hasMore: false,
      };
    }
  }

  /**
   * Fetch outages for a specific state
   */
  private async fetchStateOutages(state: string): Promise<Array<{
    county: string;
    state: string;
    utilityName: string;
    customersAffected: number;
    customersServed: number;
    percentageOut: number;
    timestamp: Date;
  }> | null> {
    try {
      // Note: This is a simplified implementation. The actual PowerOutage.us API
      // may have different endpoints or require authentication.
      const url = `${this.API_BASE}/state/${state}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        // Silently fail for individual states
        return null;
      }

      const data = (await response.json()) as PowerOutageResponse;
      const timestamp = new Date(data.timestamp || Date.now());

      const outages: Array<{
        county: string;
        state: string;
        utilityName: string;
        customersAffected: number;
        customersServed: number;
        percentageOut: number;
        timestamp: Date;
      }> = [];

      for (const area of data.areas || []) {
        if (area.outages > 0) {
          // Aggregate by utility
          for (const utility of area.utilities || []) {
            if (utility.outages > 0) {
              outages.push({
                county: area.name,
                state: area.state || state,
                utilityName: utility.name,
                customersAffected: utility.outages,
                customersServed: utility.tracked,
                percentageOut: utility.percent || 0,
                timestamp,
              });
            }
          }

          // If no utility breakdown, add area-level outage
          if (!area.utilities || area.utilities.length === 0) {
            outages.push({
              county: area.name,
              state: area.state || state,
              utilityName: 'Unknown Utility',
              customersAffected: area.outages,
              customersServed: area.tracked,
              percentageOut: area.percent || 0,
              timestamp,
            });
          }
        }
      }

      return outages;
    } catch {
      return null;
    }
  }

  private processOutages(
    outages: Array<{
      county: string;
      state: string;
      utilityName: string;
      customersAffected: number;
      customersServed: number;
      percentageOut: number;
      timestamp: Date;
    }>,
    filters?: FeedFilterOptions
  ): {
    items: NormalizedFeedItem[];
    rawIncidents: RawIncident[];
    storedOutages: NewPowerOutage[];
  } {
    const items: NormalizedFeedItem[] = [];
    const rawIncidents: RawIncident[] = [];
    const storedOutages: NewPowerOutage[] = [];

    for (const outage of outages) {
      const severity = determineSeverity(outage.customersAffected, outage.percentageOut);
      const feedSeverity = toFeedSeverity(severity);

      // Apply severity filter
      if (filters?.minSeverity) {
        const severityOrder: FeedSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];
        if (severityOrder.indexOf(feedSeverity) < severityOrder.indexOf(filters.minSeverity)) {
          continue;
        }
      }

      // Get state centroid (county-level geocoding would be better)
      const location = STATE_CENTROIDS[outage.state];
      if (!location) continue;

      // Apply bounds filter
      if (filters?.bounds) {
        const { north, south, east, west } = filters.bounds;
        if (
          location.lat < south ||
          location.lat > north ||
          location.lng < west ||
          location.lng > east
        ) {
          continue;
        }
      }

      const externalId = `poweroutage:${outage.state}:${outage.county}:${outage.utilityName}:${outage.timestamp.getTime()}`;
      const title = `Power outage: ${outage.customersAffected.toLocaleString()} customers affected in ${outage.county}, ${outage.state}`;
      const description = `${outage.utilityName} reporting ${outage.customersAffected.toLocaleString()} customers without power (${outage.percentageOut.toFixed(1)}% of service area)`;

      // Normalized feed item
      items.push({
        externalId,
        type: 'infrastructure',
        title,
        content: description,
        timestamp: outage.timestamp,
        location: {
          latitude: location.lat,
          longitude: location.lng,
          name: `${outage.county}, ${outage.state}`,
        },
        severity: feedSeverity,
        metadata: {
          county: outage.county,
          state: outage.state,
          utilityName: outage.utilityName,
          customersAffected: outage.customersAffected,
          customersServed: outage.customersServed,
          percentageOut: outage.percentageOut,
          source: 'poweroutage.us',
        },
      });

      // Raw incident for correlation
      rawIncidents.push({
        sourceId: externalId,
        source: 'power_outage',
        latitude: location.lat,
        longitude: location.lng,
        title,
        description,
        incidentType: 'power_outage',
        reportedSeverity: severity,
        timestamp: outage.timestamp,
        confidence: 0.9, // High confidence - aggregated utility data
        metadata: {
          county: outage.county,
          state: outage.state,
          utilityName: outage.utilityName,
          customersAffected: outage.customersAffected,
          percentageOut: outage.percentageOut,
        },
      });

      // Power outage record for storage
      storedOutages.push({
        id: uuidv4(),
        county: outage.county,
        state: outage.state,
        latitude: location.lat,
        longitude: location.lng,
        utilityName: outage.utilityName,
        customersAffected: outage.customersAffected,
        customersServed: outage.customersServed || null,
        percentageOut: outage.percentageOut || null,
        reportedAt: outage.timestamp,
        estimatedRestoration: null,
        processed: false,
        createdAt: new Date(),
      });
    }

    // Sort by customers affected (most significant first)
    items.sort((a, b) => {
      const aCustomers = (a.metadata.customersAffected as number) || 0;
      const bCustomers = (b.metadata.customersAffected as number) || 0;
      return bCustomers - aCustomers;
    });

    // Apply limit
    const limited = filters?.limit ? items.slice(0, filters.limit) : items;
    const limitedIncidents = filters?.limit ? rawIncidents.slice(0, filters.limit) : rawIncidents;

    return {
      items: limited,
      rawIncidents: limitedIncidents,
      storedOutages,
    };
  }

  private async storeOutages(outages: NewPowerOutage[]): Promise<void> {
    const BATCH_SIZE = 100;

    for (let i = 0; i < outages.length; i += BATCH_SIZE) {
      const batch = outages.slice(i, i + BATCH_SIZE);
      try {
        await db.insert(powerOutages).values(batch);
      } catch (error) {
        console.error('[PowerOutage] Failed to store outages:', error);
      }
    }
  }

  /**
   * Get raw incidents from fetch result
   */
  static extractRawIncidents(result: FeedFetchResult): RawIncident[] {
    const metadata = (result as FeedFetchResult & { metadata?: { rawIncidents?: RawIncident[] } })
      .metadata;
    return metadata?.rawIncidents || [];
  }

  override getDefaultConfig(): Partial<FeedConfig> {
    return {
      ...super.getDefaultConfig(),
      pollInterval: 300000, // 5 minutes
      options: {
        minCustomers: 1000,
      },
    };
  }
}

// Export singleton instance
export const powerOutageAdapter = new PowerOutageAdapter();
