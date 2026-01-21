import { createFileRoute } from '@tanstack/react-router';
import { Filter } from 'lucide-react';
import { useState } from 'react';

import type { NetworkNode, NetworkLink } from '@/components/charts';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AllianceNetworkGraph,
  RelationshipMatrix,
  RelationshipDetailPanel,
  type RelationshipDetail,
  type Entity,
  type Relationship,
} from '@/features/dashboards/alliance';

export const Route = createFileRoute('/_app/dashboards/alliances')({
  component: AllianceMappingPage,
});

// Demo data
const mockNodes: NetworkNode[] = [
  { id: 'us', name: 'United States', type: 'nation' },
  { id: 'uk', name: 'United Kingdom', type: 'nation' },
  { id: 'de', name: 'Germany', type: 'nation' },
  { id: 'fr', name: 'France', type: 'nation' },
  { id: 'jp', name: 'Japan', type: 'nation' },
  { id: 'nato', name: 'NATO', type: 'organization' },
  { id: 'eu', name: 'European Union', type: 'organization' },
  { id: 'cn', name: 'China', type: 'nation' },
  { id: 'ru', name: 'Russia', type: 'nation' },
];

const mockLinks: NetworkLink[] = [
  { source: 'us', target: 'uk', type: 'alliance', strength: 5 },
  { source: 'us', target: 'jp', type: 'alliance', strength: 4 },
  { source: 'us', target: 'de', type: 'alliance', strength: 4 },
  { source: 'us', target: 'nato', type: 'alliance', strength: 5 },
  { source: 'uk', target: 'nato', type: 'alliance', strength: 5 },
  { source: 'de', target: 'nato', type: 'alliance', strength: 5 },
  { source: 'fr', target: 'nato', type: 'alliance', strength: 4 },
  { source: 'de', target: 'eu', type: 'alliance', strength: 5 },
  { source: 'fr', target: 'eu', type: 'alliance', strength: 5 },
  { source: 'us', target: 'cn', type: 'trade', strength: 4 },
  { source: 'de', target: 'cn', type: 'trade', strength: 3 },
  { source: 'us', target: 'ru', type: 'rivalry', strength: 4 },
  { source: 'us', target: 'cn', type: 'rivalry', strength: 3 },
  { source: 'cn', target: 'ru', type: 'alliance', strength: 3 },
  { source: 'jp', target: 'cn', type: 'rivalry', strength: 2 },
];

const mockEntities: Entity[] = mockNodes.map((n) => ({
  id: n.id,
  name: n.name,
  shortName: n.name.slice(0, 3).toUpperCase(),
}));

const mockMatrixRelationships: Relationship[] = mockLinks.map((l) => ({
  sourceId: l.source,
  targetId: l.target,
  type: l.type,
  strength: l.strength,
}));

const mockRelationshipDetails: Record<string, RelationshipDetail> = {
  'us-uk': {
    id: 'us-uk',
    sourceEntity: { id: 'us', name: 'United States', type: 'nation' },
    targetEntity: { id: 'uk', name: 'United Kingdom', type: 'nation' },
    type: 'alliance',
    strength: 5,
    trend: 'stable',
    establishedDate: new Date('1941-08-14'),
    description:
      'The "Special Relationship" - close political, diplomatic, cultural, economic, military, and historical relations.',
    keyAgreements: [
      'Atlantic Charter (1941)',
      'NATO founding member',
      'Five Eyes intelligence alliance',
      'AUKUS pact (2021)',
    ],
    recentEvents: [
      { date: new Date('2024-01-15'), description: 'Joint military exercises in Baltic Sea' },
      { date: new Date('2023-11-20'), description: 'Renewed defense cooperation agreement' },
    ],
  },
  'us-cn': {
    id: 'us-cn',
    sourceEntity: { id: 'us', name: 'United States', type: 'nation' },
    targetEntity: { id: 'cn', name: 'China', type: 'nation' },
    type: 'rivalry',
    strength: 3,
    trend: 'deteriorating',
    description:
      'Complex relationship characterized by economic interdependence and strategic competition.',
    keyAgreements: ['Phase One Trade Deal (2020)', 'Climate cooperation framework'],
    recentEvents: [
      { date: new Date('2024-02-10'), description: 'New tariffs announced on tech imports' },
      { date: new Date('2024-01-05'), description: 'Diplomatic tensions over Taiwan' },
    ],
  },
};

function AllianceMappingPage() {
  const [selectedRelationship, setSelectedRelationship] = useState<RelationshipDetail | null>(null);
  const [filters, setFilters] = useState({
    alliance: true,
    trade: true,
    rivalry: true,
    dependency: true,
    neutral: true,
  });

  const handleNodeClick = (node: NetworkNode) => {
    // Could show actor details
    console.log('Node clicked:', node);
  };

  const handleLinkClick = (link: NetworkLink) => {
    const key = `${link.source}-${link.target}`;
    const detail =
      mockRelationshipDetails[key] || mockRelationshipDetails[`${link.target}-${link.source}`];
    if (detail) {
      setSelectedRelationship(detail);
    }
  };

  const handleMatrixCellClick = (sourceId: string, targetId: string) => {
    const key = `${sourceId}-${targetId}`;
    const detail =
      mockRelationshipDetails[key] || mockRelationshipDetails[`${targetId}-${sourceId}`];
    if (detail) {
      setSelectedRelationship(detail);
    }
  };

  // Filter links based on type
  const filteredLinks = mockLinks.filter((link) => filters[link.type]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alliance Mapping</h1>
          <p className="text-muted-foreground">
            Relationships between actors, organizations, and nations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={filters.alliance}
                onCheckedChange={(checked) => setFilters((f) => ({ ...f, alliance: checked }))}
              >
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-tactical-green" />
                  Alliance
                </span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.trade}
                onCheckedChange={(checked) => setFilters((f) => ({ ...f, trade: checked }))}
              >
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-tactical-blue" />
                  Trade
                </span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.rivalry}
                onCheckedChange={(checked) => setFilters((f) => ({ ...f, rivalry: checked }))}
              >
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-tactical-red" />
                  Rivalry
                </span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.dependency}
                onCheckedChange={(checked) => setFilters((f) => ({ ...f, dependency: checked }))}
              >
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-tactical-amber" />
                  Dependency
                </span>
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Network Graph */}
      <div className="h-[500px]">
        <AllianceNetworkGraph
          nodes={mockNodes}
          links={filteredLinks}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
        />
      </div>

      {/* Matrix and Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RelationshipMatrix
          entities={mockEntities}
          relationships={mockMatrixRelationships.filter((r) => filters[r.type])}
          onCellClick={handleMatrixCellClick}
        />
        <RelationshipDetailPanel
          relationship={selectedRelationship}
          onClose={() => setSelectedRelationship(null)}
        />
      </div>
    </div>
  );
}
