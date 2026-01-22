/**
 * NRC (Nuclear Regulatory Commission) Adapter
 *
 * Fetches nuclear facility event reports from NRC's public feeds.
 * Produces RawIncident[] for infrastructure correlation with confidence 1.0 (official source).
 */

import { v4 as uuidv4 } from 'uuid';

import { db } from '../../../db';
import { nrcEvents, type NewNRCEvent } from '../../../db/schema/infrastructure';
import {
  BaseFeedAdapter,
  type FeedConfig,
  type FeedFilterOptions,
  type FeedFetchResult,
  type NormalizedFeedItem,
  type FeedSeverity,
} from '../../adapter.interface';
import type { RawIncident, IncidentSeverity } from '../../types/critical-infrastructure.types';

// Known NRC nuclear facility locations (subset for demonstration)
const NUCLEAR_FACILITIES: Record<
  string,
  { lat: number; lng: number; state: string; region: string }
> = {
  'Browns Ferry': { lat: 34.7042, lng: -87.1186, state: 'AL', region: 'II' },
  Vogtle: { lat: 33.1417, lng: -81.7611, state: 'GA', region: 'II' },
  'Palo Verde': { lat: 33.3886, lng: -112.8617, state: 'AZ', region: 'IV' },
  'South Texas': { lat: 28.7958, lng: -96.0481, state: 'TX', region: 'IV' },
  Diablo: { lat: 35.2117, lng: -120.8542, state: 'CA', region: 'IV' },
  'San Onofre': { lat: 33.3683, lng: -117.5567, state: 'CA', region: 'IV' },
  Comanche: { lat: 32.2983, lng: -97.7861, state: 'TX', region: 'IV' },
  'Grand Gulf': { lat: 32.0058, lng: -91.0478, state: 'MS', region: 'IV' },
  Waterford: { lat: 29.9958, lng: -90.4711, state: 'LA', region: 'IV' },
  'River Bend': { lat: 30.7567, lng: -91.3319, state: 'LA', region: 'IV' },
  'Cooper Nuclear': { lat: 40.3617, lng: -95.6411, state: 'NE', region: 'IV' },
  'Wolf Creek': { lat: 38.2392, lng: -95.6889, state: 'KS', region: 'IV' },
  'Callaway Plant': { lat: 38.7617, lng: -91.7811, state: 'MO', region: 'IV' },
  'Arkansas Nuclear': { lat: 35.31, lng: -93.2311, state: 'AR', region: 'IV' },
  'Crystal River': { lat: 28.9569, lng: -82.6981, state: 'FL', region: 'II' },
  'Turkey Point': { lat: 25.4353, lng: -80.3308, state: 'FL', region: 'II' },
  'St. Lucie': { lat: 27.3486, lng: -80.2464, state: 'FL', region: 'II' },
  'Sequoyah Nuclear': { lat: 35.2256, lng: -85.0878, state: 'TN', region: 'II' },
  'Watts Bar': { lat: 35.6019, lng: -84.7914, state: 'TN', region: 'II' },
  'Brunswick Nuclear': { lat: 33.9583, lng: -78.0106, state: 'NC', region: 'II' },
  'Harris Nuclear': { lat: 35.6336, lng: -78.9558, state: 'NC', region: 'II' },
  McGuire: { lat: 35.4322, lng: -80.9486, state: 'NC', region: 'II' },
  Catawba: { lat: 35.0506, lng: -81.0692, state: 'SC', region: 'II' },
  Robinson: { lat: 34.4017, lng: -80.1581, state: 'SC', region: 'II' },
  Summer: { lat: 34.2958, lng: -81.3175, state: 'SC', region: 'II' },
  Farley: { lat: 31.2228, lng: -85.1078, state: 'AL', region: 'II' },
  Hatch: { lat: 31.9339, lng: -82.3444, state: 'GA', region: 'II' },
  'North Anna': { lat: 38.0608, lng: -77.7906, state: 'VA', region: 'II' },
  Surry: { lat: 37.1653, lng: -76.6978, state: 'VA', region: 'II' },
  'Millstone Nuclear': { lat: 41.3086, lng: -72.1683, state: 'CT', region: 'I' },
  'Indian Point': { lat: 41.2697, lng: -73.9522, state: 'NY', region: 'I' },
  FitzPatrick: { lat: 43.5228, lng: -76.3981, state: 'NY', region: 'I' },
  Ginna: { lat: 43.2781, lng: -77.3092, state: 'NY', region: 'I' },
  'Nine Mile Point': { lat: 43.5219, lng: -76.41, state: 'NY', region: 'I' },
  Limerick: { lat: 40.2239, lng: -75.5861, state: 'PA', region: 'I' },
  'Peach Bottom': { lat: 39.7589, lng: -76.2689, state: 'PA', region: 'I' },
  'Susquehanna Steam': { lat: 41.0922, lng: -76.1464, state: 'PA', region: 'I' },
  'Three Mile Island': { lat: 40.1531, lng: -76.7261, state: 'PA', region: 'I' },
  'Beaver Valley': { lat: 40.6219, lng: -80.4336, state: 'PA', region: 'I' },
  'Calvert Cliffs': { lat: 38.4344, lng: -76.4417, state: 'MD', region: 'I' },
  'Salem Nuclear': { lat: 39.4628, lng: -75.5361, state: 'NJ', region: 'I' },
  'Hope Creek': { lat: 39.4672, lng: -75.5336, state: 'NJ', region: 'I' },
  'Oyster Creek': { lat: 39.8144, lng: -74.2064, state: 'NJ', region: 'I' },
  Pilgrim: { lat: 41.9444, lng: -70.5786, state: 'MA', region: 'I' },
  Seabrook: { lat: 42.8972, lng: -70.8489, state: 'NH', region: 'I' },
  'Vermont Yankee': { lat: 42.7803, lng: -72.5147, state: 'VT', region: 'I' },
  Davis: { lat: 41.5972, lng: -83.0864, state: 'OH', region: 'III' },
  Perry: { lat: 41.8011, lng: -81.1444, state: 'OH', region: 'III' },
  'D.C. Cook': { lat: 41.9753, lng: -86.5653, state: 'MI', region: 'III' },
  Fermi: { lat: 41.9633, lng: -83.2575, state: 'MI', region: 'III' },
  Palisades: { lat: 42.3225, lng: -86.3156, state: 'MI', region: 'III' },
  Clinton: { lat: 40.1722, lng: -88.8344, state: 'IL', region: 'III' },
  'Braidwood Nuclear': { lat: 41.2458, lng: -88.2278, state: 'IL', region: 'III' },
  'Byron Nuclear': { lat: 42.0756, lng: -89.2822, state: 'IL', region: 'III' },
  Dresden: { lat: 41.3897, lng: -88.2714, state: 'IL', region: 'III' },
  LaSalle: { lat: 41.2439, lng: -88.6706, state: 'IL', region: 'III' },
  Quad: { lat: 41.7261, lng: -90.3386, state: 'IL', region: 'III' },
  'Duane Arnold': { lat: 42.1014, lng: -91.7772, state: 'IA', region: 'III' },
  'Prairie Island': { lat: 44.6219, lng: -92.6336, state: 'MN', region: 'III' },
  Monticello: { lat: 45.3336, lng: -93.8486, state: 'MN', region: 'III' },
  Kewaunee: { lat: 44.3431, lng: -87.5364, state: 'WI', region: 'III' },
  'Point Beach': { lat: 44.2811, lng: -87.5372, state: 'WI', region: 'III' },
  Columbia: { lat: 46.4711, lng: -119.3333, state: 'WA', region: 'IV' },
};

/**
 * Parse NRC RSS/Atom XML feed
 */
function parseNRCFeed(xmlText: string): Array<{
  eventNumber: string;
  title: string;
  description: string;
  facilityName: string;
  eventDate: Date;
  link?: string;
}> {
  const events: Array<{
    eventNumber: string;
    title: string;
    description: string;
    facilityName: string;
    eventDate: Date;
    link?: string;
  }> = [];

  // Simple XML parsing for RSS items
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];

    const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemContent);
    const descMatch = /<description>([\s\S]*?)<\/description>/.exec(itemContent);
    const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemContent);
    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemContent);

    if (titleMatch && descMatch) {
      const title = decodeHtmlEntities(titleMatch[1].trim());
      const description = decodeHtmlEntities(descMatch[1].trim());

      // Extract event number from title (e.g., "EN 56789: ...")
      const eventNumMatch = /EN\s*(\d+)/i.exec(title);
      const eventNumber = eventNumMatch ? eventNumMatch[1] : uuidv4().slice(0, 8);

      // Try to extract facility name from title
      let facilityName = 'Unknown Facility';
      for (const name of Object.keys(NUCLEAR_FACILITIES)) {
        if (title.toLowerCase().includes(name.toLowerCase())) {
          facilityName = name;
          break;
        }
      }

      // Parse date
      let eventDate = new Date();
      if (pubDateMatch) {
        const parsed = new Date(pubDateMatch[1].trim());
        if (!isNaN(parsed.getTime())) {
          eventDate = parsed;
        }
      }

      events.push({
        eventNumber,
        title,
        description,
        facilityName,
        eventDate,
        link: linkMatch ? linkMatch[1].trim() : undefined,
      });
    }
  }

  return events;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

/**
 * Determine severity from NRC event description
 */
function determineSeverity(title: string, description: string): IncidentSeverity {
  const text = `${title} ${description}`.toLowerCase();

  // Catastrophic indicators
  if (
    text.includes('meltdown') ||
    text.includes('core damage') ||
    text.includes('radiation release') ||
    text.includes('site area emergency') ||
    text.includes('general emergency')
  ) {
    return 'catastrophic';
  }

  // Severe indicators
  if (
    text.includes('emergency') ||
    text.includes('unusual event') ||
    text.includes('alert') ||
    text.includes('scram') ||
    text.includes('reactor trip')
  ) {
    return 'severe';
  }

  // Significant indicators
  if (
    text.includes('violation') ||
    text.includes('safety system') ||
    text.includes('loss of') ||
    text.includes('failure')
  ) {
    return 'significant';
  }

  // Moderate indicators
  if (text.includes('deviation') || text.includes('condition') || text.includes('inspection')) {
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
 * NRC Events Feed Adapter
 */
export class NRCAdapter extends BaseFeedAdapter {
  readonly type = 'infrastructure' as const;
  readonly name = 'NRC Nuclear Events';
  readonly description = 'Nuclear Regulatory Commission event notifications and reports';
  readonly requiredConfig = [];

  // NRC Event Reports RSS Feed URL
  private readonly NRC_FEED_URL =
    'https://www.nrc.gov/reading-rm/doc-collections/event-status/event/en.rss';

  async fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    try {
      const response = await fetch(this.NRC_FEED_URL, {
        headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
      });

      if (!response.ok) {
        throw new Error(`NRC API error: ${response.status}`);
      }

      const xmlText = await response.text();
      const events = parseNRCFeed(xmlText);

      const { items, rawIncidents, storedEvents } = this.processEvents(events, filters);

      // Store NRC events
      if (storedEvents.length > 0) {
        await this.storeNRCEvents(storedEvents);
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
        errors: [error instanceof Error ? error.message : 'NRC fetch failed'],
        hasMore: false,
      };
    }
  }

  private processEvents(
    events: Array<{
      eventNumber: string;
      title: string;
      description: string;
      facilityName: string;
      eventDate: Date;
      link?: string;
    }>,
    filters?: FeedFilterOptions
  ): {
    items: NormalizedFeedItem[];
    rawIncidents: RawIncident[];
    storedEvents: NewNRCEvent[];
  } {
    const items: NormalizedFeedItem[] = [];
    const rawIncidents: RawIncident[] = [];
    const storedEvents: NewNRCEvent[] = [];

    for (const event of events) {
      // Apply age filter
      if (filters?.maxAge) {
        const age = Date.now() - event.eventDate.getTime();
        if (age > filters.maxAge) continue;
      }

      const facility = NUCLEAR_FACILITIES[event.facilityName];
      const severity = determineSeverity(event.title, event.description);
      const feedSeverity = toFeedSeverity(severity);

      // Apply severity filter
      if (filters?.minSeverity) {
        const severityOrder: FeedSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];
        if (severityOrder.indexOf(feedSeverity) < severityOrder.indexOf(filters.minSeverity)) {
          continue;
        }
      }

      const externalId = `nrc:${event.eventNumber}`;

      // Normalized feed item
      items.push({
        externalId,
        type: 'infrastructure',
        title: event.title,
        content: event.description,
        url: event.link,
        timestamp: event.eventDate,
        location: facility
          ? {
              latitude: facility.lat,
              longitude: facility.lng,
              name: event.facilityName,
            }
          : undefined,
        severity: feedSeverity,
        metadata: {
          eventNumber: event.eventNumber,
          facilityName: event.facilityName,
          region: facility?.region,
          state: facility?.state,
          source: 'nrc',
        },
      });

      // Raw incident for correlation (only if we have location)
      if (facility) {
        rawIncidents.push({
          sourceId: externalId,
          source: 'nrc_report',
          latitude: facility.lat,
          longitude: facility.lng,
          title: event.title,
          description: event.description,
          incidentType: 'equipment_failure', // Most NRC events are equipment-related
          reportedSeverity: severity,
          timestamp: event.eventDate,
          confidence: 1.0, // Official government source
          metadata: {
            eventNumber: event.eventNumber,
            facilityName: event.facilityName,
            region: facility.region,
            state: facility.state,
          },
        });
      }

      // NRC event record for storage
      storedEvents.push({
        id: uuidv4(),
        eventNumber: event.eventNumber,
        facilityName: event.facilityName,
        region: facility?.region || null,
        state: facility?.state || null,
        latitude: facility?.lat || null,
        longitude: facility?.lng || null,
        title: event.title,
        description: event.description,
        eventType: 'event_notification',
        significance: severity,
        eventDate: event.eventDate,
        reportDate: new Date(),
        processed: false,
        rawData: { link: event.link },
        createdAt: new Date(),
      });
    }

    // Sort by date (most recent first)
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    const limited = filters?.limit ? items.slice(0, filters.limit) : items;
    const limitedIncidents = filters?.limit ? rawIncidents.slice(0, filters.limit) : rawIncidents;

    return {
      items: limited,
      rawIncidents: limitedIncidents,
      storedEvents,
    };
  }

  private async storeNRCEvents(events: NewNRCEvent[]): Promise<void> {
    const BATCH_SIZE = 50;

    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);
      try {
        await db.insert(nrcEvents).values(batch);
      } catch (error) {
        console.error('[NRC] Failed to store events:', error);
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
      pollInterval: 900000, // 15 minutes
      options: {},
    };
  }
}

// Export singleton instance
export const nrcAdapter = new NRCAdapter();
