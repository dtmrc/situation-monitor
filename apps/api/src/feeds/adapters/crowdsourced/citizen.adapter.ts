/**
 * Citizen App Adapter
 *
 * Fetches incident reports from Citizen app.
 * Multi-city support with category mapping and severity from engagement metrics.
 */

import { v4 as uuidv4 } from 'uuid';

import { db } from '../../../db';
import { citizenIncidents, type NewCitizenIncident } from '../../../db/schema/infrastructure';
import {
  BaseFeedAdapter,
  type FeedConfig,
  type FeedFilterOptions,
  type FeedFetchResult,
  type NormalizedFeedItem,
  type FeedSeverity,
} from '../../adapter.interface';
import type {
  RawIncident,
  IncidentSeverity,
  IncidentType,
  CitizenCity,
  GeoBounds,
} from '../../types/critical-infrastructure.types';
import {
  CITIZEN_SUPPORTED_CITIES,
  CITIZEN_CITY_COORDS,
} from '../../types/critical-infrastructure.types';

// Citizen incident category mappings
const CATEGORY_MAPPING: Record<string, { type: IncidentType; baseSeverity: IncidentSeverity }> = {
  // Fire-related
  fire: { type: 'fire', baseSeverity: 'significant' },
  'structure fire': { type: 'fire', baseSeverity: 'significant' },
  'brush fire': { type: 'fire', baseSeverity: 'moderate' },
  'vehicle fire': { type: 'fire', baseSeverity: 'moderate' },
  'fire alarm': { type: 'fire', baseSeverity: 'minor' },

  // Violence
  shooting: { type: 'physical_attack', baseSeverity: 'severe' },
  stabbing: { type: 'physical_attack', baseSeverity: 'severe' },
  assault: { type: 'physical_attack', baseSeverity: 'significant' },
  robbery: { type: 'physical_attack', baseSeverity: 'moderate' },
  fight: { type: 'civil_disturbance', baseSeverity: 'moderate' },

  // Traffic
  accident: { type: 'traffic_incident', baseSeverity: 'moderate' },
  'car accident': { type: 'traffic_incident', baseSeverity: 'moderate' },
  'pedestrian struck': { type: 'traffic_incident', baseSeverity: 'significant' },
  'hit and run': { type: 'traffic_incident', baseSeverity: 'moderate' },
  'road closure': { type: 'traffic_incident', baseSeverity: 'minor' },

  // Hazards
  'hazmat incident': { type: 'hazmat_release', baseSeverity: 'significant' },
  'gas leak': { type: 'hazmat_release', baseSeverity: 'significant' },
  'chemical spill': { type: 'hazmat_release', baseSeverity: 'significant' },
  explosion: { type: 'explosion', baseSeverity: 'severe' },

  // Infrastructure
  'power outage': { type: 'power_outage', baseSeverity: 'moderate' },
  'building collapse': { type: 'structural_failure', baseSeverity: 'severe' },
  flooding: { type: 'flooding', baseSeverity: 'significant' },

  // Civil disturbance
  protest: { type: 'civil_disturbance', baseSeverity: 'minor' },
  demonstration: { type: 'civil_disturbance', baseSeverity: 'minor' },
  riot: { type: 'civil_disturbance', baseSeverity: 'significant' },

  // Suspicious
  'suspicious package': { type: 'suspicious_activity', baseSeverity: 'moderate' },
  'suspicious person': { type: 'suspicious_activity', baseSeverity: 'minor' },
  'bomb threat': { type: 'suspicious_activity', baseSeverity: 'significant' },

  // Emergencies
  evacuation: { type: 'evacuation', baseSeverity: 'significant' },
  'medical emergency': { type: 'unknown', baseSeverity: 'moderate' },

  // Default
  unknown: { type: 'unknown', baseSeverity: 'minor' },
};

/**
 * Citizen API incident structure (unofficial reverse-engineered structure)
 */
interface CitizenAPIIncident {
  id: string;
  key: string;
  title: string;
  description?: string;
  category?: string;
  subcategory?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  createdAt: number; // Unix timestamp ms
  updatedAt?: number;
  viewCount?: number;
  commentCount?: number;
  updateCount?: number;
  thumbnailUrl?: string;
  severity?: string;
  isActive?: boolean;
}

interface CitizenAPIResponse {
  incidents: CitizenAPIIncident[];
  nextCursor?: string;
}

/**
 * Map category to incident type and base severity
 */
function mapCategory(category?: string): { type: IncidentType; baseSeverity: IncidentSeverity } {
  if (!category) return CATEGORY_MAPPING['unknown'];

  const lowerCategory = category.toLowerCase();

  // Check exact match
  if (CATEGORY_MAPPING[lowerCategory]) {
    return CATEGORY_MAPPING[lowerCategory];
  }

  // Check partial matches
  for (const [key, mapping] of Object.entries(CATEGORY_MAPPING)) {
    if (lowerCategory.includes(key) || key.includes(lowerCategory)) {
      return mapping;
    }
  }

  return CATEGORY_MAPPING['unknown'];
}

/**
 * Calculate severity from engagement metrics
 */
function calculateSeverity(
  baseSeverity: IncidentSeverity,
  viewCount?: number,
  commentCount?: number,
  updateCount?: number
): IncidentSeverity {
  // Score based on engagement
  const views = viewCount || 0;
  const comments = commentCount || 0;
  const updates = updateCount || 0;

  const engagementScore = views / 100 + comments * 2 + updates * 5;

  // Upgrade severity based on high engagement
  if (engagementScore > 100) {
    if (baseSeverity === 'minor') return 'moderate';
    if (baseSeverity === 'moderate') return 'significant';
    if (baseSeverity === 'significant') return 'severe';
  } else if (engagementScore > 50) {
    if (baseSeverity === 'minor') return 'moderate';
    if (baseSeverity === 'moderate') return 'significant';
  }

  return baseSeverity;
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
 * Citizen App Adapter
 */
export class CitizenAdapter extends BaseFeedAdapter {
  readonly type = 'citizen_report' as const;
  readonly name = 'Citizen App';
  readonly description = 'Crowdsourced incident reports from Citizen app (20 major US cities)';
  readonly requiredConfig = [];

  // Citizen API base URL (unofficial)
  private readonly API_BASE = 'https://citizen.com/api/incident';

  async fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    const options = config.options as Record<string, unknown>;

    // Get target cities
    let targetCities = (options.cities as CitizenCity[]) || [];
    if (targetCities.length === 0) {
      // If bounds provided, find cities within bounds
      if (filters?.bounds) {
        targetCities = this.getCitiesInBounds(filters.bounds);
      } else {
        // Default to major cities
        targetCities = ['new_york', 'los_angeles', 'chicago', 'houston', 'phoenix'];
      }
    }

    try {
      // Fetch incidents from each city
      const allIncidents: CitizenAPIIncident[] = [];

      await Promise.all(
        targetCities.map(async (city) => {
          try {
            const incidents = await this.fetchCityIncidents(city);
            allIncidents.push(...incidents);
          } catch (error) {
            console.error(`[Citizen] Failed to fetch ${city}:`, error);
          }
        })
      );

      // Apply filters and process
      const { items, rawIncidents, storedIncidents } = this.processIncidents(allIncidents, filters);

      // Store incidents
      if (storedIncidents.length > 0) {
        await this.storeIncidents(storedIncidents);
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
        errors: [error instanceof Error ? error.message : 'Citizen fetch failed'],
        hasMore: false,
      };
    }
  }

  /**
   * Get cities within geographic bounds
   */
  private getCitiesInBounds(bounds: GeoBounds): CitizenCity[] {
    const { north, south, east, west } = bounds;
    const cities: CitizenCity[] = [];

    for (const city of CITIZEN_SUPPORTED_CITIES) {
      const coords = CITIZEN_CITY_COORDS[city];
      if (coords.lat >= south && coords.lat <= north && coords.lng >= west && coords.lng <= east) {
        cities.push(city);
      }
    }

    return cities;
  }

  /**
   * Fetch incidents from a specific city
   */
  private async fetchCityIncidents(city: CitizenCity): Promise<CitizenAPIIncident[]> {
    const coords = CITIZEN_CITY_COORDS[city];

    // Note: This is an illustrative implementation. The actual Citizen API
    // is unofficial and may require different parameters or authentication.
    const url = new URL(`${this.API_BASE}/trending`);
    url.searchParams.set('lat', coords.lat.toString());
    url.searchParams.set('lng', coords.lng.toString());
    url.searchParams.set('radius', '50'); // 50 mile radius
    url.searchParams.set('limit', '50');

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SituationMonitor/1.0',
        },
      });

      if (!response.ok) {
        // Silently fail for individual cities
        return [];
      }

      const data = (await response.json()) as CitizenAPIResponse;
      return data.incidents || [];
    } catch {
      return [];
    }
  }

  /**
   * Process Citizen incidents
   */
  private processIncidents(
    incidents: CitizenAPIIncident[],
    filters?: FeedFilterOptions
  ): {
    items: NormalizedFeedItem[];
    rawIncidents: RawIncident[];
    storedIncidents: NewCitizenIncident[];
  } {
    const items: NormalizedFeedItem[] = [];
    const rawIncidents: RawIncident[] = [];
    const storedIncidents: NewCitizenIncident[] = [];
    const seenIds = new Set<string>();

    for (const incident of incidents) {
      // Skip duplicates
      if (seenIds.has(incident.id)) continue;
      seenIds.add(incident.id);

      // Skip if no location
      if (!incident.latitude || !incident.longitude) continue;

      // Apply bounds filter
      if (filters?.bounds) {
        const { north, south, east, west } = filters.bounds;
        if (
          incident.latitude < south ||
          incident.latitude > north ||
          incident.longitude < west ||
          incident.longitude > east
        ) {
          continue;
        }
      }

      const timestamp = new Date(incident.createdAt);

      // Apply age filter
      if (filters?.maxAge) {
        const age = Date.now() - timestamp.getTime();
        if (age > filters.maxAge) continue;
      }

      // Map category
      const categoryMapping = mapCategory(incident.category);
      const severity = calculateSeverity(
        categoryMapping.baseSeverity,
        incident.viewCount,
        incident.commentCount,
        incident.updateCount
      );
      const feedSeverity = toFeedSeverity(severity);

      // Apply severity filter
      if (filters?.minSeverity) {
        const severityOrder: FeedSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];
        if (severityOrder.indexOf(feedSeverity) < severityOrder.indexOf(filters.minSeverity)) {
          continue;
        }
      }

      const externalId = `citizen:${incident.id}`;
      const city =
        incident.city || this.inferCityFromLocation(incident.latitude, incident.longitude);

      // Normalized feed item
      items.push({
        externalId,
        type: 'citizen_report',
        title: incident.title,
        content: incident.description,
        timestamp,
        location: {
          latitude: incident.latitude,
          longitude: incident.longitude,
          name: incident.address || city,
        },
        severity: feedSeverity,
        metadata: {
          city,
          category: incident.category,
          subcategory: incident.subcategory,
          viewCount: incident.viewCount,
          commentCount: incident.commentCount,
          updateCount: incident.updateCount,
          isActive: incident.isActive,
          source: 'citizen',
        },
      });

      // Raw incident for correlation (only for infrastructure-relevant categories)
      if (this.isInfrastructureRelevant(categoryMapping.type)) {
        rawIncidents.push({
          sourceId: externalId,
          source: 'citizen_report',
          latitude: incident.latitude,
          longitude: incident.longitude,
          title: incident.title,
          description: incident.description,
          incidentType: categoryMapping.type,
          reportedSeverity: severity,
          timestamp,
          confidence: this.calculateConfidence(incident),
          metadata: {
            city,
            category: incident.category,
            viewCount: incident.viewCount,
            commentCount: incident.commentCount,
          },
        });
      }

      // Stored incident record
      storedIncidents.push({
        id: uuidv4(),
        externalId: incident.id,
        city,
        title: incident.title,
        description: incident.description || null,
        category: incident.category || 'unknown',
        subcategory: incident.subcategory || null,
        latitude: incident.latitude,
        longitude: incident.longitude,
        address: incident.address || null,
        viewCount: incident.viewCount || null,
        commentCount: incident.commentCount || null,
        updateCount: incident.updateCount || null,
        reportedAt: timestamp,
        lastUpdatedAt: incident.updatedAt ? new Date(incident.updatedAt) : null,
        processed: false,
        createdAt: new Date(),
      });
    }

    // Sort by timestamp (most recent first)
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    const limited = filters?.limit ? items.slice(0, filters.limit) : items;
    const limitedIncidents = filters?.limit ? rawIncidents.slice(0, filters.limit) : rawIncidents;

    return {
      items: limited,
      rawIncidents: limitedIncidents,
      storedIncidents,
    };
  }

  /**
   * Check if incident type is relevant to infrastructure
   */
  private isInfrastructureRelevant(type: IncidentType): boolean {
    const relevantTypes: IncidentType[] = [
      'fire',
      'explosion',
      'structural_failure',
      'power_outage',
      'hazmat_release',
      'flooding',
      'evacuation',
    ];
    return relevantTypes.includes(type);
  }

  /**
   * Calculate confidence based on engagement and updates
   */
  private calculateConfidence(incident: CitizenAPIIncident): number {
    let confidence = 0.4; // Base confidence for crowdsourced data

    // More updates = more verified
    const updates = incident.updateCount || 0;
    if (updates > 5) confidence += 0.2;
    else if (updates > 2) confidence += 0.1;

    // More views/comments = more attention
    const views = incident.viewCount || 0;
    const comments = incident.commentCount || 0;
    if (views > 1000 || comments > 50) confidence += 0.15;
    else if (views > 500 || comments > 20) confidence += 0.1;

    // Active incidents are more likely real
    if (incident.isActive) confidence += 0.1;

    return Math.min(0.85, confidence);
  }

  /**
   * Infer city from coordinates
   */
  private inferCityFromLocation(lat: number, lng: number): string {
    let closestCity = 'unknown';
    let closestDistance = Infinity;

    for (const city of CITIZEN_SUPPORTED_CITIES) {
      const coords = CITIZEN_CITY_COORDS[city];
      const distance = Math.sqrt(Math.pow(coords.lat - lat, 2) + Math.pow(coords.lng - lng, 2));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCity = city.replace(/_/g, ' ');
      }
    }

    return closestCity;
  }

  /**
   * Store incidents in database
   */
  private async storeIncidents(incidents: NewCitizenIncident[]): Promise<void> {
    const BATCH_SIZE = 100;

    for (let i = 0; i < incidents.length; i += BATCH_SIZE) {
      const batch = incidents.slice(i, i + BATCH_SIZE);
      try {
        await db.insert(citizenIncidents).values(batch);
      } catch (error) {
        console.error('[Citizen] Failed to store incidents:', error);
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
      pollInterval: 180000, // 3 minutes
      options: {
        cities: [], // All supported cities
      },
    };
  }
}

// Export singleton instance
export const citizenAdapter = new CitizenAdapter();
