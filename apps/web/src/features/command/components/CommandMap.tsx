import mapboxgl, { AttributionControl, Map, NavigationControl, ScaleControl } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';

import { useMapStore } from '../store';
import type { ViewportBounds } from '../types';

// Set Mapbox token from environment
mapboxgl.accessToken = (import.meta.env.VITE_MAPBOX_TOKEN as string) || '';

export interface MapFeatureClickEvent {
  featureId: string;
  layerType: 'alert' | 'marker' | 'track' | 'actor';
  coordinates: [number, number];
  properties: Record<string, unknown>;
}

interface CommandMapProps {
  onMapLoad?: (map: mapboxgl.Map) => void;
  onBoundsChange?: (bounds: ViewportBounds, zoom: number) => void;
  onFeatureClick?: (event: MapFeatureClickEvent) => void;
}

export function CommandMap({ onMapLoad, onBoundsChange, onFeatureClick }: CommandMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { viewState, setViewState, setCursor, setLoading, setSelectedMarkerId } = useMapStore();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: viewState.center,
      zoom: viewState.zoom,
      bearing: viewState.bearing,
      pitch: viewState.pitch,
      attributionControl: false,
      logoPosition: 'bottom-right',
    });

    // Add minimal attribution
    map.addControl(
      new AttributionControl({
        compact: true,
      }),
      'bottom-right'
    );

    // Add navigation controls
    map.addControl(
      new NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      }),
      'bottom-right'
    );

    // Add scale control
    map.addControl(
      new ScaleControl({
        maxWidth: 100,
        unit: 'metric',
      }),
      'bottom-left'
    );

    map.on('load', () => {
      setMapLoaded(true);
      setLoading(false);
      onMapLoad?.(map);

      // Report initial bounds
      const mapBounds = map.getBounds();
      if (mapBounds) {
        onBoundsChange?.(
          {
            west: mapBounds.getWest(),
            south: mapBounds.getSouth(),
            east: mapBounds.getEast(),
            north: mapBounds.getNorth(),
          },
          map.getZoom()
        );
      }
    });

    // Track mouse position for coordinates display
    map.on('mousemove', (e) => {
      setCursor({
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      });
    });

    map.on('mouseout', () => {
      setCursor(null);
    });

    // Sync view state changes and report bounds
    map.on('moveend', () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      setViewState({
        center: [center.lng, center.lat],
        zoom,
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });

      // Extract and report viewport bounds
      const mapBounds = map.getBounds();
      if (mapBounds) {
        onBoundsChange?.(
          {
            west: mapBounds.getWest(),
            south: mapBounds.getSouth(),
            east: mapBounds.getEast(),
            north: mapBounds.getNorth(),
          },
          zoom
        );
      }
    });

    // Deselect on map click (not on features)
    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point);
      // If no custom features clicked, deselect
      const hasCustomFeature = features.some(
        (f) => f.source?.startsWith('command-') || f.layer?.id?.startsWith('command-')
      );
      if (!hasCustomFeature) {
        setSelectedMarkerId(null);
      }
    });

    // Interactive layers for click/hover
    const interactiveLayers = [
      'command-alerts',
      'command-markers',
      'command-flight',
      'command-maritime',
      'command-actors',
    ];

    // Click handler for interactive features
    interactiveLayers.forEach((layerId) => {
      map.on('click', layerId, (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        if (!feature) return;
        const props = feature.properties || {};
        const geometry = feature.geometry;

        // Get coordinates from geometry
        let coordinates: [number, number] = [0, 0];
        if (geometry.type === 'Point') {
          coordinates = geometry.coordinates as [number, number];
        }

        // Determine layer type from layer ID
        let layerType: 'alert' | 'marker' | 'track' | 'actor' = 'marker';
        if (layerId === 'command-alerts') layerType = 'alert';
        else if (layerId === 'command-flight' || layerId === 'command-maritime')
          layerType = 'track';
        else if (layerId === 'command-actors') layerType = 'actor';

        onFeatureClick?.({
          featureId: props.id as string,
          layerType,
          coordinates,
          properties: props as Record<string, unknown>,
        });

        // Prevent click from bubbling to map
        e.originalEvent.stopPropagation();
      });
    });

    // Change cursor on hoverable features
    interactiveLayers.forEach((layerId) => {
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!mapRef.current) return;

      switch (e.key) {
        case 'Escape':
          setSelectedMarkerId(null);
          break;
        case '+':
        case '=':
          mapRef.current.zoomIn();
          break;
        case '-':
          mapRef.current.zoomOut();
          break;
        case 'r':
        case 'R':
          if (e.shiftKey) {
            mapRef.current.resetNorth();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedMarkerId]);

  // Subscribe to store flyTo requests
  useEffect(() => {
    const unsubscribe = useMapStore.subscribe(
      (state) => state.viewState,
      (viewState, prevViewState) => {
        if (
          mapRef.current &&
          (viewState.center[0] !== prevViewState.center[0] ||
            viewState.center[1] !== prevViewState.center[1])
        ) {
          mapRef.current.flyTo({
            center: viewState.center,
            zoom: viewState.zoom,
            duration: 1000,
          });
        }
      }
    );
    return unsubscribe;
  }, []);

  return (
    <div
      ref={mapContainer}
      className="absolute inset-0 w-full h-full"
      style={{
        // Apply tactical styling to map container
        filter: mapLoaded ? 'none' : 'blur(4px)',
        transition: 'filter 0.3s ease-out',
      }}
    />
  );
}

// Export ref getter for external use
export function useMapRef() {
  return useRef<mapboxgl.Map | null>(null);
}
