import { AlertTriangle, Bell, CheckCircle2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface TripwireAlert {
  id: string;
  name: string;
  triggeredAt: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'acknowledged' | 'resolved';
  indicator: string;
}

interface TripwirePanelProps {
  alerts: TripwireAlert[];
  onAlertClick?: (alert: TripwireAlert) => void;
}

const severityColors: Record<TripwireAlert['severity'], string> = {
  critical: 'bg-tactical-red/20 text-tactical-red border-tactical-red/30',
  high: 'bg-tactical-amber/20 text-tactical-amber border-tactical-amber/30',
  medium: 'bg-tactical-blue/20 text-tactical-blue border-tactical-blue/30',
  low: 'bg-muted text-muted-foreground border-border',
};

const statusIcons: Record<TripwireAlert['status'], React.ComponentType<{ className?: string }>> = {
  active: AlertTriangle,
  acknowledged: Bell,
  resolved: CheckCircle2,
};

export function TripwirePanel({ alerts, onAlertClick }: TripwirePanelProps) {
  // Sort by severity and recency, filter to recent
  const recentAlerts = [...alerts]
    .sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.triggeredAt.getTime() - a.triggeredAt.getTime();
    })
    .slice(0, 5);

  const activeCount = alerts.filter((a) => a.status === 'active').length;

  return (
    <Card className={activeCount > 0 ? 'border-tactical-red/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Tripwire Status
          </span>
          {activeCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {activeCount} Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentAlerts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-tactical-green" />
            No active alerts
          </div>
        ) : (
          <ul className="space-y-2">
            {recentAlerts.map((alert) => {
              const StatusIcon = statusIcons[alert.status];
              return (
                <li
                  key={alert.id}
                  className={cn(
                    'flex items-start gap-2 p-2 rounded border bg-card/50',
                    'cursor-pointer hover:bg-secondary transition-colors',
                    alert.status === 'active' ? 'border-tactical-red/30' : 'border-border'
                  )}
                  onClick={() => onAlertClick?.(alert)}
                >
                  <StatusIcon
                    className={cn(
                      'h-4 w-4 mt-0.5 shrink-0',
                      alert.status === 'active'
                        ? 'text-tactical-red animate-pulse'
                        : alert.status === 'acknowledged'
                          ? 'text-tactical-amber'
                          : 'text-tactical-green'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{alert.indicator}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={cn('text-xs', severityColors[alert.severity])}
                      >
                        {alert.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(alert.triggeredAt)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}
