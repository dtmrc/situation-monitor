import { MapPin } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'nai' | 'threat' | 'asset';
  status?: 'active' | 'inactive' | 'alert';
}

interface MiniMapProps {
  markers: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
}

const markerColors: Record<MapMarker['type'], string> = {
  nai: 'bg-tactical-blue',
  threat: 'bg-tactical-red',
  asset: 'bg-tactical-green',
};

const statusRing: Record<NonNullable<MapMarker['status']>, string> = {
  active: 'ring-tactical-green',
  inactive: 'ring-muted',
  alert: 'ring-tactical-red animate-pulse',
};

export function MiniMap({ markers, onMarkerClick }: MiniMapProps) {
  // Simple placeholder map - in production, integrate with Mapbox/Leaflet
  // This creates a basic grid representation

  // Normalize coordinates to 0-100 range for display
  const normalizedMarkers = markers.map((marker) => ({
    ...marker,
    x: ((marker.lng + 180) / 360) * 100,
    y: ((90 - marker.lat) / 180) * 100,
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Geospatial Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video bg-card/50 rounded border border-border overflow-hidden">
          {/* Grid lines */}
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 opacity-20">
            {Array(48)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="border border-border" />
              ))}
          </div>

          {/* Simple world outline - placeholder */}
          <svg
            className="absolute inset-0 w-full h-full opacity-30"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <ellipse
              cx="50"
              cy="50"
              rx="40"
              ry="35"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-muted-foreground"
            />
          </svg>

          {/* Markers */}
          {normalizedMarkers.map((marker) => (
            <div
              key={marker.id}
              className={cn(
                'absolute w-3 h-3 rounded-full cursor-pointer transition-transform hover:scale-150',
                markerColors[marker.type],
                marker.status && `ring-2 ${statusRing[marker.status]}`
              )}
              style={{
                left: `${marker.x}%`,
                top: `${marker.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => onMarkerClick?.(marker)}
              title={marker.name}
            />
          ))}

          {/* Legend */}
          <div className="absolute bottom-2 right-2 flex gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-tactical-blue" />
              <span className="text-muted-foreground">NAI</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-tactical-red" />
              <span className="text-muted-foreground">Threat</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-tactical-green" />
              <span className="text-muted-foreground">Asset</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
