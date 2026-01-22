import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeatMatrix, type HeatMatrixCell } from '@/components/charts';

export interface ThreatPoint {
  id: string;
  name: string;
  probability: number; // 1-5
  impact: number; // 1-5
  category: string;
}

interface ThreatMatrixProps {
  threats: ThreatPoint[];
  onSelect: (threat: ThreatPoint | null) => void;
  selectedId?: string;
}

const probabilityLabels = ['Almost Certain', 'Likely', 'Possible', 'Unlikely', 'Rare'];
const impactLabels = ['Negligible', 'Minor', 'Moderate', 'Significant', 'Catastrophic'];

export function ThreatMatrix({ threats, onSelect, selectedId }: ThreatMatrixProps) {
  // Convert threats to HeatMatrix cell format
  const data = useMemo(() => {
    const cells: Map<string, ThreatPoint[]> = new Map();

    threats.forEach((threat) => {
      // Row 0 = probability 5 (highest), Row 4 = probability 1 (lowest)
      const row = 5 - threat.probability;
      // Col 0 = impact 1, Col 4 = impact 5
      const col = threat.impact - 1;
      const key = `${row}-${col}`;

      if (!cells.has(key)) {
        cells.set(key, []);
      }
      cells.get(key)!.push(threat);
    });

    const result: HeatMatrixCell<ThreatPoint>[] = [];
    cells.forEach((items, key) => {
      const parts = key.split('-');
      const row = Number(parts[0]);
      const col = Number(parts[1]);
      result.push({ row, col, items });
    });

    return result;
  }, [threats]);

  const colorFn = (row: number, col: number, count: number) => {
    // Calculate risk: probability (5 - row) * impact (col + 1)
    const probability = 5 - row;
    const impact = col + 1;
    const risk = probability * impact;

    if (count === 0) return 'bg-card';
    if (risk >= 15) return 'bg-tactical-red/80 hover:bg-tactical-red';
    if (risk >= 10) return 'bg-orange-500/80 hover:bg-orange-500';
    if (risk >= 5) return 'bg-tactical-amber/80 hover:bg-tactical-amber';
    return 'bg-tactical-green/40 hover:bg-tactical-green/60';
  };

  const handleCellClick = (_row: number, _col: number, items: ThreatPoint[]) => {
    if (items.length > 0) {
      // If one of the items is already selected, cycle to the next
      const currentIndex = items.findIndex((t) => t.id === selectedId);
      if (currentIndex >= 0 && items.length > 1) {
        const nextIndex = (currentIndex + 1) % items.length;
        onSelect(items[nextIndex]!);
      } else {
        onSelect(items[0]!);
      }
    }
  };

  const renderCell = (_row: number, _col: number, items: ThreatPoint[], _isSelected: boolean) => {
    if (items.length === 0) return null;

    const hasSelected = items.some((t) => t.id === selectedId);

    return (
      <div className="flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-foreground font-mono">{items.length}</span>
        {hasSelected && <span className="text-xs text-foreground">★</span>}
      </div>
    );
  };

  // Find selected cell position
  const selectedThreat = threats.find((t) => t.id === selectedId);
  const selectedCell = selectedThreat
    ? {
        row: 5 - selectedThreat.probability,
        col: selectedThreat.impact - 1,
      }
    : undefined;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Threat Matrix</span>
          <span className="text-xs text-muted-foreground font-normal">
            {threats.length} threats
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <HeatMatrix
          rows={5}
          cols={5}
          data={data}
          xLabels={impactLabels}
          yLabels={probabilityLabels}
          xAxisLabel="IMPACT →"
          yAxisLabel="← PROBABILITY"
          colorFn={colorFn}
          onCellClick={handleCellClick}
          selectedCell={selectedCell}
          renderCell={renderCell}
        />

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
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
      </CardContent>
    </Card>
  );
}
