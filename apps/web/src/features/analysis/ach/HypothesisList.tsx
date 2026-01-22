import { Plus, Star } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { type Hypothesis } from './AchMatrix';

interface HypothesisListProps {
  hypotheses: Hypothesis[];
  scores: Record<string, number>;
  selectedId?: string;
  onSelect: (hypothesis: Hypothesis) => void;
  onAdd?: () => void;
}

const statusConfig: Record<NonNullable<Hypothesis['status']>, { label: string; color: string }> = {
  under_review: { label: 'Under Review', color: 'text-tactical-blue' },
  most_likely: { label: 'Most Likely', color: 'text-tactical-green' },
  unlikely: { label: 'Unlikely', color: 'text-tactical-red' },
  possible: { label: 'Possible', color: 'text-tactical-amber' },
};

export function HypothesisList({
  hypotheses,
  scores,
  selectedId,
  onSelect,
  onAdd,
}: HypothesisListProps) {
  const maxScore = Math.max(...Object.values(scores));

  // Sort by score descending
  const sortedHypotheses = [...hypotheses].sort(
    (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0)
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Hypotheses</span>
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
          {sortedHypotheses.map((hypothesis) => {
            const isSelected = hypothesis.id === selectedId;
            const score = scores[hypothesis.id] ?? 0;
            const isMax = score === maxScore && maxScore > 0;
            const status = hypothesis.status ?? 'under_review';
            const statusCfg = statusConfig[status];

            return (
              <button
                key={hypothesis.id}
                onClick={() => onSelect(hypothesis)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-md transition-colors',
                  'border border-transparent',
                  'hover:bg-secondary',
                  isSelected && 'bg-primary/10 border-primary/30'
                )}
              >
                <div className="flex items-center gap-2">
                  {isMax && (
                    <Star className="h-3.5 w-3.5 text-tactical-green fill-tactical-green shrink-0" />
                  )}
                  <span
                    className={cn(
                      'text-sm font-medium truncate flex-1',
                      isSelected && 'text-primary'
                    )}
                  >
                    {hypothesis.name}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-mono font-bold shrink-0',
                      isMax ? 'text-tactical-green' : 'text-muted-foreground'
                    )}
                  >
                    {score.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className={cn('text-xs', statusCfg.color)}>{statusCfg.label}</span>
                </div>
                {hypothesis.description && (
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {hypothesis.description}
                  </p>
                )}
              </button>
            );
          })}

          {hypotheses.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No hypotheses defined
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
