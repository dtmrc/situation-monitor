# Phase 7: Geospatial Command Center

## Overview

**Purpose:** Build the F.0 Geospatial Command Center - the primary map-centric interface that serves as the central hub for situation awareness with real-time data layers, floating panels, and tactical overlays.

**Dependencies:** Phases 4, 5, 6 (Dashboard Suite)

**Deliverables:**
- Full-screen map interface with Mapbox GL JS
- 9-layer architecture for data visualization
- Floating dashboard panels
- Real-time marker updates via WebSocket
- Layer controls and filtering
- Tactical overlay effects

---

## Interface Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ GEOSPATIAL COMMAND CENTER                    [Layers] [Search] [⚙️] [🔔 3] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐                                    ┌─────────────────┐   │
│  │ LAYER CONTROL│                                    │  SITUATION      │   │
│  │              │                                    │  OVERVIEW       │   │
│  │ ☑ Basemap    │                                    │                 │   │
│  │ ☑ Infra      │      ┌─────────┐                  │  Active: 12     │   │
│  │ ☑ Heat Maps  │      │   NAI   │                  │  Critical: 3    │   │
│  │ ☑ NAIs       │      │ Popup   │                  │  Alerts: 5      │   │
│  │ ☑ Actors     │      └─────────┘                  │                 │   │
│  │ ☐ Events     │              ●                    │  [Details →]    │   │
│  │ ☑ Maritime   │         ● ●      ✈️               └─────────────────┘   │
│  │ ☑ Flight     │      ●       ●                                          │
│  │ ☑ Alerts     │                    ● ●                                  │
│  └──────────────┘   ●                        ⚠️                           │
│                            ●  ●                                            │
│                       ●         ●                    ┌─────────────────┐   │
│                                         🚢          │  QUICK FILTERS  │   │
│                    ●      ●                         │                 │   │
│                                    ●                │  [Threats ▼]    │   │
│                         ●    ●                      │  [Time ▼]       │   │
│                                                     │  [Priority ▼]   │   │
│                                                     └─────────────────┘   │
│                                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  [📍] [-] [+] [🧭]  │  Lat: 48.8566  Long: 2.3522  │  Zoom: 8  │  UTC 14:30 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9-Layer Architecture

| Layer | Name | Data | Visibility | Z-Index |
|-------|------|------|------------|---------|
| 0 | Basemap | Mapbox Dark/Satellite | Always | 0 |
| 1 | Infrastructure | Roads, borders, facilities | Toggle | 10 |
| 2 | Heat Maps | Activity density, threat concentration | Toggle | 20 |
| 3 | Named Areas of Interest | NAI polygons/circles | Toggle | 30 |
| 4 | Actors | Threat actors, friendly forces | Toggle | 40 |
| 5 | Events | Incidents, observations | Toggle | 50 |
| 6 | Maritime | Ship tracks (AIS) | Toggle | 60 |
| 7 | Flight | Aircraft tracks (ADS-B) | Toggle | 70 |
| 8 | Alerts | Triggered tripwires, warnings | Always | 100 |

---

## Implementation Tasks

| ID | Task | Agent | Priority | Dependencies |
|----|------|-------|----------|--------------|
| 7.1 | Set up Mapbox GL JS with dark style | `tactical-visualization-expert` | Critical | Phase 3 |
| 7.2 | Create MapContainer with controls | `tactical-visualization-expert` | Critical | 7.1 |
| 7.3 | Implement layer toggle system | `frontend-developer-designer` | Critical | 7.2 |
| 7.4 | Build Layer 0: Basemap with style switcher | `tactical-visualization-expert` | High | 7.1 |
| 7.5 | Build Layer 1: Infrastructure | `tactical-visualization-expert` | Medium | 7.2 |
| 7.6 | Build Layer 2: Heat maps | `tactical-visualization-expert` | High | 7.2 |
| 7.7 | Build Layer 3: NAI polygons/circles | `tactical-visualization-expert` | Critical | 7.2 |
| 7.8 | Build Layer 4: Actor markers | `tactical-visualization-expert` | High | 7.2 |
| 7.9 | Build Layer 5: Event markers | `tactical-visualization-expert` | High | 7.2 |
| 7.10 | Build Layer 6: Maritime tracks | `tactical-visualization-expert` | Medium | 7.2 |
| 7.11 | Build Layer 7: Flight tracks | `tactical-visualization-expert` | Medium | 7.2 |
| 7.12 | Build Layer 8: Alert markers | `tactical-visualization-expert` | Critical | 7.2 |
| 7.13 | Create floating panel system | `ops-center-ui-expert` | High | 7.2 |
| 7.14 | Build Situation Overview panel | `ops-center-ui-expert` | High | 7.13 |
| 7.15 | Build Layer Control panel | `frontend-developer-designer` | High | 7.3 |
| 7.16 | Build Quick Filters panel | `frontend-developer-designer` | Medium | 7.13 |
| 7.17 | Create marker popup system | `tactical-visualization-expert` | High | 7.8 |
| 7.18 | Implement marker clustering | `tactical-visualization-expert` | High | 7.8 |
| 7.19 | Build status bar component | `ops-center-ui-expert` | Medium | 7.2 |
| 7.20 | Set up WebSocket for real-time updates | `frontend-developer-designer` | Critical | 7.2 |
| 7.21 | Implement tactical overlay effects | `ops-center-ui-expert` | Low | 7.2 |
| 7.22 | Build draw tools for NAI creation | `tactical-visualization-expert` | Medium | 7.7 |
| 7.23 | Create geospatial search | `frontend-developer-designer` | Medium | 7.2 |

---

## Detailed Component Specifications

### Map Container

**File: `apps/web/src/features/command/MapContainer.tsx`**
```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { useMapStore } from './store';
import { LayerControl } from './LayerControl';
import { FloatingPanels } from './FloatingPanels';
import { StatusBar } from './StatusBar';
import { useWebSocket } from '@/hooks/useWebSocket';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapContainerProps {
  projectId: string;
}

export function MapContainer({ projectId }: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const {
    center,
    zoom,
    layers,
    setMap,
    updateMarker,
  } = useMapStore();

  // WebSocket for real-time updates
  const { lastMessage } = useWebSocket(`/api/ws/map/${projectId}`);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [center.lng, center.lat],
      zoom,
      attributionControl: false,
      preserveDrawingBuffer: true,
    });

    // Add controls
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-left');
    map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    map.on('load', () => {
      setMapLoaded(true);
      setMap(map);

      // Add custom layers
      addCustomLayers(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle real-time updates
  useEffect(() => {
    if (!lastMessage || !mapRef.current) return;

    const data = JSON.parse(lastMessage.data);

    switch (data.type) {
      case 'marker_update':
        updateMarker(data.payload);
        break;
      case 'alert':
        showAlertMarker(mapRef.current, data.payload);
        break;
      case 'track_update':
        updateTrack(mapRef.current, data.payload);
        break;
    }
  }, [lastMessage, updateMarker]);

  return (
    <div className="relative w-full h-full">
      {/* Map */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none scanline-overlay opacity-10" />

      {/* Floating panels */}
      {mapLoaded && (
        <>
          <LayerControl className="absolute top-4 left-4" />
          <FloatingPanels className="absolute top-4 right-4" />
        </>
      )}

      {/* Status bar */}
      <StatusBar
        map={mapRef.current}
        className="absolute bottom-0 left-0 right-0"
      />
    </div>
  );
}

function addCustomLayers(map: mapboxgl.Map) {
  // Layer 2: Heat map source
  map.addSource('activity-heat', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  map.addLayer({
    id: 'activity-heatmap',
    type: 'heatmap',
    source: 'activity-heat',
    paint: {
      'heatmap-weight': ['get', 'weight'],
      'heatmap-intensity': 1,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.2, 'rgba(0,255,136,0.3)',
        0.4, 'rgba(0,212,255,0.5)',
        0.6, 'rgba(255,170,0,0.7)',
        1, 'rgba(255,51,51,0.9)',
      ],
      'heatmap-radius': 30,
    },
  });

  // Layer 3: NAI source
  map.addSource('nais', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  map.addLayer({
    id: 'nai-fill',
    type: 'fill',
    source: 'nais',
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': 0.2,
    },
  });

  map.addLayer({
    id: 'nai-outline',
    type: 'line',
    source: 'nais',
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 2,
      'line-dasharray': [2, 2],
    },
  });

  // Layer 4: Actors source
  map.addSource('actors', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  });

  // Clustered circles
  map.addLayer({
    id: 'actor-clusters',
    type: 'circle',
    source: 'actors',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#00ff88',
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        15, 10, 20, 50, 25,
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#0a0a0a',
    },
  });

  // Cluster count
  map.addLayer({
    id: 'actor-cluster-count',
    type: 'symbol',
    source: 'actors',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
    paint: {
      'text-color': '#0a0a0a',
    },
  });

  // Individual markers
  map.addLayer({
    id: 'actor-markers',
    type: 'circle',
    source: 'actors',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': 8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#0a0a0a',
    },
  });

  // Layer 8: Alerts (always on top)
  map.addSource('alerts', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  map.addLayer({
    id: 'alert-markers',
    type: 'symbol',
    source: 'alerts',
    layout: {
      'icon-image': 'warning',
      'icon-size': 1.5,
      'icon-allow-overlap': true,
    },
  });

  // Pulsing effect for alerts
  map.addLayer({
    id: 'alert-pulse',
    type: 'circle',
    source: 'alerts',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['get', 'pulse'],
        0, 15,
        1, 30,
      ],
      'circle-color': '#ff3333',
      'circle-opacity': [
        'interpolate',
        ['linear'],
        ['get', 'pulse'],
        0, 0.6,
        1, 0,
      ],
    },
  });
}

function showAlertMarker(map: mapboxgl.Map, alert: { lat: number; lng: number; message: string }) {
  const source = map.getSource('alerts') as mapboxgl.GeoJSONSource;
  if (!source) return;

  // Add alert to source
  const currentData = (source as any)._data;
  currentData.features.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [alert.lng, alert.lat] },
    properties: { message: alert.message, pulse: 0 },
  });
  source.setData(currentData);
}

function updateTrack(map: mapboxgl.Map, track: { id: string; type: string; positions: [number, number][] }) {
  // Update maritime or flight track line
  const sourceId = track.type === 'maritime' ? 'maritime-tracks' : 'flight-tracks';
  const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
  if (!source) return;

  // Update track data
  // Implementation depends on track data structure
}
```

### Layer Control Component

**File: `apps/web/src/features/command/LayerControl.tsx`**
```typescript
import { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useMapStore } from './store';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LayerConfig {
  id: string;
  name: string;
  icon: string;
  defaultVisible: boolean;
  hasOpacity: boolean;
}

const layerConfigs: LayerConfig[] = [
  { id: 'basemap', name: 'Basemap', icon: '🗺️', defaultVisible: true, hasOpacity: false },
  { id: 'infrastructure', name: 'Infrastructure', icon: '🏗️', defaultVisible: true, hasOpacity: true },
  { id: 'heatmaps', name: 'Heat Maps', icon: '🔥', defaultVisible: true, hasOpacity: true },
  { id: 'nais', name: 'NAIs', icon: '📍', defaultVisible: true, hasOpacity: true },
  { id: 'actors', name: 'Actors', icon: '👤', defaultVisible: true, hasOpacity: true },
  { id: 'events', name: 'Events', icon: '⚡', defaultVisible: false, hasOpacity: true },
  { id: 'maritime', name: 'Maritime', icon: '🚢', defaultVisible: true, hasOpacity: true },
  { id: 'flight', name: 'Flight', icon: '✈️', defaultVisible: true, hasOpacity: true },
  { id: 'alerts', name: 'Alerts', icon: '⚠️', defaultVisible: true, hasOpacity: false },
];

interface LayerControlProps {
  className?: string;
}

export function LayerControl({ className }: LayerControlProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { layers, toggleLayer, setLayerOpacity } = useMapStore();

  return (
    <Card className={cn('w-56 bg-card/90 backdrop-blur', className)}>
      <CardHeader
        className="py-3 px-4 cursor-pointer flex flex-row items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Layers
        </CardTitle>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-3">
          {layerConfigs.map((config) => {
            const layer = layers[config.id] || { visible: config.defaultVisible, opacity: 1 };

            return (
              <div key={config.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <span>{config.icon}</span>
                    <span>{config.name}</span>
                  </label>
                  <Switch
                    checked={layer.visible}
                    onCheckedChange={() => toggleLayer(config.id)}
                    disabled={config.id === 'basemap' || config.id === 'alerts'}
                  />
                </div>

                {config.hasOpacity && layer.visible && (
                  <div className="pl-6">
                    <Slider
                      value={[layer.opacity * 100]}
                      onValueChange={([value]) => setLayerOpacity(config.id, value / 100)}
                      max={100}
                      step={10}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
```

### Floating Panels System

**File: `apps/web/src/features/command/FloatingPanels.tsx`**
```typescript
import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SituationOverview } from './panels/SituationOverview';
import { QuickFilters } from './panels/QuickFilters';
import { AlertFeed } from './panels/AlertFeed';

interface Panel {
  id: string;
  title: string;
  component: React.ComponentType;
  defaultOpen: boolean;
}

const panels: Panel[] = [
  { id: 'situation', title: 'Situation Overview', component: SituationOverview, defaultOpen: true },
  { id: 'alerts', title: 'Alert Feed', component: AlertFeed, defaultOpen: true },
  { id: 'filters', title: 'Quick Filters', component: QuickFilters, defaultOpen: false },
];

interface FloatingPanelsProps {
  className?: string;
}

export function FloatingPanels({ className }: FloatingPanelsProps) {
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>(
    panels.reduce((acc, p) => ({ ...acc, [p.id]: p.defaultOpen }), {})
  );

  const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({});

  const togglePanel = (id: string) => {
    setOpenPanels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCollapse = (id: string) => {
    setCollapsedPanels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={cn('flex flex-col gap-4 w-72', className)}>
      {panels.map((panel) => {
        if (!openPanels[panel.id]) return null;

        const isCollapsed = collapsedPanels[panel.id];
        const Component = panel.component;

        return (
          <Card key={panel.id} className="bg-card/90 backdrop-blur">
            <CardHeader className="py-2 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">{panel.title}</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => toggleCollapse(panel.id)}
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => togglePanel(panel.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {!isCollapsed && (
              <CardContent className="pt-0">
                <Component />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
```

### Situation Overview Panel

**File: `apps/web/src/features/command/panels/SituationOverview.tsx`**
```typescript
import { useQuery } from '@tanstack/react-query';
import { Shield, Target, AlertTriangle, Radio } from 'lucide-react';

import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface SituationMetrics {
  activeThreats: number;
  pendingPirs: number;
  activeNais: number;
  triggeredAlerts: number;
}

export function SituationOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['situation-metrics'],
    queryFn: () => api.get<SituationMetrics>('/dashboards/metrics'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const metrics = [
    {
      label: 'Active Threats',
      value: data?.activeThreats ?? '-',
      icon: Shield,
      critical: (data?.activeThreats ?? 0) > 5,
    },
    {
      label: 'Pending PIRs',
      value: data?.pendingPirs ?? '-',
      icon: Target,
      critical: false,
    },
    {
      label: 'Active NAIs',
      value: data?.activeNais ?? '-',
      icon: Radio,
      critical: false,
    },
    {
      label: 'Alerts',
      value: data?.triggeredAlerts ?? '-',
      icon: AlertTriangle,
      critical: (data?.triggeredAlerts ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-3">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={cn(
            'flex items-center justify-between p-2 rounded-md',
            metric.critical ? 'bg-tactical-red/10' : 'bg-secondary/50'
          )}
        >
          <div className="flex items-center gap-2">
            <metric.icon
              className={cn(
                'w-4 h-4',
                metric.critical ? 'text-tactical-red' : 'text-muted-foreground'
              )}
            />
            <span className="text-sm">{metric.label}</span>
          </div>
          <span
            className={cn(
              'font-mono font-bold',
              metric.critical ? 'text-tactical-red' : 'text-foreground'
            )}
          >
            {isLoading ? '...' : metric.value}
          </span>
        </div>
      ))}

      <button className="w-full text-sm text-primary hover:underline mt-2">
        View Full Dashboard →
      </button>
    </div>
  );
}
```

### Map Store (Zustand)

**File: `apps/web/src/features/command/store.ts`**
```typescript
import { create } from 'zustand';
import type mapboxgl from 'mapbox-gl';

interface LayerState {
  visible: boolean;
  opacity: number;
}

interface Marker {
  id: string;
  type: string;
  lat: number;
  lng: number;
  properties: Record<string, unknown>;
}

interface MapState {
  map: mapboxgl.Map | null;
  center: { lat: number; lng: number };
  zoom: number;
  layers: Record<string, LayerState>;
  markers: Map<string, Marker>;

  // Actions
  setMap: (map: mapboxgl.Map) => void;
  setCenter: (lat: number, lng: number) => void;
  setZoom: (zoom: number) => void;
  toggleLayer: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  updateMarker: (marker: Marker) => void;
  removeMarker: (id: string) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  map: null,
  center: { lat: 48.8566, lng: 2.3522 }, // Default: Paris
  zoom: 6,
  layers: {
    basemap: { visible: true, opacity: 1 },
    infrastructure: { visible: true, opacity: 0.8 },
    heatmaps: { visible: true, opacity: 0.7 },
    nais: { visible: true, opacity: 0.8 },
    actors: { visible: true, opacity: 1 },
    events: { visible: false, opacity: 1 },
    maritime: { visible: true, opacity: 0.9 },
    flight: { visible: true, opacity: 0.9 },
    alerts: { visible: true, opacity: 1 },
  },
  markers: new Map(),

  setMap: (map) => set({ map }),

  setCenter: (lat, lng) => {
    set({ center: { lat, lng } });
    get().map?.flyTo({ center: [lng, lat] });
  },

  setZoom: (zoom) => {
    set({ zoom });
    get().map?.setZoom(zoom);
  },

  toggleLayer: (layerId) => {
    const { layers, map } = get();
    const layer = layers[layerId];
    if (!layer || !map) return;

    const newVisible = !layer.visible;
    set({
      layers: {
        ...layers,
        [layerId]: { ...layer, visible: newVisible },
      },
    });

    // Update map layer visibility
    const mapLayerIds = getMapLayerIds(layerId);
    mapLayerIds.forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', newVisible ? 'visible' : 'none');
      }
    });
  },

  setLayerOpacity: (layerId, opacity) => {
    const { layers, map } = get();
    const layer = layers[layerId];
    if (!layer || !map) return;

    set({
      layers: {
        ...layers,
        [layerId]: { ...layer, opacity },
      },
    });

    // Update map layer opacity
    const mapLayerIds = getMapLayerIds(layerId);
    mapLayerIds.forEach((id) => {
      if (map.getLayer(id)) {
        const layerType = map.getLayer(id)?.type;
        const opacityProp = getOpacityProperty(layerType);
        if (opacityProp) {
          map.setPaintProperty(id, opacityProp, opacity);
        }
      }
    });
  },

  updateMarker: (marker) => {
    const { markers, map } = get();
    markers.set(marker.id, marker);
    set({ markers: new Map(markers) });

    // Update GeoJSON source
    if (map) {
      updateMarkerSource(map, marker);
    }
  },

  removeMarker: (id) => {
    const { markers } = get();
    markers.delete(id);
    set({ markers: new Map(markers) });
  },
}));

function getMapLayerIds(layerId: string): string[] {
  const mapping: Record<string, string[]> = {
    heatmaps: ['activity-heatmap'],
    nais: ['nai-fill', 'nai-outline'],
    actors: ['actor-clusters', 'actor-cluster-count', 'actor-markers'],
    events: ['event-markers'],
    maritime: ['maritime-tracks', 'maritime-markers'],
    flight: ['flight-tracks', 'flight-markers'],
    alerts: ['alert-markers', 'alert-pulse'],
  };
  return mapping[layerId] || [];
}

function getOpacityProperty(layerType?: string): string | null {
  switch (layerType) {
    case 'fill':
      return 'fill-opacity';
    case 'line':
      return 'line-opacity';
    case 'circle':
      return 'circle-opacity';
    case 'symbol':
      return 'icon-opacity';
    case 'heatmap':
      return 'heatmap-opacity';
    default:
      return null;
  }
}

function updateMarkerSource(map: mapboxgl.Map, marker: Marker) {
  const sourceId = `${marker.type}s`; // e.g., 'actors'
  const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
  if (!source) return;

  // Get current data and update
  // This is a simplified version - real implementation would batch updates
}
```

---

## WebSocket Integration

**File: `apps/web/src/hooks/useWebSocket.ts`**
```typescript
import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  data: string;
  timestamp: number;
}

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      setLastMessage({
        data: event.data,
        timestamp: Date.now(),
      });
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close();
    };

    wsRef.current = ws;
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { isConnected, lastMessage, sendMessage };
}
```

---

## API Endpoints Required

### Map Data
```
GET /api/projects/:id/map/nais
GET /api/projects/:id/map/actors
GET /api/projects/:id/map/events
GET /api/projects/:id/map/heatmap
GET /api/projects/:id/map/tracks?type=maritime|flight
```

### WebSocket Messages
```
// Server -> Client
{ type: 'marker_update', payload: { id, lat, lng, type, properties } }
{ type: 'alert', payload: { id, lat, lng, message, severity } }
{ type: 'track_update', payload: { id, type, positions } }

// Client -> Server
{ type: 'subscribe', payload: { layers: string[] } }
{ type: 'viewport', payload: { bounds, zoom } }
```

---

## Acceptance Criteria

- [ ] Map loads with dark Mapbox style
- [ ] All 9 layers render correctly
- [ ] Layer toggles work with opacity controls
- [ ] Markers cluster at appropriate zoom levels
- [ ] NAI polygons display with correct styling
- [ ] Real-time updates via WebSocket work
- [ ] Alert markers pulse with animation
- [ ] Floating panels can be collapsed/closed
- [ ] Status bar shows coordinates and time
- [ ] Tactical scanline overlay renders

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/web/src/routes/_app.command.tsx` | Command Center page |
| `apps/web/src/features/command/MapContainer.tsx` | Main map component |
| `apps/web/src/features/command/LayerControl.tsx` | Layer toggle panel |
| `apps/web/src/features/command/FloatingPanels.tsx` | Panel system |
| `apps/web/src/features/command/StatusBar.tsx` | Bottom status bar |
| `apps/web/src/features/command/store.ts` | Zustand map store |
| `apps/web/src/features/command/panels/SituationOverview.tsx` | Overview panel |
| `apps/web/src/features/command/panels/QuickFilters.tsx` | Filter panel |
| `apps/web/src/features/command/panels/AlertFeed.tsx` | Alert feed panel |
| `apps/web/src/features/command/layers/` | Layer-specific components |
| `apps/web/src/hooks/useWebSocket.ts` | WebSocket hook |

---

## Dependencies

```bash
cd apps/web
pnpm add mapbox-gl @types/mapbox-gl
pnpm add zustand
pnpm add supercluster @types/supercluster  # For clustering
```

---

## Custom Tactical Mapbox Style

A custom Mapbox style optimized for the ops-center dark theme aesthetic.

### Style Specification

**Style Name:** `tactical-dark`

**Style URL:** Create this style in Mapbox Studio at `mapbox://styles/your-username/tactical-dark`

### Style Configuration Guide

Create the style in Mapbox Studio with these parameters:

#### Base Configuration
```json
{
  "version": 8,
  "name": "Tactical Dark",
  "sprite": "mapbox://sprites/your-username/tactical-dark",
  "glyphs": "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  "sources": {
    "mapbox": {
      "url": "mapbox://mapbox.mapbox-streets-v8",
      "type": "vector"
    }
  }
}
```

#### Color Palette
| Element | Color | HSL |
|---------|-------|-----|
| Background (land) | `#0a0a0a` | 0, 0%, 4% |
| Water | `#0d1117` | 215, 33%, 7% |
| Roads (major) | `#1a1a1a` | 0, 0%, 10% |
| Roads (minor) | `#141414` | 0, 0%, 8% |
| Borders (national) | `#00ff88` | 152, 100%, 50% |
| Borders (admin) | `#2a4a3a` | 150, 30%, 23% |
| Labels (primary) | `#a3a3a3` | 0, 0%, 64% |
| Labels (secondary) | `#525252` | 0, 0%, 32% |
| POI icons | `#00d4ff` | 192, 100%, 50% |
| Contours | `#1f1f1f` | 0, 0%, 12% |

#### Layer Configuration

```javascript
// Example layers for Mapbox Studio
const tacticalLayers = [
  // Background
  {
    id: 'background',
    type: 'background',
    paint: {
      'background-color': '#0a0a0a'
    }
  },

  // Water
  {
    id: 'water',
    type: 'fill',
    source: 'mapbox',
    'source-layer': 'water',
    paint: {
      'fill-color': '#0d1117',
      'fill-outline-color': '#1a3040'
    }
  },

  // Landuse (parks, etc - very subtle)
  {
    id: 'landuse-park',
    type: 'fill',
    source: 'mapbox',
    'source-layer': 'landuse',
    filter: ['==', 'class', 'park'],
    paint: {
      'fill-color': '#0f1a14',
      'fill-opacity': 0.5
    }
  },

  // Roads - minor
  {
    id: 'road-minor',
    type: 'line',
    source: 'mapbox',
    'source-layer': 'road',
    filter: ['in', 'class', 'street', 'street_limited', 'service'],
    paint: {
      'line-color': '#141414',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 18, 4]
    }
  },

  // Roads - major
  {
    id: 'road-major',
    type: 'line',
    source: 'mapbox',
    'source-layer': 'road',
    filter: ['in', 'class', 'primary', 'secondary', 'tertiary', 'trunk', 'motorway'],
    paint: {
      'line-color': '#1a1a1a',
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 18, 8]
    }
  },

  // Admin boundaries - national (glowing green)
  {
    id: 'admin-boundary-national',
    type: 'line',
    source: 'mapbox',
    'source-layer': 'admin',
    filter: ['==', 'admin_level', 0],
    paint: {
      'line-color': '#00ff88',
      'line-width': 2,
      'line-opacity': 0.8,
      'line-blur': 1
    }
  },

  // Admin boundaries - state/province
  {
    id: 'admin-boundary-state',
    type: 'line',
    source: 'mapbox',
    'source-layer': 'admin',
    filter: ['==', 'admin_level', 1],
    paint: {
      'line-color': '#2a4a3a',
      'line-width': 1,
      'line-dasharray': [2, 2],
      'line-opacity': 0.6
    }
  },

  // Labels - country
  {
    id: 'label-country',
    type: 'symbol',
    source: 'mapbox',
    'source-layer': 'place_label',
    filter: ['==', 'type', 'country'],
    layout: {
      'text-field': ['get', 'name_en'],
      'text-font': ['JetBrains Mono Bold', 'Arial Unicode MS Bold'],
      'text-size': 14,
      'text-transform': 'uppercase',
      'text-letter-spacing': 0.1
    },
    paint: {
      'text-color': '#a3a3a3',
      'text-halo-color': '#0a0a0a',
      'text-halo-width': 2
    }
  },

  // Labels - city
  {
    id: 'label-city',
    type: 'symbol',
    source: 'mapbox',
    'source-layer': 'place_label',
    filter: ['in', 'type', 'city', 'town'],
    layout: {
      'text-field': ['get', 'name_en'],
      'text-font': ['Inter Regular', 'Arial Unicode MS Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 14]
    },
    paint: {
      'text-color': '#737373',
      'text-halo-color': '#0a0a0a',
      'text-halo-width': 1
    }
  }
];
```

### Style Application in Code

**File: `apps/web/src/features/command/MapContainer.tsx`** (style configuration)
```typescript
const MAPBOX_STYLE = import.meta.env.VITE_MAPBOX_STYLE_URL ||
  'mapbox://styles/your-username/tactical-dark';

// Fallback to basic dark if custom style unavailable
const FALLBACK_STYLE = 'mapbox://styles/mapbox/dark-v11';

// In the map initialization
useEffect(() => {
  const map = new mapboxgl.Map({
    container: mapContainer.current!,
    style: MAPBOX_STYLE,
    center: [0, 30],
    zoom: 2,
    attributionControl: false,
  });

  // Handle style load errors
  map.on('error', (e) => {
    if (e.error?.status === 404 || e.error?.message?.includes('style')) {
      console.warn('Custom style not found, using fallback');
      map.setStyle(FALLBACK_STYLE);
    }
  });

  return () => map.remove();
}, []);
```

### Grid Overlay Layer

Optional coordinate grid overlay for tactical display:

```typescript
// Add grid overlay after map loads
function addGridOverlay(map: mapboxgl.Map) {
  // Add source for graticule
  map.addSource('graticule', {
    type: 'geojson',
    data: generateGraticule(10), // 10-degree grid
  });

  map.addLayer({
    id: 'graticule-lines',
    type: 'line',
    source: 'graticule',
    paint: {
      'line-color': '#1f1f1f',
      'line-width': 1,
      'line-opacity': 0.5,
    },
  });
}

function generateGraticule(interval: number): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  // Longitude lines
  for (let lng = -180; lng <= 180; lng += interval) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [lng, -90],
          [lng, 90],
        ],
      },
      properties: { type: 'longitude', value: lng },
    });
  }

  // Latitude lines
  for (let lat = -90; lat <= 90; lat += interval) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-180, lat],
          [180, lat],
        ],
      },
      properties: { type: 'latitude', value: lat },
    });
  }

  return { type: 'FeatureCollection', features };
}
```

### Fog/Atmosphere Effect

Add atmospheric fog for 3D globe effect:

```typescript
map.on('style.load', () => {
  map.setFog({
    color: '#0a0a0a',
    'high-color': '#0d1117',
    'horizon-blend': 0.02,
    'space-color': '#000000',
    'star-intensity': 0.6,
  });
});
```

---

## Environment Variables (Mapbox)

```bash
# .env
VITE_MAPBOX_ACCESS_TOKEN=pk.your-mapbox-public-token
VITE_MAPBOX_STYLE_URL=mapbox://styles/your-username/tactical-dark
```
