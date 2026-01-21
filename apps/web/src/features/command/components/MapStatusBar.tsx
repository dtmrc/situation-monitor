import { Crosshair, Locate, Navigation, Radio, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import { useMapStore } from '../store';

/**
 * MapStatusBar - Bottom status bar showing coordinates, zoom, time, and connection status
 *
 * Displays:
 * - Current cursor coordinates (lat/lng)
 * - Zoom level and bearing
 * - UTC time (updating every second)
 * - WebSocket connection status
 */

export function MapStatusBar() {
  const { cursor, viewState, wsConnected, isLoading } = useMapStore();
  const [utcTime, setUtcTime] = useState(getUTCTime());

  // Update UTC time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setUtcTime(getUTCTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-8 bg-background/90 backdrop-blur-sm border-t border-border z-[200]">
      <div className="h-full flex items-center justify-between px-4 text-xs font-mono">
        {/* Left section: Coordinates */}
        <div className="flex items-center gap-4">
          {/* Cursor coordinates */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Crosshair className="h-3 w-3" />
            {cursor ? (
              <span className="tabular-nums">
                {formatCoordinate(cursor.lat, 'lat')}, {formatCoordinate(cursor.lng, 'lng')}
              </span>
            ) : (
              <span className="text-muted-foreground/50">---.----, ---.----</span>
            )}
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-border" />

          {/* Zoom level */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Locate className="h-3 w-3" />
            <span className="tabular-nums">Z{viewState.zoom.toFixed(1)}</span>
          </div>

          {/* Bearing */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Navigation
              className="h-3 w-3 transition-transform"
              style={{ transform: `rotate(${viewState.bearing}deg)` }}
            />
            <span className="tabular-nums">{viewState.bearing.toFixed(0)}°</span>
          </div>
        </div>

        {/* Center section: Map center */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-muted-foreground/70">CTR:</span>
          <span className="tabular-nums">
            {formatCoordinate(viewState.center[1], 'lat')},{' '}
            {formatCoordinate(viewState.center[0], 'lng')}
          </span>
        </div>

        {/* Right section: Time and connection */}
        <div className="flex items-center gap-4">
          {/* UTC Time */}
          <div className="flex items-center gap-2">
            <span className="text-primary/80 font-semibold">UTC</span>
            <span className="tabular-nums text-foreground">{utcTime}</span>
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-border" />

          {/* Connection status */}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <>
                <Radio className="h-3 w-3 text-amber-500 animate-pulse" />
                <span className="text-amber-500">LOADING</span>
              </>
            ) : wsConnected ? (
              <>
                <Wifi className="h-3 w-3 text-primary" />
                <span className="text-primary">LIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">OFFLINE</span>
              </>
            )}
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                isLoading && 'bg-amber-500 animate-pulse',
                !isLoading && wsConnected && 'bg-primary status-online',
                !isLoading && !wsConnected && 'bg-muted-foreground'
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Format coordinate with hemisphere indicator */
function formatCoordinate(value: number, type: 'lat' | 'lng'): string {
  const absValue = Math.abs(value);
  const degrees = absValue.toFixed(4);

  if (type === 'lat') {
    return `${degrees}°${value >= 0 ? 'N' : 'S'}`;
  } else {
    return `${degrees}°${value >= 0 ? 'E' : 'W'}`;
  }
}

/** Get current UTC time formatted as HH:MM:SS */
function getUTCTime(): string {
  const now = new Date();
  return now.toISOString().slice(11, 19);
}
