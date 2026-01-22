import { X, AlertTriangle, Plane, Ship, User, MapPin, Clock, Info } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { MapFeatureClickEvent } from './CommandMap';

interface FeatureDetailPopupProps {
  feature: MapFeatureClickEvent | null;
  onClose: () => void;
  onAcknowledge?: (featureId: string) => void;
}

const SEVERITY_COLORS = {
  critical: 'text-red-500 bg-red-500/10 border-red-500/30',
  high: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
  medium: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  low: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  info: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
} as const;

const LAYER_ICONS = {
  alert: AlertTriangle,
  track: Plane,
  marker: MapPin,
  actor: User,
} as const;

// Helper to safely get string from unknown
function getString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

// Helper to safely get number from unknown
function getNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

export function FeatureDetailPopup({ feature, onClose, onAcknowledge }: FeatureDetailPopupProps) {
  if (!feature) return null;

  const { layerType, properties, coordinates } = feature;
  const Icon = LAYER_ICONS[layerType] || Info;

  // Extract display values with type safety
  const title =
    getString(properties.title) || getString(properties.name) || getString(properties.callsign);
  const message = getString(properties.message);
  const timestamp = getString(properties.timestamp);
  const trackType = getString(properties.type);
  const status = getString(properties.status);
  const speed = getNumber(properties.speed);
  const heading = getNumber(properties.heading);
  const altitude = getNumber(properties.altitude);
  const acknowledged = Boolean(properties.acknowledged);

  // Type-safe severity handling
  const rawSeverity = getString(properties.severity);
  const severity =
    rawSeverity && rawSeverity in SEVERITY_COLORS
      ? (rawSeverity as keyof typeof SEVERITY_COLORS)
      : undefined;
  const severityClass = severity ? SEVERITY_COLORS[severity] : SEVERITY_COLORS.info;

  // Format track-specific icon
  const TrackIcon = trackType === 'maritime' ? Ship : Plane;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 w-80 max-w-[90vw]">
      <div
        className={cn(
          'bg-neutral-900/95 backdrop-blur-sm border rounded-lg shadow-xl',
          'font-mono text-sm',
          severityClass
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-current/20">
          <div className="flex items-center gap-2">
            {layerType === 'track' ? (
              <TrackIcon className="w-4 h-4" />
            ) : (
              <Icon className="w-4 h-4" />
            )}
            <span className="font-semibold uppercase tracking-wide text-xs">
              {layerType === 'track' ? trackType || 'track' : layerType}
            </span>
            {severity && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] uppercase font-bold',
                  severityClass
                )}
              >
                {severity}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          {/* Title/Name */}
          {title && <div className="text-white font-medium">{title}</div>}

          {/* Message (for alerts) */}
          {message && <p className="text-neutral-400 text-xs">{message}</p>}

          {/* Coordinates */}
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <MapPin className="w-3 h-3" />
            <span>
              {coordinates[1].toFixed(4)}°, {coordinates[0].toFixed(4)}°
            </span>
          </div>

          {/* Timestamp */}
          {timestamp && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Clock className="w-3 h-3" />
              <span>{new Date(timestamp).toLocaleString()}</span>
            </div>
          )}

          {/* Track-specific info */}
          {layerType === 'track' && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              {speed !== null && (
                <div className="text-xs">
                  <span className="text-neutral-500">Speed:</span>{' '}
                  <span className="text-white">{speed} kts</span>
                </div>
              )}
              {heading !== null && (
                <div className="text-xs">
                  <span className="text-neutral-500">Heading:</span>{' '}
                  <span className="text-white">{Math.round(heading)}°</span>
                </div>
              )}
              {altitude !== null && (
                <div className="text-xs">
                  <span className="text-neutral-500">Altitude:</span>{' '}
                  <span className="text-white">{(altitude / 1000).toFixed(1)}k ft</span>
                </div>
              )}
              {status && (
                <div className="text-xs">
                  <span className="text-neutral-500">Status:</span>{' '}
                  <span className={cn('text-white', status === 'lost' && 'text-red-400')}>
                    {status}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actor-specific info */}
          {layerType === 'actor' && trackType && (
            <div className="pt-2 border-t border-white/10">
              <div className="text-xs">
                <span className="text-neutral-500">Classification:</span>{' '}
                <span
                  className={cn(
                    'uppercase font-semibold',
                    trackType === 'hostile' && 'text-red-400',
                    trackType === 'friendly' && 'text-emerald-400',
                    trackType === 'neutral' && 'text-amber-400',
                    trackType === 'unknown' && 'text-neutral-400'
                  )}
                >
                  {trackType}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {layerType === 'alert' && !acknowledged && onAcknowledge && (
          <div className="p-3 border-t border-current/20">
            <button
              onClick={() => onAcknowledge(feature.featureId)}
              className={cn(
                'w-full py-2 px-3 rounded text-xs font-semibold uppercase tracking-wide',
                'bg-current/20 hover:bg-current/30 transition-colors',
                'border border-current/30'
              )}
            >
              Acknowledge Alert
            </button>
          </div>
        )}

        {/* Acknowledged badge */}
        {layerType === 'alert' && acknowledged && (
          <div className="p-3 border-t border-current/20">
            <div className="text-xs text-neutral-500 text-center uppercase tracking-wide">
              ✓ Acknowledged
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
