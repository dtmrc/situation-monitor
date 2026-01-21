import { Network } from 'lucide-react';

import type { NetworkNode, NetworkLink } from '@/components/charts';
import { NetworkGraph } from '@/components/charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AllianceNetworkGraphProps {
  nodes: NetworkNode[];
  links: NetworkLink[];
  onNodeClick?: (node: NetworkNode) => void;
  onLinkClick?: (link: NetworkLink) => void;
}

export function AllianceNetworkGraph({
  nodes,
  links,
  onNodeClick,
  onLinkClick,
}: AllianceNetworkGraphProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Network className="h-4 w-4" />
          Relationship Network
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-60px)]">
        {nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No alliance data available
          </div>
        ) : (
          <NetworkGraph
            nodes={nodes}
            links={links}
            onNodeClick={onNodeClick}
            onLinkClick={onLinkClick}
          />
        )}
      </CardContent>
    </Card>
  );
}
