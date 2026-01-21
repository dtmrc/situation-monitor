import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface StabilityIndicator {
  name: string;
  value: number; // 0-100
  previousValue?: number;
  description?: string;
}

interface StabilityIndicatorsProps {
  indicators: StabilityIndicator[];
}

function GaugeChart({ value, label }: { value: number; label: string }) {
  // SVG gauge parameters
  const radius = 40;
  const strokeWidth = 8;
  const circumference = Math.PI * radius; // Half circle
  const progress = (value / 100) * circumference;

  // Color based on value
  const getColor = (val: number) => {
    if (val >= 70) return '#00ff88';
    if (val >= 40) return '#ffaa00';
    return '#ff3333';
  };

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="60" className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M 10 50 A ${radius} ${radius} 0 0 1 90 50`}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d={`M 10 50 A ${radius} ${radius} 0 0 1 90 50`}
          fill="none"
          stroke={getColor(value)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
        />
        {/* Value text */}
        <text
          x="50"
          y="45"
          textAnchor="middle"
          className="fill-foreground font-mono text-lg font-bold"
        >
          {value}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground text-center mt-1">{label}</span>
    </div>
  );
}

function TrendIndicator({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return null;

  const diff = current - previous;
  if (Math.abs(diff) < 1) {
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  }
  if (diff > 0) {
    return <TrendingUp className="w-3 h-3 text-tactical-green" />;
  }
  return <TrendingDown className="w-3 h-3 text-tactical-red" />;
}

export function StabilityIndicators({ indicators }: StabilityIndicatorsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Political Stability Indicators</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {indicators.map((indicator) => (
            <div key={indicator.name} className="text-center">
              <GaugeChart value={indicator.value} label={indicator.name} />
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendIndicator current={indicator.value} previous={indicator.previousValue} />
                {indicator.previousValue !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    vs {indicator.previousValue}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
