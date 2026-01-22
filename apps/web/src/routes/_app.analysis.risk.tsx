import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Filter, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RiskHeatMap,
  RiskRegister,
  RiskDetailPanel,
  type Risk,
  type RiskDetail,
  type RiskCategory,
} from '@/features/analysis/risk';

export const Route = createFileRoute('/_app/analysis/risk')({
  component: RiskMatrixPage,
});

// Mock data for risk matrix
const mockRisks: RiskDetail[] = [
  {
    id: 'r1',
    name: 'Supply Chain Disruption',
    category: 'operational',
    likelihood: 4,
    consequence: 5,
    owner: 'Operations Team',
    description: 'Major disruption to supply chain due to geopolitical tensions or natural disasters.',
    inherentRisk: 20,
    residualRisk: 12,
    controls: [
      { id: 'c1', name: 'Dual sourcing strategy', completed: true },
      { id: 'c2', name: 'Buffer stock maintained', completed: true },
      { id: 'c3', name: 'Alternative supplier agreements', completed: false },
    ],
    nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'r2',
    name: 'Cyber Attack on Infrastructure',
    category: 'operational',
    likelihood: 4,
    consequence: 4,
    owner: 'Security Team',
    description: 'Sophisticated cyber attack targeting critical business systems.',
    inherentRisk: 16,
    residualRisk: 10,
    controls: [
      { id: 'c4', name: 'EDR deployment', completed: true },
      { id: 'c5', name: 'Incident response plan', completed: true },
      { id: 'c6', name: 'Security awareness training', completed: true },
      { id: 'c7', name: 'Network segmentation', completed: false },
    ],
    nextReviewDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'r3',
    name: 'Key Personnel Loss',
    category: 'operational',
    likelihood: 3,
    consequence: 4,
    owner: 'HR Team',
    description: 'Loss of critical personnel with specialized knowledge.',
    inherentRisk: 12,
    residualRisk: 8,
    controls: [
      { id: 'c8', name: 'Knowledge documentation', completed: true },
      { id: 'c9', name: 'Cross-training program', completed: false },
    ],
  },
  {
    id: 'r4',
    name: 'Budget Overrun',
    category: 'financial',
    likelihood: 3,
    consequence: 3,
    owner: 'Finance Team',
    description: 'Project costs exceeding allocated budget by more than 20%.',
    inherentRisk: 9,
    residualRisk: 6,
    controls: [
      { id: 'c10', name: 'Monthly budget reviews', completed: true },
      { id: 'c11', name: 'Contingency fund', completed: true },
    ],
  },
  {
    id: 'r5',
    name: 'Currency Fluctuation',
    category: 'financial',
    likelihood: 4,
    consequence: 3,
    owner: 'Treasury',
    description: 'Adverse currency movements impacting international operations.',
    inherentRisk: 12,
    residualRisk: 8,
    controls: [
      { id: 'c12', name: 'Hedging strategy', completed: true },
      { id: 'c13', name: 'Natural hedge optimization', completed: false },
    ],
  },
  {
    id: 'r6',
    name: 'Negative Media Coverage',
    category: 'reputational',
    likelihood: 2,
    consequence: 4,
    owner: 'Communications',
    description: 'Unfavorable media coverage damaging brand reputation.',
    inherentRisk: 8,
    residualRisk: 5,
    controls: [
      { id: 'c14', name: 'Media monitoring', completed: true },
      { id: 'c15', name: 'Crisis communication plan', completed: true },
    ],
  },
  {
    id: 'r7',
    name: 'Regulatory Non-Compliance',
    category: 'strategic',
    likelihood: 2,
    consequence: 5,
    owner: 'Legal Team',
    description: 'Failure to comply with new or existing regulations.',
    inherentRisk: 10,
    residualRisk: 6,
    controls: [
      { id: 'c16', name: 'Compliance monitoring', completed: true },
      { id: 'c17', name: 'Regulatory tracking system', completed: true },
      { id: 'c18', name: 'Annual compliance audit', completed: false },
    ],
  },
  {
    id: 'r8',
    name: 'Market Share Loss',
    category: 'strategic',
    likelihood: 3,
    consequence: 4,
    owner: 'Strategy Team',
    description: 'Significant loss of market share to competitors.',
    inherentRisk: 12,
    residualRisk: 9,
    controls: [
      { id: 'c19', name: 'Competitive intelligence', completed: true },
      { id: 'c20', name: 'Product roadmap alignment', completed: false },
    ],
  },
  {
    id: 'r9',
    name: 'Data Privacy Breach',
    category: 'reputational',
    likelihood: 2,
    consequence: 5,
    owner: 'DPO',
    description: 'Unauthorized access to personal data resulting in regulatory action.',
    inherentRisk: 10,
    residualRisk: 5,
    controls: [
      { id: 'c21', name: 'Data encryption', completed: true },
      { id: 'c22', name: 'Access controls', completed: true },
      { id: 'c23', name: 'Privacy impact assessments', completed: true },
    ],
  },
  {
    id: 'r10',
    name: 'System Downtime',
    category: 'operational',
    likelihood: 2,
    consequence: 3,
    owner: 'IT Operations',
    description: 'Unplanned system downtime affecting business operations.',
    inherentRisk: 6,
    residualRisk: 3,
    controls: [
      { id: 'c24', name: 'Redundant systems', completed: true },
      { id: 'c25', name: 'Disaster recovery plan', completed: true },
    ],
  },
];

function RiskMatrixPage() {
  const [selectedRisk, setSelectedRisk] = useState<RiskDetail | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<RiskCategory | 'all'>('all');

  const filteredRisks = categoryFilter === 'all'
    ? mockRisks
    : mockRisks.filter((r) => r.category === categoryFilter);

  const handleRiskSelect = (risk: Risk | null) => {
    if (risk) {
      const fullRisk = mockRisks.find((r) => r.id === risk.id);
      setSelectedRisk(fullRisk ?? null);
    } else {
      setSelectedRisk(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Risk Matrix</h1>
          <p className="text-muted-foreground">
            Categorize and track risks with mitigation status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as RiskCategory | 'all')}
          >
            <SelectTrigger className="w-40 h-9">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="operational">Operational</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="reputational">Reputational</SelectItem>
              <SelectItem value="strategic">Strategic</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Risk
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Heat Map */}
        <div className="lg:col-span-5">
          <RiskHeatMap
            risks={filteredRisks}
            onSelect={handleRiskSelect}
            selectedId={selectedRisk?.id}
          />
        </div>

        {/* Risk Register */}
        <div className="lg:col-span-3">
          <RiskRegister
            risks={filteredRisks}
            selectedId={selectedRisk?.id}
            onSelect={(risk) => {
              const fullRisk = mockRisks.find((r) => r.id === risk.id);
              setSelectedRisk(fullRisk ?? null);
            }}
          />
        </div>

        {/* Risk Detail Panel */}
        <div className="lg:col-span-4">
          <RiskDetailPanel risk={selectedRisk} />
        </div>
      </div>
    </div>
  );
}
