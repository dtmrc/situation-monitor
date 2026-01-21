import { MoreVertical, Trash2, Edit } from 'lucide-react';

import { SpiderChart } from '@/components/charts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface ScenarioIndicator {
  label: string;
  value: number; // 0-100
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  probability: number; // 0-100
  indicators: ScenarioIndicator[];
  color?: string;
}

interface ScenarioCardProps {
  scenario: Scenario;
  onEdit?: (scenario: Scenario) => void;
  onDelete?: (scenario: Scenario) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function ScenarioCard({
  scenario,
  onEdit,
  onDelete,
  isSelected,
  onSelect,
}: ScenarioCardProps) {
  const color = scenario.color || '#00ff88';

  return (
    <Card
      className={cn('transition-all cursor-pointer', isSelected && 'ring-2 ring-primary')}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{scenario.name}</CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {scenario.description}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(scenario)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(scenario)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Probability */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Probability</span>
          <Badge
            variant="outline"
            className={cn(
              scenario.probability >= 60
                ? 'bg-tactical-green/20 text-tactical-green border-tactical-green/30'
                : scenario.probability >= 30
                  ? 'bg-tactical-amber/20 text-tactical-amber border-tactical-amber/30'
                  : 'bg-tactical-red/20 text-tactical-red border-tactical-red/30'
            )}
          >
            {scenario.probability}%
          </Badge>
        </div>

        {/* Key Indicators List */}
        {scenario.indicators.length > 0 && (
          <div>
            <span className="text-xs text-muted-foreground">Key Indicators</span>
            <ul className="mt-1 space-y-1">
              {scenario.indicators.slice(0, 4).map((indicator) => (
                <li key={indicator.label} className="flex items-center justify-between text-sm">
                  <span>{indicator.label}</span>
                  <span className="font-mono text-muted-foreground">{indicator.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Spider Chart */}
        {scenario.indicators.length >= 3 && (
          <div className="flex justify-center pt-2">
            <SpiderChart
              data={scenario.indicators.map((i) => ({ label: i.label, value: i.value }))}
              color={color}
              size={160}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
