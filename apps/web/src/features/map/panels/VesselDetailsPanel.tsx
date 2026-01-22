/**
 * Vessel Details Panel
 *
 * Displays detailed information about a selected vessel including:
 * - Vessel identification (name, MMSI, IMO, callsign)
 * - Navigation data (speed, heading, course, status)
 * - Voyage information (destination, draught)
 * - Alerts and severity indicators
 */

import { Ship, Navigation, MapPin, Radio, Ruler, X, AlertTriangle, Anchor } from 'lucide-react';

interface VesselDetailsPanelProps {
  vessel: {
    mmsi: string;
    name: string;
    imo?: string;
    callsign?: string;
    shipType: number;
    shipTypeLabel: string;
    shipCategory?: string;
    course: number;
    speed: number;
    heading: number;
    navStatus: number;
    navStatusLabel: string;
    destination?: string;
    draught?: number;
    severity: string;
    isMoving: boolean;
    alerts?: string[];
  };
  onClose: () => void;
}

// Badge component for status display
function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'warning';
}) {
  const variants = {
    default: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    secondary: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    destructive: 'bg-red-500/20 text-red-400 border-red-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

export function VesselDetailsPanel({ vessel, onClose }: VesselDetailsPanelProps) {
  const isMoving = vessel.speed > 0.5;

  return (
    <div className="w-80 bg-zinc-900/95 backdrop-blur border border-cyan-800/50 rounded-lg shadow-xl">
      {/* Header */}
      <div className="py-3 px-4 flex items-center justify-between border-b border-cyan-800/30">
        <div className="flex items-center gap-2">
          <Ship className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-white truncate max-w-[180px]">{vessel.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isMoving ? 'default' : 'secondary'}>
            {isMoving ? (
              <Navigation className="w-3 h-3 mr-1" />
            ) : (
              <Anchor className="w-3 h-3 mr-1" />
            )}
            {vessel.navStatusLabel}
          </Badge>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-700 rounded transition-colors"
            aria-label="Close panel"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Alerts */}
        {vessel.alerts && vessel.alerts.length > 0 && (
          <div className="space-y-1">
            {vessel.alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                  vessel.severity === 'critical'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : vessel.severity === 'high'
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}
              >
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span>{alert}</span>
              </div>
            ))}
          </div>
        )}

        {/* Vessel Type */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Type</span>
          <span className="text-white">{vessel.shipTypeLabel}</span>
        </div>

        {/* Speed */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Speed</span>
          <span className="font-mono text-cyan-400">{vessel.speed.toFixed(1)} kts</span>
        </div>

        {/* Course Over Ground */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400 flex items-center gap-1">
            <Navigation className="w-3 h-3" /> Course
          </span>
          <span className="font-mono text-white">{Math.round(vessel.course)}&deg;</span>
        </div>

        {/* True Heading */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Heading</span>
          <span className="font-mono text-white">{Math.round(vessel.heading)}&deg;</span>
        </div>

        {/* Destination */}
        {vessel.destination && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Destination
            </span>
            <span className="text-white text-right max-w-[150px] truncate">
              {vessel.destination}
            </span>
          </div>
        )}

        {/* Draught */}
        {vessel.draught !== undefined && vessel.draught > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400 flex items-center gap-1">
              <Ruler className="w-3 h-3" /> Draught
            </span>
            <span className="font-mono text-white">{vessel.draught.toFixed(1)} m</span>
          </div>
        )}

        {/* Identifiers Section */}
        <div className="border-t border-cyan-800/30 pt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">MMSI</span>
            <span className="font-mono text-zinc-300">{vessel.mmsi}</span>
          </div>
          {vessel.imo && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">IMO</span>
              <span className="font-mono text-zinc-300">{vessel.imo}</span>
            </div>
          )}
          {vessel.callsign && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 flex items-center gap-1">
                <Radio className="w-3 h-3" /> Callsign
              </span>
              <span className="font-mono text-zinc-300">{vessel.callsign}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { VesselDetailsPanelProps };
