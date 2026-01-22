import { cn } from '@/lib/utils';

export interface ImpactScores {
  casualties: number; // 1-5
  economic: number; // 1-5
  infrastructure: number; // 1-5
  reputation: number; // 1-5
}

interface ImpactBreakdownProps {
  scores: ImpactScores;
  className?: string;
}

const impactCategories: { key: keyof ImpactScores; label: string }[] = [
  { key: 'casualties', label: 'Casualties' },
  { key: 'economic', label: 'Economic' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'reputation', label: 'Reputation' },
];

function getScoreColor(score: number): string {
  if (score >= 5) return 'bg-tactical-red';
  if (score >= 4) return 'bg-orange-500';
  if (score >= 3) return 'bg-tactical-amber';
  if (score >= 2) return 'bg-tactical-green';
  return 'bg-muted';
}

export function ImpactBreakdown({ scores, className }: ImpactBreakdownProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Impact Breakdown
      </div>
      {impactCategories.map(({ key, label }) => {
        const score = scores[key];

        return (
          <div key={key} className="flex items-center gap-3">
            <div className="w-24 text-xs text-muted-foreground">{label}</div>
            <div className="flex-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={cn(
                    'h-4 flex-1 rounded-sm transition-colors',
                    level <= score ? getScoreColor(score) : 'bg-muted/30'
                  )}
                />
              ))}
            </div>
            <div className="w-6 text-xs font-mono text-right text-muted-foreground">
              ({score})
            </div>
          </div>
        );
      })}
    </div>
  );
}
