import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { Scenario } from './ScenarioCard';
import { ScenarioCard } from './ScenarioCard';

interface ScenarioComparisonGridProps {
  scenarios: Scenario[];
  selectedScenarioId?: string;
  onSelectScenario?: (scenario: Scenario) => void;
  onAddScenario?: () => void;
  onEditScenario?: (scenario: Scenario) => void;
  onDeleteScenario?: (scenario: Scenario) => void;
  maxScenarios?: number;
}

export function ScenarioComparisonGrid({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  onAddScenario,
  onEditScenario,
  onDeleteScenario,
  maxScenarios = 4,
}: ScenarioComparisonGridProps) {
  const canAddMore = scenarios.length < maxScenarios;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {scenarios.map((scenario) => (
        <ScenarioCard
          key={scenario.id}
          scenario={scenario}
          isSelected={scenario.id === selectedScenarioId}
          onSelect={() => onSelectScenario?.(scenario)}
          onEdit={onEditScenario}
          onDelete={onDeleteScenario}
        />
      ))}

      {/* Add Scenario Card */}
      {canAddMore && onAddScenario && (
        <Button
          variant="outline"
          className="h-auto min-h-[200px] flex flex-col items-center justify-center gap-2 border-dashed"
          onClick={onAddScenario}
        >
          <Plus className="h-8 w-8 text-muted-foreground" />
          <span className="text-muted-foreground">Add Scenario</span>
        </Button>
      )}
    </div>
  );
}
