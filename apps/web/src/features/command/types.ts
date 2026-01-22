import type { LngLatLike } from 'mapbox-gl';

/** ═══════════════════════════════════════════════════════════════════════════
 *  LAYER CONFIGURATION
 *  ═══════════════════════════════════════════════════════════════════════════ */

export type LayerId =
  | 'basemap'
  | 'infrastructure'
  | 'heatmaps'
  | 'nais'
  | 'actors'
  | 'events'
  | 'maritime'
  | 'flight'
  | 'alerts';

export interface LayerConfig {
  id: LayerId;
  name: string;
  description: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
  color: string;
  icon?: string;
}

export const DEFAULT_LAYERS: LayerConfig[] = [
  {
    id: 'basemap',
    name: 'Basemap',
    description: 'Dark tactical basemap',
    visible: true,
    opacity: 1,
    zIndex: 0,
    color: '#1a1a1a',
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    description: 'Critical infrastructure points',
    visible: true,
    opacity: 0.8,
    zIndex: 1,
    color: '#00d4ff',
  },
  {
    id: 'heatmaps',
    name: 'Activity Heatmaps',
    description: 'Density visualization of activity',
    visible: true,
    opacity: 0.7,
    zIndex: 2,
    color: '#ffaa00',
  },
  {
    id: 'nais',
    name: 'Named Areas of Interest',
    description: 'Monitored geographic zones',
    visible: true,
    opacity: 0.8,
    zIndex: 3,
    color: '#00ff88',
  },
  {
    id: 'actors',
    name: 'Actors',
    description: 'Tracked entities and assets',
    visible: true,
    opacity: 1,
    zIndex: 4,
    color: '#a855f7',
  },
  {
    id: 'events',
    name: 'Events',
    description: 'Historical and ongoing events',
    visible: false,
    opacity: 0.9,
    zIndex: 5,
    color: '#ff6b35',
  },
  {
    id: 'maritime',
    name: 'Maritime Tracks',
    description: 'Ship and vessel positions',
    visible: true,
    opacity: 0.9,
    zIndex: 6,
    color: '#3b82f6',
  },
  {
    id: 'flight',
    name: 'Flight Tracks',
    description: 'Aircraft positions',
    visible: true,
    opacity: 0.9,
    zIndex: 7,
    color: '#00d4ff',
  },
  {
    id: 'alerts',
    name: 'Active Alerts',
    description: 'Current alert markers',
    visible: true,
    opacity: 1,
    zIndex: 8,
    color: '#ff3333',
  },
];

/** ═══════════════════════════════════════════════════════════════════════════
 *  MAP MARKERS & FEATURES
 *  ═══════════════════════════════════════════════════════════════════════════ */

export type MarkerType =
  | 'nai'
  | 'threat'
  | 'asset'
  | 'event'
  | 'infrastructure'
  | 'maritime'
  | 'flight'
  | 'alert';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface MapMarker {
  id: string;
  type: MarkerType;
  coordinates: LngLatLike;
  name: string;
  description?: string;
  severity?: SeverityLevel;
  status?: 'active' | 'inactive' | 'alert';
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface NAI {
  id: string;
  name: string;
  description?: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  status: 'active' | 'inactive' | 'triggered';
  priority: SeverityLevel;
  createdAt: string;
  updatedAt: string;
}

export interface Actor {
  id: string;
  name: string;
  type: 'friendly' | 'hostile' | 'neutral' | 'unknown';
  category: string;
  coordinates: LngLatLike;
  heading?: number;
  speed?: number;
  status: 'active' | 'inactive';
  lastSeen: string;
}

export interface Track {
  id: string;
  type: 'maritime' | 'flight';
  callsign?: string;
  coordinates: LngLatLike;
  heading: number;
  speed: number;
  altitude?: number;
  origin?: string;
  destination?: string;
  status: 'active' | 'lost';
  lastUpdate: string;
}

/** ═══════════════════════════════════════════════════════════════════════════
 *  ALERTS
 *  ═══════════════════════════════════════════════════════════════════════════ */

export interface Alert {
  id: string;
  type: 'tripwire' | 'threshold' | 'manual' | 'system';
  severity: SeverityLevel;
  title: string;
  message: string;
  coordinates?: LngLatLike;
  relatedEntityId?: string;
  timestamp: string;
  acknowledged: boolean;
}

/** ═══════════════════════════════════════════════════════════════════════════
 *  MAP STATE
 *  ═══════════════════════════════════════════════════════════════════════════ */

export interface ViewState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface MapCursor {
  lat: number;
  lng: number;
}

export interface MapState {
  viewState: ViewState;
  cursor: MapCursor | null;
  selectedMarkerId: string | null;
  layers: LayerConfig[];
  isLoading: boolean;
  wsConnected: boolean;
}

/** ═══════════════════════════════════════════════════════════════════════════
 *  WEBSOCKET MESSAGES
 *  ═══════════════════════════════════════════════════════════════════════════ */

export type WsMessageType = 'marker_update' | 'alert' | 'track_update' | 'nai_update';

export interface WsMessage {
  type: WsMessageType;
  payload: unknown;
  timestamp: string;
}

export interface MarkerUpdatePayload {
  markerId: string;
  action: 'add' | 'update' | 'remove';
  marker?: MapMarker;
}

export interface AlertPayload extends Alert {}

export interface TrackUpdatePayload {
  trackId: string;
  action: 'add' | 'update' | 'remove';
  track?: Track;
}

/** ═══════════════════════════════════════════════════════════════════════════
 *  FILTERS
 *  ═══════════════════════════════════════════════════════════════════════════ */

export interface QuickFilters {
  severities: SeverityLevel[];
  types: MarkerType[];
  timeRange: '1h' | '6h' | '24h' | '7d' | 'all';
}

/** ═══════════════════════════════════════════════════════════════════════════
 *  VIEWPORT DATA
 *  ═══════════════════════════════════════════════════════════════════════════ */

export interface ViewportBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface ViewportDataMeta {
  total: number;
  truncated: boolean;
  bbox: ViewportBounds;
  zoom: number;
  fetchedAt: string;
}

export interface ViewportDataResponse {
  markers: MapMarker[];
  tracks: Track[];
  alerts: Alert[];
  meta: ViewportDataMeta;
}

/** ═══════════════════════════════════════════════════════════════════════════
 *  SITUATION OVERVIEW
 *  ═══════════════════════════════════════════════════════════════════════════ */

export interface SituationOverview {
  activeThreats: number;
  openPirs: number;
  naisMonitored: number;
  activeAlerts: number;
  lastUpdate: string;
}
