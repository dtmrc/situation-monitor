import { cn } from '@/lib/utils';

export interface HeatMatrixCell<T = unknown> {
  row: number;
  col: number;
  items: T[];
}

interface HeatMatrixProps<T> {
  rows: number;
  cols: number;
  data: HeatMatrixCell<T>[];
  xLabels: string[];
  yLabels: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  colorFn?: (row: number, col: number, count: number) => string;
  onCellClick?: (row: number, col: number, items: T[]) => void;
  selectedCell?: { row: number; col: number };
  renderCell?: (row: number, col: number, items: T[], isSelected: boolean) => React.ReactNode;
  className?: string;
}

const defaultColorFn = (row: number, col: number, count: number): string => {
  if (count === 0) return 'bg-muted/20';
  const risk = (5 - row) * (col + 1);
  if (risk >= 15) return 'bg-red-900/50';
  if (risk >= 10) return 'bg-orange-900/50';
  if (risk >= 5) return 'bg-yellow-900/50';
  return 'bg-green-900/50';
};

export function HeatMatrix<T>({
  rows,
  cols,
  data,
  xLabels,
  yLabels,
  xAxisLabel,
  yAxisLabel,
  colorFn = defaultColorFn,
  onCellClick,
  selectedCell,
  renderCell,
  className,
}: HeatMatrixProps<T>) {
  const getCellData = (row: number, col: number): T[] => {
    const cell = data.find((c) => c.row === row && c.col === col);
    return cell?.items ?? [];
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* X-axis label */}
      {xAxisLabel && (
        <div className="text-center text-xs text-muted-foreground uppercase tracking-wider">
          {xAxisLabel}
        </div>
      )}

      <div className="flex">
        {/* Y-axis label */}
        {yAxisLabel && (
          <div className="flex items-center justify-center -rotate-90 text-xs text-muted-foreground uppercase tracking-wider w-6">
            {yAxisLabel}
          </div>
        )}

        <div className="flex-1">
          {/* X-axis labels */}
          <div className="flex mb-1">
            <div className="w-24" /> {/* Spacer for Y labels */}
            {xLabels.map((label, i) => (
              <div
                key={i}
                className="flex-1 text-center text-xs text-muted-foreground truncate px-1"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Grid */}
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex">
              {/* Y-axis label */}
              <div className="w-24 text-right text-xs text-muted-foreground pr-2 flex items-center justify-end">
                {yLabels[rowIdx]}
              </div>

              {/* Cells */}
              {Array.from({ length: cols }).map((_, colIdx) => {
                const items = getCellData(rowIdx, colIdx);
                const isSelected =
                  selectedCell?.row === rowIdx && selectedCell?.col === colIdx;

                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className={cn(
                      'flex-1 aspect-square m-0.5 rounded cursor-pointer transition-all',
                      'hover:ring-2 hover:ring-primary/50',
                      'flex items-center justify-center text-xs font-mono',
                      colorFn(rowIdx, colIdx, items.length),
                      isSelected && 'ring-2 ring-primary'
                    )}
                    onClick={() => onCellClick?.(rowIdx, colIdx, items)}
                  >
                    {renderCell
                      ? renderCell(rowIdx, colIdx, items, isSelected)
                      : items.length > 0
                        ? items.length
                        : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
