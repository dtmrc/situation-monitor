# Phase 9f: Infrastructure Fire Layer (NASA FIRMS)

Parent: [09-REALTIME-DATA-FEEDS.md](./09-REALTIME-DATA-FEEDS.md)

## Overview

This document covers satellite-based fire detection using NASA FIRMS (Fire Information for Resource Management System) data, cross-referenced with a facility database to identify fires at critical infrastructure locations. The system ingests near-real-time satellite fire detections from VIIRS and MODIS sensors, matches them against known facility locations, and alerts on potential infrastructure fires with severity assessment.

**Tasks Covered:** 9.21, 9.22

---

## Fire Detection Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE FIRE DETECTION PIPELINE                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SATELLITE DATA SOURCES                                                      │
│  ──────────────────────                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │  VIIRS SNPP  │  │ VIIRS NOAA20 │  │    MODIS     │                       │
│  │   (375m)     │  │    (375m)    │  │    (1km)     │                       │
│  │  Suomi NPP   │  │   NOAA-20    │  │  Terra/Aqua  │                       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                       │
│         │                 │                 │                                │
│         └─────────────────┴─────────────────┘                                │
│                           │                                                  │
│                           ▼                                                  │
│  INGESTION LAYER                                                             │
│  ───────────────                                                             │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │                    NASA FIRMS ADAPTER                         │           │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │           │
│  │  │  CSV Parse  │  │  Normalize  │  │ Deduplicate │          │           │
│  │  │  (csv-parse)│  │  Fire Data  │  │  (by loc/   │          │           │
│  │  │             │  │             │  │   time/frp) │          │           │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │           │
│  └─────────┼────────────────┼────────────────┼──────────────────┘           │
│            │                │                │                               │
│            └────────────────┴────────────────┘                               │
│                             │                                                │
│                             ▼                                                │
│  CORRELATION LAYER                                                           │
│  ─────────────────                                                           │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │              INFRASTRUCTURE FIRE DETECTOR                     │           │
│  │                                                               │           │
│  │  ┌─────────────────┐     ┌─────────────────┐                │           │
│  │  │  Satellite Fire │────▶│ Spatial Match   │                │           │
│  │  │     Points      │     │  (500m radius)  │                │           │
│  │  └─────────────────┘     └────────┬────────┘                │           │
│  │                                   │                          │           │
│  │  ┌─────────────────┐     ┌────────▼────────┐                │           │
│  │  │    Facility     │────▶│  Match Results  │                │           │
│  │  │    Database     │     │                 │                │           │
│  │  │   (PostGIS)     │     └────────┬────────┘                │           │
│  │  └─────────────────┘              │                          │           │
│  │                                   ▼                          │           │
│  │                          ┌─────────────────┐                │           │
│  │                          │    Severity     │                │           │
│  │                          │   Calculation   │                │           │
│  │                          │  (FRP + Type)   │                │           │
│  │                          └────────┬────────┘                │           │
│  └───────────────────────────────────┼──────────────────────────┘           │
│                                      │                                       │
│                                      ▼                                       │
│  OUTPUT LAYER                                                                │
│  ────────────                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │  PostgreSQL  │  │   WebSocket  │  │    Alert     │                       │
│  │   Storage    │  │   Broadcast  │  │   Dispatch   │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Source Comparison

| Source | Satellite | Resolution | Latency | Coverage |
|--------|-----------|------------|---------|----------|
| **VIIRS SNPP** | Suomi NPP | 375m | 3 hours | Global |
| **VIIRS NOAA-20** | NOAA-20 | 375m | 3 hours | Global |
| **MODIS** | Terra/Aqua | 1km | 3 hours | Global |

---

## Infrastructure Fire Schema

**File: `apps/api/src/feeds/types/infrastructure-fire.types.ts`**
```typescript
export type FacilityType =
  | 'food_processing'
  | 'power_plant'
  | 'refinery'
  | 'chemical_plant'
  | 'warehouse'
  | 'data_center'
  | 'water_treatment'
  | 'manufacturing'
  | 'port_facility'
  | 'airport'
  | 'military_base';

export type FireSeverity = 'minor' | 'moderate' | 'major' | 'catastrophic';

export interface SatelliteFire {
  id: string;
  source: 'viirs_snpp' | 'viirs_noaa20' | 'firms_modis';

  location: {
    lat: number;
    lng: number;
  };

  brightness: number;        // Kelvin
  brightT31?: number;        // Band 31 brightness (MODIS)
  frp: number;               // Fire Radiative Power (MW)
  confidence: 'low' | 'nominal' | 'high';

  scan: number;              // Scan pixel size
  track: number;             // Track pixel size

  acqDate: Date;
  acqTime: string;           // HHMM format
  satellite: string;

  dayNight: 'D' | 'N';
  version: string;
}

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  location: {
    lat: number;
    lng: number;
  };
  operator?: string;
  capacity?: string;
  source: 'osm' | 'manual' | 'eia' | 'custom';
  sourceId?: string;
  countryCode?: string;
  tags?: string[];
}

export interface InfrastructureFire {
  id: string;
  fire: SatelliteFire;
  facility: Facility;
  distanceMeters: number;
  severity: FireSeverity;
  confirmed: boolean;
  newsArticles: string[];
  detectedAt: Date;
  lastUpdated: Date;
}
```

---

## NASA FIRMS Adapter

**File: `apps/api/src/feeds/adapters/fire/firms.adapter.ts`**
```typescript
import { parse } from 'csv-parse/sync';
import { BaseFeedAdapter, type FeedConfig } from '../../adapter.interface';
import type { SatelliteFire } from '../../types/infrastructure-fire.types';

type FIRMSSource = 'VIIRS_SNPP_NRT' | 'VIIRS_NOAA20_NRT' | 'MODIS_NRT';

interface FIRMSRow {
  latitude: string;
  longitude: string;
  brightness: string;
  scan: string;
  track: string;
  acq_date: string;
  acq_time: string;
  satellite: string;
  confidence: string;
  version: string;
  bright_t31?: string;
  frp: string;
  daynight: string;
}

export class NASAFIRMSAdapter extends BaseFeedAdapter {
  name = 'NASA FIRMS';
  type = 'satellite_fire';

  private mapKey!: string;
  private sources: FIRMSSource[] = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT'];
  private areaOfInterest?: string; // Country code or 'world'
  private dayRange: number = 1;

  async initialize(config: FeedConfig): Promise<void> {
    await super.initialize(config);
    this.mapKey = config.apiKey || process.env.NASA_FIRMS_MAP_KEY!;
    this.sources = (config.options?.sources as FIRMSSource[]) || this.sources;
    this.areaOfInterest = config.options?.area as string;
    this.dayRange = (config.options?.dayRange as number) || 1;
  }

  async fetch(): Promise<SatelliteFire[]> {
    const allFires: SatelliteFire[] = [];

    for (const source of this.sources) {
      try {
        const fires = await this.fetchSource(source);
        allFires.push(...fires);
      } catch (error) {
        console.error(`[FIRMS] Failed to fetch ${source}:`, error);
      }
    }

    // Deduplicate fires from different sources
    return this.deduplicateFires(allFires);
  }

  private async fetchSource(source: FIRMSSource): Promise<SatelliteFire[]> {
    const area = this.areaOfInterest || 'world';
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${this.mapKey}/${source}/${area}/${this.dayRange}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`FIRMS API error: ${response.statusText}`);
    }

    const csv = await response.text();

    const rows: FIRMSRow[] = parse(csv, {
      columns: true,
      skip_empty_lines: true,
    });

    return rows.map(row => this.parseRow(row, source));
  }

  private parseRow(row: FIRMSRow, source: FIRMSSource): SatelliteFire {
    const sourceMap: Record<FIRMSSource, SatelliteFire['source']> = {
      'VIIRS_SNPP_NRT': 'viirs_snpp',
      'VIIRS_NOAA20_NRT': 'viirs_noaa20',
      'MODIS_NRT': 'firms_modis',
    };

    return {
      id: `firms-${row.acq_date}-${row.acq_time}-${row.latitude}-${row.longitude}`,
      source: sourceMap[source],
      location: {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude),
      },
      brightness: parseFloat(row.brightness),
      brightT31: row.bright_t31 ? parseFloat(row.bright_t31) : undefined,
      frp: parseFloat(row.frp),
      confidence: this.mapConfidence(row.confidence),
      scan: parseFloat(row.scan),
      track: parseFloat(row.track),
      acqDate: new Date(row.acq_date),
      acqTime: row.acq_time,
      satellite: row.satellite,
      dayNight: row.daynight as 'D' | 'N',
      version: row.version,
    };
  }

  private mapConfidence(conf: string): 'low' | 'nominal' | 'high' {
    const val = conf.toLowerCase();
    if (val === 'h' || val === 'high' || parseInt(val) >= 80) return 'high';
    if (val === 'l' || val === 'low' || parseInt(val) < 50) return 'low';
    return 'nominal';
  }

  private deduplicateFires(fires: SatelliteFire[]): SatelliteFire[] {
    const DISTANCE_THRESHOLD = 1; // km
    const TIME_THRESHOLD = 60 * 60 * 1000; // 1 hour

    const dedupedFires: SatelliteFire[] = [];
    const used = new Set<string>();

    for (const fire of fires) {
      if (used.has(fire.id)) continue;

      const cluster = fires.filter(other => {
        if (used.has(other.id)) return false;

        const distance = haversineDistance(fire.location, other.location);
        const timeDiff = Math.abs(
          this.parseDateTime(fire.acqDate, fire.acqTime).getTime() -
          this.parseDateTime(other.acqDate, other.acqTime).getTime()
        );

        return distance <= DISTANCE_THRESHOLD && timeDiff <= TIME_THRESHOLD;
      });

      cluster.forEach(f => used.add(f.id));

      const best = cluster.reduce((a, b) => a.frp > b.frp ? a : b);
      dedupedFires.push(best);
    }

    return dedupedFires;
  }

  private parseDateTime(date: Date, time: string): Date {
    const hours = parseInt(time.substring(0, 2));
    const minutes = parseInt(time.substring(2, 4));
    const result = new Date(date);
    result.setUTCHours(hours, minutes);
    return result;
  }

  normalize(fire: SatelliteFire): any {
    return {
      id: fire.id,
      type: 'satellite_fire',
      title: `Fire detected (FRP: ${fire.frp.toFixed(1)} MW)`,
      timestamp: this.parseDateTime(fire.acqDate, fire.acqTime),
      location: fire.location,
      metadata: {
        source: fire.source,
        brightness: fire.brightness,
        frp: fire.frp,
        confidence: fire.confidence,
        satellite: fire.satellite,
        dayNight: fire.dayNight,
      },
      raw: fire,
    };
  }
}

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;

  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
```

---

## Infrastructure Fire Detector

**File: `apps/api/src/feeds/services/infrastructure-fire-detector.ts`**
```typescript
import { NASAFIRMSAdapter } from '../adapters/fire/firms.adapter';
import { FacilityDatabaseService } from './facility-database';
import type { SatelliteFire, InfrastructureFire, Facility, FireSeverity } from '../types/infrastructure-fire.types';

const MATCH_RADIUS_KM = 0.5; // 500 meters

export class InfrastructureFireDetector {
  private firmsAdapter: NASAFIRMSAdapter;
  private facilityDb: FacilityDatabaseService;

  constructor() {
    this.firmsAdapter = new NASAFIRMSAdapter();
    this.facilityDb = new FacilityDatabaseService();
  }

  async detectInfrastructureFires(): Promise<InfrastructureFire[]> {
    // 1. Fetch satellite fire detections
    const satelliteFires = await this.firmsAdapter.fetch();

    console.log(`[FireDetector] Processing ${satelliteFires.length} satellite fires`);

    // 2. Match each fire to nearby facilities
    const infrastructureFires: InfrastructureFire[] = [];

    for (const fire of satelliteFires) {
      const matches = await this.matchFireToFacilities(fire);
      infrastructureFires.push(...matches);
    }

    // 3. Deduplicate (same facility, same day)
    const deduplicated = this.deduplicateByFacility(infrastructureFires);

    console.log(`[FireDetector] Found ${deduplicated.length} infrastructure fires`);

    return deduplicated;
  }

  private async matchFireToFacilities(fire: SatelliteFire): Promise<InfrastructureFire[]> {
    const nearbyFacilities = await this.facilityDb.findNearbyFacilities(
      fire.location,
      MATCH_RADIUS_KM
    );

    if (nearbyFacilities.length === 0) {
      return [];
    }

    const matchedByType = new Map<string, typeof nearbyFacilities[0]>();

    for (const facility of nearbyFacilities) {
      const existing = matchedByType.get(facility.type);
      if (!existing || facility.distanceKm < existing.distanceKm) {
        matchedByType.set(facility.type, facility);
      }
    }

    return Array.from(matchedByType.values()).map(facility => ({
      id: `infra-fire-${fire.id}-${facility.id}`,
      fire,
      facility: facility as Facility,
      distanceMeters: facility.distanceKm * 1000,
      severity: this.calculateSeverity(fire, facility as Facility),
      confirmed: false,
      newsArticles: [],
      detectedAt: new Date(),
      lastUpdated: new Date(),
    }));
  }

  private calculateSeverity(fire: SatelliteFire, facility: Facility): FireSeverity {
    const frp = fire.frp;

    const criticalTypes = ['power_plant', 'refinery', 'chemical_plant', 'water_treatment'];
    const isCritical = criticalTypes.includes(facility.type);

    if (frp >= 500 || (isCritical && frp >= 200)) return 'catastrophic';
    if (frp >= 200 || (isCritical && frp >= 100)) return 'major';
    if (frp >= 50) return 'moderate';
    return 'minor';
  }

  private deduplicateByFacility(fires: InfrastructureFire[]): InfrastructureFire[] {
    const groups = new Map<string, InfrastructureFire[]>();

    for (const fire of fires) {
      const dateKey = fire.fire.acqDate.toISOString().split('T')[0];
      const key = `${fire.facility.id}-${dateKey}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(fire);
    }

    return Array.from(groups.values()).map(group => {
      const severityOrder = { minor: 0, moderate: 1, major: 2, catastrophic: 3 };
      return group.reduce((best, current) => {
        if (severityOrder[current.severity] > severityOrder[best.severity]) {
          return current;
        }
        if (current.fire.frp > best.fire.frp) {
          return current;
        }
        return best;
      });
    });
  }
}
```

---

## Facility Database Schema

**File: `apps/api/src/feeds/services/facility-database.ts`**
```typescript
import { db } from '../../db';
import { facilities } from '../../db/schema';
import { sql, and, gte, lte } from 'drizzle-orm';
import type { Facility, FacilityType } from '../types/infrastructure-fire.types';

interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export class FacilityDatabaseService {
  /**
   * Find facilities near a point
   */
  async findNearbyFacilities(
    point: { lat: number; lng: number },
    radiusKm: number,
    types?: FacilityType[]
  ): Promise<Array<Facility & { distanceKm: number }>> {
    const result = await db.execute(sql`
      SELECT
        *,
        ST_Distance(
          ST_MakePoint(${point.lng}, ${point.lat})::geography,
          ST_MakePoint(lng, lat)::geography
        ) / 1000 as distance_km
      FROM facilities
      WHERE ST_DWithin(
        ST_MakePoint(${point.lng}, ${point.lat})::geography,
        ST_MakePoint(lng, lat)::geography,
        ${radiusKm * 1000}
      )
      ${types ? sql`AND type = ANY(${types})` : sql``}
      ORDER BY distance_km ASC
    `);

    return result.rows.map(row => ({
      ...row,
      distanceKm: parseFloat(row.distance_km),
    })) as any;
  }

  /**
   * Import facilities from OpenStreetMap extract
   */
  async importFromOSM(osmData: any[]): Promise<number> {
    const facilityRecords = osmData
      .filter(item => this.isRelevantFacility(item))
      .map(item => this.mapOSMToFacility(item));

    const BATCH_SIZE = 1000;
    let imported = 0;

    for (let i = 0; i < facilityRecords.length; i += BATCH_SIZE) {
      const batch = facilityRecords.slice(i, i + BATCH_SIZE);
      await db.insert(facilities).values(batch as any).onConflictDoNothing();
      imported += batch.length;
    }

    return imported;
  }

  private isRelevantFacility(osmItem: any): boolean {
    const tags = osmItem.tags || {};

    if (tags.industrial === 'food' || tags.building === 'food_processing') return true;
    if (tags.power === 'plant' || tags.power === 'generator') return true;
    if (tags.industrial === 'refinery') return true;
    if (tags.industrial === 'chemical') return true;
    if (tags.building === 'warehouse' && tags.industrial) return true;
    if (tags.building === 'data_center' || tags.telecom === 'data_center') return true;
    if (tags.man_made === 'water_treatment') return true;

    return false;
  }

  private mapOSMToFacility(osmItem: any): Partial<Facility> {
    const tags = osmItem.tags || {};

    return {
      id: `osm-${osmItem.id}`,
      name: tags.name || `${this.mapOSMType(tags)} Facility`,
      type: this.mapOSMType(tags),
      location: {
        lat: osmItem.lat,
        lng: osmItem.lon,
      },
      operator: tags.operator,
      source: 'osm',
      sourceId: String(osmItem.id),
    };
  }

  private mapOSMType(tags: Record<string, string>): FacilityType {
    if (tags.industrial === 'food' || tags.building === 'food_processing') return 'food_processing';
    if (tags.power === 'plant') return 'power_plant';
    if (tags.industrial === 'refinery') return 'refinery';
    if (tags.industrial === 'chemical') return 'chemical_plant';
    if (tags.building === 'warehouse') return 'warehouse';
    if (tags.building === 'data_center') return 'data_center';
    if (tags.man_made === 'water_treatment') return 'water_treatment';
    return 'manufacturing';
  }
}
```

---

## Infrastructure Fire Map Layer

**File: `apps/web/src/features/map/layers/InfrastructureFireLayer.tsx`**
```tsx
import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl';
import { useQuery } from '@tanstack/react-query';
import { fetchInfrastructureFires } from '@/lib/api/feeds';

interface InfrastructureFireLayerProps {
  projectId: string;
  visible: boolean;
  facilityTypes?: string[];
  severityFilter?: string[];
}

const SEVERITY_COLORS = {
  minor: '#fbbf24',
  moderate: '#f97316',
  major: '#dc2626',
  catastrophic: '#7f1d1d',
};

export function InfrastructureFireLayer({
  projectId,
  visible,
  facilityTypes,
  severityFilter,
}: InfrastructureFireLayerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['infrastructure-fires', projectId, facilityTypes],
    queryFn: () => fetchInfrastructureFires(projectId, { facilityTypes }),
    refetchInterval: 15 * 60 * 1000, // 15 minutes
    enabled: visible,
  });

  const geojson = useMemo(() => {
    if (!data?.fires) return null;

    let fires = data.fires;

    if (severityFilter?.length) {
      fires = fires.filter((f: any) => severityFilter.includes(f.severity));
    }

    return {
      type: 'FeatureCollection' as const,
      features: fires.map((fire: any) => ({
        type: 'Feature' as const,
        id: fire.id,
        geometry: {
          type: 'Point' as const,
          coordinates: [fire.fire.location.lng, fire.fire.location.lat],
        },
        properties: {
          id: fire.id,
          severity: fire.severity,
          facilityType: fire.facility.type,
          facilityName: fire.facility.name,
          frp: fire.fire.frp,
          confidence: fire.fire.confidence,
          detectedAt: fire.detectedAt,
          distanceMeters: fire.distanceMeters,
        },
      })),
    };
  }, [data?.fires, severityFilter]);

  if (!visible || isLoading || !geojson) return null;

  return (
    <Source id="infrastructure-fires" type="geojson" data={geojson}>
      {/* Pulsing outer ring */}
      <Layer
        id="infrastructure-fires-pulse"
        type="circle"
        paint={{
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            5, 20,
            10, 35,
            15, 50,
          ],
          'circle-color': [
            'match', ['get', 'severity'],
            'catastrophic', 'rgba(127, 29, 29, 0.3)',
            'major', 'rgba(220, 38, 38, 0.3)',
            'moderate', 'rgba(249, 115, 22, 0.25)',
            'rgba(251, 191, 36, 0.2)',
          ],
          'circle-opacity': 0.7,
        }}
      />

      {/* Fire marker */}
      <Layer
        id="infrastructure-fires-marker"
        type="circle"
        paint={{
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            5, 6,
            10, 10,
            15, 14,
          ],
          'circle-color': [
            'match', ['get', 'severity'],
            'catastrophic', SEVERITY_COLORS.catastrophic,
            'major', SEVERITY_COLORS.major,
            'moderate', SEVERITY_COLORS.moderate,
            SEVERITY_COLORS.minor,
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        }}
      />

      {/* Labels at high zoom */}
      <Layer
        id="infrastructure-fires-labels"
        type="symbol"
        minzoom={10}
        layout={{
          'text-field': ['get', 'facilityName'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-max-width': 10,
        }}
        paint={{
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
        }}
      />
    </Source>
  );
}
```

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/feeds/types/infrastructure-fire.types.ts` | Type definitions for satellite fires, facilities, and infrastructure fires |
| `apps/api/src/feeds/adapters/fire/firms.adapter.ts` | NASA FIRMS adapter for fetching satellite fire data |
| `apps/api/src/feeds/services/facility-database.ts` | Facility database service with PostGIS queries |
| `apps/api/src/feeds/services/infrastructure-fire-detector.ts` | Fire detection service that correlates fires with facilities |
| `apps/web/src/features/map/layers/InfrastructureFireLayer.tsx` | Map layer component for visualizing infrastructure fires |

---

## Acceptance Criteria

- [ ] FIRMS adapter fetches VIIRS and MODIS fire data from NASA API
- [ ] Fire deduplication works across satellite sources (location + time + FRP)
- [ ] Facility database queries nearby facilities efficiently using PostGIS
- [ ] Fire-facility matching uses correct radius (500m default)
- [ ] Severity calculation considers both FRP value and facility criticality type
- [ ] Map layer displays fires with severity-based color styling
- [ ] Pulsing animation indicates active fires on the map
- [ ] Labels show facility names at high zoom levels (zoom >= 10)
- [ ] Infrastructure fires cross-reference correctly with facility database

---

## Environment Variables

```bash
# NASA FIRMS API
NASA_FIRMS_MAP_KEY=your_map_key  # Free from https://firms.modaps.eosdis.nasa.gov/api/area/
```
