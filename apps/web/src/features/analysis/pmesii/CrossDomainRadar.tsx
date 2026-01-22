import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SpiderChart } from '@/components/charts';

import { type PmesiiDomain, DOMAINS } from './DomainTabs';

interface CrossDomainRadarProps {
  scores: Record<PmesiiDomain, number>; // 0-100 for each domain
  title?: string;
}

export function CrossDomainRadar({ scores, title = 'Cross-Domain Analysis' }: CrossDomainRadarProps) {
  // Convert domain scores to SpiderChart data format
  const chartData = DOMAINS.map((domain) => ({
    label: domain.letter,
    value: scores[domain.code] ?? 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <SpiderChart data={chartData} size={280} color="#00ff88" />

        {/* Legend */}
        <div className="grid grid-cols-4 gap-2 mt-4 w-full">
          {DOMAINS.map((domain) => (
            <div key={domain.code} className="flex items-center gap-1.5 text-xs">
              <div className={`w-2 h-2 rounded-full ${domain.color}`} />
              <span className="text-muted-foreground truncate" title={domain.name}>
                {domain.letter} - {domain.name}
              </span>
            </div>
          ))}
        </div>

        {/* Score summary */}
        <div className="grid grid-cols-4 gap-2 mt-3 w-full text-center">
          {DOMAINS.map((domain) => {
            const score = scores[domain.code] ?? 0;
            return (
              <div key={domain.code} className="text-xs">
                <span className="font-mono font-bold">{score}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
