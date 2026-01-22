/**
 * FIRMS Infrastructure Adapter
 *
 * Enhanced NASA FIRMS adapter that produces RawIncident[] for infrastructure correlation.
 * Detects fires near critical facilities and feeds the incident correlator.
 */

import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';

import { db } from '../../../db';
import { satelliteFires, type NewSatelliteFire } from '../../../db/schema/infrastructure';
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
  GeoBounds,
} from '../../types/critical-infrastructure.types';

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
  bright_ti4?: string;
  bright_ti5?: string;
  brightness?: string;
  scan: string;
  track: string;
  acq_date: string;
  acq_time: string;
  satellite: string;
  instrument: string;
  confidence: string;
  version?: string;
  frp: string;
  daynight: string;
  type?: string;
}

/**
 * Map FIRMS confidence to IncidentSeverity
 */
function mapConfidenceToSeverity(confidence: string, frp: number): IncidentSeverity {
  const normalizedConfidence = normalizeConfidence(confidence);

  if (frp > 500) return 'severe';
  if (frp > 200) return 'significant';
  if (frp > 50 && normalizedConfidence === 'high') return 'moderate';
  if (normalizedConfidence === 'high') return 'moderate';
  if (normalizedConfidence === 'nominal') return 'minor';
  return 'minor';
}

/**
 * Normalize confidence value
 */
function normalizeConfidence(confidence: string): 'low' | 'nominal' | 'high' {
  const lower = confidence.toLowerCase();
  if (lower === 'high' || lower === 'h') return 'high';
  if (lower === 'nominal' || lower === 'n') return 'nominal';
  if (lower === 'low' || lower === 'l') return 'low';

  const percent = parseInt(confidence);
  if (!isNaN(percent)) {
    if (percent >= 80) return 'high';
    if (percent >= 30) return 'nominal';
    return 'low';
  }

  return 'nominal';
}

/**
 * Map confidence to numeric value (0-1)
 */
function confidenceToNumeric(confidence: string): number {
  const normalized = normalizeConfidence(confidence);
  switch (normalized) {
    case 'high':
      return 0.9;
    case 'nominal':
      return 0.6;
    case 'low':
      return 0.3;
    default:
      return 0.5;
  }
}

/**
 * FIRMS Infrastructure Adapter
 * Produces RawIncident[] for infrastructure incident correlation
 */
export class FIRMSInfrastructureAdapter extends BaseFeedAdapter {
  readonly type = 'satellite_fire' as const;
  readonly name = 'FIRMS Infrastructure Fire Detection';
  readonly description = 'NASA FIRMS satellite fire detection for infrastructure monitoring';
  readonly requiredConfig = [];

  async fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    const options = config.options as Record<string, unknown>;
    const configFilters = config.filters as Record<string, unknown>;

    const bounds = filters?.bounds || (configFilters?.bounds as FeedFilterOptions['bounds']);

    if (!bounds) {
      return {
        items: [],
        failedCount: 0,
        errors: ['Geographic bounds required for fire detection'],
        hasMore: false,
      };
    }

    const mapKey = config.apiKeyEncrypted || options.mapKey || process.env.NASA_FIRMS_MAP_KEY;
    const source = (options.source as FIRMSSource) || 'VIIRS_SNPP_NRT';
    const days = Math.min(Math.max((options.days as number) || 1, 1), 10);

    try {
      const records = await this.fetchFIRMS(source, bounds, days, mapKey as string | undefined);
      const { items, rawIncidents, storedFires } = this.processRecords(
        records,
        filters,
        configFilters
      );

      // Store satellite fires for later correlation
      if (storedFires.length > 0) {
        await this.storeSatelliteFires(storedFires);
      }

      // Attach raw incidents to metadata for the processor
      return {
        items,
        failedCount: 0,
        errors: [],
        hasMore: false,
        // Custom property for infrastructure processing
        ...(rawIncidents.length > 0 && {
          metadata: { rawIncidents },
        }),
      };
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
    bounds: GeoBounds,
    days: number,
    mapKey?: string
  ): Promise<FIRMSRecord[]> {
    const { north, south, east, west } = bounds;

    let url: string;

    if (mapKey) {
      url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${west},${south},${east},${north}/${days}`;
    } else {
      url = `https://firms.modaps.eosdis.nasa.gov/data/active_fire/${this.getSourcePath(source)}/fire_archive_${this.getSourceAbbrev(source)}.csv`;
    }

    const response = await fetch(url, {
      headers: { Accept: 'text/csv' },
    });

    if (!response.ok) {
      throw new Error(`FIRMS API error: ${response.status}`);
    }

    const csvText = await response.text();

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (!mapKey) {
      return records.filter((r: FIRMSRecord) => {
        const lat = parseFloat(r.latitude);
        const lon = parseFloat(r.longitude);
        return lat >= south && lat <= north && lon >= west && lon <= east;
      });
    }

    return records;
  }

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
   * Process FIRMS records into normalized items and raw incidents
   */
  private processRecords(
    records: FIRMSRecord[],
    filters?: FeedFilterOptions,
    configFilters?: Record<string, unknown>
  ): {
    items: NormalizedFeedItem[];
    rawIncidents: RawIncident[];
    storedFires: NewSatelliteFire[];
  } {
    const items: NormalizedFeedItem[] = [];
    const rawIncidents: RawIncident[] = [];
    const storedFires: NewSatelliteFire[] = [];
    const seenLocations = new Set<string>();

    const minConfidence = (configFilters?.minConfidence as string) || 'low';

    for (const record of records) {
      try {
        const lat = parseFloat(record.latitude);
        const lon = parseFloat(record.longitude);

        if (isNaN(lat) || isNaN(lon)) continue;

        const confidence = normalizeConfidence(record.confidence);
        if (!this.meetsConfidenceThreshold(confidence, minConfidence)) continue;

        const frp = parseFloat(record.frp);
        const brightness = parseFloat(record.bright_ti4 || record.brightness || '0');
        const timestamp = this.parseTimestamp(record.acq_date, record.acq_time);

        // Apply age filter
        if (filters?.maxAge) {
          const age = Date.now() - timestamp.getTime();
          if (age > filters.maxAge) continue;
        }

        // Deduplicate by location+time (rounded)
        const locationKey = `${lat.toFixed(3)}:${lon.toFixed(3)}:${Math.floor(timestamp.getTime() / 3600000)}`;
        if (seenLocations.has(locationKey)) continue;
        seenLocations.add(locationKey);

        const severity = this.determineSeverity(frp, confidence);
        const incidentSeverity = mapConfidenceToSeverity(record.confidence, frp);

        // Create unique ID
        const externalId = `firms:${record.satellite}:${lat}:${lon}:${timestamp.getTime()}`;

        // Normalized feed item
        items.push({
          externalId,
          type: 'satellite_fire',
          title: this.buildTitle(frp, confidence),
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
            daynight: record.daynight === 'D' ? 'day' : 'night',
          },
          raw: record,
        });

        // Raw incident for correlation
        rawIncidents.push({
          sourceId: externalId,
          source: 'satellite_fire',
          latitude: lat,
          longitude: lon,
          title: this.buildTitle(frp, confidence),
          description: this.buildDescription(record),
          incidentType: 'fire',
          reportedSeverity: incidentSeverity,
          timestamp,
          confidence: confidenceToNumeric(record.confidence),
          metadata: {
            satellite: record.satellite,
            instrument: record.instrument,
            frp,
            brightness,
            daynight: record.daynight,
          },
        });

        // Satellite fire record for storage
        storedFires.push({
          id: uuidv4(),
          latitude: lat,
          longitude: lon,
          brightness,
          frp,
          confidence,
          satellite: record.satellite,
          instrument: record.instrument || null,
          dayNight: record.daynight === 'D' ? 'day' : 'night',
          acquisitionTime: timestamp,
          processed: false,
          createdAt: new Date(),
        });
      } catch {
        // Skip invalid records
      }
    }

    // Sort by timestamp (most recent first)
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    const limited = filters?.limit ? items.slice(0, filters.limit) : items;
    const limitedIncidents = filters?.limit ? rawIncidents.slice(0, filters.limit) : rawIncidents;

    return {
      items: limited,
      rawIncidents: limitedIncidents,
      storedFires,
    };
  }

  /**
   * Store satellite fires in the database
   */
  private async storeSatelliteFires(fires: NewSatelliteFire[]): Promise<void> {
    const BATCH_SIZE = 100;

    for (let i = 0; i < fires.length; i += BATCH_SIZE) {
      const batch = fires.slice(i, i + BATCH_SIZE);
      try {
        await db.insert(satelliteFires).values(batch);
      } catch (error) {
        console.error('[FIRMS] Failed to store satellite fires:', error);
      }
    }
  }

  private meetsConfidenceThreshold(
    confidence: 'low' | 'nominal' | 'high',
    threshold: string
  ): boolean {
    const order = ['low', 'nominal', 'high'];
    return order.indexOf(confidence) >= order.indexOf(threshold.toLowerCase());
  }

  private determineSeverity(frp: number, confidence: 'low' | 'nominal' | 'high'): FeedSeverity {
    if (frp > 500) return 'critical';
    if (frp > 200) return 'high';
    if (frp > 50) return 'medium';
    if (confidence === 'high') {
      if (frp > 20) return 'medium';
      return 'low';
    }
    if (confidence === 'nominal') return 'low';
    return 'info';
  }

  private parseTimestamp(date: string, time: string): Date {
    const parts = date.split('-').map(Number);
    const year = parts[0] ?? 1970;
    const month = parts[1] ?? 1;
    const day = parts[2] ?? 1;
    const hour = parseInt(time.slice(0, 2)) || 0;
    const minute = parseInt(time.slice(2, 4)) || 0;
    return new Date(Date.UTC(year, month - 1, day, hour, minute));
  }

  private buildTitle(frp: number, confidence: string): string {
    const parts = ['Satellite fire detected'];
    if (frp > 200) parts.push('(large)');
    else if (frp > 50) parts.push('(moderate)');
    parts.push(`- ${confidence} confidence`);
    return parts.join(' ');
  }

  private buildDescription(record: FIRMSRecord): string {
    const parts: string[] = [];
    parts.push(`Satellite: ${record.satellite} (${record.instrument})`);
    parts.push(`Acquired: ${record.acq_date} ${record.acq_time} UTC`);
    parts.push(`Fire Radiative Power: ${record.frp} MW`);
    parts.push(`Confidence: ${record.confidence}`);
    parts.push(`Day/Night: ${record.daynight === 'D' ? 'Day' : 'Night'}`);
    return parts.join(' | ');
  }

  /**
   * Get raw incidents from fetch result (for infrastructure processor)
   */
  static extractRawIncidents(result: FeedFetchResult): RawIncident[] {
    const metadata = (result as FeedFetchResult & { metadata?: { rawIncidents?: RawIncident[] } })
      .metadata;
    return metadata?.rawIncidents || [];
  }

  override getDefaultConfig(): Partial<FeedConfig> {
    return {
      ...super.getDefaultConfig(),
      pollInterval: 3600000, // 1 hour
      options: {
        source: 'VIIRS_SNPP_NRT',
        days: 1,
      },
    };
  }
}

// Export singleton instance
export const firmsInfrastructureAdapter = new FIRMSInfrastructureAdapter();
