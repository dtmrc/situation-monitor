import { Target, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Pir {
  id: string;
  question: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'answered';
  dueDate?: Date;
}

interface PirListProps {
  pirs: Pir[];
  onPirClick?: (pir: Pir) => void;
}

const priorityColors: Record<Pir['priority'], string> = {
  critical: 'bg-tactical-red/20 text-tactical-red border-tactical-red/30',
  high: 'bg-tactical-amber/20 text-tactical-amber border-tactical-amber/30',
  medium: 'bg-tactical-blue/20 text-tactical-blue border-tactical-blue/30',
  low: 'bg-muted text-muted-foreground border-border',
};

const statusIcons: Record<Pir['status'], React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  in_progress: AlertCircle,
  answered: CheckCircle2,
};

export function PirList({ pirs, onPirClick }: PirListProps) {
  // Sort by priority (critical first) and filter to top 5
  const sortedPirs = [...pirs]
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Active PIRs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedPirs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active PIRs</p>
        ) : (
          <ul className="space-y-2">
            {sortedPirs.map((pir) => {
              const StatusIcon = statusIcons[pir.status];
              return (
                <li
                  key={pir.id}
                  className={cn(
                    'flex items-start gap-2 p-2 rounded border border-border bg-card/50',
                    'cursor-pointer hover:bg-secondary transition-colors'
                  )}
                  onClick={() => onPirClick?.(pir)}
                >
                  <StatusIcon
                    className={cn(
                      'h-4 w-4 mt-0.5 shrink-0',
                      pir.status === 'answered'
                        ? 'text-tactical-green'
                        : pir.status === 'in_progress'
                          ? 'text-tactical-amber'
                          : 'text-muted-foreground'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">{pir.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={cn('text-xs', priorityColors[pir.priority])}
                      >
                        {pir.priority}
                      </Badge>
                      {pir.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          Due {pir.dueDate.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
