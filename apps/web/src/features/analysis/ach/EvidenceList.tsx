import { Plus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { type Evidence } from './AchMatrix';

interface EvidenceListProps {
  evidence: Evidence[];
  selectedId?: string;
  onSelect: (evidence: Evidence) => void;
  onAdd?: () => void;
}

// Reliability rating to weight multiplier
const reliabilityWeights: Record<string, { label: string; weight: number }> = {
  'A-1': { label: 'Completely Reliable', weight: 2.0 },
  'A-2': { label: 'Usually Reliable', weight: 1.8 },
  'B-1': { label: 'Fairly Reliable', weight: 1.6 },
  'B-2': { label: 'Reliable', weight: 1.5 },
  'B-3': { label: 'Usually Reliable', weight: 1.4 },
  'C-2': { label: 'Sometimes Reliable', weight: 1.2 },
  'C-3': { label: 'Questionable', weight: 1.0 },
  'D-4': { label: 'Doubtful', weight: 0.8 },
  'E-5': { label: 'Improbable', weight: 0.6 },
  'F-6': { label: 'Cannot be judged', weight: 0.5 },
};

function getReliabilityColor(reliability: string): string {
  const first = reliability.charAt(0);
  switch (first) {
    case 'A':
      return 'bg-tactical-green/20 text-tactical-green border-tactical-green/30';
    case 'B':
      return 'bg-tactical-blue/20 text-tactical-blue border-tactical-blue/30';
    case 'C':
      return 'bg-tactical-amber/20 text-tactical-amber border-tactical-amber/30';
    case 'D':
    case 'E':
      return 'bg-tactical-red/20 text-tactical-red border-tactical-red/30';
    default:
      return 'bg-muted text-muted-foreground border-muted';
  }
}

export function EvidenceList({
  evidence,
  selectedId,
  onSelect,
  onAdd,
}: EvidenceListProps) {
  // Sort by weight descending
  const sortedEvidence = [...evidence].sort((a, b) => b.weight - a.weight);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Evidence</span>
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
          {sortedEvidence.map((ev) => {
            const isSelected = ev.id === selectedId;
            const reliabilityInfo = reliabilityWeights[ev.reliability];

            return (
              <button
                key={ev.id}
                onClick={() => onSelect(ev)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-md transition-colors',
                  'border border-transparent',
                  'hover:bg-secondary',
                  isSelected && 'bg-primary/10 border-primary/30'
                )}
              >
                <div className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className={cn('shrink-0 text-xs', getReliabilityColor(ev.reliability))}
                  >
                    {ev.reliability}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        'text-sm font-medium line-clamp-2',
                        isSelected && 'text-primary'
                      )}
                    >
                      {ev.description}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Weight: {ev.weight.toFixed(1)}
                      </span>
                      {ev.source && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {ev.source}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {evidence.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No evidence items added
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
