import { TrendingUp, TrendingDown, Minus, FileDown, Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

import { type PmesiiDomain, DOMAINS } from './DomainTabs';

interface DomainSummaryProps {
  domain: PmesiiDomain;
  overallImpact: 'low' | 'moderate' | 'high' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
  confidence: number; // 0-100
  factorCount: number;
  onAiAnalysis?: () => void;
  onExport?: () => void;
}

const impactConfig = {
  low: { label: 'LOW', color: 'text-tactical-green', bgColor: 'bg-tactical-green/20' },
  moderate: { label: 'MODERATE', color: 'text-tactical-amber', bgColor: 'bg-tactical-amber/20' },
  high: { label: 'HIGH', color: 'text-orange-500', bgColor: 'bg-orange-500/20' },
  critical: { label: 'CRITICAL', color: 'text-tactical-red', bgColor: 'bg-tactical-red/20' },
};

function TrendIndicator({ trend }: { trend: DomainSummaryProps['trend'] }) {
  switch (trend) {
    case 'improving':
      return (
        <div className="flex items-center gap-1 text-tactical-green">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">IMPROVING</span>
        </div>
      );
    case 'declining':
      return (
        <div className="flex items-center gap-1 text-tactical-red">
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm font-medium">DECLINING</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-4 w-4" />
          <span className="text-sm font-medium">STABLE</span>
        </div>
      );
  }
}

export function DomainSummary({
  domain,
  overallImpact,
  trend,
  confidence,
  factorCount,
  onAiAnalysis,
  onExport,
}: DomainSummaryProps) {
  const domainInfo = DOMAINS.find((d) => d.code === domain);
  const impact = impactConfig[overallImpact];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', domainInfo?.color)} />
            <span>{domainInfo?.name} Summary</span>
          </div>
          <span className="text-xs text-muted-foreground font-normal">
            {factorCount} factors
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Impact */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Overall Impact</span>
          <div className={cn('px-2 py-0.5 rounded text-sm font-bold', impact.bgColor, impact.color)}>
            {impact.label}
          </div>
        </div>

        {/* Trend */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Trend</span>
          <TrendIndicator trend={trend} />
        </div>

        {/* Confidence */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Confidence</span>
            <span className="text-sm font-mono">{confidence}%</span>
          </div>
          <Progress value={confidence} className="h-1.5" />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onAiAnalysis && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs"
              onClick={onAiAnalysis}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              AI Analysis
            </Button>
          )}
          {onExport && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs"
              onClick={onExport}
            >
              <FileDown className="h-3 w-3 mr-1" />
              Export
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
