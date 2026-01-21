import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ThreatCell {
  probability: number; // 1-5
  impact: number; // 1-5
  count: number;
}

interface MiniThreatMatrixProps {
  threats: ThreatCell[];
}

export function MiniThreatMatrix({ threats }: MiniThreatMatrixProps) {
  // Build 5x5 matrix
  const matrix = useMemo(() => {
    const grid: number[][] = Array(5)
      .fill(null)
      .map(() => Array(5).fill(0) as number[]);
    threats.forEach(({ probability, impact, count }) => {
      if (probability >= 1 && probability <= 5 && impact >= 1 && impact <= 5) {
        const row = grid[5 - probability];
        if (row) {
          row[impact - 1] = count;
        }
      }
    });
    return grid;
  }, [threats]);

  const getCellColor = (row: number, col: number, value: number) => {
    // Risk = row * col (higher = more severe)
    const risk = (5 - row) * (col + 1);
    if (value === 0) return 'bg-card';
    if (risk >= 20) return 'bg-tactical-red/80';
    if (risk >= 12) return 'bg-tactical-amber/80';
    if (risk >= 6) return 'bg-tactical-amber/40';
    return 'bg-tactical-green/40';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Threat Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-0.5">
          {matrix.map((row, rowIdx) =>
            row.map((value, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={cn(
                  'aspect-square flex items-center justify-center text-xs font-mono rounded-sm',
                  getCellColor(rowIdx, colIdx, value),
                  value > 0 && 'text-foreground font-medium'
                )}
              >
                {value > 0 ? value : ''}
              </div>
            ))
          )}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Impact →</span>
          <span>↑ Probability</span>
        </div>
      </CardContent>
    </Card>
  );
}
