/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/**
 * Fire Detection Feed Adapter
 *
 * Supports:
 * - NASA FIRMS (Fire Information for Resource Management System)
 * - VIIRS and MODIS satellite data
 *
 * Features:
 * - Active fire detection
 * - Confidence filtering
 * - Fire radiative power analysis
 */

import { parse } from 'csv-parse/sync';

import {
  BaseFeedAdapter,
  type FeedConfig,
  type FeedFilterOptions,
  type FeedFetchResult,
  type NormalizedFeedItem,
  type FeedSeverity,
} from '../adapter.interface';

// FIRMS data sources
type FIRMSSource =
  | 'VIIRS_SNPP_NRT'
  | 'VIIRS_NOAA20_NRT'
  | 'MODIS_NRT'
  | 'VIIRS_SNPP_SP'
  | 'MODIS_SP';

// FIRMS CSV record
interface FIRMSRecord {
  latitude: string;
  longitude: string;
  bright_ti4?: string; // Brightness temperature (VIIRS)
  bright_ti5?: string; // Brightness temperature (VIIRS)
  brightness?: string; // Brightness temperature (MODIS)
  scan: string;
  track: string;
  acq_date: string;
  acq_time: string;
  satellite: string;
  instrument: string;
  confidence: string;
  version?: string;
  frp: string; // Fire Radiative Power
  daynight: string;
  type?: string; // Fire type (VIIRS only)
}

// Fire type codes (VIIRS)
const FIRE_TYPES: Record<string, string> = {
  '0': 'Presumed vegetation fire',
  '1': 'Active volcano',
  '2': 'Other static land source',
  '3': 'Offshore',
};

/**
 * Fire Detection Feed Adapter
 */
export class FireAdapter extends BaseFeedAdapter {
  readonly type = 'fire' as const;
  readonly name = 'Fire Detection';
  readonly description = 'Active fire detections from NASA FIRMS (VIIRS & MODIS satellites)';
  readonly requiredConfig = [];

  async fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    const options = config.options as Record<string, unknown>;
    const configFilters = config.filters as Record<string, unknown>;

    // Get bounds (required for FIRMS API)
    const bounds = filters?.bounds || (configFilters?.bounds as typeof filters.bounds);

    if (!bounds) {
      return {
        items: [],
        failedCount: 0,
        errors: ['Geographic bounds required for fire detection'],
        hasMore: false,
      };
    }

    // Get MAP_KEY if using authenticated endpoint
    const mapKey = config.apiKeyEncrypted || options.mapKey || process.env.NASA_FIRMS_MAP_KEY;

    // Select data source
    const source = (options.source as FIRMSSource) || 'VIIRS_SNPP_NRT';

    // Number of days to fetch (1-10)
    const days = Math.min(Math.max((options.days as number) || 1, 1), 10);

    try {
      const records = await this.fetchFIRMS(source, bounds, days, mapKey as string | undefined);
      return this.processRecords(records, filters, configFilters);
    } catch (error) {
      return {
        items: [],
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'FIRMS fetch failed'],
        hasMore: false,
      };
    }
  }

  /**
   * Fetch data from NASA FIRMS
   */
  private async fetchFIRMS(
    source: FIRMSSource,
    bounds: NonNullable<FeedFilterOptions['bounds']>,
    days: number,
    mapKey?: string
  ): Promise<FIRMSRecord[]> {
    const { north, south, east, west } = bounds;

    // Build URL based on authentication
    let url: string;

    if (mapKey) {
      // Authenticated endpoint with custom bounding box
      url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${west},${south},${east},${north}/${days}`;
    } else {
      // Public endpoint (limited, uses country codes)
      // For demo, we'll try the public global active fires endpoint
      url = `https://firms.modaps.eosdis.nasa.gov/data/active_fire/${this.getSourcePath(source)}/fire_archive_${this.getSourceAbbrev(source)}.csv`;
    }

    const response = await fetch(url, {
      headers: {
        Accept: 'text/csv',
      },
    });

    if (!response.ok) {
      throw new Error(`FIRMS API error: ${response.status}`);
    }

    const csvText = await response.text();

    // Parse CSV
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Filter by bounds if using global endpoint
    if (!mapKey) {
      return records.filter((r) => {
        const lat = parseFloat(r.latitude);
        const lon = parseFloat(r.longitude);
        return lat >= south && lat <= north && lon >= west && lon <= east;
      });
    }

    return records;
  }

  /**
   * Get source path for public endpoint
   */
  private getSourcePath(source: FIRMSSource): string {
    switch (source) {
      case 'VIIRS_SNPP_NRT':
      case 'VIIRS_SNPP_SP':
        return 'viirs-snpp-7days';
      case 'VIIRS_NOAA20_NRT':
        return 'viirs-noaa20-7days';
      case 'MODIS_NRT':
      case 'MODIS_SP':
        return 'modis-7days';
      default:
        return 'viirs-snpp-7days';
    }
  }

  /**
   * Get source abbreviation
   */
  private getSourceAbbrev(source: FIRMSSource): string {
    switch (source) {
      case 'VIIRS_SNPP_NRT':
      case 'VIIRS_SNPP_SP':
        return 'SV-C2';
      case 'VIIRS_NOAA20_NRT':
        return 'J1V-C2';
      case 'MODIS_NRT':
      case 'MODIS_SP':
        return 'M-C61';
      default:
        return 'SV-C2';
    }
  }

  /**
   * Process FIRMS records into normalized items
   */
  private processRecords(
    records: FIRMSRecord[],
    filters?: FeedFilterOptions,
    configFilters?: Record<string, unknown>
  ): FeedFetchResult {
    const items: NormalizedFeedItem[] = [];
    let failedCount = 0;

    // Confidence filter
    const minConfidence = (configFilters?.minConfidence as string) || 'low';

    for (const record of records) {
      try {
        const lat = parseFloat(record.latitude);
        const lon = parseFloat(record.longitude);

        if (isNaN(lat) || isNaN(lon)) {
          failedCount++;
          continue;
        }

        // Filter by confidence
        const confidence = this.normalizeConfidence(record.confidence);
        if (!this.meetsConfidenceThreshold(confidence, minConfidence)) {
          continue;
        }

        // Parse fire properties
        const frp = parseFloat(record.frp);
        const brightness = parseFloat(record.bright_ti4 || record.brightness || '0');

        // Determine severity based on FRP and confidence
        const severity = this.determineFIRMSSeverity(frp, confidence, brightness);

        // Apply severity filter
        if (filters?.minSeverity) {
          const severityOrder: FeedSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];
          const minIndex = severityOrder.indexOf(filters.minSeverity);
          const fireIndex = severityOrder.indexOf(severity);
          if (fireIndex < minIndex) continue;
        }

        // Build timestamp
        const timestamp = this.parseTimestamp(record.acq_date, record.acq_time);

        // Apply age filter
        if (filters?.maxAge) {
          const age = Date.now() - timestamp.getTime();
          if (age > filters.maxAge) continue;
        }

        const fireType = record.type ? FIRE_TYPES[record.type] : undefined;

        items.push({
          externalId: `firms:${record.satellite}:${lat}:${lon}:${timestamp.getTime()}`,
          type: 'fire' as const,
          title: this.buildTitle(record, frp, confidence),
          content: this.buildDescription(record),
          timestamp,
          location: {
            latitude: lat,
            longitude: lon,
          },
          severity,
          metadata: {
            satellite: record.satellite,
            instrument: record.instrument,
            confidence,
            confidenceRaw: record.confidence,
            frp,
            brightness,
            scan: parseFloat(record.scan),
            track: parseFloat(record.track),
            daynight: record.daynight === 'D' ? 'day' : 'night',
            fireType,
            version: record.version,
          },
          raw: record,
        });
      } catch (error) {
        failedCount++;
      }
    }

    // Sort by timestamp (most recent first)
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

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
   * Normalize confidence value to low/nominal/high
   */
  private normalizeConfidence(confidence: string): 'low' | 'nominal' | 'high' {
    const lower = confidence.toLowerCase();

    // VIIRS uses categorical values
    if (lower === 'high' || lower === 'h') return 'high';
    if (lower === 'nominal' || lower === 'n') return 'nominal';
    if (lower === 'low' || lower === 'l') return 'low';

    // MODIS uses percentage
    const percent = parseInt(confidence);
    if (!isNaN(percent)) {
      if (percent >= 80) return 'high';
      if (percent >= 30) return 'nominal';
      return 'low';
    }

    return 'nominal';
  }

  /**
   * Check if confidence meets threshold
   */
  private meetsConfidenceThreshold(
    confidence: 'low' | 'nominal' | 'high',
    threshold: string
  ): boolean {
    const order = ['low', 'nominal', 'high'];
    const thresholdIndex = order.indexOf(threshold.toLowerCase());
    const confidenceIndex = order.indexOf(confidence);

    return confidenceIndex >= thresholdIndex;
  }

  /**
   * Determine severity based on FRP and confidence
   */
  private determineFIRMSSeverity(
    frp: number,
    confidence: 'low' | 'nominal' | 'high',
    _brightness: number
  ): FeedSeverity {
    // Very high FRP indicates large fire
    if (frp > 500) return 'critical';
    if (frp > 200) return 'high';
    if (frp > 50) return 'medium';

    // Adjust by confidence
    if (confidence === 'high') {
      if (frp > 20) return 'medium';
      return 'low';
    }

    if (confidence === 'nominal') {
      return 'low';
    }

    return 'info';
  }

  /**
   * Parse acquisition date and time
   */
  private parseTimestamp(date: string, time: string): Date {
    // Date format: YYYY-MM-DD
    // Time format: HHMM
    const [year, month, day] = date.split('-').map(Number);
    const hour = parseInt(time.slice(0, 2));
    const minute = parseInt(time.slice(2, 4));

    return new Date(Date.UTC(year, month - 1, day, hour, minute));
  }

  /**
   * Build fire title
   */
  private buildTitle(record: FIRMSRecord, frp: number, confidence: string): string {
    const parts = ['Fire detected'];

    // Add FRP indication
    if (frp > 200) {
      parts.push('(large)');
    } else if (frp > 50) {
      parts.push('(moderate)');
    }

    // Add confidence
    parts.push(`- ${confidence} confidence`);

    return parts.join(' ');
  }

  /**
   * Build fire description
   */
  private buildDescription(record: FIRMSRecord): string {
    const parts: string[] = [];

    parts.push(`Satellite: ${record.satellite} (${record.instrument})`);
    parts.push(`Acquired: ${record.acq_date} ${record.acq_time} UTC`);
    parts.push(`Fire Radiative Power: ${record.frp} MW`);
    parts.push(`Confidence: ${record.confidence}`);
    parts.push(`Day/Night: ${record.daynight === 'D' ? 'Day' : 'Night'}`);

    if (record.type) {
      parts.push(`Type: ${FIRE_TYPES[record.type] || record.type}`);
    }

    return parts.join(' | ');
  }

  override getDefaultConfig(): Partial<FeedConfig> {
    return {
      ...super.getDefaultConfig(),
      pollInterval: 3600000, // 1 hour (satellite passes are infrequent)
      options: {
        source: 'VIIRS_SNPP_NRT',
        days: 1,
      },
    };
  }
}

// Export singleton instance
export const fireAdapter = new FireAdapter();
