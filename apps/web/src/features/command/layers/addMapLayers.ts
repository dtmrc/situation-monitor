import type mapboxgl from 'mapbox-gl';

import type { Actor, Alert, MapMarker, NAI, Track } from '../types';

/**
 * Layer system for the Command Map
 *
 * Manages 9 data layers by z-index:
 * 0: basemap (handled by Mapbox style)
 * 1: infrastructure
 * 2: heatmaps
 * 3: nais (Named Areas of Interest)
 * 4: actors
 * 5: events
 * 6: maritime tracks
 * 7: flight tracks
 * 8: alerts
 */

// Tactical color palette
const COLORS = {
  primary: '#00ff88',
  cyan: '#00d4ff',
  amber: '#ffaa00',
  red: '#ff3333',
  purple: '#a855f7',
  blue: '#3b82f6',
  orange: '#ff6b35',
  muted: '#525252',
} as const;

/** ═══════════════════════════════════════════════════════════════════════════
 *  EMPTY GEOJSON TEMPLATES
 *  ═══════════════════════════════════════════════════════════════════════════ */

const emptyFeatureCollection: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

/** ═══════════════════════════════════════════════════════════════════════════
 *  ADD ALL MAP LAYERS
 *  ═══════════════════════════════════════════════════════════════════════════ */

export function addMapLayers(map: mapboxgl.Map): void {
  // Add all sources first
  addSources(map);

  // Add layers in z-index order
  addInfrastructureLayer(map);
  addHeatmapLayer(map);
  addNAILayer(map);
  addActorsLayer(map);
  addEventsLayer(map);
  addMaritimeLayer(map);
  addFlightLayer(map);
  addAlertsLayer(map);

  // Add markers layer (clustered points)
  addMarkersLayer(map);
}

/** ═══════════════════════════════════════════════════════════════════════════
 *  SOURCES
 *  ═══════════════════════════════════════════════════════════════════════════ */

function addSources(map: mapboxgl.Map): void {
  // Infrastructure points
  map.addSource('command-infrastructure', {
    type: 'geojson',
    data: emptyFeatureCollection,
  });

  // Heatmap data
  map.addSource('command-heatmap', {
    type: 'geojson',
    data: emptyFeatureCollection,
  });

  // Named Areas of Interest (polygons)
  map.addSource('command-nais', {
    type: 'geojson',
    data: emptyFeatureCollection,
  });

  // Actors (points)
  map.addSource('command-actors', {
    type: 'geojson',
    data: emptyFeatureCollection,
  });

  // Events (points)
  map.addSource('command-events', {
    type: 'geojson',
    data: emptyFeatureCollection,
  });

  // Maritime tracks (lines + points)
  map.addSource('command-maritime', {
    type: 'geojson',
    data: emptyFeatureCollection,
  });

  // Flight tracks (lines + points)
  map.addSource('command-flight', {
    type: 'geojson',
    data: emptyFeatureCollection,
  });

  // Active alerts (points)
  map.addSource('command-alerts', {
    type: 'geojson',
    data: emptyFeatureCollection,
  });

  // All markers (for clustering)
  map.addSource('command-markers', {
    type: 'geojson',
    data: emptyFeatureCollection,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  });
}

/** ═══════════════════════════════════════════════════════════════════════════
 *  LAYER DEFINITIONS
 *  ═══════════════════════════════════════════════════════════════════════════ */

function addInfrastructureLayer(map: mapboxgl.Map): void {
  map.addLayer({
    id: 'command-infrastructure',
    type: 'circle',
    source: 'command-infrastructure',
    paint: {
      'circle-radius': 6,
      'circle-color': COLORS.cyan,
      'circle-opacity': 0.8,
      'circle-stroke-width': 2,
      'circle-stroke-color': COLORS.cyan,
      'circle-stroke-opacity': 0.4,
    },
  });

  // Infrastructure labels
  map.addLayer({
    id: 'command-infrastructure-labels',
    type: 'symbol',
    source: 'command-infrastructure',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-size': 10,
      'text-offset': [0, 1.5],
      'text-anchor': 'top',
    },
    paint: {
      'text-color': COLORS.cyan,
      'text-halo-color': '#000',
      'text-halo-width': 1,
    },
  });
}

function addHeatmapLayer(map: mapboxgl.Map): void {
  map.addLayer({
    id: 'command-heatmap',
    type: 'heatmap',
    source: 'command-heatmap',
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(0, 0, 0, 0)',
        0.2,
        'rgba(0, 212, 255, 0.3)',
        0.4,
        'rgba(0, 255, 136, 0.5)',
        0.6,
        'rgba(255, 170, 0, 0.7)',
        0.8,
        'rgba(255, 107, 53, 0.85)',
        1,
        'rgba(255, 51, 51, 1)',
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
      'heatmap-opacity': 0.7,
    },
  });
}

function addNAILayer(map: mapboxgl.Map): void {
  // NAI fill
  map.addLayer({
    id: 'command-nais-fill',
    type: 'fill',
    source: 'command-nais',
    paint: {
      'fill-color': [
        'match',
        ['get', 'priority'],
        'critical',
        COLORS.red,
        'high',
        COLORS.orange,
        'medium',
        COLORS.amber,
        'low',
        COLORS.primary,
        COLORS.cyan,
      ],
      'fill-opacity': 0.15,
    },
  });

  // NAI outline
  map.addLayer({
    id: 'command-nais-outline',
    type: 'line',
    source: 'command-nais',
    paint: {
      'line-color': [
        'match',
        ['get', 'priority'],
        'critical',
        COLORS.red,
        'high',
        COLORS.orange,
        'medium',
        COLORS.amber,
        'low',
        COLORS.primary,
        COLORS.cyan,
      ],
      'line-width': 2,
      'line-dasharray': [2, 2],
    },
  });

  // NAI labels
  map.addLayer({
    id: 'command-nais-labels',
    type: 'symbol',
    source: 'command-nais',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
      'text-size': 12,
      'text-transform': 'uppercase',
      'text-letter-spacing': 0.1,
    },
    paint: {
      'text-color': '#fff',
      'text-halo-color': '#000',
      'text-halo-width': 2,
    },
  });
}

function addActorsLayer(map: mapboxgl.Map): void {
  map.addLayer({
    id: 'command-actors',
    type: 'circle',
    source: 'command-actors',
    paint: {
      'circle-radius': 8,
      'circle-color': [
        'match',
        ['get', 'type'],
        'friendly',
        COLORS.primary,
        'hostile',
        COLORS.red,
        'neutral',
        COLORS.amber,
        COLORS.muted,
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
      'circle-stroke-opacity': 0.5,
    },
  });

  // Actor direction indicator
  map.addLayer({
    id: 'command-actors-direction',
    type: 'symbol',
    source: 'command-actors',
    layout: {
      'icon-image': 'triangle-11',
      'icon-size': 0.8,
      'icon-rotate': ['get', 'heading'],
      'icon-allow-overlap': true,
    },
    paint: {
      'icon-color': '#fff',
      'icon-opacity': 0.8,
    },
    filter: ['has', 'heading'],
  });
}

function addEventsLayer(map: mapboxgl.Map): void {
  map.addLayer({
    id: 'command-events',
    type: 'circle',
    source: 'command-events',
    layout: {
      visibility: 'none', // Off by default
    },
    paint: {
      'circle-radius': 6,
      'circle-color': COLORS.orange,
      'circle-opacity': 0.9,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fff',
    },
  });
}

function addMaritimeLayer(map: mapboxgl.Map): void {
  // Maritime vessel points
  map.addLayer({
    id: 'command-maritime',
    type: 'symbol',
    source: 'command-maritime',
    layout: {
      'icon-image': 'ferry-15',
      'icon-size': 1,
      'icon-rotate': ['get', 'heading'],
      'icon-allow-overlap': true,
      'text-field': ['get', 'callsign'],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-size': 9,
      'text-offset': [0, 1.2],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: {
      'icon-color': COLORS.blue,
      'text-color': COLORS.blue,
      'text-halo-color': '#000',
      'text-halo-width': 1,
    },
  });
}

function addFlightLayer(map: mapboxgl.Map): void {
  // Flight track points
  map.addLayer({
    id: 'command-flight',
    type: 'symbol',
    source: 'command-flight',
    layout: {
      'icon-image': 'airport-15',
      'icon-size': 1,
      'icon-rotate': ['get', 'heading'],
      'icon-allow-overlap': true,
      'text-field': ['get', 'callsign'],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-size': 9,
      'text-offset': [0, 1.2],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: {
      'icon-color': COLORS.cyan,
      'text-color': COLORS.cyan,
      'text-halo-color': '#000',
      'text-halo-width': 1,
    },
  });
}

function addAlertsLayer(map: mapboxgl.Map): void {
  // Alert pulse ring (animated via CSS)
  map.addLayer({
    id: 'command-alerts-pulse',
    type: 'circle',
    source: 'command-alerts',
    paint: {
      'circle-radius': 20,
      'circle-color': COLORS.red,
      'circle-opacity': 0.2,
      'circle-stroke-width': 0,
    },
  });

  // Alert center point
  map.addLayer({
    id: 'command-alerts',
    type: 'circle',
    source: 'command-alerts',
    paint: {
      'circle-radius': ['match', ['get', 'severity'], 'critical', 10, 'high', 8, 'medium', 6, 4],
      'circle-color': [
        'match',
        ['get', 'severity'],
        'critical',
        COLORS.red,
        'high',
        COLORS.orange,
        'medium',
        COLORS.amber,
        COLORS.cyan,
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  });
}

function addMarkersLayer(map: mapboxgl.Map): void {
  // Clustered circles
  map.addLayer({
    id: 'command-markers-cluster',
    type: 'circle',
    source: 'command-markers',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        COLORS.cyan,
        10,
        COLORS.amber,
        50,
        COLORS.red,
      ],
      'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 50, 25],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
      'circle-stroke-opacity': 0.5,
    },
  });

  // Cluster count labels
  map.addLayer({
    id: 'command-markers-cluster-count',
    type: 'symbol',
    source: 'command-markers',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
    paint: {
      'text-color': '#fff',
    },
  });

  // Unclustered point
  map.addLayer({
    id: 'command-markers',
    type: 'circle',
    source: 'command-markers',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': 6,
      'circle-color': [
        'match',
        ['get', 'type'],
        'threat',
        COLORS.red,
        'nai',
        COLORS.primary,
        'asset',
        COLORS.cyan,
        'alert',
        COLORS.amber,
        COLORS.purple,
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
      'circle-stroke-opacity': 0.6,
    },
  });
}

/** ═══════════════════════════════════════════════════════════════════════════
 *  UPDATE LAYER DATA
 *  ═══════════════════════════════════════════════════════════════════════════ */

export function updateMarkersData(map: mapboxgl.Map, markers: MapMarker[]): void {
  const source = map.getSource('command-markers') as mapboxgl.GeoJSONSource;
  if (!source) return;

  const features: GeoJSON.Feature[] = markers.map((marker) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: marker.coordinates as [number, number],
    },
    properties: {
      id: marker.id,
      type: marker.type,
      name: marker.name,
      severity: marker.severity,
      status: marker.status,
    },
  }));

  source.setData({
    type: 'FeatureCollection',
    features,
  });
}

export function updateNAIsData(map: mapboxgl.Map, nais: NAI[]): void {
  const source = map.getSource('command-nais') as mapboxgl.GeoJSONSource;
  if (!source) return;

  const features: GeoJSON.Feature[] = nais.map((nai) => ({
    type: 'Feature',
    geometry: nai.geometry,
    properties: {
      id: nai.id,
      name: nai.name,
      priority: nai.priority,
      status: nai.status,
    },
  }));

  source.setData({
    type: 'FeatureCollection',
    features,
  });
}

export function updateActorsData(map: mapboxgl.Map, actors: Actor[]): void {
  const source = map.getSource('command-actors') as mapboxgl.GeoJSONSource;
  if (!source) return;

  const features: GeoJSON.Feature[] = actors.map((actor) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: actor.coordinates as [number, number],
    },
    properties: {
      id: actor.id,
      name: actor.name,
      type: actor.type,
      heading: actor.heading,
      status: actor.status,
    },
  }));

  source.setData({
    type: 'FeatureCollection',
    features,
  });
}

export function updateTracksData(
  map: mapboxgl.Map,
  tracks: Track[],
  type: 'maritime' | 'flight'
): void {
  const sourceId = type === 'maritime' ? 'command-maritime' : 'command-flight';
  const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
  if (!source) return;

  const features: GeoJSON.Feature[] = tracks
    .filter((t) => t.type === type)
    .map((track) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: track.coordinates as [number, number],
      },
      properties: {
        id: track.id,
        callsign: track.callsign,
        heading: track.heading,
        speed: track.speed,
        altitude: track.altitude,
        status: track.status,
      },
    }));

  source.setData({
    type: 'FeatureCollection',
    features,
  });
}

export function updateAlertsData(map: mapboxgl.Map, alerts: Alert[]): void {
  const source = map.getSource('command-alerts') as mapboxgl.GeoJSONSource;
  if (!source) return;

  const features: GeoJSON.Feature[] = alerts
    .filter((alert) => alert.coordinates)
    .map((alert) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: alert.coordinates as [number, number],
      },
      properties: {
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        acknowledged: alert.acknowledged,
      },
    }));

  source.setData({
    type: 'FeatureCollection',
    features,
  });
}

/** ═══════════════════════════════════════════════════════════════════════════
 *  LAYER VISIBILITY CONTROL
 *  ═══════════════════════════════════════════════════════════════════════════ */

export function setLayerVisibility(map: mapboxgl.Map, layerId: string, visible: boolean): void {
  const layerIds = getLayerIds(layerId);

  layerIds.forEach((id) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
  });
}

export function setLayerOpacity(map: mapboxgl.Map, layerId: string, opacity: number): void {
  const layerIds = getLayerIds(layerId);

  layerIds.forEach((id) => {
    if (map.getLayer(id)) {
      const layer = map.getLayer(id);
      if (!layer) return;

      const type = layer.type;
      switch (type) {
        case 'circle':
          map.setPaintProperty(id, 'circle-opacity', opacity);
          break;
        case 'fill':
          map.setPaintProperty(id, 'fill-opacity', opacity * 0.15); // NAI fill is always subtle
          break;
        case 'line':
          map.setPaintProperty(id, 'line-opacity', opacity);
          break;
        case 'symbol':
          map.setPaintProperty(id, 'icon-opacity', opacity);
          map.setPaintProperty(id, 'text-opacity', opacity);
          break;
        case 'heatmap':
          map.setPaintProperty(id, 'heatmap-opacity', opacity);
          break;
      }
    }
  });
}

/** Get all layer IDs associated with a logical layer */
function getLayerIds(layerId: string): string[] {
  const layerMap: Record<string, string[]> = {
    infrastructure: ['command-infrastructure', 'command-infrastructure-labels'],
    heatmaps: ['command-heatmap'],
    nais: ['command-nais-fill', 'command-nais-outline', 'command-nais-labels'],
    actors: ['command-actors', 'command-actors-direction'],
    events: ['command-events'],
    maritime: ['command-maritime'],
    flight: ['command-flight'],
    alerts: ['command-alerts', 'command-alerts-pulse'],
  };

  return layerMap[layerId] || [`command-${layerId}`];
}
