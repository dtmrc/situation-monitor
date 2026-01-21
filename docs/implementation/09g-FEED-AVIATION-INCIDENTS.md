# Phase 9g: Aviation Incident Layer

Parent: [09-REALTIME-DATA-FEEDS.md](./09-REALTIME-DATA-FEEDS.md)

## Overview

This document covers aviation incident monitoring combining verified incident reports from safety databases with real-time ADS-B anomaly detection to identify and track aviation incidents.

**Tasks Covered:** 9.23, 9.24, 9.25

---

## Data Source Comparison

| Source | Type | Coverage | Latency | Access |
|--------|------|----------|---------|--------|
| **Aviation Safety Network (ASN)** | Verified incidents | Global | Hours-Days | RSS/Scrape |
| **FAA Preliminary Reports** | Official US incidents | US only | Daily | Public feed |
| **NTSB Aviation** | US investigations | US only | Days | RSS |
| **ADS-B Exchange** | Real-time tracking | Global | Seconds | API |

---

## Aviation Incident Schema

**File: `apps/api/src/feeds/types/aviation-incident.types.ts`**
```typescript
export type IncidentCategory =
  | 'accident'
  | 'serious_incident'
  | 'incident'
  | 'ground_incident'
  | 'hijacking'
  | 'shoot_down'
  | 'unknown';

export type IncidentPhase =
  | 'takeoff'
  | 'initial_climb'
  | 'climb'
  | 'cruise'
  | 'descent'
  | 'approach'
  | 'landing'
  | 'taxi'
  | 'parked'
  | 'unknown';

export interface AviationIncident {
  id: string;
  source: 'asn' | 'faa' | 'ntsb' | 'adsb_anomaly' | 'manual';
  sourceId: string;

  registration?: string;
  aircraftType?: string;
  operator?: string;
  flightNumber?: string;

  location: {
    lat: number;
    lng: number;
    altitude?: number;
  };
  locationDescription?: string;
  country: string;
  countryCode: string;

  category: IncidentCategory;
  phase: IncidentPhase;

  fatalities?: number;
  injuries?: number;
  survived?: number;
  occupants?: number;

  date: Date;
  description: string;
  cause?: string;

  confirmed: boolean;
  investigationStatus?: 'preliminary' | 'ongoing' | 'final';

  sourceUrls: string[];

  createdAt: Date;
  updatedAt: Date;
}

export type AnomalyType =
  | 'emergency_squawk'
  | 'hijack_squawk'
  | 'comm_failure'
  | 'rapid_descent'
  | 'signal_loss'
  | 'altitude_deviation'
  | 'course_deviation';

export interface ADSBAnomaly {
  id: string;
  aircraftId: string;
  callsign?: string;

  anomalyType: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';

  detectedAt: Date;
  location: {
    lat: number;
    lng: number;
    altitude: number;
  };

  squawk?: string;
  verticalRate?: number;
  previousAltitude?: number;
  currentAltitude?: number;

  resolved: boolean;
  resolvedAt?: Date;
  linkedIncidentId?: string;
}
```

---

## Aviation Safety Network Adapter

**File: `apps/api/src/feeds/adapters/aviation/asn.adapter.ts`**
```typescript
import Parser from 'rss-parser';
import { BaseFeedAdapter, type FeedConfig } from '../../adapter.interface';
import type { AviationIncident, IncidentCategory, IncidentPhase } from '../../types/aviation-incident.types';

interface ASNFeedItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  guid: string;
}

export class AviationSafetyNetworkAdapter extends BaseFeedAdapter {
  name = 'Aviation Safety Network';
  type = 'aviation_incident';

  private parser: Parser;
  private feedUrl = 'https://aviation-safety.net/rss/latest-news.xml';

  constructor() {
    super();
    this.parser = new Parser();
  }

  async fetch(): Promise<ASNFeedItem[]> {
    try {
      const feed = await this.parser.parseURL(this.feedUrl);
      return feed.items as ASNFeedItem[];
    } catch (error) {
      console.error('[ASN] Failed to fetch feed:', error);
      return [];
    }
  }

  normalize(item: ASNFeedItem): AviationIncident | null {
    const parsed = this.parseASNTitle(item.title);
    if (!parsed) return null;

    const location = this.extractLocation(item.contentSnippet);

    return {
      id: `asn-${item.guid}`,
      source: 'asn',
      sourceId: item.guid,

      registration: parsed.registration,
      aircraftType: parsed.aircraftType,
      operator: parsed.operator,

      location: location || { lat: 0, lng: 0 },
      locationDescription: parsed.location,
      country: this.extractCountry(parsed.location),
      countryCode: 'XX',

      category: this.inferCategory(item.title, item.contentSnippet),
      phase: this.inferPhase(item.contentSnippet),

      fatalities: this.extractNumber(item.contentSnippet, /(\d+)\s*(?:killed|fatal|dead)/i),
      injuries: this.extractNumber(item.contentSnippet, /(\d+)\s*(?:injured|hurt)/i),

      date: new Date(item.pubDate),
      description: item.contentSnippet,

      confirmed: true,

      sourceUrls: [item.link],

      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private parseASNTitle(title: string): {
    registration?: string;
    aircraftType?: string;
    operator?: string;
    location?: string;
  } | null {
    const patterns = {
      registration: /\b([A-Z]{1,2}-[A-Z0-9]{3,5}|N\d{1,5}[A-Z]{0,2})\b/,
      aircraftType: /(Boeing|Airbus|Cessna|Piper|Beech|Embraer|ATR|Bombardier)[\s\w-]+?\d+/i,
      operator: /operated by\s+([\w\s]+?)(?:\s+crashed|\s+accident|\s+incident|$)/i,
    };

    return {
      registration: title.match(patterns.registration)?.[1],
      aircraftType: title.match(patterns.aircraftType)?.[0],
      operator: title.match(patterns.operator)?.[1]?.trim(),
      location: title.match(/(?:near|at|over|in)\s+([^,]+)/i)?.[1],
    };
  }

  private extractLocation(text: string): { lat: number; lng: number } | null {
    const coordMatch = text.match(/(-?\d+\.?\d*)[deg\s,]+([NS])?[,\s]+(-?\d+\.?\d*)[deg\s,]+([EW])?/i);
    if (coordMatch) {
      let lat = parseFloat(coordMatch[1]);
      let lng = parseFloat(coordMatch[3]);
      if (coordMatch[2]?.toUpperCase() === 'S') lat = -lat;
      if (coordMatch[4]?.toUpperCase() === 'W') lng = -lng;
      return { lat, lng };
    }
    return null;
  }

  private extractCountry(location?: string): string {
    if (!location) return 'Unknown';
    const parts = location.split(',');
    return parts[parts.length - 1]?.trim() || 'Unknown';
  }

  private inferCategory(title: string, content: string): IncidentCategory {
    const text = `${title} ${content}`.toLowerCase();

    if (text.includes('hijack')) return 'hijacking';
    if (text.includes('shot down') || text.includes('missile')) return 'shoot_down';
    if (text.includes('crashed') || text.includes('crash') || text.includes('fatal')) return 'accident';
    if (text.includes('serious incident')) return 'serious_incident';
    if (text.includes('ground') && text.includes('collision')) return 'ground_incident';

    return 'incident';
  }

  private inferPhase(content: string): IncidentPhase {
    const text = content.toLowerCase();

    if (text.includes('takeoff') || text.includes('take-off')) return 'takeoff';
    if (text.includes('landing') || text.includes('touchdown')) return 'landing';
    if (text.includes('approach') || text.includes('final')) return 'approach';
    if (text.includes('cruise') || text.includes('cruising')) return 'cruise';
    if (text.includes('climb')) return 'climb';
    if (text.includes('descent') || text.includes('descending')) return 'descent';
    if (text.includes('taxi')) return 'taxi';

    return 'unknown';
  }

  private extractNumber(text: string, pattern: RegExp): number | undefined {
    const match = text.match(pattern);
    return match ? parseInt(match[1], 10) : undefined;
  }
}
```

---

## ADS-B Anomaly Detector

**File: `apps/api/src/feeds/services/adsb-anomaly-detector.ts`**
```typescript
import type { ADSBAnomaly, AnomalyType } from '../types/aviation-incident.types';

interface ADSBAircraft {
  hex: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number;
  alt_geom?: number;
  baro_rate?: number;
  squawk?: string;
  emergency?: string;
  seen?: number;
  seen_pos?: number;
}

interface AircraftState {
  lastPosition: { lat: number; lng: number; altitude: number };
  lastSeen: Date;
  history: Array<{ time: Date; altitude: number; position: { lat: number; lng: number } }>;
}

const EMERGENCY_SQUAWKS = {
  '7700': 'emergency_squawk' as const,
  '7500': 'hijack_squawk' as const,
  '7600': 'comm_failure' as const,
};

const THRESHOLDS = {
  RAPID_DESCENT_RATE: -4000,
  RAPID_CLIMB_RATE: 6000,
  SIGNAL_LOSS_SECONDS: 60,
  ALTITUDE_DEVIATION_FEET: 5000,
};

export class ADSBAnomalyDetector {
  private aircraftStates = new Map<string, AircraftState>();
  private activeAnomalies = new Map<string, ADSBAnomaly>();

  processAircraftData(aircraft: ADSBAircraft[]): ADSBAnomaly[] {
    const newAnomalies: ADSBAnomaly[] = [];
    const now = new Date();

    for (const ac of aircraft) {
      const anomalies = this.checkAircraft(ac, now);
      newAnomalies.push(...anomalies);
    }

    const signalLossAnomalies = this.checkSignalLoss(aircraft, now);
    newAnomalies.push(...signalLossAnomalies);

    return newAnomalies;
  }

  private checkAircraft(ac: ADSBAircraft, now: Date): ADSBAnomaly[] {
    const anomalies: ADSBAnomaly[] = [];

    // 1. Emergency squawk codes
    if (ac.squawk && ac.squawk in EMERGENCY_SQUAWKS) {
      const anomalyType = EMERGENCY_SQUAWKS[ac.squawk as keyof typeof EMERGENCY_SQUAWKS];
      const anomaly = this.createAnomaly(ac, anomalyType, now);
      if (anomaly) {
        anomaly.severity = anomalyType === 'hijack_squawk' ? 'critical' : 'high';
        anomaly.squawk = ac.squawk;
        anomalies.push(anomaly);
      }
    }

    // 2. Rapid descent
    if (ac.baro_rate && ac.baro_rate < THRESHOLDS.RAPID_DESCENT_RATE) {
      const anomaly = this.createAnomaly(ac, 'rapid_descent', now);
      if (anomaly) {
        anomaly.severity = ac.baro_rate < -6000 ? 'critical' : 'high';
        anomaly.verticalRate = ac.baro_rate;
        anomalies.push(anomaly);
      }
    }

    // 3. Track state for future checks
    this.updateAircraftState(ac, now);

    return anomalies;
  }

  private checkSignalLoss(currentAircraft: ADSBAircraft[], now: Date): ADSBAnomaly[] {
    const anomalies: ADSBAnomaly[] = [];
    const currentHexCodes = new Set(currentAircraft.map(ac => ac.hex));

    for (const [hex, state] of this.aircraftStates.entries()) {
      if (currentHexCodes.has(hex)) continue;

      const timeSinceSeen = (now.getTime() - state.lastSeen.getTime()) / 1000;

      if (timeSinceSeen > THRESHOLDS.SIGNAL_LOSS_SECONDS && timeSinceSeen < 300) {
        if (state.lastPosition.altitude < 10000) {
          const anomalyId = `signal-loss-${hex}`;

          if (!this.activeAnomalies.has(anomalyId)) {
            const anomaly: ADSBAnomaly = {
              id: anomalyId,
              aircraftId: hex,
              anomalyType: 'signal_loss',
              severity: 'high',
              detectedAt: now,
              location: state.lastPosition,
              resolved: false,
            };

            this.activeAnomalies.set(anomalyId, anomaly);
            anomalies.push(anomaly);
          }
        }
      }

      if (timeSinceSeen > 600) {
        this.aircraftStates.delete(hex);
      }
    }

    return anomalies;
  }

  private createAnomaly(ac: ADSBAircraft, type: AnomalyType, now: Date): ADSBAnomaly | null {
    if (!ac.lat || !ac.lon) return null;

    const id = `${type}-${ac.hex}-${now.getTime()}`;

    const existingKey = Array.from(this.activeAnomalies.keys())
      .find(k => k.includes(ac.hex) && k.includes(type));

    if (existingKey) {
      const existing = this.activeAnomalies.get(existingKey)!;
      if (now.getTime() - existing.detectedAt.getTime() < 300000) {
        return null;
      }
    }

    const anomaly: ADSBAnomaly = {
      id,
      aircraftId: ac.hex,
      callsign: ac.flight?.trim(),
      anomalyType: type,
      severity: 'medium',
      detectedAt: now,
      location: {
        lat: ac.lat,
        lng: ac.lon,
        altitude: ac.alt_baro || ac.alt_geom || 0,
      },
      resolved: false,
    };

    this.activeAnomalies.set(id, anomaly);
    return anomaly;
  }

  private updateAircraftState(ac: ADSBAircraft, now: Date): void {
    if (!ac.lat || !ac.lon) return;

    const state = this.aircraftStates.get(ac.hex) || {
      lastPosition: { lat: 0, lng: 0, altitude: 0 },
      lastSeen: now,
      history: [],
    };

    state.lastPosition = {
      lat: ac.lat,
      lng: ac.lon,
      altitude: ac.alt_baro || ac.alt_geom || 0,
    };
    state.lastSeen = now;

    state.history.push({
      time: now,
      altitude: state.lastPosition.altitude,
      position: { lat: ac.lat, lng: ac.lon },
    });
    if (state.history.length > 10) {
      state.history.shift();
    }

    this.aircraftStates.set(ac.hex, state);
  }

  resolveAnomaly(anomalyId: string): void {
    const anomaly = this.activeAnomalies.get(anomalyId);
    if (anomaly) {
      anomaly.resolved = true;
      anomaly.resolvedAt = new Date();
    }
  }

  getActiveAnomalies(): ADSBAnomaly[] {
    return Array.from(this.activeAnomalies.values()).filter(a => !a.resolved);
  }
}
```

---

## Aviation Incident Map Layer

**File: `apps/web/src/features/map/layers/AviationIncidentLayer.tsx`**
```tsx
import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl';
import { useQuery } from '@tanstack/react-query';
import { fetchAviationIncidents } from '@/lib/api/feeds';

interface AviationIncidentLayerProps {
  projectId: string;
  visible: boolean;
  showAnomalies?: boolean;
  categoryFilter?: string[];
}

const CATEGORY_COLORS = {
  accident: '#dc2626',
  serious_incident: '#f97316',
  incident: '#eab308',
  ground_incident: '#84cc16',
  hijacking: '#7c3aed',
  shoot_down: '#be185d',
  unknown: '#6b7280',
};

const ANOMALY_COLORS = {
  emergency_squawk: '#dc2626',
  hijack_squawk: '#7c3aed',
  comm_failure: '#f97316',
  rapid_descent: '#ef4444',
  signal_loss: '#fbbf24',
};

export function AviationIncidentLayer({
  projectId,
  visible,
  showAnomalies = true,
  categoryFilter,
}: AviationIncidentLayerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['aviation-incidents', projectId],
    queryFn: () => fetchAviationIncidents(projectId),
    refetchInterval: 60 * 1000,
    enabled: visible,
  });

  const incidentsGeoJSON = useMemo(() => {
    if (!data?.incidents) return null;

    let incidents = data.incidents;
    if (categoryFilter?.length) {
      incidents = incidents.filter((i: any) => categoryFilter.includes(i.category));
    }

    return {
      type: 'FeatureCollection' as const,
      features: incidents
        .filter((i: any) => i.location.lat && i.location.lng)
        .map((incident: any) => ({
          type: 'Feature' as const,
          id: incident.id,
          geometry: {
            type: 'Point' as const,
            coordinates: [incident.location.lng, incident.location.lat],
          },
          properties: {
            id: incident.id,
            category: incident.category,
            phase: incident.phase,
            aircraftType: incident.aircraftType,
            operator: incident.operator,
            fatalities: incident.fatalities || 0,
            date: incident.date,
            description: incident.description,
          },
        })),
    };
  }, [data?.incidents, categoryFilter]);

  const anomaliesGeoJSON = useMemo(() => {
    if (!data?.activeAnomalies || !showAnomalies) return null;

    return {
      type: 'FeatureCollection' as const,
      features: data.activeAnomalies.map((anomaly: any) => ({
        type: 'Feature' as const,
        id: anomaly.id,
        geometry: {
          type: 'Point' as const,
          coordinates: [anomaly.location.lng, anomaly.location.lat],
        },
        properties: {
          id: anomaly.id,
          type: anomaly.anomalyType,
          severity: anomaly.severity,
          callsign: anomaly.callsign || anomaly.aircraftId,
          altitude: anomaly.location.altitude,
          squawk: anomaly.squawk,
          verticalRate: anomaly.verticalRate,
        },
      })),
    };
  }, [data?.activeAnomalies, showAnomalies]);

  if (!visible || isLoading) return null;

  return (
    <>
      {incidentsGeoJSON && (
        <Source id="aviation-incidents" type="geojson" data={incidentsGeoJSON}>
          <Layer
            id="aviation-incidents-markers"
            type="circle"
            paint={{
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                5, 6,
                10, 10,
                15, 14,
              ],
              'circle-color': [
                'match', ['get', 'category'],
                'accident', CATEGORY_COLORS.accident,
                'serious_incident', CATEGORY_COLORS.serious_incident,
                'incident', CATEGORY_COLORS.incident,
                'hijacking', CATEGORY_COLORS.hijacking,
                'shoot_down', CATEGORY_COLORS.shoot_down,
                CATEGORY_COLORS.unknown,
              ],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
            }}
          />

          <Layer
            id="aviation-incidents-fatalities"
            type="symbol"
            filter={['>', ['get', 'fatalities'], 0]}
            layout={{
              'icon-image': 'cross-icon',
              'icon-size': 0.6,
              'icon-allow-overlap': true,
            }}
          />
        </Source>
      )}

      {anomaliesGeoJSON && (
        <Source id="adsb-anomalies" type="geojson" data={anomaliesGeoJSON}>
          <Layer
            id="adsb-anomalies-pulse"
            type="circle"
            paint={{
              'circle-radius': 25,
              'circle-color': [
                'match', ['get', 'severity'],
                'critical', 'rgba(220, 38, 38, 0.4)',
                'high', 'rgba(249, 115, 22, 0.3)',
                'rgba(234, 179, 8, 0.25)',
              ],
              'circle-opacity': 0.7,
            }}
          />

          <Layer
            id="adsb-anomalies-core"
            type="circle"
            paint={{
              'circle-radius': 8,
              'circle-color': [
                'match', ['get', 'type'],
                'emergency_squawk', ANOMALY_COLORS.emergency_squawk,
                'hijack_squawk', ANOMALY_COLORS.hijack_squawk,
                'rapid_descent', ANOMALY_COLORS.rapid_descent,
                'signal_loss', ANOMALY_COLORS.signal_loss,
                '#6b7280',
              ],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
            }}
          />

          <Layer
            id="adsb-anomalies-labels"
            type="symbol"
            layout={{
              'text-field': ['get', 'callsign'],
              'text-size': 10,
              'text-offset': [0, -1.5],
              'text-anchor': 'bottom',
              'text-font': ['JetBrains Mono Regular', 'monospace'],
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

## Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/feeds/types/aviation-incident.types.ts` | Type definitions |
| `apps/api/src/feeds/adapters/aviation/asn.adapter.ts` | ASN adapter |
| `apps/api/src/feeds/services/adsb-anomaly-detector.ts` | ADS-B anomaly detection |
| `apps/api/src/feeds/services/aviation-incident-aggregator.ts` | Incident aggregation |
| `apps/web/src/features/map/layers/AviationIncidentLayer.tsx` | Map layer component |

---

## Acceptance Criteria

- [ ] ASN adapter fetches aviation incidents from RSS
- [ ] Incident parsing extracts registration, aircraft type, operator
- [ ] Category and phase inference works correctly
- [ ] ADS-B anomaly detector identifies emergency squawks (7500, 7600, 7700)
- [ ] Rapid descent detection triggers at -4000 ft/min
- [ ] Signal loss detection triggers for tracked aircraft
- [ ] Map layer shows incidents with category-based colors
- [ ] Active anomalies show pulsing indicators
- [ ] Callsign labels appear for anomalies
