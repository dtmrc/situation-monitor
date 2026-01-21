import { createFileRoute } from '@tanstack/react-router';
import { Download, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  ExecutiveSummary,
  KeyFindings,
  ActionItems,
  RiskSummary,
  ConfidenceAssessment,
  type Finding,
  type ActionItem,
  type RiskItem,
  type ConfidenceData,
} from '@/features/dashboards/synthesis';

export const Route = createFileRoute('/_app/dashboards/synthesis')({
  component: StrategicSynthesisPage,
});

// Demo data
const mockSummary = `## Strategic Assessment Summary

The current operational environment presents a complex mix of opportunities and challenges. Key developments over the past quarter indicate:

**Primary Observations:**
- Political stability has improved slightly due to successful economic reforms
- Regional tensions remain elevated, particularly regarding maritime disputes
- Economic indicators show modest growth despite global headwinds

**Strategic Implications:**
The window for diplomatic engagement appears to be narrowing. Recommend prioritizing intelligence collection on key decision-makers and their response to ongoing negotiations.

**Bottom Line:**
Maintain heightened awareness posture while pursuing diplomatic channels. Monitor tripwire indicators closely for signs of escalation.`;

const mockFindings: Finding[] = [
  {
    id: '1',
    content: 'Economic sanctions have reduced target nation GDP by 3.2% over the past year',
    source: 'pmesii',
    priority: 'high',
  },
  {
    id: '2',
    content:
      'Military modernization program accelerating, with new weapons systems deployment expected within 6 months',
    source: 'threats',
    priority: 'high',
  },
  {
    id: '3',
    content: 'Opposition coalition gaining support in urban areas ahead of elections',
    source: 'pmesii',
    priority: 'medium',
  },
  {
    id: '4',
    content:
      'Critical infrastructure (power grid) identified as primary vulnerability in adversary CoG analysis',
    source: 'cog',
    priority: 'high',
  },
  {
    id: '5',
    content: 'PIR 3 answered: No evidence of imminent military action in next 30 days',
    source: 'pir',
    priority: 'medium',
  },
];

const mockActions: ActionItem[] = [
  {
    id: '1',
    content: 'Increase ISR coverage in NAI Alpha region',
    completed: false,
    assignee: 'Intel Team',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    content: 'Update diplomatic engagement strategy based on latest findings',
    completed: true,
    assignee: 'Policy Team',
  },
  {
    id: '3',
    content: 'Brief senior leadership on escalation indicators',
    completed: false,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    content: 'Coordinate with regional partners on intelligence sharing',
    completed: false,
    assignee: 'Liaison',
  },
];

const mockRisks: RiskItem[] = [
  { category: 'Military Escalation', level: 'high', count: 3 },
  { category: 'Economic Disruption', level: 'medium', count: 5 },
  { category: 'Political Instability', level: 'medium', count: 2 },
  { category: 'Cyber Threats', level: 'critical', count: 2 },
  { category: 'Supply Chain', level: 'low', count: 4 },
];

const mockConfidence: ConfidenceData = {
  overallConfidence: 'medium',
  sources: [
    { name: 'SIGINT', reliability: 'high' },
    { name: 'HUMINT', reliability: 'medium' },
    { name: 'OSINT', reliability: 'high' },
    { name: 'IMINT', reliability: 'medium' },
  ],
  gaps: [
    'Limited visibility into senior leadership decision-making',
    'Uncertain economic data due to reporting inconsistencies',
    'Cyber capabilities assessment based on limited incidents',
  ],
  caveats: [
    'Analysis assumes no major external shocks to the system',
    'Political assessment may shift significantly post-election',
    'Military modernization timeline based on projected funding',
  ],
};

function StrategicSynthesisPage() {
  const [summary, setSummary] = useState(mockSummary);
  const [findings, setFindings] = useState(mockFindings);
  const [actions, setActions] = useState(mockActions);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSummary = () => {
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  const handleAddFinding = () => {
    const newFinding: Finding = {
      id: Date.now().toString(),
      content: 'New finding...',
      source: 'manual',
      priority: 'medium',
    };
    setFindings([...findings, newFinding]);
  };

  const handleRemoveFinding = (id: string) => {
    setFindings(findings.filter((f) => f.id !== id));
  };

  const handleAddAction = (content: string) => {
    const newAction: ActionItem = {
      id: Date.now().toString(),
      content,
      completed: false,
    };
    setActions([...actions, newAction]);
  };

  const handleToggleAction = (id: string) => {
    setActions(actions.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a)));
  };

  const handleExport = () => {
    // In production, generate PDF export
    console.log('Export synthesis');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Strategic Synthesis</h1>
          <p className="text-muted-foreground">Integrated findings and strategic assessments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateSummary}
            disabled={isGenerating}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <ExecutiveSummary
        content={summary}
        onChange={setSummary}
        onGenerate={handleGenerateSummary}
        isGenerating={isGenerating}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KeyFindings
          findings={findings}
          onAddFinding={handleAddFinding}
          onRemoveFinding={handleRemoveFinding}
        />
        <ActionItems
          items={actions}
          onAddItem={handleAddAction}
          onToggleItem={handleToggleAction}
        />
      </div>

      {/* Risk and Confidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskSummary risks={mockRisks} />
        <ConfidenceAssessment data={mockConfidence} />
      </div>
    </div>
  );
}
