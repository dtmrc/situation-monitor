# Phase 9e: Civil Unrest Layer (ACLED + GDELT)

Parent: [09-REALTIME-DATA-FEEDS.md](./09-REALTIME-DATA-FEEDS.md)

## Overview

This document covers civil unrest data integration combining ACLED (Armed Conflict Location & Event Data) and GDELT (Global Database of Events, Language, and Tone) for comprehensive protest, conflict, and political violence monitoring.

**Tasks Covered:** 9.18, 9.19, 9.20

---

## Data Source Comparison

| Feature | ACLED | GDELT |
|---------|-------|-------|
| **Coverage** | Global conflicts, protests | All global news events |
| **Latency** | 24-48 hours | 15 minutes |
| **Quality** | Human-verified | Automated extraction |
| **Detail** | Rich event coding, actor info | Themes, tone, entities |
| **Access** | API (free with registration) | Public API (free) |
| **Best For** | Verified conflict data | Breaking news, trends |

---

## Civil Unrest Types Schema

**File: `apps/api/src/feeds/types/civil-unrest.types.ts`**
```typescript
export type UnrestEventType =
  | 'protest'
  | 'riot'
  | 'strike'
  | 'political_violence'
  | 'armed_clash'
  | 'mob_violence'
  | 'remote_violence'     // Explosions, airstrikes
  | 'abduction'
  | 'sexual_violence'
  | 'civilian_targeting';

export type ActorType =
  | 'government'
  | 'military'
  | 'police'
  | 'rebel_group'
  | 'political_militia'
  | 'identity_militia'
  | 'protesters'
  | 'rioters'
  | 'civilians'
  | 'external_force'
  | 'unknown';

export interface UnrestEvent {
  id: string;
  source: 'acled' | 'gdelt';
  sourceId: string;

  // Event classification
  eventType: UnrestEventType;
  subEventType?: string;

  // Location
  location: {
    lat: number;
    lng: number;
    precision: 'exact' | 'approximate' | 'region';
  };
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  locationDescription?: string;

  // Actors
  actor1?: {
    name: string;
    type: ActorType;
    affiliation?: string;
  };
  actor2?: {
    name: string;
    type: ActorType;
    affiliation?: string;
  };

  // Impact
  fatalities?: number;
  injuries?: number;
  participants?: number;

  // Context
  date: Date;
  notes?: string;
  sources?: string[];

  // Processing metadata
  severity: 'low' | 'medium' | 'high' | 'critical';
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnrestHotspot {
  id: string;
  center: { lat: number; lng: number };
  radius: number;       // km
  eventCount: number;
  fatalityCount: number;
  dominantType: UnrestEventType;
  countries: string[];
  recentEvents: UnrestEvent[];
  trendDirection: 'increasing' | 'stable' | 'decreasing';
}
```

---

## ACLED Adapter

**File: `apps/api/src/feeds/adapters/unrest/acled.adapter.ts`**
```typescript
import { BaseFeedAdapter, type FeedConfig } from '../../adapter.interface';
import type { NormalizedFeedItem } from '../../../jobs/queues';
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

// ACLED event type mapping
const EVENT_TYPE_MAP: Record<string, UnrestEventType> = {
  'Battles': 'armed_clash',
  'Violence against civilians': 'civilian_targeting',
  'Explosions/Remote violence': 'remote_violence',
  'Riots': 'riot',
  'Protests': 'protest',
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

export class ACLEDAdapter extends BaseFeedAdapter {
  name = 'ACLED Civil Unrest';
  type = 'civil_unrest';

  private apiKey!: string;
  private email!: string;
  private countries?: string[];
  private regions?: string[];
  private lastFetchDate: Date = new Date(Date.now() - 7 * 24 * 3600000); // 7 days ago

  async initialize(config: FeedConfig): Promise<void> {
    await super.initialize(config);
    this.apiKey = config.apiKey!;
    this.email = config.options?.email as string;
    this.countries = config.options?.countries as string[];
    this.regions = config.options?.regions as string[];
  }

  async fetch(): Promise<ACLEDRecord[]> {
    const url = new URL('https://api.acleddata.com/acled/read');

    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('email', this.email);
    url.searchParams.set('event_date', `${this.formatDate(this.lastFetchDate)}|${this.formatDate(new Date())}`);
    url.searchParams.set('event_date_where', 'BETWEEN');
    url.searchParams.set('limit', '5000');

    if (this.countries?.length) {
      url.searchParams.set('country', this.countries.join('|'));
      url.searchParams.set('country_where', 'IN');
    }

    if (this.regions?.length) {
      url.searchParams.set('region', this.regions.join('|'));
      url.searchParams.set('region_where', 'IN');
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`ACLED API error: ${response.statusText}`);
    }

    const data = await response.json();
    this.lastFetchDate = new Date();

    return data.data || [];
  }

  normalize(record: ACLEDRecord): NormalizedFeedItem {
    const event = this.parseToUnrestEvent(record);

    return {
      id: `acled-${record.event_id_cnty}`,
      type: 'event',
      title: `${record.event_type} in ${record.location}, ${record.country}`,
      content: record.notes,
      timestamp: new Date(record.event_date),
      location: {
        lat: record.latitude,
        lng: record.longitude,
        name: `${record.location}, ${record.country}`,
      },
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
        severity: event.severity,
        verified: true,
      },
      raw: record,
    };
  }

  private parseToUnrestEvent(record: ACLEDRecord): UnrestEvent {
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
        precision: record.geo_precision === 1 ? 'exact' : record.geo_precision === 2 ? 'approximate' : 'region',
      },
      country: record.country,
      countryCode: record.iso3,
      region: record.region,
      city: record.location,
      actor1: record.actor1 ? {
        name: record.actor1,
        type: ACTOR_TYPE_MAP[record.inter1] || 'unknown',
        affiliation: record.assoc_actor_1,
      } : undefined,
      actor2: record.actor2 ? {
        name: record.actor2,
        type: ACTOR_TYPE_MAP[record.inter2 || 0] || 'unknown',
        affiliation: record.assoc_actor_2,
      } : undefined,
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

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
```

---

## GDELT Events Adapter

**File: `apps/api/src/feeds/adapters/unrest/gdelt-events.adapter.ts`**
```typescript
import { BaseFeedAdapter, type FeedConfig } from '../../adapter.interface';
import type { NormalizedFeedItem } from '../../../jobs/queues';
import type { UnrestEvent, UnrestEventType } from '../../types/civil-unrest.types';

// GDELT CAMEO event codes for civil unrest
const UNREST_CAMEO_CODES: Record<string, UnrestEventType> = {
  '140': 'protest',        // Engage in political dissent
  '141': 'protest',        // Demonstrate or rally
  '1411': 'protest',       // Demonstrate for leadership change
  '1412': 'protest',       // Demonstrate for policy change
  '1413': 'protest',       // Demonstrate for human rights
  '1414': 'protest',       // Demonstrate for economic rights
  '145': 'riot',           // Protest violently
  '170': 'political_violence', // Coerce
  '171': 'abduction',      // Seize/Kidnap
  '175': 'political_violence', // Impose administrative sanctions
  '180': 'armed_clash',    // Use unconventional violence
  '190': 'armed_clash',    // Use conventional force
  '200': 'armed_clash',    // Use force
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

export class GDELTEventsAdapter extends BaseFeedAdapter {
  name = 'GDELT Events';
  type = 'civil_unrest';

  private lastUpdateTime: Date = new Date(Date.now() - 15 * 60000); // 15 min ago

  async fetch(): Promise<GDELTEventRecord[]> {
    // GDELT updates every 15 minutes
    const lastUpdateUrl = 'http://data.gdeltproject.org/gdeltv2/lastupdate.txt';
    const response = await fetch(lastUpdateUrl);
    const lastUpdateText = await response.text();

    // Parse the events export URL
    const eventsLine = lastUpdateText.split('\n').find(line => line.includes('.export.'));
    if (!eventsLine) return [];

    const eventsUrl = eventsLine.split(' ')[2];

    // Fetch and parse events
    const events = await this.fetchAndParseEvents(eventsUrl);

    // Filter to civil unrest events only
    return events.filter(event =>
      Object.keys(UNREST_CAMEO_CODES).some(code =>
        event.EventCode.startsWith(code) || event.EventBaseCode.startsWith(code)
      )
    );
  }

  private async fetchAndParseEvents(url: string): Promise<GDELTEventRecord[]> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    // Decompress gzip
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(new Uint8Array(buffer));
    writer.close();

    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
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

  normalize(record: GDELTEventRecord): NormalizedFeedItem {
    const eventType = this.mapEventType(record.EventCode, record.EventBaseCode);

    return {
      id: `gdelt-${record.GLOBALEVENTID}`,
      type: 'event',
      title: this.generateTitle(record),
      content: `Event involving ${record.Actor1Name || 'Unknown'} in ${record.Actor1Geo_FullName}`,
      timestamp: this.parseGDELTDate(record.SQLDATE),
      location: {
        lat: record.Actor1Geo_Lat,
        lng: record.Actor1Geo_Long,
        name: record.Actor1Geo_FullName,
      },
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
        sourceUrl: record.SOURCEURL,
        verified: false,
        severity: this.calculateSeverity(record),
      },
      raw: record,
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
    return `${eventType.charAt(0).toUpperCase() + eventType.slice(1).replace('_', ' ')} reported in ${location}`;
  }

  private parseGDELTDate(sqlDate: string): Date {
    const year = sqlDate.slice(0, 4);
    const month = sqlDate.slice(4, 6);
    const day = sqlDate.slice(6, 8);
    return new Date(`${year}-${month}-${day}`);
  }

  private calculateSeverity(record: GDELTEventRecord): UnrestEvent['severity'] {
    const goldstein = Math.abs(record.GoldsteinScale);
    if (goldstein >= 8) return 'critical';
    if (goldstein >= 5) return 'high';
    if (goldstein >= 2) return 'medium';
    return 'low';
  }
}
```

---

## Civil Unrest Clustering Service

**File: `apps/api/src/feeds/services/civil-unrest-aggregator.ts`**
```typescript
import type { UnrestEvent, UnrestHotspot, UnrestEventType } from '../types/civil-unrest.types';

interface AggregatedUnrestData {
  events: UnrestEvent[];
  hotspots: UnrestHotspot[];
  statistics: {
    total: number;
    last24h: number;
    last7d: number;
    byType: Record<string, number>;
    byCountry: Record<string, number>;
    totalFatalities: number;
  };
}

export class CivilUnrestAggregator {
  /**
   * Aggregate events from multiple sources and identify hotspots
   */
  aggregateEvents(events: UnrestEvent[]): AggregatedUnrestData {
    // Deduplicate events
    const deduped = this.deduplicateEvents(events);

    // Identify hotspots using DBSCAN-like clustering
    const hotspots = this.identifyHotspots(deduped);

    // Calculate statistics
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const statistics = {
      total: deduped.length,
      last24h: deduped.filter(e => e.date >= oneDayAgo).length,
      last7d: deduped.filter(e => e.date >= sevenDaysAgo).length,
      byType: this.countByField(deduped, 'eventType'),
      byCountry: this.countByField(deduped, 'country'),
      totalFatalities: deduped.reduce((sum, e) => sum + (e.fatalities || 0), 0),
    };

    return { events: deduped, hotspots, statistics };
  }

  /**
   * Deduplicate events from ACLED and GDELT
   * Prefer ACLED (verified) over GDELT (automated)
   */
  private deduplicateEvents(events: UnrestEvent[]): UnrestEvent[] {
    const eventMap = new Map<string, UnrestEvent>();

    // Sort by source (ACLED first) then by date
    const sorted = [...events].sort((a, b) => {
      if (a.source !== b.source) return a.source === 'acled' ? -1 : 1;
      return b.date.getTime() - a.date.getTime();
    });

    for (const event of sorted) {
      // Create deduplication key based on location + date + type
      const dateKey = event.date.toISOString().split('T')[0];
      const locationKey = `${event.location.lat.toFixed(2)}_${event.location.lng.toFixed(2)}`;
      const key = `${dateKey}_${locationKey}_${event.eventType}`;

      // Keep first occurrence (ACLED preferred)
      if (!eventMap.has(key)) {
        eventMap.set(key, event);
      }
    }

    return Array.from(eventMap.values());
  }

  /**
   * Identify geographic hotspots using spatial clustering
   */
  private identifyHotspots(events: UnrestEvent[]): UnrestHotspot[] {
    const CLUSTER_RADIUS_KM = 50;
    const MIN_EVENTS_FOR_HOTSPOT = 3;

    const hotspots: UnrestHotspot[] = [];
    const used = new Set<string>();

    for (const event of events) {
      if (used.has(event.id)) continue;

      // Find all events within radius
      const cluster = events.filter(other => {
        if (used.has(other.id)) return false;
        const distance = this.haversineDistance(event.location, other.location);
        return distance <= CLUSTER_RADIUS_KM;
      });

      if (cluster.length >= MIN_EVENTS_FOR_HOTSPOT) {
        // Mark all as used
        cluster.forEach(e => used.add(e.id));

        // Calculate cluster center
        const center = this.calculateCenter(cluster);

        // Determine dominant event type
        const typeCounts = this.countByField(cluster, 'eventType');
        const dominantType = Object.entries(typeCounts)
          .sort((a, b) => b[1] - a[1])[0][0] as UnrestEventType;

        // Get unique countries
        const countries = [...new Set(cluster.map(e => e.country))];

        hotspots.push({
          id: `hotspot-${center.lat.toFixed(4)}-${center.lng.toFixed(4)}`,
          center,
          radius: CLUSTER_RADIUS_KM,
          eventCount: cluster.length,
          fatalityCount: cluster.reduce((sum, e) => sum + (e.fatalities || 0), 0),
          dominantType,
          countries,
          recentEvents: cluster.slice(0, 5),
          trendDirection: 'stable', // Would need historical data
        });
      }
    }

    return hotspots.sort((a, b) => b.eventCount - a.eventCount);
  }

  private calculateCenter(events: UnrestEvent[]): { lat: number; lng: number } {
    const sum = events.reduce(
      (acc, e) => ({
        lat: acc.lat + e.location.lat,
        lng: acc.lng + e.location.lng,
      }),
      { lat: 0, lng: 0 }
    );

    return {
      lat: sum.lat / events.length,
      lng: sum.lng / events.length,
    };
  }

  private haversineDistance(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;

    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  private countByField<T extends Record<string, any>>(
    items: T[],
    field: keyof T
  ): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = String(item[field]);
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
```

---

## Civil Unrest Map Layer

**File: `apps/web/src/features/map/layers/CivilUnrestLayer.tsx`**
```tsx
import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl';
import { useQuery } from '@tanstack/react-query';
import { fetchCivilUnrestData } from '@/lib/api/feeds';
import type { FeatureCollection, Point } from 'geojson';

interface CivilUnrestLayerProps {
  projectId: string;
  visible: boolean;
  eventTypeFilter?: string[];
  severityFilter?: string[];
  showHotspots?: boolean;
}

const SEVERITY_COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

const EVENT_TYPE_ICONS = {
  protest: 'protest-icon',
  riot: 'riot-icon',
  armed_clash: 'conflict-icon',
  political_violence: 'violence-icon',
};

export function CivilUnrestLayer({
  projectId,
  visible,
  eventTypeFilter,
  severityFilter,
  showHotspots = true,
}: CivilUnrestLayerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['civil-unrest', projectId, eventTypeFilter],
    queryFn: () => fetchCivilUnrestData(projectId, { eventTypes: eventTypeFilter }),
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    enabled: visible,
  });

  // Events GeoJSON
  const eventsGeoJSON = useMemo((): FeatureCollection<Point> | null => {
    if (!data?.events) return null;

    let events = data.events;

    if (severityFilter?.length) {
      events = events.filter((e: any) => severityFilter.includes(e.severity));
    }

    return {
      type: 'FeatureCollection',
      features: events.map((event: any) => ({
        type: 'Feature',
        id: event.id,
        geometry: {
          type: 'Point',
          coordinates: [event.location.lng, event.location.lat],
        },
        properties: {
          id: event.id,
          eventType: event.eventType,
          severity: event.severity,
          fatalities: event.fatalities || 0,
          country: event.country,
          city: event.city,
          date: event.date,
          verified: event.verified,
        },
      })),
    };
  }, [data?.events, severityFilter]);

  // Hotspots GeoJSON
  const hotspotsGeoJSON = useMemo((): FeatureCollection<Point> | null => {
    if (!data?.hotspots || !showHotspots) return null;

    return {
      type: 'FeatureCollection',
      features: data.hotspots.map((hotspot: any) => ({
        type: 'Feature',
        id: hotspot.id,
        geometry: {
          type: 'Point',
          coordinates: [hotspot.center.lng, hotspot.center.lat],
        },
        properties: {
          id: hotspot.id,
          eventCount: hotspot.eventCount,
          fatalityCount: hotspot.fatalityCount,
          dominantType: hotspot.dominantType,
          radius: hotspot.radius,
        },
      })),
    };
  }, [data?.hotspots, showHotspots]);

  if (!visible || isLoading) return null;

  return (
    <>
      {/* Hotspot circles (background) */}
      {hotspotsGeoJSON && (
        <Source id="unrest-hotspots" type="geojson" data={hotspotsGeoJSON}>
          <Layer
            id="unrest-hotspots-circle"
            type="circle"
            paint={{
              'circle-radius': [
                'interpolate', ['linear'], ['get', 'eventCount'],
                3, 30,
                10, 50,
                50, 80,
              ],
              'circle-color': 'rgba(239, 68, 68, 0.15)',
              'circle-stroke-color': 'rgba(239, 68, 68, 0.4)',
              'circle-stroke-width': 2,
            }}
          />
        </Source>
      )}

      {/* Event markers */}
      {eventsGeoJSON && (
        <Source id="unrest-events" type="geojson" data={eventsGeoJSON}>
          {/* Severity-based circles */}
          <Layer
            id="unrest-events-circles"
            type="circle"
            paint={{
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                5, 5,
                10, 8,
                15, 12,
              ],
              'circle-color': [
                'match', ['get', 'severity'],
                'critical', SEVERITY_COLORS.critical,
                'high', SEVERITY_COLORS.high,
                'medium', SEVERITY_COLORS.medium,
                SEVERITY_COLORS.low,
              ],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': [
                'case',
                ['get', 'verified'], 2,
                1,
              ],
              'circle-opacity': [
                'case',
                ['get', 'verified'], 1,
                0.7,
              ],
            }}
          />

          {/* Fatality indicator (skull icon or size increase) */}
          <Layer
            id="unrest-events-fatality"
            type="circle"
            filter={['>', ['get', 'fatalities'], 0]}
            paint={{
              'circle-radius': [
                '+',
                ['interpolate', ['linear'], ['zoom'], 5, 5, 10, 8, 15, 12],
                ['min', ['get', 'fatalities'], 5],
              ],
              'circle-color': 'transparent',
              'circle-stroke-color': '#000000',
              'circle-stroke-width': 1,
            }}
          />

          {/* Labels at high zoom */}
          <Layer
            id="unrest-events-labels"
            type="symbol"
            minzoom={10}
            layout={{
              'text-field': ['get', 'city'],
              'text-size': 10,
              'text-offset': [0, 1.5],
              'text-anchor': 'top',
            }}
            paint={{
              'text-color': '#ffffff',
              'text-halo-color': '#000000',
              'text-halo-width': 1,
            }}
          />
        </Source>
      )}
    </>
  );
}
```

---

## Civil Unrest Analytics Panel

**File: `apps/web/src/features/feeds/panels/CivilUnrestAnalyticsPanel.tsx`**
```tsx
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { fetchCivilUnrestData } from '@/lib/api/feeds';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface CivilUnrestAnalyticsPanelProps {
  projectId: string;
  className?: string;
}

const SEVERITY_COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

const EVENT_TYPE_COLORS = {
  protest: '#3b82f6',
  riot: '#f97316',
  strike: '#8b5cf6',
  political_violence: '#ef4444',
  armed_clash: '#dc2626',
  mob_violence: '#f59e0b',
  remote_violence: '#6366f1',
  abduction: '#ec4899',
  sexual_violence: '#db2777',
  civilian_targeting: '#be123c',
};

export function CivilUnrestAnalyticsPanel({
  projectId,
  className,
}: CivilUnrestAnalyticsPanelProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['civil-unrest-analytics', projectId],
    queryFn: () => fetchCivilUnrestData(projectId, {}),
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  // Prepare chart data
  const eventTypeData = useMemo(() => {
    if (!data?.statistics?.byType) return [];
    return Object.entries(data.statistics.byType)
      .map(([type, count]) => ({
        name: type.replace(/_/g, ' '),
        value: count as number,
        fill: EVENT_TYPE_COLORS[type as keyof typeof EVENT_TYPE_COLORS] || '#6b7280',
      }))
      .sort((a, b) => b.value - a.value);
  }, [data?.statistics?.byType]);

  const countryData = useMemo(() => {
    if (!data?.statistics?.byCountry) return [];
    return Object.entries(data.statistics.byCountry)
      .map(([country, count]) => ({
        name: country,
        events: count as number,
      }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 10);
  }, [data?.statistics?.byCountry]);

  const severityData = useMemo(() => {
    if (!data?.events) return [];
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };
    data.events.forEach((e: any) => {
      if (e.severity in counts) {
        counts[e.severity as keyof typeof counts]++;
      }
    });
    return Object.entries(counts).map(([severity, count]) => ({
      name: severity,
      value: count,
      fill: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS],
    }));
  }, [data?.events]);

  if (isLoading) {
    return (
      <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
        <CardContent className="pt-6">
          <p className="text-red-400 text-sm">Failed to load civil unrest data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
      <CardHeader>
        <CardTitle className="text-green-400 font-mono">
          Civil Unrest Analytics
        </CardTitle>
        <CardDescription>
          ACLED + GDELT combined intelligence
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Total Events</p>
            <p className="text-2xl font-mono text-white">{data?.statistics?.total || 0}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Last 24h</p>
            <p className="text-2xl font-mono text-amber-400">{data?.statistics?.last24h || 0}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Last 7d</p>
            <p className="text-2xl font-mono text-blue-400">{data?.statistics?.last7d || 0}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Fatalities</p>
            <p className="text-2xl font-mono text-red-400">{data?.statistics?.totalFatalities || 0}</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-zinc-800/50 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="events">Recent Events</TabsTrigger>
            <TabsTrigger value="hotspots">Hotspots</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-2 gap-6">
              {/* Event Types Pie Chart */}
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">By Event Type</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={eventTypeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {eventTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          border: '1px solid #3f3f46',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Countries Bar Chart */}
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">Top Countries</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={countryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                      <XAxis type="number" stroke="#71717a" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={80}
                        stroke="#71717a"
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          border: '1px solid #3f3f46',
                        }}
                      />
                      <Bar dataKey="events" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Severity Distribution */}
              <div className="col-span-2">
                <h4 className="text-sm font-medium text-zinc-400 mb-2">Severity Distribution</h4>
                <div className="flex gap-2">
                  {severityData.map((item) => (
                    <div
                      key={item.name}
                      className="flex-1 rounded-lg p-3 text-center"
                      style={{ backgroundColor: `${item.fill}20` }}
                    >
                      <p className="text-xs uppercase tracking-wider" style={{ color: item.fill }}>
                        {item.name}
                      </p>
                      <p className="text-xl font-mono text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="events">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {data?.events?.slice(0, 20).map((event: any) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                      style={{
                        backgroundColor: SEVERITY_COLORS[event.severity as keyof typeof SEVERITY_COLORS],
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {event.eventType.replace(/_/g, ' ')} in {event.city || event.country}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>{formatDistanceToNow(new Date(event.date), { addSuffix: true })}</span>
                        {event.fatalities > 0 && (
                          <span className="text-red-400">{event.fatalities} fatalities</span>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] py-0',
                            event.verified ? 'border-green-600 text-green-400' : 'border-zinc-600 text-zinc-400'
                          )}
                        >
                          {event.source.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="hotspots">
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {data?.hotspots?.map((hotspot: any) => (
                  <div
                    key={hotspot.id}
                    className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">
                        {hotspot.countries.join(', ')}
                      </h4>
                      <Badge
                        className={cn(
                          'text-xs',
                          hotspot.trendDirection === 'increasing'
                            ? 'bg-red-500/20 text-red-400'
                            : hotspot.trendDirection === 'decreasing'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-zinc-500/20 text-zinc-400'
                        )}
                      >
                        {hotspot.trendDirection}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-zinc-500 text-xs">Events</p>
                        <p className="text-white font-mono">{hotspot.eventCount}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs">Fatalities</p>
                        <p className="text-red-400 font-mono">{hotspot.fatalityCount}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs">Dominant Type</p>
                        <p className="text-blue-400 text-xs truncate">
                          {hotspot.dominantType.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/feeds/types/civil-unrest.types.ts` | Civil unrest type definitions |
| `apps/api/src/feeds/adapters/unrest/acled.adapter.ts` | ACLED adapter |
| `apps/api/src/feeds/adapters/unrest/gdelt-events.adapter.ts` | GDELT events adapter |
| `apps/api/src/feeds/services/civil-unrest-aggregator.ts` | Aggregation and hotspot detection |
| `apps/web/src/features/map/layers/CivilUnrestLayer.tsx` | Map visualization layer |
| `apps/web/src/features/feeds/panels/CivilUnrestAnalyticsPanel.tsx` | Analytics dashboard panel |

---

## Acceptance Criteria

- [ ] ACLED adapter fetches events with proper filtering
- [ ] GDELT adapter extracts civil unrest events from CAMEO codes
- [ ] Events deduplicate correctly (ACLED preferred)
- [ ] Hotspot clustering identifies geographic concentrations
- [ ] Map layer displays events with severity-based styling
- [ ] Verified events (ACLED) visually distinct from unverified (GDELT)
- [ ] Fatality counts reflected in marker size
- [ ] Hotspot circles show at appropriate zoom levels

---

## Environment Variables

```bash
# ACLED API
ACLED_API_KEY=your_api_key
ACLED_EMAIL=your_registered_email
```
