import { AlertTriangle, ChevronDown, ChevronUp, Eye, MapPin, Shield } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

import { useMapStore } from '../store';

/**
 * SituationOverviewPanel - Floating panel showing key metrics
 *
 * Position: top-right corner
 * Features:
 * - Active threats count
 * - Open PIRs count
 * - NAIs being monitored
 * - Active alerts count
 * - Last update timestamp
 */

export function SituationOverviewPanel() {
  const [isExpanded, setIsExpanded] = useState(true);

  const { overview, alerts } = useMapStore();
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged).length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical' && !a.acknowledged).length;

  const metrics = [
    {
      id: 'threats',
      label: 'Active Threats',
      value: overview.activeThreats,
      icon: Shield,
      color: overview.activeThreats > 0 ? 'text-red-500' : 'text-muted-foreground',
      bgColor: overview.activeThreats > 0 ? 'bg-red-500/10' : 'bg-muted/50',
    },
    {
      id: 'pirs',
      label: 'Open PIRs',
      value: overview.openPirs,
      icon: Eye,
      color: overview.openPirs > 0 ? 'text-amber-500' : 'text-muted-foreground',
      bgColor: overview.openPirs > 0 ? 'bg-amber-500/10' : 'bg-muted/50',
    },
    {
      id: 'nais',
      label: 'NAIs Monitored',
      value: overview.naisMonitored,
      icon: MapPin,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      id: 'alerts',
      label: 'Active Alerts',
      value: unacknowledgedAlerts,
      icon: AlertTriangle,
      color: criticalAlerts > 0 ? 'text-red-500' : 'text-amber-500',
      bgColor: criticalAlerts > 0 ? 'bg-red-500/10' : 'bg-amber-500/10',
      badge: criticalAlerts > 0 ? `${criticalAlerts} CRIT` : undefined,
    },
  ];

  return (
    <div className="absolute top-4 right-4 z-[300]">
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden min-w-[200px]">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary status-online" />
            <span className="text-sm font-medium">Situation</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Metrics */}
        {isExpanded && (
          <div className="border-t border-border p-2 space-y-1">
            {metrics.map((metric) => (
              <div
                key={metric.id}
                className={cn(
                  'flex items-center justify-between px-2 py-1.5 rounded',
                  metric.bgColor
                )}
              >
                <div className="flex items-center gap-2">
                  <metric.icon className={cn('h-4 w-4', metric.color)} />
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {metric.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white animate-pulse">
                      {metric.badge}
                    </span>
                  )}
                  <span className={cn('text-sm font-mono font-semibold', metric.color)}>
                    {metric.value}
                  </span>
                </div>
              </div>
            ))}

            {/* Last update */}
            <div className="pt-2 border-t border-border/50 mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                <span>Last Update</span>
                <span className="font-mono">{formatTimestamp(overview.lastUpdate)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toISOString().slice(11, 19) + 'Z';
}
