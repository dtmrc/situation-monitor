import { AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface RiskItem {
  category: string;
  level: 'critical' | 'high' | 'medium' | 'low';
  count: number;
}

interface RiskSummaryProps {
  risks: RiskItem[];
  onCategoryClick?: (category: string) => void;
}

const levelColors: Record<RiskItem['level'], string> = {
  critical: 'bg-tactical-red',
  high: 'bg-tactical-amber',
  medium: 'bg-tactical-blue',
  low: 'bg-tactical-green',
};

const levelOrder: Record<RiskItem['level'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function RiskSummary({ risks, onCategoryClick }: RiskSummaryProps) {
  // Sort by level severity
  const sortedRisks = [...risks].sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

  // Calculate totals by level
  const totals = risks.reduce(
    (acc, risk) => {
      acc[risk.level] = (acc[risk.level] || 0) + risk.count;
      return acc;
    },
    {} as Record<RiskItem['level'], number>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Risk Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary bar */}
        <div className="space-y-2">
          <div className="flex h-3 rounded-full overflow-hidden">
            {(['critical', 'high', 'medium', 'low'] as const).map((level) => {
              const count = totals[level] || 0;
              const total = Object.values(totals).reduce((a, b) => a + b, 0);
              const width = total > 0 ? (count / total) * 100 : 0;

              if (width === 0) return null;

              return (
                <div
                  key={level}
                  className={cn(levelColors[level])}
                  style={{ width: `${width}%` }}
                  title={`${level}: ${count}`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            {(['critical', 'high', 'medium', 'low'] as const).map((level) => {
              const count = totals[level] || 0;
              if (count === 0) return null;

              return (
                <div key={level} className="flex items-center gap-1.5">
                  <div className={cn('w-2 h-2 rounded-full', levelColors[level])} />
                  <span className="capitalize text-muted-foreground">
                    {level}: {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Risk breakdown by category */}
        {sortedRisks.length > 0 && (
          <ul className="space-y-1">
            {sortedRisks.map((risk) => (
              <li
                key={`${risk.category}-${risk.level}`}
                className={cn(
                  'flex items-center justify-between p-2 rounded text-sm',
                  'hover:bg-secondary transition-colors',
                  onCategoryClick && 'cursor-pointer'
                )}
                onClick={() => onCategoryClick?.(risk.category)}
              >
                <span>{risk.category}</span>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', levelColors[risk.level])} />
                  <span className="font-mono text-muted-foreground">{risk.count}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {risks.length === 0 && (
          <p className="text-sm text-muted-foreground">No risk data available</p>
        )}
      </CardContent>
    </Card>
  );
}
