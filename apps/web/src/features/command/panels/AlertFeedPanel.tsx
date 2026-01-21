import { AlertTriangle, Bell, Check, ChevronDown, ChevronUp, MapPin, X } from 'lucide-react';
import { useState } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import { useMapStore } from '../store';
import type { Alert, SeverityLevel } from '../types';

/**
 * AlertFeedPanel - Floating panel showing recent alerts
 *
 * Position: bottom-left corner (above status bar)
 * Features:
 * - List of recent alerts
 * - Click to fly to alert location
 * - Acknowledge/dismiss alerts
 * - Severity indicators
 */

const severityConfig: Record<
  SeverityLevel,
  { color: string; bgColor: string; icon: typeof AlertTriangle }
> = {
  critical: {
    color: 'text-red-500',
    bgColor: 'bg-red-500/10 border-red-500/30',
    icon: AlertTriangle,
  },
  high: {
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
    icon: AlertTriangle,
  },
  medium: {
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    icon: Bell,
  },
  low: {
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10 border-cyan-500/30',
    icon: Bell,
  },
  info: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50 border-border',
    icon: Bell,
  },
};

export function AlertFeedPanel() {
  const [isExpanded, setIsExpanded] = useState(true);

  const { alerts, acknowledgeAlert, removeAlert, flyTo } = useMapStore();

  // Show only unacknowledged alerts, sorted by severity then time
  const visibleAlerts = alerts
    .filter((a) => !a.acknowledged)
    .sort((a, b) => {
      const severityOrder: Record<SeverityLevel, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
        info: 4,
      };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })
    .slice(0, 10); // Show max 10 alerts

  const criticalCount = visibleAlerts.filter((a) => a.severity === 'critical').length;

  const handleAlertClick = (alert: Alert) => {
    if (alert.coordinates) {
      const coords = alert.coordinates as [number, number];
      flyTo(coords, 12);
    }
  };

  return (
    <div className="absolute bottom-12 left-4 z-[300]">
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden w-[320px]">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                'h-4 w-4',
                criticalCount > 0 ? 'text-red-500 animate-pulse' : 'text-amber-500'
              )}
            />
            <span className="text-sm font-medium">Alerts</span>
            {visibleAlerts.length > 0 && (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full font-mono">
                {visibleAlerts.length}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Alert list */}
        {isExpanded && (
          <div className="border-t border-border">
            {visibleAlerts.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No active alerts
              </div>
            ) : (
              <ScrollArea className="max-h-[240px]">
                <div className="p-2 space-y-1">
                  {visibleAlerts.map((alert) => {
                    const config = severityConfig[alert.severity];
                    const Icon = config.icon;

                    return (
                      <div
                        key={alert.id}
                        className={cn(
                          'relative rounded border p-2 cursor-pointer transition-colors',
                          config.bgColor,
                          'hover:brightness-110'
                        )}
                        onClick={() => handleAlertClick(alert)}
                      >
                        <div className="flex items-start gap-2">
                          <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', config.color)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium truncate">{alert.title}</span>
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                {formatRelativeTime(alert.timestamp)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {alert.message}
                            </p>
                            {alert.coordinates && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>Click to locate</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              acknowledgeAlert(alert.id);
                            }}
                            className="p-1 rounded hover:bg-background/50"
                            title="Acknowledge"
                          >
                            <Check className="h-3 w-3 text-primary" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAlert(alert.id);
                            }}
                            className="p-1 rounded hover:bg-background/50"
                            title="Dismiss"
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toISOString().slice(11, 16);
}
