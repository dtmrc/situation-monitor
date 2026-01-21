import { Lightbulb, Plus, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Finding {
  id: string;
  content: string;
  source: 'pmesii' | 'threats' | 'cog' | 'pir' | 'manual';
  priority: 'high' | 'medium' | 'low';
}

interface KeyFindingsProps {
  findings: Finding[];
  onAddFinding?: () => void;
  onRemoveFinding?: (id: string) => void;
  readOnly?: boolean;
}

const sourceLabels: Record<Finding['source'], { label: string; color: string }> = {
  pmesii: {
    label: 'PMESII',
    color: 'bg-tactical-blue/20 text-tactical-blue border-tactical-blue/30',
  },
  threats: {
    label: 'Threats',
    color: 'bg-tactical-red/20 text-tactical-red border-tactical-red/30',
  },
  cog: { label: 'CoG', color: 'bg-tactical-amber/20 text-tactical-amber border-tactical-amber/30' },
  pir: { label: 'PIR', color: 'bg-tactical-green/20 text-tactical-green border-tactical-green/30' },
  manual: { label: 'Manual', color: 'bg-muted text-muted-foreground border-border' },
};

const priorityStyles: Record<Finding['priority'], string> = {
  high: 'border-l-tactical-red',
  medium: 'border-l-tactical-amber',
  low: 'border-l-tactical-green',
};

export function KeyFindings({
  findings,
  onAddFinding,
  onRemoveFinding,
  readOnly = false,
}: KeyFindingsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Key Findings
          </CardTitle>
          {!readOnly && onAddFinding && (
            <Button variant="ghost" size="sm" onClick={onAddFinding}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No key findings recorded. Add findings from your analysis or generate them
            automatically.
          </p>
        ) : (
          <ul className="space-y-2">
            {findings.map((finding) => {
              const source = sourceLabels[finding.source];
              return (
                <li
                  key={finding.id}
                  className={cn(
                    'flex items-start gap-2 p-2 rounded border border-border border-l-2 bg-card/50',
                    priorityStyles[finding.priority]
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{finding.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn('text-xs', source.color)}>
                        {source.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground capitalize">
                        {finding.priority} priority
                      </span>
                    </div>
                  </div>
                  {!readOnly && onRemoveFinding && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => onRemoveFinding(finding.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
