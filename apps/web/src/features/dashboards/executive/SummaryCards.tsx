import { Shield, Target, AlertTriangle, Radio } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'warning' | 'critical';
}

function MetricCard({ title, value, change, icon: Icon, variant = 'default' }: MetricCardProps) {
  const variantStyles = {
    default: 'border-border',
    warning: 'border-tactical-amber/50',
    critical: 'border-tactical-red/50',
  };

  const glowStyles = {
    default: '',
    warning: 'shadow-[0_0_10px_rgba(255,170,0,0.15)]',
    critical: 'shadow-[0_0_10px_rgba(255,51,51,0.15)]',
  };

  return (
    <Card className={cn('bg-card', variantStyles[variant], glowStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-mono">{value}</div>
        {change !== undefined && (
          <p
            className={cn('text-xs mt-1', change > 0 ? 'text-tactical-red' : 'text-tactical-green')}
          >
            {change > 0 ? '+' : ''}
            {change}% from last assessment
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export interface SummaryData {
  activeThreats: number;
  threatsChange: number;
  pendingPirs: number;
  activeNais: number;
  triggeredAlerts: number;
}

interface SummaryCardsProps {
  data: SummaryData;
}

export function SummaryCards({ data }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Active Threats"
        value={data.activeThreats}
        change={data.threatsChange}
        icon={Shield}
        variant={data.activeThreats > 10 ? 'critical' : 'default'}
      />
      <MetricCard
        title="Pending PIRs"
        value={data.pendingPirs}
        icon={Target}
        variant={data.pendingPirs > 5 ? 'warning' : 'default'}
      />
      <MetricCard title="Active NAIs" value={data.activeNais} icon={Radio} />
      <MetricCard
        title="Triggered Alerts"
        value={data.triggeredAlerts}
        icon={AlertTriangle}
        variant={data.triggeredAlerts > 0 ? 'critical' : 'default'}
      />
    </div>
  );
}
