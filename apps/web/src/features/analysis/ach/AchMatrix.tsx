import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { RatingCell, RatingLegend, type Rating } from './RatingCell';

export interface Hypothesis {
  id: string;
  name: string;
  description?: string;
  status?: 'under_review' | 'most_likely' | 'unlikely' | 'possible';
}

export interface Evidence {
  id: string;
  description: string;
  reliability: string; // e.g., 'A-1', 'B-2', 'C-3'
  weight: number;
  source?: string;
}

export interface AchRating {
  hypothesisId: string;
  evidenceId: string;
  rating: Rating;
}

interface AchMatrixProps {
  hypotheses: Hypothesis[];
  evidence: Evidence[];
  ratings: AchRating[];
  onRatingChange: (hypothesisId: string, evidenceId: string, rating: Rating) => void;
}

const ratingValues: Record<Rating, number> = {
  '++': 2,
  '+': 1,
  'N': 0,
  '-': -1,
  '--': -2,
};

export function AchMatrix({
  hypotheses,
  evidence,
  ratings,
  onRatingChange,
}: AchMatrixProps) {
  const getRating = (hId: string, eId: string): Rating => {
    return ratings.find((r) => r.hypothesisId === hId && r.evidenceId === eId)?.rating || 'N';
  };

  const calculateScore = (hypothesisId: string): number => {
    return evidence.reduce((sum, e) => {
      const rating = getRating(hypothesisId, e.id);
      const ratingValue = ratingValues[rating];
      return sum + ratingValue * e.weight;
    }, 0);
  };

  const scores = hypotheses.map((h) => ({
    id: h.id,
    score: calculateScore(h.id),
  }));
  const maxScore = Math.max(...scores.map((s) => s.score));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>ACH Matrix</span>
          <span className="text-xs text-muted-foreground font-normal">
            {hypotheses.length} hypotheses × {evidence.length} evidence items
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground border-b border-border w-1/3">
                  Evidence
                </th>
                {hypotheses.map((h) => {
                  const score = scores.find((s) => s.id === h.id)?.score ?? 0;
                  const isMax = score === maxScore && maxScore > 0;

                  return (
                    <th
                      key={h.id}
                      className={cn(
                        'p-2 text-center text-xs font-medium border-b border-border min-w-[80px]',
                        isMax && 'text-tactical-green'
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <span className="truncate max-w-[100px]" title={h.name}>
                          {h.name}
                        </span>
                        {isMax && <span className="text-tactical-green">★</span>}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {evidence.map((e) => (
                <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-2">
                    <div className="text-sm font-medium truncate max-w-[250px]" title={e.description}>
                      {e.description}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Reliability: {e.reliability} | Weight: {e.weight.toFixed(1)}
                    </div>
                  </td>
                  {hypotheses.map((h) => {
                    const rating = getRating(h.id, e.id);
                    return (
                      <td key={h.id} className="p-1 text-center">
                        <RatingCell
                          rating={rating}
                          onChange={(newRating) => onRatingChange(h.id, e.id, newRating)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Score row */}
              <tr className="bg-card">
                <td className="p-2 text-sm font-bold">WEIGHTED SCORE</td>
                {hypotheses.map((h) => {
                  const score = scores.find((s) => s.id === h.id)?.score ?? 0;
                  const isMax = score === maxScore && maxScore > 0;

                  return (
                    <td
                      key={h.id}
                      className={cn(
                        'p-2 text-center font-mono font-bold text-lg',
                        isMax ? 'text-tactical-green' : 'text-foreground'
                      )}
                    >
                      {score.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <RatingLegend />
      </CardContent>
    </Card>
  );
}
