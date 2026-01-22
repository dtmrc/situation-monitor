import type mapboxgl from 'mapbox-gl';

import type { Actor, Alert, FlightCategory, MapMarker, NAI, Track } from '../types';

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

// Flight category colors for aircraft visualization
const FLIGHT_COLORS: Record<FlightCategory, string> = {
  commercial: '#00d4ff', // Cyan - commercial airliners
  military: '#a855f7', // Purple - military aircraft
  emergency: '#ff3333', // Red - emergency squawk
  private: '#00ff88', // Green - private/GA
  helicopter: '#ffaa00', // Amber - rotorcraft
  cargo: '#3b82f6', // Blue - cargo aircraft
  uav: '#ff6b35', // Orange - drones/UAVs
  unknown: '#6b7280', // Gray - unknown
};

/**
 * Airplane SVG icon as a data URL for Mapbox
 * Points upward (north) - Mapbox will rotate based on heading property
 */
const AIRPLANE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
</svg>`;

/**
 * Load custom icons into Mapbox map
 * Must be called before adding layers that use these icons
 */
export function loadMapIcons(map: mapboxgl.Map): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create image from SVG data URL
    const img = new Image(24, 24);
    img.onload = () => {
      // Add the image as an SDF icon for dynamic coloring
      if (!map.hasImage('airplane-icon')) {
        map.addImage('airplane-icon', img, { sdf: true });
      }
      resolve();
    };
    img.onerror = (err) => {
      console.error('Failed to load airplane icon:', err);
      reject(err);
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(AIRPLANE_SVG)}`;
  });
}

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
  // Emergency flight pulse ring (for aircraft squawking emergency)
  map.addLayer({
    id: 'command-flight-emergency-pulse',
    type: 'circle',
    source: 'command-flight',
    filter: ['==', ['get', 'isEmergency'], true],
    paint: {
      'circle-radius': 18,
      'circle-color': COLORS.red,
      'circle-opacity': 0.3,
      'circle-stroke-width': 2,
      'circle-stroke-color': COLORS.red,
      'circle-stroke-opacity': 0.6,
    },
  });

  // Flight track airplane icons with category-based coloring
  map.addLayer({
    id: 'command-flight',
    type: 'symbol',
    source: 'command-flight',
    layout: {
      'icon-image': 'airplane-icon',
      'icon-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        4,
        0.6, // Small at low zoom
        8,
        0.8,
        12,
        1.0, // Full size at high zoom
      ],
      'icon-rotate': ['get', 'heading'],
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'text-field': ['get', 'callsign'],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-size': 9,
      'text-offset': [0, 1.5],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: {
      // Color by flight category
      'icon-color': [
        'match',
        ['get', 'flightCategory'],
        'commercial',
        FLIGHT_COLORS.commercial,
        'military',
        FLIGHT_COLORS.military,
        'emergency',
        FLIGHT_COLORS.emergency,
        'private',
        FLIGHT_COLORS.private,
        'helicopter',
        FLIGHT_COLORS.helicopter,
        'cargo',
        FLIGHT_COLORS.cargo,
        'uav',
        FLIGHT_COLORS.uav,
        FLIGHT_COLORS.unknown, // default
      ],
      // Text color matches icon color
      'text-color': [
        'match',
        ['get', 'flightCategory'],
        'commercial',
        FLIGHT_COLORS.commercial,
        'military',
        FLIGHT_COLORS.military,
        'emergency',
        FLIGHT_COLORS.emergency,
        'private',
        FLIGHT_COLORS.private,
        'helicopter',
        FLIGHT_COLORS.helicopter,
        'cargo',
        FLIGHT_COLORS.cargo,
        'uav',
        FLIGHT_COLORS.uav,
        FLIGHT_COLORS.unknown, // default
      ],
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
        // Flight-specific properties for visualization
        flightCategory: track.flightCategory || 'unknown',
        isEmergency: track.isEmergency || false,
        squawk: track.squawk,
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
    flight: ['command-flight', 'command-flight-emergency-pulse'],
    alerts: ['command-alerts', 'command-alerts-pulse'],
  };

  return layerMap[layerId] || [`command-${layerId}`];
}
