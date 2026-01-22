/**
 * Civil Unrest Feed Adapter
 *
 * Supports:
 * - ACLED (Armed Conflict Location & Event Data)
 * - GDELT GKG (Global Knowledge Graph) for protest/conflict events
 */

import {
  BaseFeedAdapter,
  type FeedConfig,
  type FeedFilterOptions,
  type FeedFetchResult,
  type NormalizedFeedItem,
  type FeedSeverity,
} from '../adapter.interface';

// ACLED event types
const ACLED_EVENT_TYPES: Record<string, FeedSeverity> = {
  Battles: 'critical',
  'Violence against civilians': 'critical',
  'Explosions/Remote violence': 'critical',
  Riots: 'high',
  Protests: 'medium',
  'Strategic developments': 'low',
};

// ACLED API response
interface ACLEDEvent {
  data_id: number;
  event_date: string;
  year: number;
  event_type: string;
  sub_event_type: string;
  actor1: string;
  actor2: string;
  country: string;
  admin1: string;
  admin2: string;
  admin3: string;
  location: string;
  latitude: string;
  longitude: string;
  fatalities: number;
  notes: string;
  source: string;
  source_scale: string;
  timestamp: string;
}

interface ACLEDResponse {
  status: number;
  success: boolean;
  data: ACLEDEvent[];
  count: number;
}

/**
 * Civil Unrest Feed Adapter
 */
export class CivilUnrestAdapter extends BaseFeedAdapter {
  readonly type = 'civil_unrest' as const;
  readonly name = 'Civil Unrest & Conflict';
  readonly description = 'Conflict events from ACLED and GDELT';
  readonly requiredConfig = ['sourceType'];

  async fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    const options = config.options as Record<string, unknown>;
    const sourceType = options.sourceType as string;

    switch (sourceType) {
      case 'acled':
        return this.fetchACLED(config, filters);
      case 'gdelt':
        return this.fetchGDELTEvents(config, filters);
      default:
        return {
          items: [],
          failedCount: 0,
          errors: [`Unknown source type: ${sourceType}`],
          hasMore: false,
        };
    }
  }

  /**
   * Fetch from ACLED API
   */
  private async fetchACLED(
    config: FeedConfig,
    filters?: FeedFilterOptions
  ): Promise<FeedFetchResult> {
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

    // Build query parameters
    const params = new URLSearchParams();
    params.set('key', apiKey as string);
    params.set('email', email as string);

    // Limit results
    const limit = filters?.limit || 500;
    params.set('limit', String(limit));

    // Country filter
    const countries = configFilters?.countries as string[];
    if (countries?.length) {
      params.set('country', countries.join('|'));
    }

    // Region filter
    const regions = configFilters?.regions as number[];
    if (regions?.length) {
      params.set('region', regions.join('|'));
    }

    // Event type filter
    const eventTypes = filters?.categories || (configFilters?.eventTypes as string[]);
    if (eventTypes?.length) {
      params.set('event_type', eventTypes.join('|'));
    }

    // Date range
    if (filters?.maxAge) {
      const startDate = new Date(Date.now() - filters.maxAge);
      params.set('event_date', `${formatDate(startDate)}|${formatDate(new Date())}`);
      params.set('event_date_where', 'BETWEEN');
    } else {
      // Default to last 30 days
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      params.set('event_date', `${formatDate(startDate)}|${formatDate(new Date())}`);
      params.set('event_date_where', 'BETWEEN');
    }

    // Geographic bounds
    if (filters?.bounds) {
      const { north, south, east, west } = filters.bounds;
      params.set('latitude', `${south}|${north}`);
      params.set('latitude_where', 'BETWEEN');
      params.set('longitude', `${west}|${east}`);
      params.set('longitude_where', 'BETWEEN');
    }

    try {
      const response = await fetch(`https://api.acleddata.com/acled/read?${params.toString()}`);
      const data = (await response.json()) as ACLEDResponse;

      if (!data.success) {
        return {
          items: [],
          failedCount: 0,
          errors: ['ACLED API request failed'],
          hasMore: false,
        };
      }

      const items: NormalizedFeedItem[] = data.data.map((event) => {
        const severity = this.determineACLEDSeverity(event);

        return {
          externalId: `acled:${event.data_id}`,
          type: 'civil_unrest' as const,
          title: this.buildACLEDTitle(event),
          content: event.notes,
          timestamp: new Date(event.event_date),
          location: {
            latitude: parseFloat(event.latitude),
            longitude: parseFloat(event.longitude),
            name: [event.location, event.admin1, event.country].filter(Boolean).join(', '),
          },
          severity,
          metadata: {
            eventType: event.event_type,
            subEventType: event.sub_event_type,
            actor1: event.actor1,
            actor2: event.actor2,
            fatalities: event.fatalities,
            country: event.country,
            admin1: event.admin1,
            admin2: event.admin2,
            source: event.source,
            sourceScale: event.source_scale,
          },
          raw: event,
        };
      });

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

  /**
   * Fetch conflict events from GDELT
   */
  private async fetchGDELTEvents(
    config: FeedConfig,
    filters?: FeedFilterOptions
  ): Promise<FeedFetchResult> {
    const configFilters = config.filters as Record<string, unknown>;

    // GDELT Event query for protest/conflict events
    // Use CAMEO codes for conflict-related events
    const conflictCodes = [
      '14', // Protest
      '145', // Protest violently
      '18', // Assault
      '19', // Fight
      '20', // Engage in mass violence
    ];

    const params = new URLSearchParams();
    params.set('query', `eventcode:${conflictCodes.join(' OR eventcode:')}`);
    params.set('mode', 'artlist');
    params.set('maxrecords', String(filters?.limit || 100));
    params.set('format', 'json');

    // Geographic filter
    if (filters?.bounds) {
      // Note: GDELT doesn't support direct bbox filtering in this endpoint
      // Bounds are available but not used: filters.bounds.north, etc.
      params.set('sourcecountry', 'all'); // Get all countries
    }

    // Country filter from config
    const countries = configFilters?.countries as string[];
    if (countries?.length) {
      params.set('sourcecountry', countries.join(','));
    }

    try {
      const response = await fetch(
        `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`
      );
      const data = (await response.json()) as {
        articles?: {
          url: string;
          title: string;
          seendate: string;
          sourcecountry: string;
          language: string;
          domain: string;
          tone?: number;
        }[];
      };

      if (!data.articles) {
        return {
          items: [],
          failedCount: 0,
          errors: [],
          hasMore: false,
        };
      }

      const items: NormalizedFeedItem[] = data.articles.map((article) => ({
        externalId: `gdelt-event:${Buffer.from(article.url).toString('base64').slice(0, 100)}`,
        type: 'civil_unrest' as const,
        title: article.title,
        url: article.url,
        timestamp: this.parseGDELTDate(article.seendate),
        severity: this.determineGDELTSeverity(article),
        metadata: {
          source: 'GDELT',
          country: article.sourcecountry,
          language: article.language,
          domain: article.domain,
          tone: article.tone,
        },
        raw: article,
      }));

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

  /**
   * Build a title for ACLED event
   */
  private buildACLEDTitle(event: ACLEDEvent): string {
    const parts = [event.event_type];

    if (event.sub_event_type && event.sub_event_type !== event.event_type) {
      parts.push(`(${event.sub_event_type})`);
    }

    parts.push('in', event.location || event.admin1 || event.country);

    if (event.fatalities > 0) {
      parts.push(`- ${event.fatalities} fatalities`);
    }

    return parts.join(' ');
  }

  /**
   * Determine severity for ACLED event
   */
  private determineACLEDSeverity(event: ACLEDEvent): FeedSeverity {
    // Check fatalities first
    if (event.fatalities >= 10) return 'critical';
    if (event.fatalities >= 1) return 'high';

    // Check event type
    const typeSeverity = ACLED_EVENT_TYPES[event.event_type];
    if (typeSeverity) return typeSeverity;

    return 'medium';
  }

  /**
   * Determine severity for GDELT event
   */
  private determineGDELTSeverity(article: { tone?: number; title: string }): FeedSeverity {
    // Use tone score (negative = more conflict)
    if (article.tone !== undefined) {
      if (article.tone < -10) return 'critical';
      if (article.tone < -5) return 'high';
      if (article.tone < 0) return 'medium';
    }

    // Fallback to keyword detection
    return this.determineSeverity(article.title);
  }

  /**
   * Parse GDELT date format
   */
  private parseGDELTDate(dateStr: string): Date {
    if (!dateStr || dateStr.length < 14) {
      return new Date();
    }

    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)) - 1;
    const day = parseInt(dateStr.slice(6, 8));
    const hour = parseInt(dateStr.slice(8, 10));
    const minute = parseInt(dateStr.slice(10, 12));
    const second = parseInt(dateStr.slice(12, 14));

    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  override getDefaultConfig(): Partial<FeedConfig> {
    return {
      ...super.getDefaultConfig(),
      pollInterval: 900000, // 15 minutes
      options: {
        sourceType: 'acled',
      },
    };
  }
}

/**
 * Format date as YYYY-MM-DD for ACLED API
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

// Export singleton instance
export const civilUnrestAdapter = new CivilUnrestAdapter();
