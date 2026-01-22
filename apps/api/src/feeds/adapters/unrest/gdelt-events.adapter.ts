/**
 * GDELT Events Adapter
 *
 * Fetches and normalizes civil unrest data from GDELT (Global Database of Events, Language, and Tone).
 * GDELT provides automated event extraction with 15-minute latency.
 */

import {
  BaseFeedAdapter,
  type FeedConfig,
  type FeedFilterOptions,
  type FeedFetchResult,
  type NormalizedFeedItem,
} from '../../adapter.interface';
import type { UnrestEvent, UnrestEventType } from '../../types/civil-unrest.types';

// GDELT CAMEO event codes for civil unrest
const UNREST_CAMEO_CODES: Record<string, UnrestEventType> = {
  '140': 'protest', // Engage in political dissent
  '141': 'protest', // Demonstrate or rally
  '1411': 'protest', // Demonstrate for leadership change
  '1412': 'protest', // Demonstrate for policy change
  '1413': 'protest', // Demonstrate for human rights
  '1414': 'protest', // Demonstrate for economic rights
  '145': 'riot', // Protest violently
  '170': 'political_violence', // Coerce
  '171': 'abduction', // Seize/Kidnap
  '175': 'political_violence', // Impose administrative sanctions
  '180': 'armed_clash', // Use unconventional violence
  '190': 'armed_clash', // Use conventional force
  '200': 'armed_clash', // Use force
};

interface GDELTEventRecord {
  GLOBALEVENTID: string;
  SQLDATE: string;
  Actor1Code: string;
  Actor1Name: string;
  Actor1CountryCode: string;
  Actor1Type1Code: string;
  Actor2Code?: string;
  Actor2Name?: string;
  Actor2CountryCode?: string;
  Actor2Type1Code?: string;
  IsRootEvent: number;
  EventCode: string;
  EventBaseCode: string;
  EventRootCode: string;
  QuadClass: number;
  GoldsteinScale: number;
  NumMentions: number;
  NumSources: number;
  NumArticles: number;
  AvgTone: number;
  Actor1Geo_Lat: number;
  Actor1Geo_Long: number;
  Actor1Geo_FullName: string;
  Actor1Geo_CountryCode: string;
  SOURCEURL: string;
}

/**
 * GDELT Events Adapter
 */
export class GDELTEventsAdapter extends BaseFeedAdapter {
  readonly type = 'civil_unrest' as const;
  readonly name = 'GDELT Events';
  readonly description = 'Real-time civil unrest events from GDELT (15-minute latency)';
  readonly requiredConfig: string[] = [];

  async fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    try {
      // GDELT updates every 15 minutes - get the latest update URL
      const lastUpdateUrl = 'http://data.gdeltproject.org/gdeltv2/lastupdate.txt';
      const response = await fetch(lastUpdateUrl);
      const lastUpdateText = await response.text();

      // Parse the events export URL
      const eventsLine = lastUpdateText.split('\n').find((line) => line.includes('.export.'));
      if (!eventsLine) {
        return {
          items: [],
          failedCount: 0,
          errors: [],
          hasMore: false,
        };
      }

      const eventsUrl = eventsLine.split(' ')[2];

      // Fetch and parse events
      const events = await this.fetchAndParseEvents(eventsUrl);

      // Filter to civil unrest events only
      const unrestEvents = events.filter((event) =>
        Object.keys(UNREST_CAMEO_CODES).some(
          (code) => event.EventCode.startsWith(code) || event.EventBaseCode.startsWith(code)
        )
      );

      // Apply additional filters
      let filteredEvents = unrestEvents;

      if (filters?.bounds) {
        const { north, south, east, west } = filters.bounds;
        filteredEvents = filteredEvents.filter(
          (e) =>
            e.Actor1Geo_Lat >= south &&
            e.Actor1Geo_Lat <= north &&
            e.Actor1Geo_Long >= west &&
            e.Actor1Geo_Long <= east
        );
      }

      if (filters?.limit) {
        filteredEvents = filteredEvents.slice(0, filters.limit);
      }

      const items: NormalizedFeedItem[] = filteredEvents.map((record) => this.normalize(record));

      return {
        items,
        failedCount: 0,
        errors: [],
        hasMore: false,
      };
    } catch (error) {
      return {
        items: [],
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'GDELT fetch failed'],
        hasMore: false,
      };
    }
  }

  private async fetchAndParseEvents(url: string): Promise<GDELTEventRecord[]> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    // Decompress gzip
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    await writer.write(new Uint8Array(buffer));
    await writer.close();

    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    let readerDone = false;
    while (!readerDone) {
      const { done, value } = await reader.read();
      readerDone = done;
      if (value) {
        chunks.push(value);
      }
    }

    const text = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const result = new Uint8Array(acc.length + chunk.length);
        result.set(acc);
        result.set(chunk, acc.length);
        return result;
      }, new Uint8Array())
    );

    // Parse TSV
    const lines = text.split('\n');
    const events: GDELTEventRecord[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const fields = line.split('\t');
      if (fields.length < 58) continue;

      // Only include events with valid coordinates
      const lat = parseFloat(fields[53]);
      const lng = parseFloat(fields[54]);
      if (!lat || !lng) continue;

      events.push({
        GLOBALEVENTID: fields[0],
        SQLDATE: fields[1],
        Actor1Code: fields[5],
        Actor1Name: fields[6],
        Actor1CountryCode: fields[7],
        Actor1Type1Code: fields[12],
        Actor2Code: fields[15],
        Actor2Name: fields[16],
        Actor2CountryCode: fields[17],
        Actor2Type1Code: fields[22],
        IsRootEvent: parseInt(fields[25]),
        EventCode: fields[26],
        EventBaseCode: fields[27],
        EventRootCode: fields[28],
        QuadClass: parseInt(fields[29]),
        GoldsteinScale: parseFloat(fields[30]),
        NumMentions: parseInt(fields[31]),
        NumSources: parseInt(fields[32]),
        NumArticles: parseInt(fields[33]),
        AvgTone: parseFloat(fields[34]),
        Actor1Geo_Lat: lat,
        Actor1Geo_Long: lng,
        Actor1Geo_FullName: fields[52],
        Actor1Geo_CountryCode: fields[51],
        SOURCEURL: fields[57],
      });
    }

    return events;
  }

  private normalize(record: GDELTEventRecord): NormalizedFeedItem {
    const eventType = this.mapEventType(record.EventCode, record.EventBaseCode);
    const severity = this.calculateSeverity(record);

    return {
      externalId: `gdelt-${record.GLOBALEVENTID}`,
      type: 'civil_unrest',
      title: this.generateTitle(record),
      content: `Event involving ${record.Actor1Name || 'Unknown'} in ${record.Actor1Geo_FullName}`,
      url: record.SOURCEURL,
      timestamp: this.parseGDELTDate(record.SQLDATE),
      location: {
        latitude: record.Actor1Geo_Lat,
        longitude: record.Actor1Geo_Long,
        name: record.Actor1Geo_FullName,
      },
      severity: severity,
      metadata: {
        source: 'gdelt',
        eventType,
        eventCode: record.EventCode,
        actor1: record.Actor1Name,
        actor2: record.Actor2Name,
        goldsteinScale: record.GoldsteinScale,
        numMentions: record.NumMentions,
        numSources: record.NumSources,
        avgTone: record.AvgTone,
        countryCode: record.Actor1Geo_CountryCode,
        verified: false,
      },
      raw: record,
    };
  }

  parseToUnrestEvent(record: GDELTEventRecord): UnrestEvent {
    const eventType = this.mapEventType(record.EventCode, record.EventBaseCode);
    const severity = this.calculateSeverity(record);

    return {
      id: `gdelt-${record.GLOBALEVENTID}`,
      source: 'gdelt',
      sourceId: record.GLOBALEVENTID,
      eventType,
      location: {
        lat: record.Actor1Geo_Lat,
        lng: record.Actor1Geo_Long,
        precision: 'approximate',
      },
      country: record.Actor1Geo_FullName.split(',').pop()?.trim() || '',
      countryCode: record.Actor1Geo_CountryCode,
      city: record.Actor1Geo_FullName.split(',')[0],
      actor1: record.Actor1Name
        ? {
            name: record.Actor1Name,
            type: 'unknown',
          }
        : undefined,
      actor2: record.Actor2Name
        ? {
            name: record.Actor2Name,
            type: 'unknown',
          }
        : undefined,
      date: this.parseGDELTDate(record.SQLDATE),
      sources: [record.SOURCEURL],
      severity: severity === 'info' ? 'low' : severity,
      verified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private mapEventType(eventCode: string, baseCode: string): UnrestEventType {
    for (const [code, type] of Object.entries(UNREST_CAMEO_CODES)) {
      if (eventCode.startsWith(code) || baseCode.startsWith(code)) {
        return type;
      }
    }
    return 'political_violence';
  }

  private generateTitle(record: GDELTEventRecord): string {
    const eventType = this.mapEventType(record.EventCode, record.EventBaseCode);
    const location = record.Actor1Geo_FullName.split(',')[0];
    return `${eventType.charAt(0).toUpperCase() + eventType.slice(1).replace(/_/g, ' ')} reported in ${location}`;
  }

  private parseGDELTDate(sqlDate: string): Date {
    const year = sqlDate.slice(0, 4);
    const month = sqlDate.slice(4, 6);
    const day = sqlDate.slice(6, 8);
    return new Date(`${year}-${month}-${day}`);
  }

  private calculateSeverity(
    record: GDELTEventRecord
  ): 'info' | 'low' | 'medium' | 'high' | 'critical' {
    const goldstein = Math.abs(record.GoldsteinScale);
    if (goldstein >= 8) return 'critical';
    if (goldstein >= 5) return 'high';
    if (goldstein >= 2) return 'medium';
    return 'low';
  }

  override getDefaultConfig(): Partial<FeedConfig> {
    return {
      ...super.getDefaultConfig(),
      pollInterval: 900000, // 15 minutes (matches GDELT update frequency)
      options: {
        sourceType: 'gdelt',
      },
    };
  }
}

// Export singleton instance
export const gdeltEventsAdapter = new GDELTEventsAdapter();
