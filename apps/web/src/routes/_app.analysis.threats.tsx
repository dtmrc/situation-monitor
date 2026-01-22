import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { RefreshCw, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  ThreatMatrix,
  ThreatActorList,
  ThreatDetailPanel,
  type ThreatPoint,
  type ThreatDetail,
} from '@/features/analysis/threat';

export const Route = createFileRoute('/_app/analysis/threats')({
  component: ThreatAssessmentPage,
});

// Mock data for demonstration
const mockThreats: ThreatDetail[] = [
  {
    id: '1',
    name: 'State Actor A',
    probability: 4,
    impact: 5,
    category: 'State Actor',
    description: 'Advanced persistent threat from a nation-state adversary.',
    scenario:
      'Coordinated cyber-attack targeting critical infrastructure combined with information operations to undermine public confidence.',
    capabilities: ['Cyber Warfare', 'SIGINT', 'HUMINT', 'Information Ops'],
    intentions: 'Hostile - seeking to destabilize regional influence',
    impactScores: {
      casualties: 4,
      economic: 3,
      infrastructure: 5,
      reputation: 2,
    },
    mitigations: [
      { id: 'm1', text: 'Enhanced network monitoring', completed: true },
      { id: 'm2', text: 'Incident response plan update', completed: true },
      { id: 'm3', text: 'Critical system isolation', completed: false },
    ],
  },
  {
    id: '2',
    name: 'Non-State Group B',
    probability: 3,
    impact: 4,
    category: 'Non-State',
    description: 'Well-funded extremist organization with regional presence.',
    scenario:
      'Asymmetric attacks on soft targets during high-profile events to maximize media coverage.',
    capabilities: ['IED', 'Small Arms', 'Recruitment'],
    intentions: 'Hostile - ideologically motivated',
    impactScores: {
      casualties: 5,
      economic: 2,
      infrastructure: 2,
      reputation: 4,
    },
    mitigations: [
      { id: 'm4', text: 'Increased security presence', completed: true },
      { id: 'm5', text: 'Intelligence sharing agreements', completed: false },
    ],
  },
  {
    id: '3',
    name: 'Cyber Threat C',
    probability: 4,
    impact: 3,
    category: 'Cyber',
    description: 'Sophisticated ransomware group targeting financial sector.',
    scenario:
      'Multi-stage attack: initial access via phishing, lateral movement, data exfiltration, then ransomware deployment.',
    capabilities: ['Ransomware', 'Social Engineering', 'Zero-day Exploits'],
    intentions: 'Financial - seeking ransom payments',
    impactScores: {
      casualties: 1,
      economic: 4,
      infrastructure: 3,
      reputation: 3,
    },
    mitigations: [
      { id: 'm6', text: 'Backup verification', completed: true },
      { id: 'm7', text: 'Phishing training', completed: true },
      { id: 'm8', text: 'Network segmentation', completed: false },
    ],
  },
  {
    id: '4',
    name: 'Criminal Network D',
    probability: 3,
    impact: 3,
    category: 'Criminal',
    description: 'Organized crime syndicate with corruption ties.',
    scenario: 'Exploitation of supply chain vulnerabilities for smuggling and extortion.',
    capabilities: ['Corruption', 'Smuggling', 'Extortion'],
    intentions: 'Financial - profit-driven',
    impactScores: {
      casualties: 2,
      economic: 4,
      infrastructure: 2,
      reputation: 3,
    },
    mitigations: [
      { id: 'm9', text: 'Supply chain audits', completed: false },
    ],
  },
  {
    id: '5',
    name: 'Insider Threat E',
    probability: 2,
    impact: 4,
    category: 'Insider',
    description: 'Disgruntled employee with access to sensitive systems.',
    scenario: 'Data theft and sabotage during transition period.',
    capabilities: ['System Access', 'Institutional Knowledge'],
    intentions: 'Mixed - revenge and financial gain',
    impactScores: {
      casualties: 1,
      economic: 3,
      infrastructure: 4,
      reputation: 4,
    },
    mitigations: [
      { id: 'm10', text: 'Access reviews', completed: true },
      { id: 'm11', text: 'Exit procedures', completed: true },
    ],
  },
  {
    id: '6',
    name: 'State Actor F',
    probability: 2,
    impact: 5,
    category: 'State Actor',
    description: 'Regional power with economic leverage.',
    scenario: 'Economic coercion through trade restrictions and investment manipulation.',
    capabilities: ['Economic Warfare', 'Diplomatic Pressure'],
    intentions: 'Opportunistic - seeking favorable trade terms',
    impactScores: {
      casualties: 1,
      economic: 5,
      infrastructure: 2,
      reputation: 3,
    },
    mitigations: [],
  },
  {
    id: '7',
    name: 'Hacktivist Group G',
    probability: 4,
    impact: 2,
    category: 'Cyber',
    description: 'Ideologically motivated hackers targeting public perception.',
    scenario: 'Website defacement and data leaks timed with public events.',
    capabilities: ['DDoS', 'Website Defacement', 'Data Leaks'],
    intentions: 'Ideological - seeking publicity',
    impactScores: {
      casualties: 1,
      economic: 2,
      infrastructure: 1,
      reputation: 3,
    },
    mitigations: [
      { id: 'm12', text: 'DDoS protection', completed: true },
    ],
  },
];

function ThreatAssessmentPage() {
  const [selectedThreat, setSelectedThreat] = useState<ThreatDetail | null>(null);

  const handleThreatSelect = (threat: ThreatPoint | null) => {
    if (threat) {
      const fullThreat = mockThreats.find((t) => t.id === threat.id);
      setSelectedThreat(fullThreat ?? null);
    } else {
      setSelectedThreat(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Threat Assessment</h1>
          <p className="text-muted-foreground">
            Probability × Impact analysis with threat actor profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Threat
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Threat Matrix */}
        <div className="lg:col-span-5">
          <ThreatMatrix
            threats={mockThreats}
            onSelect={handleThreatSelect}
            selectedId={selectedThreat?.id}
          />
        </div>

        {/* Threat Actor List */}
        <div className="lg:col-span-3">
          <ThreatActorList
            threats={mockThreats}
            selectedId={selectedThreat?.id}
            onSelect={(threat) => handleThreatSelect(threat)}
          />
        </div>

        {/* Threat Detail Panel */}
        <div className="lg:col-span-4">
          <ThreatDetailPanel threat={selectedThreat} />
        </div>
      </div>
    </div>
  );
}
