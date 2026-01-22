import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import {
  DEFAULT_LAYERS,
  type Alert,
  type LayerConfig,
  type LayerId,
  type MapCursor,
  type MapMarker,
  type QuickFilters,
  type SeverityLevel,
  type SituationOverview,
  type Track,
  type ViewportBounds,
  type ViewState,
} from '../types';

/** ═══════════════════════════════════════════════════════════════════════════
 *  STORE STATE INTERFACE
 *  ═══════════════════════════════════════════════════════════════════════════ */

interface MapStoreState {
  // View state
  viewState: ViewState;
  cursor: MapCursor | null;
  selectedMarkerId: string | null;
  viewportBounds: ViewportBounds | null;

  // Layer management
  layers: LayerConfig[];

  // Data collections
  markers: MapMarker[];
  alerts: Alert[];
  tracks: Track[];

  // Filters
  filters: QuickFilters;

  // Situation overview
  overview: SituationOverview;

  // Connection status
  isLoading: boolean;
  wsConnected: boolean;

  // Actions - View
  setViewState: (viewState: Partial<ViewState>) => void;
  setCursor: (cursor: MapCursor | null) => void;
  setSelectedMarkerId: (id: string | null) => void;
  setViewportBounds: (bounds: ViewportBounds) => void;
  flyTo: (center: [number, number], zoom?: number) => void;

  // Actions - Layers
  setLayerVisibility: (layerId: LayerId, visible: boolean) => void;
  setLayerOpacity: (layerId: LayerId, opacity: number) => void;
  toggleLayer: (layerId: LayerId) => void;

  // Actions - Data
  setMarkers: (markers: MapMarker[]) => void;
  addMarker: (marker: MapMarker) => void;
  updateMarker: (id: string, updates: Partial<MapMarker>) => void;
  removeMarker: (id: string) => void;

  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (id: string) => void;
  removeAlert: (id: string) => void;

  setTracks: (tracks: Track[]) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;

  // Actions - Filters
  setFilters: (filters: Partial<QuickFilters>) => void;
  toggleSeverityFilter: (severity: SeverityLevel) => void;
  resetFilters: () => void;

  // Actions - Overview
  setOverview: (overview: SituationOverview) => void;

  // Actions - Connection
  setLoading: (isLoading: boolean) => void;
  setWsConnected: (connected: boolean) => void;
}

/** ═══════════════════════════════════════════════════════════════════════════
 *  DEFAULT VALUES
 *  ═══════════════════════════════════════════════════════════════════════════ */

const DEFAULT_VIEW_STATE: ViewState = {
  center: [2.3522, 48.8566], // Paris
  zoom: 5,
  bearing: 0,
  pitch: 0,
};

const DEFAULT_FILTERS: QuickFilters = {
  severities: ['critical', 'high', 'medium', 'low', 'info'],
  types: ['nai', 'threat', 'asset', 'event', 'infrastructure', 'maritime', 'flight', 'alert'],
  timeRange: '24h',
};

const DEFAULT_OVERVIEW: SituationOverview = {
  activeThreats: 0,
  openPirs: 0,
  naisMonitored: 0,
  activeAlerts: 0,
  lastUpdate: new Date().toISOString(),
};

/** ═══════════════════════════════════════════════════════════════════════════
 *  STORE IMPLEMENTATION
 *  ═══════════════════════════════════════════════════════════════════════════ */

export const useMapStore = create<MapStoreState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    viewState: DEFAULT_VIEW_STATE,
    cursor: null,
    selectedMarkerId: null,
    viewportBounds: null,
    layers: DEFAULT_LAYERS,
    markers: [],
    alerts: [],
    tracks: [],
    filters: DEFAULT_FILTERS,
    overview: DEFAULT_OVERVIEW,
    isLoading: true,
    wsConnected: false,

    // View actions
    setViewState: (viewState) =>
      set((state) => ({
        viewState: { ...state.viewState, ...viewState },
      })),

    setCursor: (cursor) => set({ cursor }),

    setSelectedMarkerId: (id) => set({ selectedMarkerId: id }),

    setViewportBounds: (bounds) => set({ viewportBounds: bounds }),

    flyTo: (center, zoom) =>
      set((state) => ({
        viewState: {
          ...state.viewState,
          center,
          zoom: zoom ?? state.viewState.zoom,
        },
      })),

    // Layer actions
    setLayerVisibility: (layerId, visible) =>
      set((state) => ({
        layers: state.layers.map((layer) => (layer.id === layerId ? { ...layer, visible } : layer)),
      })),

    setLayerOpacity: (layerId, opacity) =>
      set((state) => ({
        layers: state.layers.map((layer) => (layer.id === layerId ? { ...layer, opacity } : layer)),
      })),

    toggleLayer: (layerId) => {
      const layer = get().layers.find((l) => l.id === layerId);
      if (layer) {
        set((state) => ({
          layers: state.layers.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l)),
        }));
      }
    },

    // Marker actions
    setMarkers: (markers) => set({ markers }),

    addMarker: (marker) =>
      set((state) => ({
        markers: [...state.markers, marker],
      })),

    updateMarker: (id, updates) =>
      set((state) => ({
        markers: state.markers.map((marker) =>
          marker.id === id ? { ...marker, ...updates } : marker
        ),
      })),

    removeMarker: (id) =>
      set((state) => ({
        markers: state.markers.filter((marker) => marker.id !== id),
        selectedMarkerId: state.selectedMarkerId === id ? null : state.selectedMarkerId,
      })),

    // Alert actions
    setAlerts: (alerts) => set({ alerts }),

    addAlert: (alert) =>
      set((state) => ({
        alerts: [alert, ...state.alerts].slice(0, 100), // Keep last 100 alerts
      })),

    acknowledgeAlert: (id) =>
      set((state) => ({
        alerts: state.alerts.map((alert) =>
          alert.id === id ? { ...alert, acknowledged: true } : alert
        ),
      })),

    removeAlert: (id) =>
      set((state) => ({
        alerts: state.alerts.filter((alert) => alert.id !== id),
      })),

    // Track actions
    setTracks: (tracks) => set({ tracks }),

    updateTrack: (id, updates) =>
      set((state) => ({
        tracks: state.tracks.map((track) => (track.id === id ? { ...track, ...updates } : track)),
      })),

    // Filter actions
    setFilters: (filters) =>
      set((state) => ({
        filters: { ...state.filters, ...filters },
      })),

    toggleSeverityFilter: (severity) =>
      set((state) => {
        const current = state.filters.severities;
        const updated = current.includes(severity)
          ? current.filter((s) => s !== severity)
          : [...current, severity];
        return {
          filters: { ...state.filters, severities: updated },
        };
      }),

    resetFilters: () => set({ filters: DEFAULT_FILTERS }),

    // Overview actions
    setOverview: (overview) => set({ overview }),

    // Connection actions
    setLoading: (isLoading) => set({ isLoading }),
    setWsConnected: (connected) => set({ wsConnected: connected }),
  }))
);

/** ═══════════════════════════════════════════════════════════════════════════
 *  SELECTORS
 *  ═══════════════════════════════════════════════════════════════════════════ */

export const selectVisibleLayers = (state: MapStoreState) => state.layers.filter((l) => l.visible);

export const selectUnacknowledgedAlerts = (state: MapStoreState) =>
  state.alerts.filter((a) => !a.acknowledged);

export const selectFilteredMarkers = (state: MapStoreState) => {
  const { markers, filters } = state;
  return markers.filter((marker) => {
    if (!filters.types.includes(marker.type)) return false;
    if (marker.severity && !filters.severities.includes(marker.severity)) return false;
    return true;
  });
};

export const selectCriticalAlerts = (state: MapStoreState) =>
  state.alerts.filter((a) => a.severity === 'critical' && !a.acknowledged);
