import { ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ConfidenceData {
  overallConfidence: 'high' | 'medium' | 'low';
  sources: {
    name: string;
    reliability: 'high' | 'medium' | 'low';
  }[];
  gaps: string[];
  caveats: string[];
}

interface ConfidenceAssessmentProps {
  data: ConfidenceData;
}

const confidenceLabels: Record<
  ConfidenceData['overallConfidence'],
  { label: string; color: string; icon: typeof ShieldCheck }
> = {
  high: { label: 'High Confidence', color: 'text-tactical-green', icon: ShieldCheck },
  medium: { label: 'Medium Confidence', color: 'text-tactical-amber', icon: AlertCircle },
  low: { label: 'Low Confidence', color: 'text-tactical-red', icon: HelpCircle },
};

const reliabilityColors: Record<string, string> = {
  high: 'bg-tactical-green/20 text-tactical-green',
  medium: 'bg-tactical-amber/20 text-tactical-amber',
  low: 'bg-tactical-red/20 text-tactical-red',
};

export function ConfidenceAssessment({ data }: ConfidenceAssessmentProps) {
  const confidence = confidenceLabels[data.overallConfidence];
  const ConfidenceIcon = confidence.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Confidence Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall confidence */}
        <div className="flex items-center gap-2">
          <ConfidenceIcon className={cn('h-5 w-5', confidence.color)} />
          <span className={cn('font-medium', confidence.color)}>{confidence.label}</span>
        </div>

        {/* Sources */}
        {data.sources.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Source Reliability
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.sources.map((source, i) => (
                <div
                  key={i}
                  className={cn('px-2 py-1 rounded text-xs', reliabilityColors[source.reliability])}
                >
                  {source.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intelligence Gaps */}
        {data.gaps.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Intelligence Gaps
            </h4>
            <ul className="space-y-1">
              {data.gaps.map((gap, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <HelpCircle className="h-3 w-3 mt-1 text-tactical-amber shrink-0" />
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Caveats */}
        {data.caveats.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Caveats
            </h4>
            <ul className="space-y-1">
              {data.caveats.map((caveat, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-3 w-3 mt-1 text-muted-foreground shrink-0" />
                  {caveat}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
