# Phase 9c: Flight Tracking (ADS-B)

Parent: [09-REALTIME-DATA-FEEDS.md](./09-REALTIME-DATA-FEEDS.md)

## Overview

This document covers ADS-B (Automatic Dependent Surveillance-Broadcast) flight tracking integration via the ADS-B Exchange API and OpenSky Network. ADS-B is a surveillance technology where aircraft broadcast their position, altitude, speed, and identification information, which can be received by ground stations and other aircraft.

Real-time flight tracking enables monitoring of:
- Aircraft positions within defined geographic areas
- Emergency situations via squawk codes (7500 hijack, 7600 radio failure, 7700 emergency)
- Flight patterns and anomalies over areas of interest
- Military and government aircraft movements

**Tasks Covered:** 9.6, 9.12

---

## Data Source Comparison

| Source | Coverage | Latency | Access | Cost |
|--------|----------|---------|--------|------|
| **ADS-B Exchange** | Global | ~5 seconds | API | Free tier available |
| **OpenSky Network** | Global | ~15 seconds | API | Free for research |
| **FlightRadar24** | Global | ~5 seconds | API | Paid |
| **FlightAware** | Global | ~5 seconds | API | Paid |
| **Local Receiver** | ~250nm radius | Real-time | Direct | Hardware cost |

---

## 9.6 ADS-B Flight Adapter

**File: `apps/api/src/feeds/adapters/adsb.adapter.ts`**

```typescript
import { BaseFeedAdapter, type FeedConfig } from '../adapter.interface';
import type { NormalizedFeedItem } from '../../jobs/queues';

interface ADSBState {
  icao24: string;          // ICAO 24-bit address
  callsign: string;        // Flight callsign
  origin_country: string;
  time_position: number;   // Unix timestamp
  last_contact: number;
  longitude: number;
  latitude: number;
  baro_altitude: number;   // Barometric altitude (meters)
  on_ground: boolean;
  velocity: number;        // Ground speed (m/s)
  true_track: number;      // Heading (degrees)
  vertical_rate: number;   // Vertical rate (m/s)
  sensors?: number[];
  geo_altitude: number;    // Geometric altitude (meters)
  squawk: string;          // Transponder code
  spi: boolean;            // Special position indicator
  position_source: number;
}

interface OpenSkyResponse {
  time: number;
  states: (string | number | boolean | null)[][];
}

interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// Emergency squawk codes
const EMERGENCY_SQUAWKS = {
  '7500': 'HIJACK',
  '7600': 'RADIO_FAILURE',
  '7700': 'EMERGENCY',
} as const;

export class AdsbAdapter extends BaseFeedAdapter {
  name = 'ADS-B Flight Tracker';
  type = 'flight';

  private apiUrl!: string;
  private apiKey?: string;
  private boundingBox?: BoundingBox;
  private pollInterval!: number;
  private lastStates: Map<string, ADSBState> = new Map();

  async initialize(config: FeedConfig): Promise<void> {
    await super.initialize(config);
    this.apiUrl = config.endpoint || 'https://opensky-network.org/api/states/all';
    this.apiKey = config.apiKey;
    this.boundingBox = config.options?.boundingBox as BoundingBox;
    this.pollInterval = config.pollInterval || 30000; // 30 seconds default
  }

  async fetch(): Promise<ADSBState[]> {
    const url = new URL(this.apiUrl);

    // Add bounding box if configured
    if (this.boundingBox) {
      url.searchParams.set('lamin', String(this.boundingBox.minLat));
      url.searchParams.set('lamax', String(this.boundingBox.maxLat));
      url.searchParams.set('lomin', String(this.boundingBox.minLng));
      url.searchParams.set('lomax', String(this.boundingBox.maxLng));
    }

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers['Authorization'] = `Basic ${this.apiKey}`;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      throw new Error(`ADS-B API error: ${response.statusText}`);
    }

    const data: OpenSkyResponse = await response.json();

    if (!data.states) return [];

    const states = data.states.map((state): ADSBState => ({
      icao24: state[0] as string,
      callsign: (state[1] as string)?.trim() || '',
      origin_country: state[2] as string,
      time_position: state[3] as number,
      last_contact: state[4] as number,
      longitude: state[5] as number,
      latitude: state[6] as number,
      baro_altitude: state[7] as number,
      on_ground: state[8] as boolean,
      velocity: state[9] as number,
      true_track: state[10] as number,
      vertical_rate: state[11] as number,
      geo_altitude: state[13] as number,
      squawk: state[14] as string,
      spi: state[15] as boolean,
      position_source: state[16] as number,
    }));

    // Filter out aircraft without position
    const validStates = states.filter(s => s.latitude && s.longitude);

    // Update tracking
    for (const state of validStates) {
      this.lastStates.set(state.icao24, state);
    }

    return validStates;
  }

  normalize(state: ADSBState): NormalizedFeedItem {
    const altitudeFeet = state.baro_altitude
      ? Math.round(state.baro_altitude * 3.28084)
      : null;

    const speedKnots = state.velocity
      ? Math.round(state.velocity * 1.94384)
      : null;

    const isEmergency = state.squawk in EMERGENCY_SQUAWKS;

    return {
      id: `flight-${state.icao24}-${state.time_position}`,
      type: 'flight',
      title: state.callsign || state.icao24,
      content: `${state.callsign || state.icao24} from ${state.origin_country}`,
      timestamp: new Date(state.time_position * 1000),
      location: {
        lat: state.latitude,
        lng: state.longitude,
        name: state.callsign || state.icao24,
      },
      metadata: {
        icao24: state.icao24,
        callsign: state.callsign,
        originCountry: state.origin_country,
        altitude: altitudeFeet,
        groundSpeed: speedKnots,
        heading: state.true_track,
        verticalRate: state.vertical_rate,
        onGround: state.on_ground,
        squawk: state.squawk,
        isEmergency,
        emergencyType: isEmergency ? EMERGENCY_SQUAWKS[state.squawk as keyof typeof EMERGENCY_SQUAWKS] : null,
      },
      raw: state,
    };
  }

  /**
   * Get current position for a specific aircraft
   */
  getAircraftState(icao24: string): ADSBState | undefined {
    return this.lastStates.get(icao24);
  }

  /**
   * Get all currently tracked aircraft
   */
  getAllStates(): ADSBState[] {
    return Array.from(this.lastStates.values());
  }

  /**
   * Check if any aircraft has an emergency squawk
   */
  getEmergencyAircraft(): ADSBState[] {
    return this.getAllStates().filter(
      state => state.squawk in EMERGENCY_SQUAWKS
    );
  }
}
```

---

## Flight Layer Component

**File: `apps/web/src/features/map/layers/FlightLayer.tsx`**

```tsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Layer, Source, Popup } from 'react-map-gl';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { fetchFlightData } from '@/lib/api/feeds';
import type { FeatureCollection, Point } from 'geojson';

interface FlightState {
  icao24: string;
  callsign: string;
  latitude: number;
  longitude: number;
  altitude: number;       // feet
  heading: number;        // degrees
  groundSpeed: number;    // knots
  onGround: boolean;
  squawk: string;
  originCountry: string;
  isEmergency: boolean;
  emergencyType: string | null;
}

interface FlightLayerProps {
  projectId: string;
  visible: boolean;
  showLabels?: boolean;
  boundingBox?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

// Emergency squawk codes with labels and colors
const EMERGENCY_SQUAWKS: Record<string, { label: string; color: string }> = {
  '7500': { label: 'HIJACK', color: '#9333ea' },      // Purple
  '7600': { label: 'RADIO FAILURE', color: '#f97316' }, // Orange
  '7700': { label: 'EMERGENCY', color: '#ef4444' },   // Red
};

export function FlightLayer({
  projectId,
  visible,
  showLabels = true,
  boundingBox,
}: FlightLayerProps) {
  const [flights, setFlights] = useState<FlightState[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightState | null>(null);

  // Initial data fetch with 30-second polling
  const { data: initialData } = useQuery({
    queryKey: ['flights', projectId, boundingBox],
    queryFn: () => fetchFlightData(projectId, boundingBox),
    refetchInterval: 30000, // 30 seconds
    enabled: visible,
  });

  // WebSocket for real-time updates
  const { lastMessage, isConnected } = useWebSocket(
    `${import.meta.env.VITE_WS_URL}/ws/feeds/${projectId}/flights`
  );

  // Handle initial data
  useEffect(() => {
    if (initialData?.flights) {
      setFlights(initialData.flights);
    }
  }, [initialData]);

  // Handle WebSocket updates
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const data = JSON.parse(lastMessage.data);
      if (data.type === 'flight_update') {
        setFlights(prev => {
          const updated = new Map(prev.map(f => [f.icao24, f]));
          updated.set(data.payload.icao24, data.payload);
          return Array.from(updated.values());
        });
      } else if (data.type === 'flight_batch') {
        // Handle batch updates for efficiency
        setFlights(data.payload.flights);
      }
    } catch (error) {
      console.error('Failed to parse flight update:', error);
    }
  }, [lastMessage]);

  // Build GeoJSON from flight data
  const geojson = useMemo((): FeatureCollection<Point> => {
    return {
      type: 'FeatureCollection',
      features: flights.map(flight => ({
        type: 'Feature',
        id: flight.icao24,
        geometry: {
          type: 'Point',
          coordinates: [flight.longitude, flight.latitude],
        },
        properties: {
          icao24: flight.icao24,
          callsign: flight.callsign || flight.icao24,
          altitude: flight.altitude,
          heading: flight.heading,
          groundSpeed: flight.groundSpeed,
          onGround: flight.onGround,
          squawk: flight.squawk,
          originCountry: flight.originCountry,
          isEmergency: flight.isEmergency,
          emergencyType: flight.emergencyType,
        },
      })),
    };
  }, [flights]);

  // Handle click on aircraft
  const handleClick = useCallback((event: mapboxgl.MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (feature) {
      const flight = flights.find(f => f.icao24 === feature.properties?.icao24);
      setSelectedFlight(flight || null);
    }
  }, [flights]);

  if (!visible) return null;

  return (
    <>
      <Source id="flight-data" type="geojson" data={geojson}>
        {/* Emergency aircraft highlight ring */}
        <Layer
          id="flight-emergency-ring"
          type="circle"
          filter={['==', ['get', 'isEmergency'], true]}
          paint={{
            'circle-radius': 24,
            'circle-color': 'transparent',
            'circle-stroke-color': [
              'match', ['get', 'squawk'],
              '7500', EMERGENCY_SQUAWKS['7500'].color,
              '7600', EMERGENCY_SQUAWKS['7600'].color,
              '7700', EMERGENCY_SQUAWKS['7700'].color,
              '#ef4444'
            ],
            'circle-stroke-width': 3,
            'circle-opacity': [
              'interpolate', ['linear'], ['%', ['/', ['get', 'time'], 500], 1],
              0, 0.3,
              0.5, 1,
              1, 0.3,
            ],
          }}
        />

        {/* Aircraft icons */}
        <Layer
          id="flight-icons"
          type="symbol"
          layout={{
            'icon-image': 'aircraft-icon',
            'icon-size': [
              'interpolate', ['linear'], ['zoom'],
              5, 0.4,
              8, 0.6,
              12, 0.9,
            ],
            'icon-rotate': ['get', 'heading'],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          }}
          paint={{
            'icon-color': [
              'case',
              ['==', ['get', 'isEmergency'], true], '#ef4444',
              ['==', ['get', 'onGround'], true], '#6b7280',
              '#00d4ff' // Tactical blue
            ],
            'icon-opacity': [
              'case',
              ['==', ['get', 'onGround'], true], 0.6,
              1,
            ],
          }}
        />

        {/* Fallback circles when icon not loaded */}
        <Layer
          id="flight-circles"
          type="circle"
          filter={['!', ['has', 'icon-image']]}
          paint={{
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              5, 4,
              10, 6,
              15, 8,
            ],
            'circle-color': [
              'case',
              ['==', ['get', 'isEmergency'], true], '#ef4444',
              ['==', ['get', 'onGround'], true], '#6b7280',
              '#00d4ff'
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
          }}
        />

        {/* Callsign and altitude labels */}
        {showLabels && (
          <Layer
            id="flight-labels"
            type="symbol"
            minzoom={7}
            layout={{
              'text-field': [
                'concat',
                ['coalesce', ['get', 'callsign'], ['get', 'icao24']],
                '\n',
                ['to-string', ['get', 'altitude']],
                ' ft'
              ],
              'text-size': 10,
              'text-offset': [0, 1.8],
              'text-anchor': 'top',
              'text-font': ['JetBrains Mono Regular', 'monospace'],
              'text-max-width': 10,
            }}
            paint={{
              'text-color': [
                'case',
                ['==', ['get', 'isEmergency'], true], '#ef4444',
                '#e5e5e5'
              ],
              'text-halo-color': '#0a0a0a',
              'text-halo-width': 1.5,
            }}
          />
        )}
      </Source>

      {/* Popup for selected aircraft */}
      {selectedFlight && (
        <Popup
          latitude={selectedFlight.latitude}
          longitude={selectedFlight.longitude}
          onClose={() => setSelectedFlight(null)}
          closeButton={true}
          closeOnClick={false}
          className="flight-popup"
        >
          <div className="p-2 min-w-48 font-mono text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-tactical-blue">
                {selectedFlight.callsign || selectedFlight.icao24}
              </span>
              {selectedFlight.isEmergency && (
                <span className={`px-2 py-0.5 text-xs rounded ${
                  selectedFlight.squawk === '7500' ? 'bg-purple-500' :
                  selectedFlight.squawk === '7600' ? 'bg-orange-500' :
                  'bg-red-500'
                } text-white`}>
                  {EMERGENCY_SQUAWKS[selectedFlight.squawk]?.label}
                </span>
              )}
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Origin</span>
                <span>{selectedFlight.originCountry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Altitude</span>
                <span>
                  {selectedFlight.onGround
                    ? 'On Ground'
                    : `${selectedFlight.altitude.toLocaleString()} ft`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Speed</span>
                <span>{selectedFlight.groundSpeed} kts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Heading</span>
                <span>{Math.round(selectedFlight.heading)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Squawk</span>
                <span className={selectedFlight.isEmergency ? 'text-red-400' : ''}>
                  {selectedFlight.squawk || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
                <span className="text-gray-400">ICAO</span>
                <span className="text-gray-500">{selectedFlight.icao24}</span>
              </div>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}
```

---

## API Integration

**File: `apps/web/src/lib/api/feeds.ts`** (add to existing file)

```typescript
interface FlightDataResponse {
  flights: FlightState[];
  timestamp: number;
  count: number;
}

export async function fetchFlightData(
  projectId: string,
  boundingBox?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }
): Promise<FlightDataResponse> {
  const params = new URLSearchParams();

  if (boundingBox) {
    params.set('minLat', String(boundingBox.minLat));
    params.set('maxLat', String(boundingBox.maxLat));
    params.set('minLng', String(boundingBox.minLng));
    params.set('maxLng', String(boundingBox.maxLng));
  }

  const response = await fetch(
    `/api/feeds/${projectId}/flights?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch flight data');
  }

  return response.json();
}
```

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/feeds/adapters/adsb.adapter.ts` | ADS-B flight adapter for fetching aircraft data via OpenSky Network or ADS-B Exchange API |
| `apps/web/src/features/map/layers/FlightLayer.tsx` | React component for displaying aircraft on the map with callsign, altitude, and emergency highlighting |

---

## Acceptance Criteria

- [ ] ADS-B adapter fetches aircraft within bounding box
- [ ] Aircraft display on map with callsign and altitude
- [ ] Squawk codes highlighted (7500, 7600, 7700)
- [ ] Aircraft positions update every 30 seconds

---

## Environment Variables

```bash
# ADS-B API (OpenSky Network)
OPENSKY_USERNAME=your_username
OPENSKY_PASSWORD=your_password
ADSB_API_URL=https://opensky-network.org/api/states/all
ADSB_POLL_INTERVAL=30000
```
