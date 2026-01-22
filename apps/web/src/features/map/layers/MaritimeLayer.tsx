/**
 * Maritime Layer
 *
 * Displays AIS vessel tracking data on the map:
 * - Ship type differentiated by icon/color
 * - Heading indicators with rotation
 * - Speed and name labels
 * - Course vectors for moving vessels
 * - Click interaction for vessel details
 */

import { useQuery } from '@tanstack/react-query';
import type { FeatureCollection, Point } from 'geojson';
import type mapboxgl from 'mapbox-gl';
import { useEffect, useRef, useCallback } from 'react';

interface MaritimeLayerProps {
  map: mapboxgl.Map | null;
  projectId: string;
  visible: boolean;
  showLabels?: boolean;
  shipTypeFilter?: number[];
  severityFilter?: string[];
  onVesselClick?: (vessel: VesselState) => void;
}

interface VesselState {
  mmsi: string;
  name: string;
  latitude: number;
  longitude: number;
  course: number;
  speed: number;
  heading: number;
  shipType: number;
  shipTypeLabel: string;
  shipCategory?: string;
  navStatus: number;
  navStatusLabel: string;
  destination?: string;
  imo?: string;
  callsign?: string;
  draught?: number;
  severity: string;
  isMoving: boolean;
  alerts?: string[];
}

interface MaritimeResponse {
  vessels: VesselState[];
  timestamp: string;
  count: number;
}

// Ship type colors for map visualization
const SHIP_TYPE_COLORS: Record<number, string> = {
  30: '#22c55e', // Fishing - Green
  35: '#7c3aed', // Military - Purple
  60: '#3b82f6', // Passenger - Blue
  70: '#f97316', // Cargo - Orange
  80: '#ef4444', // Tanker - Red
  0: '#6b7280', // Unknown - Gray
};

// Severity colors
const SEVERITY_COLORS: Record<string, string> = {
  info: '#6b7280',
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

const SOURCE_IDS = {
  vessels: 'maritime-vessels',
};

const LAYER_IDS = {
  vesselCircles: 'maritime-vessel-circles',
  vesselLabels: 'maritime-vessel-labels',
  vesselDirections: 'maritime-vessel-directions',
};

async function fetchMaritimeData(
  projectId: string,
  options: { shipTypes?: number[]; severityFilter?: string[] }
): Promise<MaritimeResponse> {
  const params = new URLSearchParams();
  if (options.shipTypes?.length) {
    params.set('shipTypes', options.shipTypes.join(','));
  }
  if (options.severityFilter?.length) {
    params.set('severity', options.severityFilter.join(','));
  }

  const response = await fetch(`/api/projects/${projectId}/feeds/maritime?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch maritime data');
  }
  return response.json() as Promise<MaritimeResponse>;
}

export function MaritimeLayer({
  map,
  projectId,
  visible,
  showLabels = true,
  shipTypeFilter,
  severityFilter,
  onVesselClick,
}: MaritimeLayerProps) {
  const layersAdded = useRef(false);

  // Fetch data with 60-second refresh
  const { data } = useQuery({
    queryKey: ['maritime', projectId, shipTypeFilter, severityFilter],
    queryFn: () =>
      fetchMaritimeData(projectId, {
        shipTypes: shipTypeFilter,
        severityFilter,
      }),
    refetchInterval: 60 * 1000, // 60 seconds
    enabled: visible && !!map,
    staleTime: 30000,
  });

  // Handle vessel click
  const handleVesselClick = useCallback(
    (vessel: VesselState) => {
      onVesselClick?.(vessel);
    },
    [onVesselClick]
  );

  // Convert vessels to GeoJSON
  const vesselsGeoJSON: FeatureCollection<Point> | null = data?.vessels
    ? {
        type: 'FeatureCollection',
        features: data.vessels.map((vessel) => ({
          type: 'Feature' as const,
          id: vessel.mmsi,
          geometry: {
            type: 'Point' as const,
            coordinates: [vessel.longitude, vessel.latitude],
          },
          properties: {
            mmsi: vessel.mmsi,
            name: vessel.name,
            course: vessel.course,
            speed: vessel.speed,
            heading: vessel.heading,
            shipType: vessel.shipType,
            shipTypeLabel: vessel.shipTypeLabel,
            shipCategory: vessel.shipCategory || '',
            navStatus: vessel.navStatus,
            navStatusLabel: vessel.navStatusLabel,
            destination: vessel.destination || '',
            imo: vessel.imo || '',
            callsign: vessel.callsign || '',
            draught: vessel.draught || 0,
            severity: vessel.severity,
            isMoving: vessel.speed > 0.5,
            alerts: JSON.stringify(vessel.alerts || []),
          },
        })),
      }
    : null;

  // Initialize layers
  useEffect(() => {
    if (!map || layersAdded.current) return;

    const setupLayers = () => {
      // Add vessel source
      if (!map.getSource(SOURCE_IDS.vessels)) {
        map.addSource(SOURCE_IDS.vessels, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

      // Add vessel circles layer with ship type color coding
      if (!map.getLayer(LAYER_IDS.vesselCircles)) {
        map.addLayer({
          id: LAYER_IDS.vesselCircles,
          type: 'circle',
          source: SOURCE_IDS.vessels,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 10, 8, 15, 12],
            // Color based on ship type category
            'circle-color': [
              'match',
              ['floor', ['/', ['get', 'shipType'], 10]],
              3,
              SHIP_TYPE_COLORS[30], // Fishing - Green (30-39)
              6,
              SHIP_TYPE_COLORS[60], // Passenger - Blue (60-69)
              7,
              SHIP_TYPE_COLORS[70], // Cargo - Orange (70-79)
              8,
              SHIP_TYPE_COLORS[80], // Tanker - Red (80-89)
              SHIP_TYPE_COLORS[0], // Default - Gray
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
            // Dimmer for stationary vessels
            'circle-opacity': ['case', ['get', 'isMoving'], 1, 0.6],
          },
        });
      }

      // Add severity ring for vessels with alerts
      if (!map.getLayer(LAYER_IDS.vesselDirections)) {
        map.addLayer({
          id: LAYER_IDS.vesselDirections,
          type: 'circle',
          source: SOURCE_IDS.vessels,
          filter: [
            'any',
            ['==', ['get', 'severity'], 'high'],
            ['==', ['get', 'severity'], 'critical'],
          ],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 6, 10, 12, 15, 18],
            'circle-color': 'transparent',
            'circle-stroke-color': [
              'match',
              ['get', 'severity'],
              'critical',
              SEVERITY_COLORS.critical,
              'high',
              SEVERITY_COLORS.high,
              SEVERITY_COLORS.medium,
            ],
            'circle-stroke-width': 2,
          },
        });
      }

      // Add vessel labels with name, heading, and speed
      if (!map.getLayer(LAYER_IDS.vesselLabels)) {
        map.addLayer({
          id: LAYER_IDS.vesselLabels,
          type: 'symbol',
          source: SOURCE_IDS.vessels,
          minzoom: 8,
          layout: {
            'text-field': [
              'format',
              ['get', 'name'],
              { 'font-scale': 1.0 },
              '\n',
              {},
              [
                'concat',
                ['to-string', ['round', ['get', 'heading']]],
                '\u00B0 ',
                ['to-string', ['round', ['*', ['get', 'speed'], 10]]],
                // Divide by 10 to show 1 decimal
                ' kts',
              ],
              { 'font-scale': 0.8 },
            ],
            'text-size': 10,
            'text-offset': [0, 1.8],
            'text-anchor': 'top',
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            'text-max-width': 12,
            'text-optional': true,
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
      if (!onVesselClick) return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: [LAYER_IDS.vesselCircles],
      });

      if (features.length > 0) {
        const feature = features[0];
        const props = feature.properties as Record<string, unknown> | null;
        const coords = (feature.geometry as GeoJSON.Point).coordinates;

        const vessel: VesselState = {
          mmsi: String(props?.mmsi ?? ''),
          name: String(props?.name ?? ''),
          latitude: coords[1],
          longitude: coords[0],
          course: Number(props?.course ?? 0),
          speed: Number(props?.speed ?? 0),
          heading: Number(props?.heading ?? 0),
          shipType: Number(props?.shipType ?? 0),
          shipTypeLabel: String(props?.shipTypeLabel ?? 'Unknown'),
          shipCategory: props?.shipCategory ? String(props.shipCategory) : undefined,
          navStatus: Number(props?.navStatus ?? 15),
          navStatusLabel: String(props?.navStatusLabel ?? 'Unknown'),
          destination: props?.destination ? String(props.destination) : undefined,
          imo: props?.imo ? String(props.imo) : undefined,
          callsign: props?.callsign ? String(props.callsign) : undefined,
          draught: props?.draught ? Number(props.draught) : undefined,
          severity: String(props?.severity ?? 'info'),
          isMoving: Boolean(props?.isMoving),
          alerts: props?.alerts ? (JSON.parse(String(props.alerts)) as string[]) : undefined,
        };

        handleVesselClick(vessel);
      }
    };

    map.on('click', LAYER_IDS.vesselCircles, handleClick);

    // Cursor handling
    map.on('mouseenter', LAYER_IDS.vesselCircles, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', LAYER_IDS.vesselCircles, () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      map.off('click', LAYER_IDS.vesselCircles, handleClick);
    };
  }, [map, onVesselClick, handleVesselClick]);

  // Update data
  useEffect(() => {
    if (!map || !layersAdded.current) return;

    const vesselsSource = map.getSource(SOURCE_IDS.vessels);

    if (vesselsSource && 'setData' in vesselsSource && vesselsGeoJSON) {
      vesselsSource.setData(vesselsGeoJSON);
    }
  }, [map, vesselsGeoJSON]);

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

  // Update labels visibility
  useEffect(() => {
    if (!map || !layersAdded.current) return;

    if (map.getLayer(LAYER_IDS.vesselLabels)) {
      map.setLayoutProperty(
        LAYER_IDS.vesselLabels,
        'visibility',
        visible && showLabels ? 'visible' : 'none'
      );
    }
  }, [map, visible, showLabels]);

  // Component doesn't render anything visible - it manages map layers imperatively
  return null;
}

export { SHIP_TYPE_COLORS, SEVERITY_COLORS };
export type { VesselState, MaritimeLayerProps };
