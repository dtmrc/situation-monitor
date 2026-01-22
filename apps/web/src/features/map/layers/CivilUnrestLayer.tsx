/**
 * Civil Unrest Map Layer
 *
 * Displays civil unrest events from ACLED and GDELT on the map:
 * - Severity-based color coding
 * - Hotspot visualization
 * - Verified vs unverified styling
 * - Fatality indicators
 */

import { useQuery } from '@tanstack/react-query';
import type { FeatureCollection, Point } from 'geojson';
import type mapboxgl from 'mapbox-gl';
import { useEffect, useRef } from 'react';

interface CivilUnrestLayerProps {
  map: mapboxgl.Map | null;
  projectId: string;
  visible: boolean;
  eventTypeFilter?: string[];
  severityFilter?: string[];
  showHotspots?: boolean;
  onEventClick?: (event: UnrestEventFeature) => void;
}

interface UnrestEventFeature {
  id: string;
  eventType: string;
  severity: string;
  fatalities: number;
  country: string;
  city?: string;
  date: string;
  verified: boolean;
  lat: number;
  lng: number;
}

const SEVERITY_COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

const SOURCE_IDS = {
  events: 'civil-unrest-events',
  hotspots: 'civil-unrest-hotspots',
};

const LAYER_IDS = {
  hotspotsCircle: 'civil-unrest-hotspots-circle',
  eventsCircles: 'civil-unrest-events-circles',
  eventsFatality: 'civil-unrest-events-fatality',
  eventsLabels: 'civil-unrest-events-labels',
};

interface CivilUnrestResponse {
  events: UnrestEventFeature[];
  hotspots: Array<{
    id: string;
    center: { lat: number; lng: number };
    eventCount: number;
    fatalityCount: number;
    dominantType: string;
    radius: number;
  }>;
}

async function fetchCivilUnrestData(
  projectId: string,
  options: { eventTypes?: string[] }
): Promise<CivilUnrestResponse> {
  const params = new URLSearchParams();
  if (options.eventTypes?.length) {
    params.set('eventTypes', options.eventTypes.join(','));
  }

  const response = await fetch(
    `/api/projects/${projectId}/feeds/civil-unrest?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch civil unrest data');
  }
  return response.json() as Promise<CivilUnrestResponse>;
}

export function CivilUnrestLayer({
  map,
  projectId,
  visible,
  eventTypeFilter,
  severityFilter,
  showHotspots = true,
  onEventClick,
}: CivilUnrestLayerProps) {
  const layersAdded = useRef(false);

  const { data } = useQuery({
    queryKey: ['civil-unrest', projectId, eventTypeFilter],
    queryFn: () => fetchCivilUnrestData(projectId, { eventTypes: eventTypeFilter }),
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    enabled: visible && !!map,
  });

  // Convert events to GeoJSON
  const eventsGeoJSON: FeatureCollection<Point> | null = data?.events
    ? {
        type: 'FeatureCollection',
        features: data.events
          .filter((e) => !severityFilter?.length || severityFilter.includes(e.severity))
          .map((event) => ({
            type: 'Feature' as const,
            id: event.id,
            geometry: {
              type: 'Point' as const,
              coordinates: [event.lng, event.lat],
            },
            properties: {
              id: event.id,
              eventType: event.eventType,
              severity: event.severity,
              fatalities: event.fatalities || 0,
              country: event.country,
              city: event.city || '',
              date: event.date,
              verified: event.verified,
            },
          })),
      }
    : null;

  // Convert hotspots to GeoJSON
  const hotspotsGeoJSON: FeatureCollection<Point> | null =
    data?.hotspots && showHotspots
      ? {
          type: 'FeatureCollection',
          features: data.hotspots.map((hotspot) => ({
            type: 'Feature' as const,
            id: hotspot.id,
            geometry: {
              type: 'Point' as const,
              coordinates: [hotspot.center.lng, hotspot.center.lat],
            },
            properties: {
              id: hotspot.id,
              eventCount: hotspot.eventCount,
              fatalityCount: hotspot.fatalityCount,
              dominantType: hotspot.dominantType,
              radius: hotspot.radius,
            },
          })),
        }
      : null;

  // Initialize layers
  useEffect(() => {
    if (!map || layersAdded.current) return;

    const setupLayers = () => {
      // Add empty sources
      if (!map.getSource(SOURCE_IDS.events)) {
        map.addSource(SOURCE_IDS.events, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

      if (!map.getSource(SOURCE_IDS.hotspots)) {
        map.addSource(SOURCE_IDS.hotspots, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

      // Add hotspot circles layer (background)
      if (!map.getLayer(LAYER_IDS.hotspotsCircle)) {
        map.addLayer({
          id: LAYER_IDS.hotspotsCircle,
          type: 'circle',
          source: SOURCE_IDS.hotspots,
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'eventCount'],
              3,
              30,
              10,
              50,
              50,
              80,
            ],
            'circle-color': 'rgba(239, 68, 68, 0.15)',
            'circle-stroke-color': 'rgba(239, 68, 68, 0.4)',
            'circle-stroke-width': 2,
          },
        });
      }

      // Add event circles layer
      if (!map.getLayer(LAYER_IDS.eventsCircles)) {
        map.addLayer({
          id: LAYER_IDS.eventsCircles,
          type: 'circle',
          source: SOURCE_IDS.events,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 5, 10, 8, 15, 12],
            'circle-color': [
              'match',
              ['get', 'severity'],
              'critical',
              SEVERITY_COLORS.critical,
              'high',
              SEVERITY_COLORS.high,
              'medium',
              SEVERITY_COLORS.medium,
              SEVERITY_COLORS.low,
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': ['case', ['get', 'verified'], 2, 1],
            'circle-opacity': ['case', ['get', 'verified'], 1, 0.7],
          },
        });
      }

      // Add fatality indicator layer
      if (!map.getLayer(LAYER_IDS.eventsFatality)) {
        map.addLayer({
          id: LAYER_IDS.eventsFatality,
          type: 'circle',
          source: SOURCE_IDS.events,
          filter: ['>', ['get', 'fatalities'], 0],
          paint: {
            'circle-radius': [
              '+',
              ['interpolate', ['linear'], ['zoom'], 5, 5, 10, 8, 15, 12],
              ['min', ['get', 'fatalities'], 5],
            ],
            'circle-color': 'transparent',
            'circle-stroke-color': '#000000',
            'circle-stroke-width': 1,
          },
        });
      }

      // Add labels layer
      if (!map.getLayer(LAYER_IDS.eventsLabels)) {
        map.addLayer({
          id: LAYER_IDS.eventsLabels,
          type: 'symbol',
          source: SOURCE_IDS.events,
          minzoom: 10,
          layout: {
            'text-field': ['get', 'city'],
            'text-size': 10,
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1,
          },
        });
      }

      layersAdded.current = true;
    };

    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.on('style.load', setupLayers);
    }

    // Click handler
    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      if (!onEventClick) return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: [LAYER_IDS.eventsCircles],
      });

      if (features.length > 0) {
        const feature = features[0];
        const props = feature.properties as Record<string, unknown> | null;
        const coords = (feature.geometry as GeoJSON.Point).coordinates;

        onEventClick({
          id: String(props?.id ?? ''),
          eventType: String(props?.eventType ?? ''),
          severity: String(props?.severity ?? ''),
          fatalities: Number(props?.fatalities ?? 0),
          country: String(props?.country ?? ''),
          city: props?.city ? String(props.city) : undefined,
          date: String(props?.date ?? ''),
          verified: Boolean(props?.verified),
          lat: coords[1],
          lng: coords[0],
        });
      }
    };

    map.on('click', LAYER_IDS.eventsCircles, handleClick);

    // Cursor handling
    map.on('mouseenter', LAYER_IDS.eventsCircles, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', LAYER_IDS.eventsCircles, () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      map.off('click', LAYER_IDS.eventsCircles, handleClick);
    };
  }, [map, onEventClick]);

  // Update data
  useEffect(() => {
    if (!map || !layersAdded.current) return;

    const eventsSource = map.getSource(SOURCE_IDS.events);
    const hotspotsSource = map.getSource(SOURCE_IDS.hotspots);

    if (eventsSource && 'setData' in eventsSource && eventsGeoJSON) {
      eventsSource.setData(eventsGeoJSON);
    }

    if (hotspotsSource && 'setData' in hotspotsSource && hotspotsGeoJSON) {
      hotspotsSource.setData(hotspotsGeoJSON);
    }
  }, [map, eventsGeoJSON, hotspotsGeoJSON]);

  // Update visibility
  useEffect(() => {
    if (!map || !layersAdded.current) return;

    const visibility = visible ? 'visible' : 'none';

    Object.values(LAYER_IDS).forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    });
  }, [map, visible]);

  // Update hotspot visibility
  useEffect(() => {
    if (!map || !layersAdded.current) return;

    if (map.getLayer(LAYER_IDS.hotspotsCircle)) {
      map.setLayoutProperty(
        LAYER_IDS.hotspotsCircle,
        'visibility',
        visible && showHotspots ? 'visible' : 'none'
      );
    }
  }, [map, visible, showHotspots]);

  // Component doesn't render anything visible - it manages map layers imperatively
  return null;
}
