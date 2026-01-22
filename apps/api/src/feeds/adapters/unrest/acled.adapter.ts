/**
 * ACLED (Armed Conflict Location & Event Data) Adapter
 *
 * Fetches and normalizes civil unrest data from ACLED API.
 * ACLED provides human-verified conflict event data with 24-48 hour latency.
 */

import {
  BaseFeedAdapter,
  type FeedConfig,
  type FeedFilterOptions,
  type FeedFetchResult,
  type NormalizedFeedItem,
} from '../../adapter.interface';
import type { UnrestEvent, UnrestEventType, ActorType } from '../../types/civil-unrest.types';

interface ACLEDRecord {
  event_id_cnty: string;
  event_date: string;
  year: number;
  event_type: string;
  sub_event_type: string;
  actor1: string;
  assoc_actor_1?: string;
  inter1: number;
  actor2?: string;
  assoc_actor_2?: string;
  inter2?: number;
  interaction: number;
  region: string;
  country: string;
  admin1: string;
  admin2?: string;
  admin3?: string;
  location: string;
  latitude: number;
  longitude: number;
  geo_precision: number;
  source: string;
  source_scale: string;
  notes: string;
  fatalities: number;
  timestamp: number;
  iso3: string;
}

interface ACLEDResponse {
  status: number;
  success: boolean;
  data: ACLEDRecord[];
  count: number;
}

// ACLED event type mapping
const EVENT_TYPE_MAP: Record<string, UnrestEventType> = {
  Battles: 'armed_clash',
  'Violence against civilians': 'civilian_targeting',
  'Explosions/Remote violence': 'remote_violence',
  Riots: 'riot',
  Protests: 'protest',
  'Strategic developments': 'political_violence',
};

// ACLED actor inter codes
const ACTOR_TYPE_MAP: Record<number, ActorType> = {
  1: 'government',
  2: 'rebel_group',
  3: 'political_militia',
  4: 'identity_militia',
  5: 'rioters',
  6: 'protesters',
  7: 'civilians',
  8: 'external_force',
};

/**
 * ACLED Civil Unrest Adapter
 */
export class ACLEDAdapter extends BaseFeedAdapter {
  readonly type = 'civil_unrest' as const;
  readonly name = 'ACLED Civil Unrest';
  readonly description = 'Human-verified conflict and protest data from ACLED';
  readonly requiredConfig = ['apiKey', 'email'];

  async fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    const options = config.options as Record<string, unknown>;
    const configFilters = config.filters as Record<string, unknown>;

    const apiKey = config.apiKeyEncrypted || options.apiKey;
    const email = options.email;

    if (!apiKey || !email) {
      return {
        items: [],
        failedCount: 0,
        errors: ['ACLED API key and email required'],
        hasMore: false,
      };
    }

    const url = new URL('https://api.acleddata.com/acled/read');

    url.searchParams.set('key', apiKey as string);
    url.searchParams.set('email', email as string);

    // Date range
    const startDate = filters?.maxAge
      ? new Date(Date.now() - filters.maxAge)
      : new Date(Date.now() - 7 * 24 * 3600000); // 7 days default

    url.searchParams.set(
      'event_date',
      `${this.formatDate(startDate)}|${this.formatDate(new Date())}`
    );
    url.searchParams.set('event_date_where', 'BETWEEN');
    url.searchParams.set('limit', String(filters?.limit || 5000));

    // Country filter
    const countries = configFilters?.countries as string[];
    if (countries?.length) {
      url.searchParams.set('country', countries.join('|'));
      url.searchParams.set('country_where', 'IN');
    }

    // Region filter
    const regions = configFilters?.regions as string[];
    if (regions?.length) {
      url.searchParams.set('region', regions.join('|'));
      url.searchParams.set('region_where', 'IN');
    }

    // Event type filter
    const eventTypes = filters?.categories || (configFilters?.eventTypes as string[]);
    if (eventTypes?.length) {
      url.searchParams.set('event_type', eventTypes.join('|'));
      url.searchParams.set('event_type_where', 'IN');
    }

    // Geographic bounds
    if (filters?.bounds) {
      const { north, south, east, west } = filters.bounds;
      url.searchParams.set('latitude', `${south}|${north}`);
      url.searchParams.set('latitude_where', 'BETWEEN');
      url.searchParams.set('longitude', `${west}|${east}`);
      url.searchParams.set('longitude_where', 'BETWEEN');
    }

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`ACLED API error: ${response.statusText}`);
      }

      const data = (await response.json()) as ACLEDResponse;

      if (!data.success) {
        return {
          items: [],
          failedCount: 0,
          errors: ['ACLED API request failed'],
          hasMore: false,
        };
      }

      const items: NormalizedFeedItem[] = (data.data || []).map((record) => this.normalize(record));

      return {
        items,
        failedCount: 0,
        errors: [],
        hasMore: data.count > items.length,
      };
    } catch (error) {
      return {
        items: [],
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'ACLED fetch failed'],
        hasMore: false,
      };
    }
  }

  private normalize(record: ACLEDRecord): NormalizedFeedItem {
    const event = this.parseToUnrestEvent(record);

    return {
      externalId: `acled-${record.event_id_cnty}`,
      type: 'civil_unrest',
      title: `${record.event_type} in ${record.location}, ${record.country}`,
      content: record.notes,
      timestamp: new Date(record.event_date),
      location: {
        latitude: record.latitude,
        longitude: record.longitude,
        name: `${record.location}, ${record.country}`,
      },
      severity: this.mapSeverityToFeed(event.severity),
      metadata: {
        source: 'acled',
        eventType: event.eventType,
        subEventType: record.sub_event_type,
        actor1: event.actor1,
        actor2: event.actor2,
        fatalities: record.fatalities,
        country: record.country,
        countryCode: record.iso3,
        region: record.region,
        verified: true,
      },
      raw: record,
    };
  }

  parseToUnrestEvent(record: ACLEDRecord): UnrestEvent {
    const eventType = EVENT_TYPE_MAP[record.event_type] || 'political_violence';

    return {
      id: `acled-${record.event_id_cnty}`,
      source: 'acled',
      sourceId: record.event_id_cnty,
      eventType,
      subEventType: record.sub_event_type,
      location: {
        lat: record.latitude,
        lng: record.longitude,
        precision:
          record.geo_precision === 1
            ? 'exact'
            : record.geo_precision === 2
              ? 'approximate'
              : 'region',
      },
      country: record.country,
      countryCode: record.iso3,
      region: record.region,
      city: record.location,
      actor1: record.actor1
        ? {
            name: record.actor1,
            type: ACTOR_TYPE_MAP[record.inter1] || 'unknown',
            affiliation: record.assoc_actor_1,
          }
        : undefined,
      actor2: record.actor2
        ? {
            name: record.actor2,
            type: ACTOR_TYPE_MAP[record.inter2 || 0] || 'unknown',
            affiliation: record.assoc_actor_2,
          }
        : undefined,
      fatalities: record.fatalities,
      date: new Date(record.event_date),
      notes: record.notes,
      sources: [record.source],
      severity: this.calculateSeverity(record),
      verified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private calculateSeverity(record: ACLEDRecord): UnrestEvent['severity'] {
    if (record.fatalities >= 10) return 'critical';
    if (record.fatalities >= 1) return 'high';
    if (['Battles', 'Violence against civilians'].includes(record.event_type)) return 'medium';
    return 'low';
  }

  private mapSeverityToFeed(
    severity: UnrestEvent['severity']
  ): 'info' | 'low' | 'medium' | 'high' | 'critical' {
    return severity;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  override getDefaultConfig(): Partial<FeedConfig> {
    return {
      ...super.getDefaultConfig(),
      pollInterval: 900000, // 15 minutes (ACLED updates every 24-48 hours, but poll frequently for new data)
      options: {
        sourceType: 'acled',
      },
    };
  }
}

// Export singleton instance
export const acledAdapter = new ACLEDAdapter();
