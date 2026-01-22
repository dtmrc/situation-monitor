import { createFileRoute } from '@tanstack/react-router';
import type mapboxgl from 'mapbox-gl';
import { useCallback, useEffect, useRef } from 'react';

import {
  addMapLayers,
  AlertFeedPanel,
  CommandMap,
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
} from '@/features/command';
import { useUserLocation } from '@/hooks/useUserLocation';

export const Route = createFileRoute('/_app/command')({
  component: CommandCenterPage,
});

function CommandCenterPage() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const layersInitialized = useRef(false);
  const initialLocationSet = useRef(false);

  const { layers, markers, alerts, tracks, flyTo } = useMapStore();
  const { location, isLoading: locationLoading } = useUserLocation();

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
        <CommandMap onMapLoad={handleMapLoad} />

        {/* Tactical overlay effects */}
        <MapOverlay scanlines={true} vignette={true} noise={false} />

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
