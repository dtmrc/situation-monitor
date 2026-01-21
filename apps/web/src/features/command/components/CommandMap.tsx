import mapboxgl, { AttributionControl, Map, NavigationControl, ScaleControl } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';

import { useMapStore } from '../store';

// Set Mapbox token from environment
mapboxgl.accessToken = (import.meta.env.VITE_MAPBOX_TOKEN as string) || '';

interface CommandMapProps {
  onMapLoad?: (map: mapboxgl.Map) => void;
}

export function CommandMap({ onMapLoad }: CommandMapProps) {
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

    // Sync view state changes
    map.on('moveend', () => {
      const center = map.getCenter();
      setViewState({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
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

    // Change cursor on hoverable features
    map.on('mouseenter', 'command-markers', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'command-markers', () => {
      map.getCanvas().style.cursor = '';
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
