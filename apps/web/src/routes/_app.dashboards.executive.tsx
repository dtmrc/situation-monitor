import { createFileRoute } from '@tanstack/react-router';
import { Clock } from 'lucide-react';
import { useState } from 'react';

import {
  SummaryCards,
  MiniThreatMatrix,
  MiniMap,
  PirList,
  TripwirePanel,
  AssessmentTimeline,
  type SummaryData,
  type ThreatCell,
  type MapMarker,
  type Pir,
  type TripwireAlert,
  type Assessment,
} from '@/features/dashboards/executive';

export const Route = createFileRoute('/_app/dashboards/executive')({
  component: ExecutiveDashboardPage,
});

// Demo data - in production, fetch from API
const mockSummaryData: SummaryData = {
  activeThreats: 7,
  threatsChange: 12,
  pendingPirs: 4,
  activeNais: 12,
  triggeredAlerts: 2,
};

const mockThreatCells: ThreatCell[] = [
  { probability: 4, impact: 5, count: 2 },
  { probability: 3, impact: 4, count: 3 },
  { probability: 3, impact: 3, count: 1 },
  { probability: 2, impact: 2, count: 4 },
  { probability: 1, impact: 3, count: 2 },
];

const mockMarkers: MapMarker[] = [
  { id: '1', name: 'NAI Alpha', lat: 35.6762, lng: 139.6503, type: 'nai', status: 'active' },
  { id: '2', name: 'Threat Zone', lat: 37.5665, lng: 126.978, type: 'threat', status: 'alert' },
  { id: '3', name: 'Asset Base', lat: 51.5074, lng: -0.1278, type: 'asset', status: 'active' },
  { id: '4', name: 'NAI Beta', lat: 48.8566, lng: 2.3522, type: 'nai', status: 'inactive' },
];

const mockPirs: Pir[] = [
  {
    id: '1',
    question: 'What are the primary indicators of potential military escalation in the region?',
    priority: 'critical',
    status: 'pending',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    question: 'How will the upcoming elections affect regional stability?',
    priority: 'high',
    status: 'in_progress',
  },
  {
    id: '3',
    question: 'What economic factors could influence diplomatic relations?',
    priority: 'medium',
    status: 'pending',
  },
  {
    id: '4',
    question: 'Are there indications of cyber operations targeting critical infrastructure?',
    priority: 'high',
    status: 'answered',
  },
];

const mockAlerts: TripwireAlert[] = [
  {
    id: '1',
    name: 'Military Mobilization',
    triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    severity: 'critical',
    status: 'active',
    indicator: 'Troop movement detected near eastern border',
  },
  {
    id: '2',
    name: 'Economic Indicator',
    triggeredAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    severity: 'high',
    status: 'acknowledged',
    indicator: 'Currency devaluation exceeded 5% threshold',
  },
];

const mockAssessments: Assessment[] = [
  {
    id: '1',
    name: 'Q1 PMESII-PT Assessment',
    type: 'pmesii',
    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    status: 'completed',
  },
  {
    id: '2',
    name: 'Monthly Threat Review',
    type: 'threat',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: 'scheduled',
  },
  {
    id: '3',
    name: 'CoG Analysis - Region A',
    type: 'cog',
    date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    status: 'scheduled',
  },
  {
    id: '4',
    name: 'Strategic Assessment',
    type: 'strategic',
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'scheduled',
  },
];

function ExecutiveDashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useState(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Executive Command</h1>
          <p className="text-muted-foreground">Strategic overview and situation awareness</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
          <Clock className="h-4 w-4" />
          {currentTime.toISOString().replace('T', ' ').slice(0, 19)} UTC
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards data={mockSummaryData} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <MiniThreatMatrix threats={mockThreatCells} />
          <PirList pirs={mockPirs} />
        </div>

        {/* Center Column */}
        <div className="lg:col-span-2 space-y-6">
          <MiniMap markers={mockMarkers} />
          <TripwirePanel alerts={mockAlerts} />
          <AssessmentTimeline assessments={mockAssessments} />
        </div>
      </div>
    </div>
  );
}
