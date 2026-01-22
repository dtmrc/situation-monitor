import { Edit2, Trash2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { type ThreatPoint } from './ThreatMatrix';
import { ImpactBreakdown, type ImpactScores } from './ImpactBreakdown';

export interface ThreatDetail extends ThreatPoint {
  description?: string;
  scenario?: string;
  capabilities?: string[];
  intentions?: string;
  impactScores?: ImpactScores;
  mitigations?: { id: string; text: string; completed: boolean }[];
}

interface ThreatDetailPanelProps {
  threat: ThreatDetail | null;
  onEdit?: (threat: ThreatDetail) => void;
  onDelete?: (threat: ThreatDetail) => void;
}

const probabilityLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const impactLabels = ['Negligible', 'Minor', 'Moderate', 'Significant', 'Catastrophic'];

function getRiskLevel(probability: number, impact: number): { label: string; color: string; bgColor: string } {
  const risk = probability * impact;
  if (risk >= 15) return { label: 'CRITICAL', color: 'text-tactical-red', bgColor: 'bg-tactical-red/20' };
  if (risk >= 10) return { label: 'HIGH', color: 'text-orange-500', bgColor: 'bg-orange-500/20' };
  if (risk >= 5) return { label: 'MEDIUM', color: 'text-tactical-amber', bgColor: 'bg-tactical-amber/20' };
  return { label: 'LOW', color: 'text-tactical-green', bgColor: 'bg-tactical-green/20' };
}

export function ThreatDetailPanel({ threat, onEdit, onDelete }: ThreatDetailPanelProps) {
  if (!threat) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          <p className="text-sm">Select a threat to view details</p>
        </CardContent>
      </Card>
    );
  }

  const risk = getRiskLevel(threat.probability, threat.impact);
  const riskScore = threat.probability * threat.impact;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="truncate">{threat.name}</span>
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => onEdit(threat)}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-tactical-red hover:text-tactical-red"
                onClick={() => onDelete(threat)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* Risk Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Category</div>
            <Badge variant="outline">{threat.category}</Badge>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Risk Score</div>
            <div className={cn('text-lg font-bold font-mono', risk.color)}>
              {riskScore}
              <span className="text-xs font-normal ml-1">({risk.label})</span>
            </div>
          </div>
        </div>

        {/* Probability & Impact */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Probability</div>
            <div className="text-sm font-medium">
              {probabilityLabels[threat.probability - 1]} ({threat.probability}/5)
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Impact</div>
            <div className="text-sm font-medium">
              {impactLabels[threat.impact - 1]} ({threat.impact}/5)
            </div>
          </div>
        </div>

        <Separator />

        {/* Capabilities */}
        {threat.capabilities && threat.capabilities.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">Capabilities</div>
            <div className="flex flex-wrap gap-1.5">
              {threat.capabilities.map((cap, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {cap}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Intentions */}
        {threat.intentions && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Intentions</div>
            <div className="text-sm">{threat.intentions}</div>
          </div>
        )}

        {/* Scenario */}
        {threat.scenario && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Threat Scenario</div>
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-md p-3">
              {threat.scenario}
            </div>
          </div>
        )}

        <Separator />

        {/* Impact Breakdown */}
        {threat.impactScores && <ImpactBreakdown scores={threat.impactScores} />}

        {/* Mitigations */}
        {threat.mitigations && threat.mitigations.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">Mitigations</div>
            <div className="space-y-1.5">
              {threat.mitigations.map((mitigation) => (
                <div
                  key={mitigation.id}
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    mitigation.completed && 'text-muted-foreground line-through'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center text-xs',
                      mitigation.completed
                        ? 'bg-tactical-green/20 border-tactical-green text-tactical-green'
                        : 'border-muted-foreground'
                    )}
                  >
                    {mitigation.completed ? '✓' : ''}
                  </div>
                  {mitigation.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
