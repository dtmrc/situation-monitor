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
  useMockDataFeed,
  useMapStore,
} from '@/features/command';

export const Route = createFileRoute('/_app/command')({
  component: CommandCenterPage,
});

function CommandCenterPage() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const layersInitialized = useRef(false);

  const { layers, markers, alerts } = useMapStore();

  // Use mock data for demo (replace with useWebSocketFeed in production)
  useMockDataFeed();

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

  return (
    <>
      {/* Full-screen map container - uses negative margins to fill AppShell padding */}
      <div className="relative -m-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)]">
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
