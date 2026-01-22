import { Plus, GripVertical, TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Factor {
  id: string;
  name: string;
  impact: number; // 1-5
  trend: 'improving' | 'stable' | 'declining';
  description?: string;
}

interface FactorListProps {
  factors: Factor[];
  selectedId?: string;
  onSelect: (factor: Factor) => void;
  onAdd?: () => void;
  onReorder?: (factors: Factor[]) => void;
}

function getImpactColor(impact: number): string {
  if (impact >= 5) return 'text-tactical-red';
  if (impact >= 4) return 'text-orange-500';
  if (impact >= 3) return 'text-tactical-amber';
  return 'text-tactical-green';
}

function TrendIcon({ trend }: { trend: Factor['trend'] }) {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="h-3.5 w-3.5 text-tactical-green" />;
    case 'declining':
      return <TrendingDown className="h-3.5 w-3.5 text-tactical-red" />;
    default:
      return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

export function FactorList({
  factors,
  selectedId,
  onSelect,
  onAdd,
}: FactorListProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Factors</span>
          {onAdd && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAdd}>
              <Plus className="h-3 w-3 mr-1" />
              Add Factor
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-1">
          {factors.map((factor) => {
            const isSelected = factor.id === selectedId;

            return (
              <button
                key={factor.id}
                onClick={() => onSelect(factor)}
                className={cn(
                  'w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-md transition-colors',
                  'hover:bg-secondary group',
                  isSelected && 'bg-primary/10 ring-1 ring-primary/50'
                )}
              >
                {/* Drag handle */}
                <GripVertical className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab shrink-0" />

                {/* Factor info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-sm font-medium truncate',
                        isSelected && 'text-primary'
                      )}
                    >
                      {factor.name}
                    </span>
                  </div>
                  {factor.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {factor.description}
                    </p>
                  )}
                </div>

                {/* Impact indicator */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={cn(
                          'w-1.5 h-3 rounded-sm',
                          level <= factor.impact
                            ? getImpactColor(factor.impact).replace('text-', 'bg-')
                            : 'bg-muted/30'
                        )}
                      />
                    ))}
                  </div>
                  <TrendIcon trend={factor.trend} />
                </div>
              </button>
            );
          })}

          {factors.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No factors defined for this domain
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
