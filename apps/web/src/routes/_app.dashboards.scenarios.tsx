import { createFileRoute } from '@tanstack/react-router';
import { Plus, Download } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  ScenarioComparisonGrid,
  ComparativeBarChart,
  type Scenario,
} from '@/features/dashboards/scenario';

export const Route = createFileRoute('/_app/dashboards/scenarios')({
  component: ScenarioComparisonPage,
});

// Demo data
const mockScenarios: Scenario[] = [
  {
    id: '1',
    name: 'Status Quo',
    description: 'Current trajectory continues with no major changes to regional dynamics.',
    probability: 60,
    color: '#00ff88',
    indicators: [
      { label: 'Economic', value: 65 },
      { label: 'Military', value: 40 },
      { label: 'Political', value: 55 },
      { label: 'Social', value: 70 },
      { label: 'Diplomatic', value: 60 },
    ],
  },
  {
    id: '2',
    name: 'Escalation',
    description:
      'Tensions escalate leading to increased military posturing and economic sanctions.',
    probability: 25,
    color: '#ff3333',
    indicators: [
      { label: 'Economic', value: 30 },
      { label: 'Military', value: 85 },
      { label: 'Political', value: 40 },
      { label: 'Social', value: 35 },
      { label: 'Diplomatic', value: 20 },
    ],
  },
  {
    id: '3',
    name: 'De-escalation',
    description: 'Diplomatic breakthrough leads to reduced tensions and improved cooperation.',
    probability: 15,
    color: '#00d4ff',
    indicators: [
      { label: 'Economic', value: 80 },
      { label: 'Military', value: 20 },
      { label: 'Political', value: 75 },
      { label: 'Social', value: 85 },
      { label: 'Diplomatic', value: 90 },
    ],
  },
];

const comparisonMetrics = [
  {
    metric: 'Economic Stability',
    dataPoints: mockScenarios.map((s) => ({
      scenarioId: s.id,
      scenarioName: s.name,
      value: s.indicators.find((i) => i.label === 'Economic')?.value || 0,
      color: s.color || '#00ff88',
    })),
  },
  {
    metric: 'Military Tension',
    dataPoints: mockScenarios.map((s) => ({
      scenarioId: s.id,
      scenarioName: s.name,
      value: s.indicators.find((i) => i.label === 'Military')?.value || 0,
      color: s.color || '#00ff88',
    })),
  },
  {
    metric: 'Diplomatic Relations',
    dataPoints: mockScenarios.map((s) => ({
      scenarioId: s.id,
      scenarioName: s.name,
      value: s.indicators.find((i) => i.label === 'Diplomatic')?.value || 0,
      color: s.color || '#00ff88',
    })),
  },
  {
    metric: 'Social Stability',
    dataPoints: mockScenarios.map((s) => ({
      scenarioId: s.id,
      scenarioName: s.name,
      value: s.indicators.find((i) => i.label === 'Social')?.value || 0,
      color: s.color || '#00ff88',
    })),
  },
];

function ScenarioComparisonPage() {
  const [scenarios, setScenarios] = useState(mockScenarios);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | undefined>();

  const handleAddScenario = () => {
    const newScenario: Scenario = {
      id: Date.now().toString(),
      name: `New Scenario ${scenarios.length + 1}`,
      description: 'Enter scenario description...',
      probability: 50,
      color: '#a855f7',
      indicators: [
        { label: 'Economic', value: 50 },
        { label: 'Military', value: 50 },
        { label: 'Political', value: 50 },
        { label: 'Social', value: 50 },
        { label: 'Diplomatic', value: 50 },
      ],
    };
    setScenarios([...scenarios, newScenario]);
  };

  const handleEditScenario = (scenario: Scenario) => {
    // In production, open edit modal
    console.log('Edit scenario:', scenario);
  };

  const handleDeleteScenario = (scenario: Scenario) => {
    setScenarios(scenarios.filter((s) => s.id !== scenario.id));
    if (selectedScenarioId === scenario.id) {
      setSelectedScenarioId(undefined);
    }
  };

  const handleSelectScenario = (scenario: Scenario) => {
    setSelectedScenarioId(scenario.id === selectedScenarioId ? undefined : scenario.id);
  };

  const handleExport = () => {
    // In production, generate PDF/CSV export
    console.log('Export scenarios');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scenario Comparison</h1>
          <p className="text-muted-foreground">Compare multiple scenarios and courses of action</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={handleAddScenario}>
            <Plus className="h-4 w-4 mr-2" />
            Add Scenario
          </Button>
        </div>
      </div>

      {/* Scenario Cards */}
      <ScenarioComparisonGrid
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={handleSelectScenario}
        onAddScenario={handleAddScenario}
        onEditScenario={handleEditScenario}
        onDeleteScenario={handleDeleteScenario}
        maxScenarios={4}
      />

      {/* Comparative Metrics */}
      <ComparativeBarChart
        data={comparisonMetrics.map((metric) => ({
          ...metric,
          dataPoints: metric.dataPoints.filter((dp) =>
            scenarios.some((s) => s.id === dp.scenarioId)
          ),
        }))}
      />
    </div>
  );
}
