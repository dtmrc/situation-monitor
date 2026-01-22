/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/**
 * Flight Tracking Feed Adapter
 *
 * Supports:
 * - ADS-B Exchange API v2
 * - OpenSky Network (future)
 *
 * Features:
 * - Squawk code alerting (7500, 7600, 7700)
 * - Bounding box queries for NAI regions
 * - Military aircraft filtering
 */

import {
  BaseFeedAdapter,
  type FeedConfig,
  type FeedFilterOptions,
  type FeedFetchResult,
  type NormalizedFeedItem,
  type FeedSeverity,
} from '../adapter.interface';

// Emergency squawk codes
const EMERGENCY_SQUAWKS: Record<string, { severity: FeedSeverity; meaning: string }> = {
  '7500': { severity: 'critical', meaning: 'Hijack' },
  '7600': { severity: 'high', meaning: 'Radio Failure' },
  '7700': { severity: 'critical', meaning: 'Emergency' },
};

// Military squawk ranges (general)
const MILITARY_SQUAWK_RANGES = [
  { start: '0001', end: '0777' }, // Military
  { start: '4400', end: '4477' }, // Military/special
  { start: '5000', end: '5077' }, // Military/special
];

// ADS-B Exchange API response
interface ADSBExchangeAircraft {
  hex: string; // ICAO24 code
  type?: string; // Aircraft type
  flight?: string; // Callsign
  r?: string; // Registration
  t?: string; // Aircraft type code
  alt_baro?: number; // Barometric altitude
  alt_geom?: number; // Geometric altitude
  gs?: number; // Ground speed (knots)
  track?: number; // Track/heading
  baro_rate?: number; // Vertical rate (ft/min)
  squawk?: string;
  emergency?: string;
  category?: string;
  nav_heading?: number;
  lat?: number;
  lon?: number;
  nic?: number; // Navigation Integrity Category
  rc?: number; // Radius of containment
  seen_pos?: number; // Seconds since position update
  version?: number;
  nic_baro?: number;
  nac_p?: number;
  nac_v?: number;
  sil?: number;
  sil_type?: string;
  gva?: number;
  sda?: number;
  mlat?: string[];
  tisb?: string[];
  messages?: number;
  seen?: number;
  rssi?: number;
  alert?: number;
  spi?: number;
  true_heading?: number;
  mag_heading?: number;
  desc?: string; // Aircraft description
}

interface ADSBExchangeResponse {
  ac: ADSBExchangeAircraft[];
  msg?: string;
  now: number;
  total: number;
  ctime: number;
  ptime: number;
}

/**
 * Flight Tracking Feed Adapter
 */
export class FlightAdapter extends BaseFeedAdapter {
  readonly type = 'flight' as const;
  readonly name = 'Flight Tracking';
  readonly description = 'ADS-B flight tracking data from ADS-B Exchange';
  readonly requiredConfig = ['apiKey'];

  async fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    const options = config.options as Record<string, unknown>;
    const configFilters = config.filters as Record<string, unknown>;

    const apiKey = config.apiKeyEncrypted || options.apiKey;

    if (!apiKey) {
      return {
        items: [],
        failedCount: 0,
        errors: ['ADS-B Exchange API key required'],
        hasMore: false,
      };
    }

    // Determine which API endpoint to use
    const bounds = filters?.bounds || (configFilters?.bounds as typeof filters.bounds);

    if (bounds) {
      return this.fetchByBounds(apiKey as string, bounds, filters);
    }

    // Default: fetch all aircraft (requires higher tier API)
    return this.fetchAll(apiKey as string, filters);
  }

  /**
   * Fetch aircraft within bounding box
   */
  private async fetchByBounds(
    apiKey: string,
    bounds: NonNullable<FeedFilterOptions['bounds']>,
    filters?: FeedFilterOptions
  ): Promise<FeedFetchResult> {
    const { north, south, east, west } = bounds;

    try {
      // ADS-B Exchange v2 bbox endpoint
      const response = await fetch(
        `https://adsbexchange.com/api/aircraft/v2/lat/${(north + south) / 2}/lon/${(east + west) / 2}/dist/${this.calculateRadius(bounds)}/`,
        {
          headers: {
            'Api-Auth': apiKey,
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        return {
          items: [],
          failedCount: 0,
          errors: [`ADS-B Exchange API error: ${response.status}`],
          hasMore: false,
        };
      }

      const data = (await response.json()) as ADSBExchangeResponse;
      return this.processAircraft(data.ac || [], filters, bounds);
    } catch (error) {
      return {
        items: [],
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'ADS-B fetch failed'],
        hasMore: false,
      };
    }
  }

  /**
   * Fetch all aircraft (global)
   */
  private async fetchAll(apiKey: string, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    try {
      // ADS-B Exchange v2 global endpoint
      const response = await fetch('https://adsbexchange.com/api/aircraft/v2/all', {
        headers: {
          'Api-Auth': apiKey,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return {
          items: [],
          failedCount: 0,
          errors: [`ADS-B Exchange API error: ${response.status}`],
          hasMore: false,
        };
      }

      const data = (await response.json()) as ADSBExchangeResponse;
      return this.processAircraft(data.ac || [], filters);
    } catch (error) {
      return {
        items: [],
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'ADS-B fetch failed'],
        hasMore: false,
      };
    }
  }

  /**
   * Process aircraft data into normalized items
   */
  private processAircraft(
    aircraft: ADSBExchangeAircraft[],
    filters?: FeedFilterOptions,
    bounds?: NonNullable<FeedFilterOptions['bounds']>
  ): FeedFetchResult {
    const items: NormalizedFeedItem[] = [];
    let failedCount = 0;

    for (const ac of aircraft) {
      // Skip aircraft without position
      if (ac.lat === undefined || ac.lon === undefined) {
        failedCount++;
        continue;
      }

      // Filter by bounds if provided
      if (bounds && !this.isWithinBounds(ac.lat, ac.lon, bounds)) {
        continue;
      }

      // Determine severity based on squawk and conditions
      const { severity, title, alerts } = this.analyzeAircraft(ac);

      // Apply severity filter
      if (filters?.minSeverity) {
        const severityOrder: FeedSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];
        const minIndex = severityOrder.indexOf(filters.minSeverity);
        const acIndex = severityOrder.indexOf(severity);
        if (acIndex < minIndex) continue;
      }

      items.push({
        externalId: `adsb:${ac.hex}:${Date.now()}`,
        type: 'flight' as const,
        title,
        content: this.buildDescription(ac),
        timestamp: new Date(),
        location: {
          latitude: ac.lat,
          longitude: ac.lon,
        },
        severity,
        metadata: {
          icao24: ac.hex,
          callsign: ac.flight?.trim(),
          registration: ac.r,
          aircraftType: ac.t,
          description: ac.desc,
          altitude: ac.alt_baro || ac.alt_geom,
          groundSpeed: ac.gs,
          heading: ac.track,
          verticalRate: ac.baro_rate,
          squawk: ac.squawk,
          emergency: ac.emergency,
          category: ac.category,
          onGround: ac.alt_baro === 0 || ac.alt_baro === 'ground',
          isMilitary: this.isMilitarySquawk(ac.squawk),
          alerts,
        },
        raw: ac,
      });
    }

    // Apply limit
    const limited = filters?.limit ? items.slice(0, filters.limit) : items;

    return {
      items: limited,
      failedCount,
      errors: [],
      hasMore: false,
    };
  }

  /**
   * Analyze aircraft for alerts and severity
   */
  private analyzeAircraft(ac: ADSBExchangeAircraft): {
    severity: FeedSeverity;
    title: string;
    alerts: string[];
  } {
    const alerts: string[] = [];
    let severity: FeedSeverity = 'info';

    // Check emergency squawk
    if (ac.squawk && EMERGENCY_SQUAWKS[ac.squawk]) {
      const emergency = EMERGENCY_SQUAWKS[ac.squawk];
      alerts.push(`Emergency: ${emergency.meaning} (Squawk ${ac.squawk})`);
      severity = emergency.severity;
    }

    // Check emergency field
    if (ac.emergency && ac.emergency !== 'none') {
      alerts.push(`Emergency declared: ${ac.emergency}`);
      if (severity === 'info') severity = 'high';
    }

    // Check for military aircraft
    if (this.isMilitarySquawk(ac.squawk) || this.isMilitaryCallsign(ac.flight)) {
      alerts.push('Military aircraft');
      if (severity === 'info') severity = 'low';
    }

    // Check for unusual altitude changes
    if (ac.baro_rate && Math.abs(ac.baro_rate) > 4000) {
      alerts.push(`Rapid altitude change: ${ac.baro_rate > 0 ? '+' : ''}${ac.baro_rate} ft/min`);
      if (severity === 'info') severity = 'medium';
    }

    // Build title
    const callsign = ac.flight?.trim() || ac.hex.toUpperCase();
    let title = callsign;

    if (alerts.length > 0) {
      title = `${callsign} - ${alerts[0]}`;
    } else if (ac.desc) {
      title = `${callsign} (${ac.desc})`;
    }

    return { severity, title, alerts };
  }

  /**
   * Build aircraft description
   */
  private buildDescription(ac: ADSBExchangeAircraft): string {
    const parts: string[] = [];

    if (ac.r) parts.push(`Registration: ${ac.r}`);
    if (ac.t) parts.push(`Type: ${ac.t}`);
    if (ac.desc) parts.push(`Description: ${ac.desc}`);
    if (ac.alt_baro !== undefined) parts.push(`Altitude: ${ac.alt_baro} ft`);
    if (ac.gs !== undefined) parts.push(`Ground Speed: ${ac.gs} kts`);
    if (ac.track !== undefined) parts.push(`Heading: ${ac.track}°`);
    if (ac.squawk) parts.push(`Squawk: ${ac.squawk}`);

    return parts.join(' | ');
  }

  /**
   * Check if squawk indicates military aircraft
   */
  private isMilitarySquawk(squawk?: string): boolean {
    if (!squawk) return false;

    for (const range of MILITARY_SQUAWK_RANGES) {
      if (squawk >= range.start && squawk <= range.end) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if callsign indicates military aircraft
   */
  private isMilitaryCallsign(callsign?: string): boolean {
    if (!callsign) return false;

    const militaryPrefixes = [
      'REACH',
      'EVAC',
      'DUKE',
      'TITAN',
      'SENTRY',
      'OMNI',
      'RCH',
      'AE',
      'MC',
      'CNV',
      'NAVY',
      'ARMY',
      'USAF',
    ];

    const trimmed = callsign.trim().toUpperCase();
    return militaryPrefixes.some((prefix) => trimmed.startsWith(prefix));
  }

  /**
   * Calculate radius in nautical miles for bounding box
   */
  private calculateRadius(bounds: NonNullable<FeedFilterOptions['bounds']>): number {
    const latDiff = bounds.north - bounds.south;
    const lonDiff = bounds.east - bounds.west;

    // Rough conversion: 1 degree ≈ 60 nautical miles at equator
    const latNm = latDiff * 60;
    const lonNm = lonDiff * 60 * Math.cos((((bounds.north + bounds.south) / 2) * Math.PI) / 180);

    // Use half the diagonal as radius
    return Math.ceil(Math.sqrt(latNm * latNm + lonNm * lonNm) / 2);
  }

  override getDefaultConfig(): Partial<FeedConfig> {
    return {
      ...super.getDefaultConfig(),
      pollInterval: 10000, // 10 seconds for real-time tracking
    };
  }
}

// Export singleton instance
export const flightAdapter = new FlightAdapter();
