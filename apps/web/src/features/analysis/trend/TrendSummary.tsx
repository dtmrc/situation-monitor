import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { type IndicatorSummary } from './IndicatorList';

interface TrendSummaryProps {
  indicators: IndicatorSummary[];
}

export function TrendSummary({ indicators }: TrendSummaryProps) {
  // Count by trend direction
  const improving = indicators.filter((i) => i.trend === 'improving').length;
  const stable = indicators.filter((i) => i.trend === 'stable').length;
  const declining = indicators.filter((i) => i.trend === 'declining').length;

  // Get top changes
  const sortedByChange = [...indicators].sort(
    (a, b) => Math.abs(b.change) - Math.abs(a.change)
  );
  const topChanges = sortedByChange.slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Trend Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Direction counts */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-2 bg-tactical-green/10 rounded-md">
            <TrendingUp className="h-4 w-4 text-tactical-green" />
            <div>
              <div className="text-lg font-bold text-tactical-green">{improving}</div>
              <div className="text-xs text-muted-foreground">Improving</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-lg font-bold">{stable}</div>
              <div className="text-xs text-muted-foreground">Stable</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-tactical-red/10 rounded-md">
            <TrendingDown className="h-4 w-4 text-tactical-red" />
            <div>
              <div className="text-lg font-bold text-tactical-red">{declining}</div>
              <div className="text-xs text-muted-foreground">Declining</div>
            </div>
          </div>
        </div>

        {/* Key Changes */}
        <div>
          <div className="text-xs text-muted-foreground mb-2">Key Changes This Period</div>
          <div className="space-y-2">
            {topChanges.map((indicator) => (
              <div
                key={indicator.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: indicator.color }}
                  />
                  <span className="truncate">{indicator.name}</span>
                </div>
                <span
                  className={cn(
                    'font-mono font-medium',
                    indicator.change > 0 ? 'text-tactical-green' : 'text-tactical-red'
                  )}
                >
                  {indicator.change > 0 ? '+' : ''}
                  {indicator.change.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Forecast placeholder */}
        <div className="p-3 bg-muted/20 rounded-md border border-dashed border-border">
          <div className="text-xs text-muted-foreground mb-1">Forecast (30 days)</div>
          <p className="text-xs text-muted-foreground">
            AI-powered forecasting available with data integration.
            Confidence bands will be displayed on the chart.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
