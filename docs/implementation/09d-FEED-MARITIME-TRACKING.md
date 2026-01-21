# Phase 9d: Maritime Tracking (AIS)

Parent: [09-REALTIME-DATA-FEEDS.md](./09-REALTIME-DATA-FEEDS.md)

## Overview

This document covers AIS (Automatic Identification System) maritime vessel tracking integration for real-time vessel monitoring on the Geospatial Command Center map. AIS is a tracking system used by ships and vessel traffic services that provides automatic position reporting, identification, and other vessel information.

AIS data includes:
- **Position data**: Latitude, longitude, course over ground (COG), speed over ground (SOG)
- **Static data**: MMSI, IMO number, vessel name, callsign, ship type, dimensions
- **Voyage data**: Destination, ETA, draught, navigation status

**Tasks Covered:** 9.7, 9.13

---

## Data Source Comparison

| Source | Coverage | Latency | Access | Cost |
|--------|----------|---------|--------|------|
| **AISStream** | Global | Real-time | WebSocket | Free tier |
| **MarineTraffic** | Global | Minutes | API | Paid |
| **VesselFinder** | Global | Minutes | API | Paid |
| **AIS Hub** | Coastal | Real-time | Data sharing | Free |

---

## 9.7 AIS Maritime Adapter

### Ship Type Classifications

AIS defines ship types using numeric codes. The first digit indicates the general category:

| Code Range | Category | Description |
|------------|----------|-------------|
| 30-39 | Special | Fishing, towing, dredging, diving, military |
| 40-49 | High-Speed | High-speed craft, WIG |
| 50-59 | Service | Pilot, SAR, tug, port tender, law enforcement |
| 60-69 | Passenger | Passenger vessels |
| 70-79 | Cargo | Cargo ships |
| 80-89 | Tanker | Tankers |
| 90-99 | Other | Other vessel types |

### Navigation Status Codes

| Code | Status |
|------|--------|
| 0 | Under way using engine |
| 1 | At anchor |
| 2 | Not under command |
| 3 | Restricted maneuverability |
| 4 | Constrained by draught |
| 5 | Moored |
| 6 | Aground |
| 7 | Engaged in fishing |
| 8 | Under way sailing |
| 15 | Undefined |

### AIS Adapter Implementation

**File: `apps/api/src/feeds/adapters/ais.adapter.ts`**
```typescript
import { BaseFeedAdapter, type FeedConfig } from '../adapter.interface';
import type { NormalizedFeedItem } from '../../jobs/queues';

interface AISMessage {
  mmsi: string;           // Maritime Mobile Service Identity
  name: string;           // Vessel name
  imo?: string;           // IMO number
  callsign?: string;
  ship_type: number;      // AIS ship type code
  latitude: number;
  longitude: number;
  course: number;         // Course over ground (degrees)
  speed: number;          // Speed over ground (knots)
  heading: number;        // True heading (degrees)
  nav_status: number;     // Navigation status
  destination?: string;
  eta?: string;
  draught?: number;       // Ship's draught (meters)
  timestamp: number;
}

interface AISStreamMessage {
  MessageType: string;
  MetaData: {
    MMSI: number;
    ShipName: string;
    latitude: number;
    longitude: number;
    time_utc: string;
  };
  Message: {
    PositionReport?: {
      Cog: number;        // Course over ground
      Sog: number;        // Speed over ground
      TrueHeading: number;
      NavigationalStatus: number;
    };
    ShipStaticData?: {
      ImoNumber: number;
      CallSign: string;
      Type: number;
      Destination: string;
      Eta: { Month: number; Day: number; Hour: number; Minute: number };
      MaximumStaticDraught: number;
    };
  };
}

interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// Ship type classifications
const SHIP_TYPES: Record<number, string> = {
  30: 'Fishing',
  31: 'Towing',
  32: 'Towing (large)',
  33: 'Dredging',
  34: 'Diving',
  35: 'Military',
  36: 'Sailing',
  37: 'Pleasure Craft',
  40: 'High-Speed Craft',
  50: 'Pilot Vessel',
  51: 'Search and Rescue',
  52: 'Tug',
  53: 'Port Tender',
  55: 'Law Enforcement',
  60: 'Passenger',
  70: 'Cargo',
  80: 'Tanker',
  90: 'Other',
};

// Navigation status codes
const NAV_STATUS: Record<number, string> = {
  0: 'Under way using engine',
  1: 'At anchor',
  2: 'Not under command',
  3: 'Restricted maneuverability',
  4: 'Constrained by draught',
  5: 'Moored',
  6: 'Aground',
  7: 'Engaged in fishing',
  8: 'Under way sailing',
  15: 'Undefined',
};

export class AisAdapter extends BaseFeedAdapter {
  name = 'AIS Maritime Tracker';
  type = 'maritime';

  private wsUrl!: string;
  private apiKey!: string;
  private boundingBox?: BoundingBox;
  private vesselStates: Map<string, AISMessage> = new Map();
  private ws?: WebSocket;
  private pollInterval!: number;

  async initialize(config: FeedConfig): Promise<void> {
    await super.initialize(config);
    this.wsUrl = config.endpoint || 'wss://stream.aisstream.io/v0/stream';
    this.apiKey = config.apiKey!;
    this.boundingBox = config.options?.boundingBox as BoundingBox;
    this.pollInterval = config.pollInterval || 60000; // Default 60 seconds
  }

  /**
   * Fetch vessels within the configured bounding box
   * Returns current vessel states from the internal cache
   */
  async fetch(): Promise<AISMessage[]> {
    const vessels = Array.from(this.vesselStates.values());

    // Filter by bounding box if configured
    if (this.boundingBox) {
      return vessels.filter(v =>
        v.latitude >= this.boundingBox!.minLat &&
        v.latitude <= this.boundingBox!.maxLat &&
        v.longitude >= this.boundingBox!.minLng &&
        v.longitude <= this.boundingBox!.maxLng
      );
    }

    return vessels;
  }

  /**
   * Start WebSocket connection for real-time AIS data
   */
  startStream(onMessage: (vessel: AISMessage) => void): void {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      console.log('[AIS] WebSocket connected');

      // Subscribe to AIS stream with bounding box filter
      const subscriptionMessage = {
        APIKey: this.apiKey,
        BoundingBoxes: this.boundingBox ? [[
          [this.boundingBox.minLng, this.boundingBox.minLat],
          [this.boundingBox.maxLng, this.boundingBox.maxLat],
        ]] : undefined,
      };

      this.ws!.send(JSON.stringify(subscriptionMessage));
    };

    this.ws.onmessage = (event) => {
      try {
        const data: AISStreamMessage = JSON.parse(event.data.toString());
        const vessel = this.parseAISMessage(data);

        if (vessel) {
          this.vesselStates.set(vessel.mmsi, vessel);
          onMessage(vessel);
        }
      } catch (error) {
        console.error('[AIS] Failed to parse message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[AIS] WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('[AIS] WebSocket closed, reconnecting in 5s...');
      setTimeout(() => this.startStream(onMessage), 5000);
    };
  }

  private parseAISMessage(data: AISStreamMessage): AISMessage | null {
    const meta = data.MetaData;
    const posReport = data.Message.PositionReport;
    const staticData = data.Message.ShipStaticData;

    if (!meta.latitude || !meta.longitude) return null;

    return {
      mmsi: String(meta.MMSI),
      name: meta.ShipName || `MMSI ${meta.MMSI}`,
      imo: staticData?.ImoNumber ? String(staticData.ImoNumber) : undefined,
      callsign: staticData?.CallSign,
      ship_type: staticData?.Type || 0,
      latitude: meta.latitude,
      longitude: meta.longitude,
      course: posReport?.Cog || 0,
      speed: posReport?.Sog || 0,
      heading: posReport?.TrueHeading || 0,
      nav_status: posReport?.NavigationalStatus || 15,
      destination: staticData?.Destination,
      draught: staticData?.MaximumStaticDraught,
      timestamp: new Date(meta.time_utc).getTime(),
    };
  }

  normalize(vessel: AISMessage): NormalizedFeedItem {
    const shipType = SHIP_TYPES[Math.floor(vessel.ship_type / 10) * 10] || 'Unknown';
    const navStatus = NAV_STATUS[vessel.nav_status] || 'Unknown';

    return {
      id: `vessel-${vessel.mmsi}-${vessel.timestamp}`,
      type: 'maritime',
      title: vessel.name,
      content: `${vessel.name} (${shipType}) - ${navStatus}`,
      timestamp: new Date(vessel.timestamp),
      location: {
        lat: vessel.latitude,
        lng: vessel.longitude,
        name: vessel.name,
      },
      metadata: {
        mmsi: vessel.mmsi,
        imo: vessel.imo,
        callsign: vessel.callsign,
        shipType: vessel.ship_type,
        shipTypeLabel: shipType,
        course: vessel.course,
        speed: vessel.speed,
        heading: vessel.heading,
        navStatus: vessel.nav_status,
        navStatusLabel: navStatus,
        destination: vessel.destination,
        draught: vessel.draught,
      },
      raw: vessel,
    };
  }

  /**
   * Get vessel by MMSI
   */
  getVessel(mmsi: string): AISMessage | undefined {
    return this.vesselStates.get(mmsi);
  }

  /**
   * Get all tracked vessels
   */
  getAllVessels(): AISMessage[] {
    return Array.from(this.vesselStates.values());
  }

  async destroy(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this.vesselStates.clear();
  }
}

// Export ship type constants for use in UI
export { SHIP_TYPES, NAV_STATUS };
export type { AISMessage, BoundingBox };
```

---

## 9.13 Maritime Layer Component

The Maritime Layer displays vessels on the map with ship type differentiation, heading indicators, and name labels.

### Ship Type Icons and Colors

| Ship Type | Icon | Color | Hex |
|-----------|------|-------|-----|
| Fishing | Fish icon | Green | `#22c55e` |
| Military | Shield icon | Purple | `#7c3aed` |
| Passenger | Users icon | Blue | `#3b82f6` |
| Cargo | Box icon | Orange | `#f97316` |
| Tanker | Droplet icon | Red | `#ef4444` |
| Unknown/Other | Ship icon | Gray | `#6b7280` |

### Maritime Layer Implementation

**File: `apps/web/src/features/map/layers/MaritimeLayer.tsx`**
```tsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Layer, Source, Popup } from 'react-map-gl';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { fetchMaritimeData } from '@/lib/api/feeds';
import type { FeatureCollection, Point } from 'geojson';

interface VesselState {
  mmsi: string;
  name: string;
  latitude: number;
  longitude: number;
  course: number;
  speed: number;
  heading: number;
  shipType: number;
  shipTypeLabel: string;
  navStatus: number;
  navStatusLabel: string;
  destination?: string;
  imo?: string;
  callsign?: string;
  draught?: number;
}

interface MaritimeLayerProps {
  projectId: string;
  visible: boolean;
  showLabels?: boolean;
  shipTypeFilter?: number[];
  onVesselClick?: (vessel: VesselState) => void;
}

// Ship type colors for map visualization
const SHIP_TYPE_COLORS: Record<number, string> = {
  30: '#22c55e',  // Fishing - Green
  35: '#7c3aed',  // Military - Purple
  60: '#3b82f6',  // Passenger - Blue
  70: '#f97316',  // Cargo - Orange
  80: '#ef4444',  // Tanker - Red
  0: '#6b7280',   // Unknown - Gray
};

// Icon mapping for ship types
const SHIP_TYPE_ICONS: Record<number, string> = {
  30: 'fishing-vessel',
  35: 'military-vessel',
  60: 'passenger-vessel',
  70: 'cargo-vessel',
  80: 'tanker-vessel',
  0: 'default-vessel',
};

export function MaritimeLayer({
  projectId,
  visible,
  showLabels = true,
  shipTypeFilter,
  onVesselClick,
}: MaritimeLayerProps) {
  const [vessels, setVessels] = useState<VesselState[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<VesselState | null>(null);

  // Initial data fetch with 60-second refresh
  const { data: initialData, isLoading } = useQuery({
    queryKey: ['maritime', projectId],
    queryFn: () => fetchMaritimeData(projectId),
    refetchInterval: 60000, // Update every 60 seconds
    enabled: visible,
    staleTime: 30000,
  });

  // WebSocket for real-time updates
  const { lastMessage, isConnected } = useWebSocket(
    visible ? `${import.meta.env.VITE_WS_URL}/ws/feeds/${projectId}` : null
  );

  // Handle initial data load
  useEffect(() => {
    if (initialData?.vessels) {
      setVessels(initialData.vessels);
    }
  }, [initialData]);

  // Handle WebSocket updates
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const data = JSON.parse(lastMessage.data);
      if (data.type === 'vessel_update') {
        setVessels(prev => {
          const updated = new Map(prev.map(v => [v.mmsi, v]));
          updated.set(data.payload.mmsi, data.payload);
          return Array.from(updated.values());
        });
      }
    } catch (error) {
      console.error('Failed to parse vessel update:', error);
    }
  }, [lastMessage]);

  // Handle vessel click
  const handleVesselClick = useCallback((vessel: VesselState) => {
    setSelectedVessel(vessel);
    onVesselClick?.(vessel);
  }, [onVesselClick]);

  // Build GeoJSON feature collection
  const geojson = useMemo((): FeatureCollection<Point> => {
    let filtered = vessels;

    // Apply ship type filter if provided
    if (shipTypeFilter?.length) {
      filtered = filtered.filter(v =>
        shipTypeFilter.includes(Math.floor(v.shipType / 10) * 10)
      );
    }

    return {
      type: 'FeatureCollection',
      features: filtered.map(vessel => ({
        type: 'Feature',
        id: vessel.mmsi,
        geometry: {
          type: 'Point',
          coordinates: [vessel.longitude, vessel.latitude],
        },
        properties: {
          mmsi: vessel.mmsi,
          name: vessel.name,
          course: vessel.course,
          speed: vessel.speed,
          heading: vessel.heading,
          shipType: vessel.shipType,
          shipTypeLabel: vessel.shipTypeLabel,
          navStatus: vessel.navStatus,
          navStatusLabel: vessel.navStatusLabel,
          destination: vessel.destination || '',
          isMoving: vessel.speed > 0.5,
        },
      })),
    };
  }, [vessels, shipTypeFilter]);

  if (!visible) return null;

  return (
    <>
      <Source id="maritime-data" type="geojson" data={geojson}>
        {/* Vessel icons with heading rotation */}
        <Layer
          id="vessel-icons"
          type="symbol"
          layout={{
            'icon-image': [
              'match',
              ['floor', ['/', ['get', 'shipType'], 10]],
              3, SHIP_TYPE_ICONS[30],
              3.5, SHIP_TYPE_ICONS[35],
              6, SHIP_TYPE_ICONS[60],
              7, SHIP_TYPE_ICONS[70],
              8, SHIP_TYPE_ICONS[80],
              SHIP_TYPE_ICONS[0],
            ],
            'icon-size': [
              'interpolate', ['linear'], ['zoom'],
              5, 0.4,
              10, 0.7,
              15, 1.0,
            ],
            'icon-rotate': ['get', 'heading'],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          }}
          paint={{
            'icon-opacity': [
              'case',
              ['get', 'isMoving'], 1,
              0.6, // Dimmer for stationary vessels
            ],
          }}
        />

        {/* Fallback circles when icons not available */}
        <Layer
          id="vessel-circles"
          type="circle"
          paint={{
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              5, 4,
              10, 8,
              15, 12,
            ],
            'circle-color': [
              'match',
              ['floor', ['/', ['get', 'shipType'], 10]],
              3, SHIP_TYPE_COLORS[30],
              6, SHIP_TYPE_COLORS[60],
              7, SHIP_TYPE_COLORS[70],
              8, SHIP_TYPE_COLORS[80],
              SHIP_TYPE_COLORS[0],
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
            'circle-opacity': [
              'case',
              ['get', 'isMoving'], 1,
              0.5, // Dimmer for anchored/moored vessels
            ],
          }}
        />

        {/* Vessel name and heading labels */}
        {showLabels && (
          <Layer
            id="vessel-labels"
            type="symbol"
            minzoom={8}
            layout={{
              'text-field': [
                'format',
                ['get', 'name'], { 'font-scale': 1.0 },
                '\n', {},
                ['concat', ['to-string', ['round', ['get', 'heading']]], '\u00B0 ', ['to-string', ['round', ['get', 'speed']]], ' kts'],
                { 'font-scale': 0.8 },
              ],
              'text-size': 10,
              'text-offset': [0, 2],
              'text-anchor': 'top',
              'text-font': ['JetBrains Mono Regular', 'monospace'],
              'text-max-width': 12,
              'text-optional': true,
            }}
            paint={{
              'text-color': '#ffffff',
              'text-halo-color': '#000000',
              'text-halo-width': 1,
            }}
          />
        )}

        {/* Course vectors showing direction of travel */}
        <Layer
          id="vessel-course-vectors"
          type="line"
          minzoom={10}
          filter={['>', ['get', 'speed'], 0.5]}
          layout={{
            'line-cap': 'round',
          }}
          paint={{
            'line-color': '#00d4ff',
            'line-width': 2,
            'line-opacity': 0.7,
          }}
        />
      </Source>

      {/* Popup for selected vessel */}
      {selectedVessel && (
        <Popup
          longitude={selectedVessel.longitude}
          latitude={selectedVessel.latitude}
          anchor="bottom"
          onClose={() => setSelectedVessel(null)}
          closeOnClick={false}
          className="maritime-popup"
        >
          <div className="p-2 min-w-[200px]">
            <h3 className="font-semibold text-sm">{selectedVessel.name}</h3>
            <p className="text-xs text-muted-foreground mb-2">
              {selectedVessel.shipTypeLabel}
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-muted-foreground">Speed:</span>
              <span className="font-mono">{selectedVessel.speed.toFixed(1)} kts</span>
              <span className="text-muted-foreground">Heading:</span>
              <span className="font-mono">{Math.round(selectedVessel.heading)}&deg;</span>
              <span className="text-muted-foreground">Status:</span>
              <span>{selectedVessel.navStatusLabel}</span>
              {selectedVessel.destination && (
                <>
                  <span className="text-muted-foreground">Destination:</span>
                  <span className="truncate">{selectedVessel.destination}</span>
                </>
              )}
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}

export { SHIP_TYPE_COLORS, SHIP_TYPE_ICONS };
export type { VesselState, MaritimeLayerProps };
```

---

## Vessel Details Panel

**File: `apps/web/src/features/map/panels/VesselDetailsPanel.tsx`**
```tsx
import { Ship, Navigation, Anchor, MapPin, Radio, Ruler } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface VesselDetailsPanelProps {
  vessel: {
    mmsi: string;
    name: string;
    imo?: string;
    callsign?: string;
    shipTypeLabel: string;
    course: number;
    speed: number;
    heading: number;
    navStatusLabel: string;
    destination?: string;
    draught?: number;
  };
  onClose: () => void;
}

export function VesselDetailsPanel({ vessel, onClose }: VesselDetailsPanelProps) {
  const isMoving = vessel.speed > 0.5;

  return (
    <Card className="w-80 bg-background/95 backdrop-blur border-cyan-800/50">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-cyan-800/30">
        <CardTitle className="text-sm flex items-center gap-2">
          <Ship className="w-4 h-4 text-cyan-400" />
          {vessel.name}
        </CardTitle>
        <Badge variant={isMoving ? 'default' : 'secondary'}>
          {vessel.navStatusLabel}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3 text-sm pt-3">
        {/* Vessel Type */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Type</span>
          <span>{vessel.shipTypeLabel}</span>
        </div>

        {/* Speed */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Speed</span>
          <span className="font-mono text-cyan-400">{vessel.speed.toFixed(1)} kts</span>
        </div>

        {/* Course Over Ground */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1">
            <Navigation className="w-3 h-3" /> Course
          </span>
          <span className="font-mono">{Math.round(vessel.course)}&deg;</span>
        </div>

        {/* True Heading */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Heading</span>
          <span className="font-mono">{Math.round(vessel.heading)}&deg;</span>
        </div>

        {/* Destination */}
        {vessel.destination && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Destination
            </span>
            <span className="text-right max-w-[150px] truncate">
              {vessel.destination}
            </span>
          </div>
        )}

        {/* Draught */}
        {vessel.draught && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Ruler className="w-3 h-3" /> Draught
            </span>
            <span className="font-mono">{vessel.draught.toFixed(1)} m</span>
          </div>
        )}

        {/* Identifiers Section */}
        <div className="border-t border-cyan-800/30 pt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">MMSI</span>
            <span className="font-mono">{vessel.mmsi}</span>
          </div>
          {vessel.imo && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">IMO</span>
              <span className="font-mono">{vessel.imo}</span>
            </div>
          )}
          {vessel.callsign && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Radio className="w-3 h-3" /> Callsign
              </span>
              <span className="font-mono">{vessel.callsign}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## API Client Functions

**File: `apps/web/src/lib/api/feeds.ts`** (maritime-related functions)
```typescript
import { api } from './client';

interface MaritimeDataResponse {
  vessels: VesselState[];
  timestamp: string;
  count: number;
}

/**
 * Fetch maritime vessel data for a project
 */
export async function fetchMaritimeData(projectId: string): Promise<MaritimeDataResponse> {
  const response = await api.get(`/feeds/${projectId}/maritime`);
  return response.data;
}

/**
 * Fetch vessel details by MMSI
 */
export async function fetchVesselDetails(projectId: string, mmsi: string) {
  const response = await api.get(`/feeds/${projectId}/maritime/${mmsi}`);
  return response.data;
}

/**
 * Fetch vessel track history
 */
export async function fetchVesselTrack(projectId: string, mmsi: string, hours: number = 24) {
  const response = await api.get(`/feeds/${projectId}/maritime/${mmsi}/track`, {
    params: { hours },
  });
  return response.data;
}
```

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/feeds/adapters/ais.adapter.ts` | AIS maritime adapter with WebSocket support |
| `apps/web/src/features/map/layers/MaritimeLayer.tsx` | Maritime vessel tracking map layer |
| `apps/web/src/features/map/panels/VesselDetailsPanel.tsx` | Vessel details panel component |

---

## Acceptance Criteria

- [ ] AIS adapter fetches vessels within bounding box
- [ ] Vessels display on map with name and heading
- [ ] Ship types differentiated by icon/color:
  - Fishing vessels: Green
  - Military vessels: Purple
  - Passenger vessels: Blue
  - Cargo vessels: Orange
  - Tankers: Red
  - Unknown/Other: Gray
- [ ] Vessel positions update every 60 seconds
- [ ] Stationary vessels (anchored/moored) visually distinct from moving vessels
- [ ] Vessel labels show name, heading, and speed at zoom level 8+
- [ ] Course vectors display for moving vessels at zoom level 10+
- [ ] Click on vessel shows popup with details
- [ ] Details panel displays MMSI, IMO, callsign, destination, and draught
- [ ] WebSocket updates reflect on map in real-time

---

## Environment Variables

```bash
# AIS Stream API
AISSTREAM_API_KEY=your_api_key
AIS_WS_URL=wss://stream.aisstream.io/v0/stream

# Optional: MarineTraffic API (alternative provider)
MARINETRAFFIC_API_KEY=your_api_key
```

---

## Testing

### Unit Tests

```typescript
// apps/api/src/feeds/adapters/__tests__/ais.adapter.test.ts
import { AisAdapter } from '../ais.adapter';

describe('AisAdapter', () => {
  let adapter: AisAdapter;

  beforeEach(async () => {
    adapter = new AisAdapter();
    await adapter.initialize({
      id: 'test-ais',
      name: 'Test AIS',
      type: 'maritime',
      enabled: true,
      pollInterval: 60000,
      apiKey: 'test-key',
      options: {
        boundingBox: {
          minLat: 25.0,
          maxLat: 50.0,
          minLng: -130.0,
          maxLng: -60.0,
        },
      },
    });
  });

  it('should normalize vessel data correctly', () => {
    const rawVessel = {
      mmsi: '123456789',
      name: 'TEST VESSEL',
      ship_type: 70,
      latitude: 37.7749,
      longitude: -122.4194,
      course: 180,
      speed: 12.5,
      heading: 175,
      nav_status: 0,
      timestamp: Date.now(),
    };

    const normalized = adapter.normalize(rawVessel);

    expect(normalized.id).toContain('vessel-123456789');
    expect(normalized.type).toBe('maritime');
    expect(normalized.title).toBe('TEST VESSEL');
    expect(normalized.metadata.shipTypeLabel).toBe('Cargo');
  });

  it('should filter vessels by bounding box', async () => {
    // Add test vessels to internal state
    // ... test implementation
  });
});
```

### Integration Tests

```typescript
// apps/web/src/features/map/layers/__tests__/MaritimeLayer.test.tsx
import { render, screen } from '@testing-library/react';
import { MaritimeLayer } from '../MaritimeLayer';

describe('MaritimeLayer', () => {
  it('should render vessels on the map', () => {
    // ... test implementation
  });

  it('should filter by ship type', () => {
    // ... test implementation
  });

  it('should update positions via WebSocket', () => {
    // ... test implementation
  });
});
```
