import { BarChart3 } from 'lucide-react';
import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DataPoint {
  scenarioId: string;
  scenarioName: string;
  value: number;
  color: string;
}

interface MetricComparison {
  metric: string;
  dataPoints: DataPoint[];
}

interface ComparativeBarChartProps {
  data: MetricComparison[];
}

export function ComparativeBarChart({ data }: ComparativeBarChartProps) {
  const maxValue = useMemo(() => {
    let max = 0;
    data.forEach((metric) => {
      metric.dataPoints.forEach((dp) => {
        if (dp.value > max) max = dp.value;
      });
    });
    return max || 100;
  }, [data]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Comparative Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No metrics to compare</p>
        </CardContent>
      </Card>
    );
  }

  // Get all unique scenarios for legend
  const scenarios = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    data.forEach((metric) => {
      metric.dataPoints.forEach((dp) => {
        if (!map.has(dp.scenarioId)) {
          map.set(dp.scenarioId, { name: dp.scenarioName, color: dp.color });
        }
      });
    });
    return Array.from(map.entries());
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Comparative Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((metric) => (
          <div key={metric.metric}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{metric.metric}</span>
            </div>
            <div className="flex items-end gap-1 h-16">
              {metric.dataPoints.map((dp) => {
                const height = (dp.value / maxValue) * 100;
                return (
                  <div key={dp.scenarioId} className="flex-1 flex flex-col items-center group">
                    <div className="w-full relative">
                      <div
                        className={cn('w-full rounded-t transition-all', 'group-hover:opacity-80')}
                        style={{
                          height: `${height}%`,
                          minHeight: '4px',
                          backgroundColor: dp.color,
                        }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <div className="bg-popover border border-border rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                          {dp.scenarioName}: {dp.value}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono mt-1 text-muted-foreground">{dp.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
          {scenarios.map(([id, { name, color }]) => (
            <div key={id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              {name}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
