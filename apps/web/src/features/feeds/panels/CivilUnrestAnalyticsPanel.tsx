/**
 * Civil Unrest Analytics Panel
 *
 * Displays aggregated analytics for civil unrest data:
 * - Summary statistics
 * - Event type distribution
 * - Country breakdown
 * - Severity distribution
 * - Recent events list
 * - Hotspot overview
 */

import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, MapPin, Skull, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface CivilUnrestAnalyticsPanelProps {
  projectId: string;
  className?: string;
}

interface UnrestEvent {
  id: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  fatalities: number;
  country: string;
  city?: string;
  date: string;
  verified: boolean;
  source: string;
}

interface UnrestHotspot {
  id: string;
  countries: string[];
  eventCount: number;
  fatalityCount: number;
  dominantType: string;
  trendDirection: 'increasing' | 'stable' | 'decreasing';
}

interface CivilUnrestData {
  events: UnrestEvent[];
  hotspots: UnrestHotspot[];
  statistics: {
    total: number;
    last24h: number;
    last7d: number;
    byType: Record<string, number>;
    byCountry: Record<string, number>;
    totalFatalities: number;
  };
}

const SEVERITY_COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  protest: '#3b82f6',
  riot: '#f97316',
  strike: '#8b5cf6',
  political_violence: '#ef4444',
  armed_clash: '#dc2626',
  mob_violence: '#f59e0b',
  remote_violence: '#6366f1',
  abduction: '#ec4899',
  sexual_violence: '#db2777',
  civilian_targeting: '#be123c',
};

async function fetchCivilUnrestAnalytics(projectId: string): Promise<CivilUnrestData> {
  const response = await fetch(`/api/projects/${projectId}/feeds/civil-unrest/analytics`);
  if (!response.ok) {
    throw new Error('Failed to fetch civil unrest analytics');
  }
  return response.json() as Promise<CivilUnrestData>;
}

export function CivilUnrestAnalyticsPanel({
  projectId,
  className,
}: CivilUnrestAnalyticsPanelProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['civil-unrest-analytics', projectId],
    queryFn: () => fetchCivilUnrestAnalytics(projectId),
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  // Prepare event type data
  const eventTypeData = useMemo(() => {
    if (!data?.statistics?.byType) return [];
    const entries = Object.entries(data.statistics.byType);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    return entries
      .map(([type, count]) => ({
        name: type.replace(/_/g, ' '),
        value: count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        color: EVENT_TYPE_COLORS[type] || '#6b7280',
      }))
      .sort((a, b) => b.value - a.value);
  }, [data?.statistics?.byType]);

  // Prepare country data
  const countryData = useMemo(() => {
    if (!data?.statistics?.byCountry) return [];
    const entries = Object.entries(data.statistics.byCountry);
    const maxCount = Math.max(...entries.map(([, count]) => count));
    return entries
      .map(([country, count]) => ({
        name: country,
        count,
        percentage: maxCount > 0 ? (count / maxCount) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [data?.statistics?.byCountry]);

  // Prepare severity data
  const severityData = useMemo(() => {
    if (!data?.events) return [];
    const counts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    data.events.forEach((e) => {
      if (e.severity in counts) {
        counts[e.severity]++;
      }
    });
    return Object.entries(counts).map(([severity, count]) => ({
      name: severity,
      value: count,
      color: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS],
    }));
  }, [data?.events]);

  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-zinc-800 bg-zinc-900 p-6', className)}>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="h-64 bg-zinc-800 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('rounded-lg border border-zinc-800 bg-zinc-900 p-6', className)}>
        <p className="text-red-400 text-sm">Failed to load civil unrest data</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-zinc-800 bg-zinc-900', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-green-400 font-mono text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Civil Unrest Analytics
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">ACLED + GDELT combined intelligence</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2 p-3 border-b border-zinc-800">
        <StatCard
          label="Total Events"
          value={data?.statistics?.total || 0}
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Last 24h"
          value={data?.statistics?.last24h || 0}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          variant="warning"
        />
        <StatCard
          label="Last 7d"
          value={data?.statistics?.last7d || 0}
          icon={<MapPin className="h-3.5 w-3.5" />}
          variant="info"
        />
        <StatCard
          label="Fatalities"
          value={data?.statistics?.totalFatalities || 0}
          icon={<Skull className="h-3.5 w-3.5" />}
          variant="danger"
        />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start border-b border-zinc-800 rounded-none bg-transparent px-2">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 text-xs"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="events"
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 text-xs"
          >
            Recent Events
          </TabsTrigger>
          <TabsTrigger
            value="hotspots"
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 text-xs"
          >
            Hotspots
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="p-3 space-y-4">
          {/* Event Types */}
          <div>
            <h4 className="text-xs font-medium text-zinc-400 mb-2">By Event Type</h4>
            <div className="space-y-1.5">
              {eventTypeData.slice(0, 5).map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-zinc-300 capitalize">{item.name}</span>
                      <span className="text-zinc-500">{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Countries */}
          <div>
            <h4 className="text-xs font-medium text-zinc-400 mb-2">Top Countries</h4>
            <div className="space-y-1.5">
              {countryData.slice(0, 5).map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-zinc-300">{item.name}</span>
                      <span className="text-zinc-500">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Severity Distribution */}
          <div>
            <h4 className="text-xs font-medium text-zinc-400 mb-2">Severity Distribution</h4>
            <div className="flex gap-1.5">
              {severityData.map((item) => (
                <div
                  key={item.name}
                  className="flex-1 rounded p-2 text-center"
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  <p
                    className="text-[10px] uppercase tracking-wider font-medium"
                    style={{ color: item.color }}
                  >
                    {item.name}
                  </p>
                  <p className="text-lg font-mono text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="events" className="p-0">
          <ScrollArea className="h-64">
            <div className="divide-y divide-zinc-800">
              {data?.events?.slice(0, 20).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-2 p-3 hover:bg-zinc-800/50 transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{
                      backgroundColor: SEVERITY_COLORS[event.severity],
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {event.eventType.replace(/_/g, ' ')} in {event.city || event.country}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                      <span>{formatDistanceToNow(new Date(event.date), { addSuffix: true })}</span>
                      {event.fatalities > 0 && (
                        <span className="text-red-400">{event.fatalities} fatalities</span>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] py-0 h-4',
                          event.verified
                            ? 'border-green-600 text-green-400'
                            : 'border-zinc-600 text-zinc-400'
                        )}
                      >
                        {event.source.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {(!data?.events || data.events.length === 0) && (
                <div className="p-8 text-center text-zinc-500 text-sm">No events to display</div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="hotspots" className="p-0">
          <ScrollArea className="h-64">
            <div className="divide-y divide-zinc-800">
              {data?.hotspots?.map((hotspot) => (
                <div key={hotspot.id} className="p-3 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white text-sm">
                      {hotspot.countries.join(', ')}
                    </h4>
                    <TrendBadge direction={hotspot.trendDirection} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-zinc-500">Events</p>
                      <p className="text-white font-mono">{hotspot.eventCount}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Fatalities</p>
                      <p className="text-red-400 font-mono">{hotspot.fatalityCount}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Type</p>
                      <p className="text-blue-400 truncate capitalize">
                        {hotspot.dominantType.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {(!data?.hotspots || data.hotspots.length === 0) && (
                <div className="p-8 text-center text-zinc-500 text-sm">No hotspots detected</div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  variant = 'default',
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger' | 'info';
}) {
  const variantStyles = {
    default: 'text-white',
    warning: 'text-amber-400',
    danger: 'text-red-400',
    info: 'text-blue-400',
  };

  return (
    <div className="bg-zinc-800/50 rounded p-2">
      <div className="flex items-center gap-1 text-zinc-500 mb-0.5">
        {icon}
        <p className="text-[10px] uppercase tracking-wider">{label}</p>
      </div>
      <p className={cn('text-xl font-mono', variantStyles[variant])}>{value}</p>
    </div>
  );
}

function TrendBadge({ direction }: { direction: 'increasing' | 'stable' | 'decreasing' }) {
  const config = {
    increasing: {
      icon: TrendingUp,
      label: 'increasing',
      className: 'bg-red-500/20 text-red-400',
    },
    decreasing: {
      icon: TrendingDown,
      label: 'decreasing',
      className: 'bg-green-500/20 text-green-400',
    },
    stable: {
      icon: Minus,
      label: 'stable',
      className: 'bg-zinc-500/20 text-zinc-400',
    },
  };

  const { icon: Icon, label, className } = config[direction];

  return (
    <Badge className={cn('text-[10px] gap-1', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
