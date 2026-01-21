import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import type { OrgNode } from '@/components/charts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GovernmentStructure,
  ActorProfile,
  PoliticalEventsTimeline,
  StabilityIndicators,
  type PoliticalActor,
  type PoliticalEvent,
  type StabilityIndicator,
} from '@/features/dashboards/political';

export const Route = createFileRoute('/_app/dashboards/political')({
  component: PoliticalLandscapePage,
});

// Demo data
const mockGovStructure: OrgNode = {
  id: 'president',
  name: 'President',
  title: 'Head of State',
  children: [
    {
      id: 'pm',
      name: 'Prime Minister',
      title: 'Head of Government',
      children: [
        {
          id: 'foreign',
          name: 'Foreign Minister',
          title: 'Ministry of Foreign Affairs',
        },
        {
          id: 'defense',
          name: 'Defense Minister',
          title: 'Ministry of Defense',
        },
        {
          id: 'interior',
          name: 'Interior Minister',
          title: 'Ministry of Interior',
        },
        {
          id: 'finance',
          name: 'Finance Minister',
          title: 'Ministry of Finance',
        },
      ],
    },
    {
      id: 'security',
      name: 'Security Council',
      title: 'National Security',
      children: [
        {
          id: 'intel',
          name: 'Intelligence Director',
          title: 'Intelligence Services',
        },
        {
          id: 'military',
          name: 'Chief of Staff',
          title: 'Armed Forces',
        },
      ],
    },
  ],
};

const mockActors: Record<string, PoliticalActor> = {
  president: {
    id: 'president',
    name: 'John Smith',
    title: 'President',
    party: 'National Unity Party',
    inOfficeSince: new Date('2020-01-15'),
    biography:
      'Former military commander with 20 years of service. Known for centrist policies and focus on national security.',
    affiliations: ['National Unity Party', 'Veterans Association', 'Business Council'],
    keyPositions: ['Commander-in-Chief', 'Chair of Security Council', 'Chief Diplomat'],
    influence: 'high',
  },
  pm: {
    id: 'pm',
    name: 'Maria Garcia',
    title: 'Prime Minister',
    party: 'National Unity Party',
    inOfficeSince: new Date('2022-03-01'),
    biography: 'Economist by training. Previously served as Finance Minister.',
    affiliations: ['National Unity Party', 'Economic Forum'],
    keyPositions: ['Head of Government', 'Economic Policy Lead'],
    influence: 'high',
  },
  defense: {
    id: 'defense',
    name: 'Robert Chen',
    title: 'Defense Minister',
    party: 'National Unity Party',
    inOfficeSince: new Date('2021-06-15'),
    biography: 'Former General with extensive combat experience.',
    affiliations: ['Veterans Association', 'Defense Industry Council'],
    keyPositions: ['Military Oversight', 'Defense Procurement'],
    influence: 'high',
  },
};

const mockEvents: PoliticalEvent[] = [
  {
    id: '1',
    title: 'General Election',
    date: new Date('2020-01-10'),
    type: 'election',
    description: 'National Unity Party wins majority',
  },
  {
    id: '2',
    title: 'Cabinet Reshuffle',
    date: new Date('2022-03-01'),
    type: 'transition',
    description: 'New PM appointed after resignation',
  },
  {
    id: '3',
    title: 'Defense Treaty Signed',
    date: new Date('2023-06-15'),
    type: 'treaty',
    description: 'Regional defense cooperation agreement',
  },
  {
    id: '4',
    title: 'Mass Protests',
    date: new Date('2024-02-20'),
    type: 'protest',
    description: 'Economic reform protests in capital',
  },
  {
    id: '5',
    title: 'Upcoming Election',
    date: new Date('2025-01-15'),
    type: 'election',
    description: 'Scheduled general election',
  },
];

const mockIndicators: StabilityIndicator[] = [
  { name: 'Stability', value: 68, previousValue: 72 },
  { name: 'Freedom', value: 55, previousValue: 52 },
  { name: 'Corruption', value: 42, previousValue: 45 },
  { name: 'Rule of Law', value: 61, previousValue: 58 },
];

const regions = [
  { id: 'country-a', name: 'Country A' },
  { id: 'country-b', name: 'Country B' },
  { id: 'country-c', name: 'Country C' },
];

function PoliticalLandscapePage() {
  const [selectedRegion, setSelectedRegion] = useState(regions[0]?.id ?? 'country-a');
  const [selectedActor, setSelectedActor] = useState<PoliticalActor | null>(null);

  const handleNodeClick = (node: OrgNode) => {
    const actor = mockActors[node.id];
    if (actor) {
      setSelectedActor(actor);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Political Landscape</h1>
          <p className="text-muted-foreground">Government structure and political dynamics</p>
        </div>
        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {regions.map((region) => (
              <SelectItem key={region.id} value={region.id}>
                {region.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Government Structure - 2 columns */}
        <div className="lg:col-span-2">
          <GovernmentStructure data={mockGovStructure} onNodeClick={handleNodeClick} />
        </div>

        {/* Actor Profile & Events */}
        <div className="space-y-6">
          <ActorProfile actor={selectedActor} onClose={() => setSelectedActor(null)} />
          <PoliticalEventsTimeline events={mockEvents} />
        </div>
      </div>

      {/* Stability Indicators */}
      <StabilityIndicators indicators={mockIndicators} />
    </div>
  );
}
