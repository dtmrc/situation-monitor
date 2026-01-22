import { CheckCircle2, Circle } from 'lucide-react';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface Control {
  id: string;
  name: string;
  completed: boolean;
}

interface MitigationTrackerProps {
  controls: Control[];
  onToggle?: (controlId: string) => void;
  nextReviewDate?: Date;
}

export function MitigationTracker({
  controls,
  onToggle,
  nextReviewDate,
}: MitigationTrackerProps) {
  const completedCount = controls.filter((c) => c.completed).length;
  const progress = controls.length > 0 ? (completedCount / controls.length) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground font-medium">Mitigation Status</div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-mono">
            {completedCount}/{controls.length} ({Math.round(progress)}%)
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Controls checklist */}
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">Controls</div>
        {controls.map((control) => (
          <button
            key={control.id}
            onClick={() => onToggle?.(control.id)}
            disabled={!onToggle}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left',
              'hover:bg-muted/30 transition-colors',
              !onToggle && 'cursor-default'
            )}
          >
            {control.completed ? (
              <CheckCircle2 className="h-4 w-4 text-tactical-green shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span
              className={cn(
                'text-sm flex-1',
                control.completed && 'text-muted-foreground line-through'
              )}
            >
              {control.name}
            </span>
          </button>
        ))}

        {controls.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No controls defined
          </p>
        )}
      </div>

      {/* Next review date */}
      {nextReviewDate && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Next Review</span>
            <span className="font-mono">
              {nextReviewDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
