import { Plus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { type Risk, type RiskCategory } from './RiskHeatMap';

interface RiskRegisterProps {
  risks: Risk[];
  selectedId?: string;
  onSelect: (risk: Risk) => void;
  onAdd?: () => void;
}

const categoryConfig: Record<RiskCategory, { color: string; borderColor: string }> = {
  operational: { color: 'text-tactical-blue', borderColor: 'border-tactical-blue/30' },
  financial: { color: 'text-tactical-green', borderColor: 'border-tactical-green/30' },
  reputational: { color: 'text-purple-500', borderColor: 'border-purple-500/30' },
  strategic: { color: 'text-tactical-amber', borderColor: 'border-tactical-amber/30' },
};

function getRiskLevel(likelihood: number, consequence: number): { label: string; color: string } {
  const score = likelihood * consequence;
  if (score >= 15) return { label: 'Critical', color: 'text-tactical-red' };
  if (score >= 10) return { label: 'High', color: 'text-orange-500' };
  if (score >= 5) return { label: 'Medium', color: 'text-tactical-amber' };
  return { label: 'Low', color: 'text-tactical-green' };
}

export function RiskRegister({
  risks,
  selectedId,
  onSelect,
  onAdd,
}: RiskRegisterProps) {
  // Group risks by severity level
  const groupedRisks = {
    critical: risks.filter((r) => r.likelihood * r.consequence >= 15),
    high: risks.filter((r) => {
      const score = r.likelihood * r.consequence;
      return score >= 10 && score < 15;
    }),
    medium: risks.filter((r) => {
      const score = r.likelihood * r.consequence;
      return score >= 5 && score < 10;
    }),
    low: risks.filter((r) => r.likelihood * r.consequence < 5),
  };

  const levelConfig = {
    critical: { label: 'Critical', color: 'text-tactical-red', count: groupedRisks.critical.length },
    high: { label: 'High', color: 'text-orange-500', count: groupedRisks.high.length },
    medium: { label: 'Medium', color: 'text-tactical-amber', count: groupedRisks.medium.length },
    low: { label: 'Low', color: 'text-tactical-green', count: groupedRisks.low.length },
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Risk Register</span>
          {onAdd && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAdd}>
              <Plus className="h-3 w-3 mr-1" />
              Add Risk
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-3">
        {Object.entries(groupedRisks).map(([level, items]) => {
          const config = levelConfig[level as keyof typeof levelConfig];
          if (items.length === 0) return null;

          return (
            <div key={level}>
              <div className={cn('text-xs font-medium mb-1', config.color)}>
                {config.label} ({config.count})
              </div>
              <div className="space-y-1">
                {items.map((risk) => {
                  const isSelected = risk.id === selectedId;
                  const catConfig = categoryConfig[risk.category];
                  const riskLevel = getRiskLevel(risk.likelihood, risk.consequence);

                  return (
                    <button
                      key={risk.id}
                      onClick={() => onSelect(risk)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md transition-colors',
                        'border border-transparent',
                        'hover:bg-secondary',
                        isSelected && `bg-primary/10 ${catConfig.borderColor}`
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-sm font-medium truncate flex-1',
                            isSelected && 'text-primary'
                          )}
                        >
                          {risk.name}
                        </span>
                        <span className={cn('text-xs font-mono', riskLevel.color)}>
                          {risk.likelihood * risk.consequence}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn('text-xs capitalize', catConfig.color)}>
                          {risk.category}
                        </span>
                        {risk.owner && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {risk.owner}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {risks.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            No risks in the register
          </div>
        )}
      </CardContent>
    </Card>
  );
}
