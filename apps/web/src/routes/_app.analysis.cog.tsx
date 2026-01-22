import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CogTree,
  CogElementList,
  CogElementDetail,
  CogLinkModal,
  type CogNode,
  type CogElement,
} from '@/features/analysis/cog';

export const Route = createFileRoute('/_app/analysis/cog')({
  component: CogAnalysisPage,
});

// Mock data for Center of Gravity analysis
const mockElements: CogElement[] = [
  {
    id: 'cog-1',
    name: 'Enemy Command & Control',
    type: 'cog',
    description:
      'The adversary\'s ability to coordinate and direct military operations through centralized command structure.',
    priority: 'high',
    linkedIds: ['cc-1', 'cc-2', 'cc-3'],
  },
  {
    id: 'cc-1',
    name: 'Force Projection',
    type: 'cc',
    description: 'Ability to deploy and sustain military forces at strategic distances.',
    priority: 'high',
    linkedIds: ['cr-1', 'cr-2'],
  },
  {
    id: 'cc-2',
    name: 'C2 Network',
    type: 'cc',
    description: 'Secure communications network enabling coordinated operations.',
    priority: 'high',
    linkedIds: ['cr-3', 'cr-4'],
  },
  {
    id: 'cc-3',
    name: 'Intelligence Gathering',
    type: 'cc',
    description: 'Multi-source intelligence collection and analysis capabilities.',
    priority: 'medium',
    linkedIds: ['cr-5'],
  },
  {
    id: 'cr-1',
    name: 'Logistics Network',
    type: 'cr',
    description: 'Supply chain infrastructure for ammunition, fuel, and equipment.',
    priority: 'high',
    linkedIds: ['cv-1'],
  },
  {
    id: 'cr-2',
    name: 'Air Superiority',
    type: 'cr',
    description: 'Control of airspace enabling freedom of movement.',
    priority: 'high',
    linkedIds: ['cv-2'],
  },
  {
    id: 'cr-3',
    name: 'Satellite Communications',
    type: 'cr',
    description: 'Space-based communication infrastructure.',
    priority: 'medium',
    linkedIds: ['cv-3'],
  },
  {
    id: 'cr-4',
    name: 'Ground Relay Stations',
    type: 'cr',
    description: 'Terrestrial communication nodes for redundancy.',
    priority: 'medium',
    linkedIds: ['cv-4'],
  },
  {
    id: 'cr-5',
    name: 'HUMINT Networks',
    type: 'cr',
    description: 'Human intelligence source networks in region.',
    priority: 'medium',
    linkedIds: ['cv-5'],
  },
  {
    id: 'cv-1',
    name: 'Supply Line Chokepoints',
    type: 'cv',
    description: 'Limited routes for logistics create vulnerable chokepoints.',
    priority: 'high',
  },
  {
    id: 'cv-2',
    name: 'Airfield Dependency',
    type: 'cv',
    description: 'Reliance on limited number of forward operating bases.',
    priority: 'high',
  },
  {
    id: 'cv-3',
    name: 'Single Satellite Constellation',
    type: 'cv',
    description: 'Limited redundancy in space-based communications.',
    priority: 'medium',
  },
  {
    id: 'cv-4',
    name: 'Fixed Infrastructure',
    type: 'cv',
    description: 'Relay stations are fixed and can be targeted.',
    priority: 'medium',
  },
  {
    id: 'cv-5',
    name: 'Source Exposure Risk',
    type: 'cv',
    description: 'HUMINT networks vulnerable to counterintelligence.',
    priority: 'low',
  },
];

// Build tree structure from flat elements
function buildCogTree(elements: CogElement[]): CogNode | null {
  const cog = elements.find((e) => e.type === 'cog');
  if (!cog) return null;

  const buildChildren = (parentIds: string[] | undefined, childType: 'cc' | 'cr' | 'cv'): CogNode[] => {
    if (!parentIds) return [];

    return elements
      .filter((e) => e.type === childType && parentIds.includes(e.id))
      .map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        children:
          childType === 'cc'
            ? buildChildren(e.linkedIds, 'cr')
            : childType === 'cr'
              ? buildChildren(e.linkedIds, 'cv')
              : undefined,
      }));
  };

  return {
    id: cog.id,
    name: cog.name,
    type: 'cog',
    children: buildChildren(cog.linkedIds, 'cc'),
  };
}

function CogAnalysisPage() {
  const [perspective, setPerspective] = useState<'friendly' | 'adversary'>('adversary');
  const [selectedElement, setSelectedElement] = useState<CogElement | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  const treeData = buildCogTree(mockElements);

  const handleNodeClick = (node: CogNode) => {
    const element = mockElements.find((e) => e.id === node.id);
    if (element) {
      setSelectedElement(element);
    }
  };

  const handleElementSelect = (element: CogElement) => {
    setSelectedElement(element);
  };

  const handleLink = (element: CogElement) => {
    setSelectedElement(element);
    setLinkModalOpen(true);
  };

  const handleSaveLinks = (sourceId: string, linkedIds: string[]) => {
    // In a real app, this would update the state/backend
    console.log('Saving links:', sourceId, linkedIds);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Center of Gravity Analysis</h1>
          <p className="text-muted-foreground">
            Identify and analyze critical capabilities, requirements, and vulnerabilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={perspective} onValueChange={(v) => setPerspective(v as typeof perspective)}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="adversary">Adversary</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Element
          </Button>
        </div>
      </div>

      {/* CoG Tree Visualization */}
      {treeData && (
        <CogTree
          data={treeData}
          onNodeClick={handleNodeClick}
          selectedId={selectedElement?.id}
        />
      )}

      {/* Element Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Element List */}
        <CogElementList
          elements={mockElements}
          selectedId={selectedElement?.id}
          onSelect={handleElementSelect}
        />

        {/* Element Detail */}
        <CogElementDetail
          element={selectedElement}
          allElements={mockElements}
          onLink={handleLink}
        />
      </div>

      {/* Link Modal */}
      <CogLinkModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        sourceElement={selectedElement}
        availableElements={mockElements}
        onSave={handleSaveLinks}
      />
    </div>
  );
}
