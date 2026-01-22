import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DomainTabs,
  FactorList,
  FactorEditor,
  DomainSummary,
  CrossDomainRadar,
  type PmesiiDomain,
  type Factor,
  type FactorDetail,
} from '@/features/analysis/pmesii';

export const Route = createFileRoute('/_app/analysis/pmesii')({
  component: PmesiiPtPage,
});

// Mock data for each domain
const mockFactorsByDomain: Record<PmesiiDomain, FactorDetail[]> = {
  P1: [
    {
      id: 'p1-1',
      name: 'Government Stability',
      impact: 4,
      trend: 'declining',
      description: 'Assessment of current administration stability and policy consistency.',
      analysis: 'Recent cabinet reshuffles indicate internal disagreements. Opposition gaining ground in polls.',
      evidence: [
        { id: 'e1', text: 'Cabinet minister resignation reported Jan 15', source: 'Reuters', date: '2025-01-15' },
        { id: 'e2', text: 'Approval rating dropped 8 points in Q4', source: 'Gallup', date: '2025-01-10' },
      ],
      sources: ['Reuters', 'Gallup', 'Local News'],
    },
    {
      id: 'p1-2',
      name: 'Policy Changes',
      impact: 3,
      trend: 'stable',
      description: 'Tracking regulatory and legislative changes affecting operations.',
      analysis: 'No major policy shifts expected before elections. Incremental regulatory tightening continues.',
    },
    {
      id: 'p1-3',
      name: 'Election Cycle',
      impact: 4,
      trend: 'declining',
      description: 'Impact of upcoming elections on political landscape.',
      analysis: 'Elections scheduled for Q3. Increased uncertainty and potential for populist policies.',
    },
  ],
  M: [
    {
      id: 'm-1',
      name: 'Defense Posture',
      impact: 3,
      trend: 'stable',
      description: 'Military readiness and force disposition.',
      analysis: 'Routine deployments continuing. No significant force structure changes observed.',
    },
    {
      id: 'm-2',
      name: 'Regional Tensions',
      impact: 4,
      trend: 'declining',
      description: 'Border disputes and regional military activities.',
      analysis: 'Increased naval patrols in disputed waters. Diplomatic talks stalled.',
    },
  ],
  E: [
    {
      id: 'e-1',
      name: 'Market Conditions',
      impact: 3,
      trend: 'improving',
      description: 'Stock market performance and investor sentiment.',
      analysis: 'Markets recovering from Q4 selloff. Tech sector leading gains.',
    },
    {
      id: 'e-2',
      name: 'Trade Dynamics',
      impact: 4,
      trend: 'stable',
      description: 'Import/export volumes and trade agreements.',
      analysis: 'Trade negotiations ongoing. Tariff situation unchanged.',
    },
    {
      id: 'e-3',
      name: 'Inflation Pressure',
      impact: 4,
      trend: 'declining',
      description: 'Consumer price index and monetary policy.',
      analysis: 'Core inflation above target. Central bank signaling rate hikes.',
    },
  ],
  S: [
    {
      id: 's-1',
      name: 'Public Sentiment',
      impact: 3,
      trend: 'declining',
      description: 'Social mood and public confidence indicators.',
      analysis: 'Growing discontent with economic conditions. Social media sentiment negative.',
    },
    {
      id: 's-2',
      name: 'Demographics',
      impact: 2,
      trend: 'stable',
      description: 'Population trends and migration patterns.',
      analysis: 'Urban migration continuing. Aging population concerns.',
    },
  ],
  I1: [
    {
      id: 'i1-1',
      name: 'Media Landscape',
      impact: 3,
      trend: 'declining',
      description: 'Media freedom and information reliability.',
      analysis: 'Increasing polarization in media coverage. Disinformation concerns growing.',
    },
    {
      id: 'i1-2',
      name: 'Cyber Threats',
      impact: 5,
      trend: 'declining',
      description: 'Cyber attack frequency and sophistication.',
      analysis: 'Significant increase in ransomware attacks. State-sponsored activity detected.',
    },
  ],
  I2: [
    {
      id: 'i2-1',
      name: 'Power Grid',
      impact: 4,
      trend: 'stable',
      description: 'Electrical infrastructure reliability.',
      analysis: 'Grid operating within normal parameters. Aging infrastructure concerns.',
    },
    {
      id: 'i2-2',
      name: 'Transportation',
      impact: 3,
      trend: 'improving',
      description: 'Road, rail, and air transport capacity.',
      analysis: 'New rail line operational. Port congestion easing.',
    },
  ],
  P2: [
    {
      id: 'p2-1',
      name: 'Climate Impact',
      impact: 3,
      trend: 'declining',
      description: 'Weather patterns and natural disaster risk.',
      analysis: 'Drought conditions persisting. Increased wildfire risk forecast.',
    },
    {
      id: 'p2-2',
      name: 'Resource Access',
      impact: 3,
      trend: 'stable',
      description: 'Water, minerals, and energy resource availability.',
      analysis: 'Water reserves adequate. Mining operations normal.',
    },
  ],
  T: [
    {
      id: 't-1',
      name: 'Election Window',
      impact: 4,
      trend: 'declining',
      description: 'Time remaining until critical political events.',
      analysis: '6 months until general election. Decision window narrowing.',
    },
    {
      id: 't-2',
      name: 'Contract Deadlines',
      impact: 3,
      trend: 'stable',
      description: 'Key contractual and agreement timelines.',
      analysis: 'Trade agreement renewal due Q4. Negotiations proceeding normally.',
    },
  ],
};

const mockDomainScores: Record<PmesiiDomain, number> = {
  P1: 65,
  M: 55,
  E: 70,
  S: 45,
  I1: 80,
  I2: 50,
  P2: 40,
  T: 60,
};

const mockDomainSummaries: Record<PmesiiDomain, { impact: 'low' | 'moderate' | 'high' | 'critical'; trend: 'improving' | 'stable' | 'declining'; confidence: number }> = {
  P1: { impact: 'high', trend: 'declining', confidence: 72 },
  M: { impact: 'moderate', trend: 'stable', confidence: 68 },
  E: { impact: 'moderate', trend: 'improving', confidence: 75 },
  S: { impact: 'moderate', trend: 'declining', confidence: 60 },
  I1: { impact: 'critical', trend: 'declining', confidence: 82 },
  I2: { impact: 'moderate', trend: 'stable', confidence: 70 },
  P2: { impact: 'low', trend: 'declining', confidence: 65 },
  T: { impact: 'high', trend: 'declining', confidence: 78 },
};

function PmesiiPtPage() {
  const [selectedDomain, setSelectedDomain] = useState<PmesiiDomain>('P1');
  const [selectedFactor, setSelectedFactor] = useState<FactorDetail | null>(null);
  const [assessment, setAssessment] = useState('Q1 2025');

  const factors = mockFactorsByDomain[selectedDomain];
  const domainSummary = mockDomainSummaries[selectedDomain];

  const handleDomainChange = (domain: PmesiiDomain) => {
    setSelectedDomain(domain);
    setSelectedFactor(null);
  };

  const handleFactorSelect = (factor: Factor) => {
    const fullFactor = factors.find((f) => f.id === factor.id);
    setSelectedFactor(fullFactor ?? null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">PMESII-PT Analysis</h1>
          <p className="text-muted-foreground">
            Comprehensive environmental analysis across eight domains
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Assessment:</span>
          <Select value={assessment} onValueChange={setAssessment}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Q1 2025">Q1 2025</SelectItem>
              <SelectItem value="Q4 2024">Q4 2024</SelectItem>
              <SelectItem value="Q3 2024">Q3 2024</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Domain Tabs */}
      <DomainTabs
        selectedDomain={selectedDomain}
        onSelectDomain={handleDomainChange}
        domainScores={mockDomainScores}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Factor List */}
        <div className="lg:col-span-4">
          <FactorList
            factors={factors}
            selectedId={selectedFactor?.id}
            onSelect={handleFactorSelect}
          />
        </div>

        {/* Factor Editor */}
        <div className="lg:col-span-5">
          <FactorEditor factor={selectedFactor} />
        </div>

        {/* Domain Summary */}
        <div className="lg:col-span-3">
          <DomainSummary
            domain={selectedDomain}
            overallImpact={domainSummary.impact}
            trend={domainSummary.trend}
            confidence={domainSummary.confidence}
            factorCount={factors.length}
          />
        </div>
      </div>

      {/* Cross-Domain Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CrossDomainRadar scores={mockDomainScores} />

        {/* Domain Correlation Summary */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium mb-4">Domain Correlations</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Highest Impact</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="text-sm font-medium">Information</span>
                <span className="text-sm text-tactical-red font-mono">80</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Most Volatile</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-medium">Political</span>
                <span className="text-sm text-tactical-red">↓ declining</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Improving</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Economic</span>
                <span className="text-sm text-tactical-green">↑ improving</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Key Deadline</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pink-500" />
                <span className="text-sm font-medium">Time</span>
                <span className="text-sm text-muted-foreground">Election Q3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
