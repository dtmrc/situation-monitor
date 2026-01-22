import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { Plus, HelpCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  AchMatrix,
  HypothesisList,
  EvidenceList,
  type Hypothesis,
  type Evidence,
  type AchRating,
  type Rating,
} from '@/features/analysis/ach';

export const Route = createFileRoute('/_app/analysis/ach')({
  component: AchPage,
});

// Mock data for ACH analysis
const mockHypotheses: Hypothesis[] = [
  {
    id: 'h1',
    name: 'Scenario A',
    description: 'State-sponsored operation targeting critical infrastructure.',
    status: 'under_review',
  },
  {
    id: 'h2',
    name: 'Scenario B',
    description: 'Financially motivated criminal organization attack.',
    status: 'most_likely',
  },
  {
    id: 'h3',
    name: 'Scenario C',
    description: 'Ideologically motivated hacktivist group activity.',
    status: 'unlikely',
  },
  {
    id: 'h4',
    name: 'Scenario D',
    description: 'Insider threat with external collaboration.',
    status: 'possible',
  },
];

const mockEvidence: Evidence[] = [
  {
    id: 'e1',
    description: 'Malware signature matches known APT toolkit',
    reliability: 'A-1',
    weight: 2.0,
    source: 'Threat Intel Team',
  },
  {
    id: 'e2',
    description: 'Attack timing coincides with geopolitical tensions',
    reliability: 'B-2',
    weight: 1.5,
    source: 'OSINT Analysis',
  },
  {
    id: 'e3',
    description: 'Ransom demand received via encrypted channel',
    reliability: 'A-1',
    weight: 2.0,
    source: 'IR Team',
  },
  {
    id: 'e4',
    description: 'Social media claims from hacktivist collective',
    reliability: 'C-3',
    weight: 1.0,
    source: 'Social Media Monitoring',
  },
  {
    id: 'e5',
    description: 'Unusual access patterns from privileged account',
    reliability: 'B-2',
    weight: 1.5,
    source: 'SIEM Logs',
  },
  {
    id: 'e6',
    description: 'Data exfiltration to known bulletproof hosting',
    reliability: 'A-2',
    weight: 1.8,
    source: 'Network Traffic Analysis',
  },
];

const mockRatings: AchRating[] = [
  { hypothesisId: 'h1', evidenceId: 'e1', rating: '++' },
  { hypothesisId: 'h1', evidenceId: 'e2', rating: '+' },
  { hypothesisId: 'h1', evidenceId: 'e3', rating: '--' },
  { hypothesisId: 'h1', evidenceId: 'e4', rating: 'N' },
  { hypothesisId: 'h1', evidenceId: 'e5', rating: '-' },
  { hypothesisId: 'h1', evidenceId: 'e6', rating: '+' },

  { hypothesisId: 'h2', evidenceId: 'e1', rating: '+' },
  { hypothesisId: 'h2', evidenceId: 'e2', rating: 'N' },
  { hypothesisId: 'h2', evidenceId: 'e3', rating: '++' },
  { hypothesisId: 'h2', evidenceId: 'e4', rating: '-' },
  { hypothesisId: 'h2', evidenceId: 'e5', rating: '+' },
  { hypothesisId: 'h2', evidenceId: 'e6', rating: '++' },

  { hypothesisId: 'h3', evidenceId: 'e1', rating: '-' },
  { hypothesisId: 'h3', evidenceId: 'e2', rating: '+' },
  { hypothesisId: 'h3', evidenceId: 'e3', rating: '--' },
  { hypothesisId: 'h3', evidenceId: 'e4', rating: '++' },
  { hypothesisId: 'h3', evidenceId: 'e5', rating: 'N' },
  { hypothesisId: 'h3', evidenceId: 'e6', rating: 'N' },

  { hypothesisId: 'h4', evidenceId: 'e1', rating: 'N' },
  { hypothesisId: 'h4', evidenceId: 'e2', rating: 'N' },
  { hypothesisId: 'h4', evidenceId: 'e3', rating: '+' },
  { hypothesisId: 'h4', evidenceId: 'e4', rating: 'N' },
  { hypothesisId: 'h4', evidenceId: 'e5', rating: '++' },
  { hypothesisId: 'h4', evidenceId: 'e6', rating: '+' },
];

const ratingValues: Record<Rating, number> = {
  '++': 2,
  '+': 1,
  'N': 0,
  '-': -1,
  '--': -2,
};

function AchPage() {
  const [ratings, setRatings] = useState<AchRating[]>(mockRatings);
  const [selectedHypothesis, setSelectedHypothesis] = useState<Hypothesis | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  const handleRatingChange = (hypothesisId: string, evidenceId: string, rating: Rating) => {
    setRatings((prev) => {
      const existing = prev.findIndex(
        (r) => r.hypothesisId === hypothesisId && r.evidenceId === evidenceId
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { hypothesisId, evidenceId, rating };
        return updated;
      }
      return [...prev, { hypothesisId, evidenceId, rating }];
    });
  };

  // Calculate scores for each hypothesis
  const scores = useMemo(() => {
    const result: Record<string, number> = {};
    mockHypotheses.forEach((h) => {
      result[h.id] = mockEvidence.reduce((sum, e) => {
        const rating = ratings.find(
          (r) => r.hypothesisId === h.id && r.evidenceId === e.id
        )?.rating ?? 'N';
        return sum + ratingValues[rating] * e.weight;
      }, 0);
    });
    return result;
  }, [ratings]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Analysis of Competing Hypotheses
          </h1>
          <p className="text-muted-foreground">
            Structured technique for evaluating multiple hypotheses against evidence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <HelpCircle className="h-4 w-4 mr-2" />
            Help
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New ACH
          </Button>
        </div>
      </div>

      {/* ACH Matrix */}
      <AchMatrix
        hypotheses={mockHypotheses}
        evidence={mockEvidence}
        ratings={ratings}
        onRatingChange={handleRatingChange}
      />

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hypotheses */}
        <HypothesisList
          hypotheses={mockHypotheses}
          scores={scores}
          selectedId={selectedHypothesis?.id}
          onSelect={setSelectedHypothesis}
        />

        {/* Evidence */}
        <EvidenceList
          evidence={mockEvidence}
          selectedId={selectedEvidence?.id}
          onSelect={setSelectedEvidence}
        />
      </div>
    </div>
  );
}
