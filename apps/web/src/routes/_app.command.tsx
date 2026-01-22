import { createFileRoute } from '@tanstack/react-router';
import type mapboxgl from 'mapbox-gl';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  addMapLayers,
  AlertFeedPanel,
  CommandMap,
  FeatureDetailPopup,
  LayerControlPanel,
  MapOverlay,
  MapStatusBar,
  QuickFiltersPanel,
  setLayerOpacity,
  setLayerVisibility,
  SituationOverviewPanel,
  updateAlertsData,
  updateMarkersData,
  updateTracksData,
  useMockDataFeed,
  useMapStore,
  useViewportData,
} from '@/features/command';
import type { MapFeatureClickEvent, ViewportBounds } from '@/features/command';
import { useUserLocation } from '@/hooks/useUserLocation';

export const Route = createFileRoute('/_app/command')({
  component: CommandCenterPage,
});

function CommandCenterPage() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const layersInitialized = useRef(false);
  const initialLocationSet = useRef(false);
  const [currentZoom, setCurrentZoom] = useState(5);
  const [selectedFeature, setSelectedFeature] = useState<MapFeatureClickEvent | null>(null);

  const { layers, markers, alerts, tracks, flyTo, acknowledgeAlert } = useMapStore();
  const { location, isLoading: locationLoading } = useUserLocation();

  // For demo: using mock project ID - replace with actual project selection
  const projectId = 'demo-project-id';

  // Viewport-based data fetching with debouncing
  const { data: viewportData, updateBounds } = useViewportData({
    projectId,
    zoom: currentZoom,
    enabled: true, // Set to true when you have a real API
  });

  // Update store with viewport data when it changes
  useEffect(() => {
    if (viewportData) {
      // Merge viewport data with existing data (WebSocket real-time updates take precedence)
      // For now, we'll just log when viewport data arrives - in production you'd merge intelligently
      console.log('[Viewport] Received data:', {
        markers: viewportData.markers.length,
        tracks: viewportData.tracks.length,
        alerts: viewportData.alerts.length,
        meta: viewportData.meta,
      });
    }
  }, [viewportData]);

  // Handle bounds changes from the map
  const handleBoundsChange = useCallback(
    (bounds: ViewportBounds, zoom: number) => {
      setCurrentZoom(zoom);
      updateBounds(bounds);
    },
    [updateBounds]
  );

  // Handle feature click on map
  const handleFeatureClick = useCallback((event: MapFeatureClickEvent) => {
    setSelectedFeature(event);
  }, []);

  // Handle popup close
  const handlePopupClose = useCallback(() => {
    setSelectedFeature(null);
  }, []);

  // Handle alert acknowledgment
  const handleAcknowledge = useCallback(
    (featureId: string) => {
      acknowledgeAlert(featureId);
      setSelectedFeature(null);
    },
    [acknowledgeAlert]
  );

  // Use mock data for demo (replace with useWebSocketFeed in production)
  useMockDataFeed();

  // Center map on user's location when available
  useEffect(() => {
    if (!locationLoading && location && !initialLocationSet.current) {
      // Fly to user's location with a reasonable zoom level
      flyTo([location.longitude, location.latitude], 8);
      initialLocationSet.current = true;
    }
  }, [location, locationLoading, flyTo]);

  // Handle map load - add custom layers
  const handleMapLoad = useCallback((map: mapboxgl.Map) => {
    mapRef.current = map;

    if (!layersInitialized.current) {
      addMapLayers(map);
      layersInitialized.current = true;
    }
  }, []);

  // Sync layer visibility with store
  useEffect(() => {
    if (!mapRef.current || !layersInitialized.current) return;

    layers.forEach((layer) => {
      if (layer.id !== 'basemap') {
        setLayerVisibility(mapRef.current!, layer.id, layer.visible);
        setLayerOpacity(mapRef.current!, layer.id, layer.opacity);
      }
    });
  }, [layers]);

  // Update marker data when markers change
  useEffect(() => {
    if (!mapRef.current || !layersInitialized.current) return;
    updateMarkersData(mapRef.current, markers);
  }, [markers]);

  // Update alert data when alerts change
  useEffect(() => {
    if (!mapRef.current || !layersInitialized.current) return;
    updateAlertsData(mapRef.current, alerts);
  }, [alerts]);

  // Update flight track data when tracks change
  useEffect(() => {
    if (!mapRef.current || !layersInitialized.current) return;
    const flightTracks = tracks.filter((t) => t.type === 'flight');
    updateTracksData(mapRef.current, flightTracks, 'flight');
  }, [tracks]);

  // Update maritime track data when tracks change
  useEffect(() => {
    if (!mapRef.current || !layersInitialized.current) return;
    const maritimeTracks = tracks.filter((t) => t.type === 'maritime');
    updateTracksData(mapRef.current, maritimeTracks, 'maritime');
  }, [tracks]);

  return (
    <>
      {/* Full-screen map container - uses negative margins to fill AppShell padding */}
      <div className="fixed inset-0 z-10">
        {/* Mapbox GL Map */}
        <CommandMap
          onMapLoad={handleMapLoad}
          onBoundsChange={handleBoundsChange}
          onFeatureClick={handleFeatureClick}
        />

        {/* Tactical overlay effects */}
        <MapOverlay scanlines={true} vignette={true} noise={false} />

        {/* Feature detail popup */}
        <FeatureDetailPopup
          feature={selectedFeature}
          onClose={handlePopupClose}
          onAcknowledge={handleAcknowledge}
        />

        {/* Floating panels */}
        <LayerControlPanel />
        <SituationOverviewPanel />
        <AlertFeedPanel />
        <QuickFiltersPanel />

        {/* Custom status bar for map (replaces default AppShell status bar visually) */}
        <MapStatusBar />
      </div>
    </>
  );
}
