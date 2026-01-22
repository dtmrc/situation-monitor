import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeatMatrix, type HeatMatrixCell } from '@/components/charts';

export type RiskCategory = 'operational' | 'financial' | 'reputational' | 'strategic';

export interface Risk {
  id: string;
  name: string;
  category: RiskCategory;
  likelihood: number; // 1-5
  consequence: number; // 1-5
  owner?: string;
}

interface RiskHeatMapProps {
  risks: Risk[];
  onSelect: (risk: Risk | null) => void;
  selectedId?: string;
  showCategories?: boolean;
}

const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const consequenceLabels = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

const categoryColors: Record<RiskCategory, string> = {
  operational: 'bg-tactical-blue',
  financial: 'bg-tactical-green',
  reputational: 'bg-purple-500',
  strategic: 'bg-tactical-amber',
};

export function RiskHeatMap({
  risks,
  onSelect,
  selectedId,
  showCategories = true,
}: RiskHeatMapProps) {
  // Convert risks to HeatMatrix cell format
  const data = useMemo(() => {
    const cells: Map<string, Risk[]> = new Map();

    risks.forEach((risk) => {
      // Row 0 = likelihood 5 (highest), Row 4 = likelihood 1 (lowest)
      const row = 5 - risk.likelihood;
      // Col 0 = consequence 1, Col 4 = consequence 5
      const col = risk.consequence - 1;
      const key = `${row}-${col}`;

      if (!cells.has(key)) {
        cells.set(key, []);
      }
      cells.get(key)!.push(risk);
    });

    const result: HeatMatrixCell<Risk>[] = [];
    cells.forEach((items, key) => {
      const parts = key.split('-');
      const row = Number(parts[0]);
      const col = Number(parts[1]);
      result.push({ row, col, items });
    });

    return result;
  }, [risks]);

  const colorFn = (row: number, col: number, count: number) => {
    // Calculate risk: likelihood (5 - row) * consequence (col + 1)
    const likelihood = 5 - row;
    const consequence = col + 1;
    const riskScore = likelihood * consequence;

    if (count === 0) return 'bg-card';
    if (riskScore >= 15) return 'bg-tactical-red/80 hover:bg-tactical-red';
    if (riskScore >= 10) return 'bg-orange-500/80 hover:bg-orange-500';
    if (riskScore >= 5) return 'bg-tactical-amber/80 hover:bg-tactical-amber';
    return 'bg-tactical-green/40 hover:bg-tactical-green/60';
  };

  const handleCellClick = (_row: number, _col: number, items: Risk[]) => {
    if (items.length > 0) {
      const currentIndex = items.findIndex((r) => r.id === selectedId);
      if (currentIndex >= 0 && items.length > 1) {
        const nextIndex = (currentIndex + 1) % items.length;
        onSelect(items[nextIndex]!);
      } else {
        onSelect(items[0]!);
      }
    }
  };

  const renderCell = (_row: number, _col: number, items: Risk[], _isSelected: boolean) => {
    if (items.length === 0) return null;

    const hasSelected = items.some((r) => r.id === selectedId);

    return (
      <div className="flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-foreground font-mono">{items.length}</span>
        {hasSelected && <span className="text-xs text-foreground">★</span>}
      </div>
    );
  };

  const selectedRisk = risks.find((r) => r.id === selectedId);
  const selectedCell = selectedRisk
    ? {
        row: 5 - selectedRisk.likelihood,
        col: selectedRisk.consequence - 1,
      }
    : undefined;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Risk Heat Map</span>
          <span className="text-xs text-muted-foreground font-normal">
            {risks.length} risks
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <HeatMatrix
          rows={5}
          cols={5}
          data={data}
          xLabels={consequenceLabels}
          yLabels={likelihoodLabels}
          xAxisLabel="CONSEQUENCE →"
          yAxisLabel="← LIKELIHOOD"
          colorFn={colorFn}
          onCellClick={handleCellClick}
          selectedCell={selectedCell}
          renderCell={renderCell}
        />

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between mt-4 text-xs gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-tactical-green/40" />
              <span className="text-muted-foreground">Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-tactical-amber/80" />
              <span className="text-muted-foreground">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-orange-500/80" />
              <span className="text-muted-foreground">High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-tactical-red/80" />
              <span className="text-muted-foreground">Critical</span>
            </div>
          </div>

          {showCategories && (
            <div className="flex items-center gap-3">
              {Object.entries(categoryColors).map(([cat, color]) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-muted-foreground capitalize">{cat}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
