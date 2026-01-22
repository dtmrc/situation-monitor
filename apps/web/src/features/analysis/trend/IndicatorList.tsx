import { Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type TrendDirection = 'improving' | 'stable' | 'declining';

export interface IndicatorSummary {
  id: string;
  name: string;
  color: string;
  currentValue: number;
  change: number; // percentage change
  trend: TrendDirection;
}

interface IndicatorListProps {
  indicators: IndicatorSummary[];
  selectedId?: string;
  onSelect: (indicator: IndicatorSummary) => void;
  onAdd?: () => void;
}

function TrendIcon({ trend, className }: { trend: TrendDirection; className?: string }) {
  switch (trend) {
    case 'improving':
      return <TrendingUp className={cn('h-4 w-4 text-tactical-green', className)} />;
    case 'declining':
      return <TrendingDown className={cn('h-4 w-4 text-tactical-red', className)} />;
    default:
      return <Minus className={cn('h-4 w-4 text-muted-foreground', className)} />;
  }
}

function getChangeColor(change: number): string {
  if (change > 0) return 'text-tactical-green';
  if (change < 0) return 'text-tactical-red';
  return 'text-muted-foreground';
}

export function IndicatorList({
  indicators,
  selectedId,
  onSelect,
  onAdd,
}: IndicatorListProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Tracked Indicators</span>
          {onAdd && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAdd}>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-1.5">
          {indicators.map((indicator) => {
            const isSelected = indicator.id === selectedId;

            return (
              <button
                key={indicator.id}
                onClick={() => onSelect(indicator)}
                className={cn(
                  'w-full text-left px-3 py-3 rounded-md transition-colors',
                  'border border-transparent',
                  'hover:bg-secondary',
                  isSelected && 'bg-primary/10 border-primary/30'
                )}
              >
                <div className="flex items-center gap-2">
                  <TrendIcon trend={indicator.trend} />
                  <span
                    className={cn(
                      'text-sm font-medium truncate flex-1',
                      isSelected && 'text-primary'
                    )}
                  >
                    {indicator.name}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: indicator.color }}
                    />
                    <span className="text-sm font-mono font-bold">
                      {indicator.currentValue}
                    </span>
                  </div>
                  <span className={cn('text-xs font-mono', getChangeColor(indicator.change))}>
                    {indicator.change > 0 ? '+' : ''}
                    {indicator.change.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                  Trend: {indicator.trend}
                </div>
              </button>
            );
          })}

          {indicators.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No indicators tracked
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
