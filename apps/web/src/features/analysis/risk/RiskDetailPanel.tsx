import { Edit2, Trash2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { type Risk, type RiskCategory } from './RiskHeatMap';
import { MitigationTracker, type Control } from './MitigationTracker';

export interface RiskDetail extends Risk {
  description?: string;
  inherentRisk?: number;
  residualRisk?: number;
  controls?: Control[];
  nextReviewDate?: Date;
}

interface RiskDetailPanelProps {
  risk: RiskDetail | null;
  onEdit?: (risk: RiskDetail) => void;
  onDelete?: (risk: RiskDetail) => void;
  onToggleControl?: (riskId: string, controlId: string) => void;
}

const categoryConfig: Record<RiskCategory, { label: string; color: string; bgColor: string }> = {
  operational: { label: 'Operational', color: 'text-tactical-blue', bgColor: 'bg-tactical-blue/20' },
  financial: { label: 'Financial', color: 'text-tactical-green', bgColor: 'bg-tactical-green/20' },
  reputational: { label: 'Reputational', color: 'text-purple-500', bgColor: 'bg-purple-500/20' },
  strategic: { label: 'Strategic', color: 'text-tactical-amber', bgColor: 'bg-tactical-amber/20' },
};

const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const consequenceLabels = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

function getRiskColor(score: number): string {
  if (score >= 15) return 'text-tactical-red';
  if (score >= 10) return 'text-orange-500';
  if (score >= 5) return 'text-tactical-amber';
  return 'text-tactical-green';
}

export function RiskDetailPanel({
  risk,
  onEdit,
  onDelete,
  onToggleControl,
}: RiskDetailPanelProps) {
  if (!risk) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          <p className="text-sm">Select a risk to view details</p>
        </CardContent>
      </Card>
    );
  }

  const catConfig = categoryConfig[risk.category];
  const inherentScore = risk.inherentRisk ?? risk.likelihood * risk.consequence;
  const residualScore = risk.residualRisk ?? Math.max(1, inherentScore - 4);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="truncate">{risk.name}</span>
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => onEdit(risk)}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-tactical-red hover:text-tactical-red"
                onClick={() => onDelete(risk)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* Category & Owner */}
        <div className="flex items-center justify-between">
          <Badge className={cn(catConfig.bgColor, catConfig.color, 'border-0')}>
            {catConfig.label}
          </Badge>
          {risk.owner && (
            <span className="text-xs text-muted-foreground">Owner: {risk.owner}</span>
          )}
        </div>

        {/* Description */}
        {risk.description && (
          <p className="text-sm text-muted-foreground">{risk.description}</p>
        )}

        {/* Likelihood & Consequence */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Likelihood</div>
            <div className="text-sm font-medium">
              {likelihoodLabels[risk.likelihood - 1]} ({risk.likelihood}/5)
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Consequence</div>
            <div className="text-sm font-medium">
              {consequenceLabels[risk.consequence - 1]} ({risk.consequence}/5)
            </div>
          </div>
        </div>

        {/* Risk Scores */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-md">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Inherent Risk</div>
            <div className={cn('text-2xl font-bold font-mono', getRiskColor(inherentScore))}>
              {inherentScore}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Residual Risk</div>
            <div className={cn('text-2xl font-bold font-mono', getRiskColor(residualScore))}>
              {residualScore}
            </div>
          </div>
        </div>

        <Separator />

        {/* Mitigation Tracker */}
        {risk.controls && (
          <MitigationTracker
            controls={risk.controls}
            onToggle={onToggleControl ? (cId) => onToggleControl(risk.id, cId) : undefined}
            nextReviewDate={risk.nextReviewDate}
          />
        )}
      </CardContent>
    </Card>
  );
}
