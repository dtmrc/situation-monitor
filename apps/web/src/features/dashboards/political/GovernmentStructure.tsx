import { Building2 } from 'lucide-react';

import type { OrgNode } from '@/components/charts';
import { OrgChart } from '@/components/charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GovernmentStructureProps {
  data: OrgNode;
  onNodeClick?: (node: OrgNode) => void;
}

export function GovernmentStructure({ data, onNodeClick }: GovernmentStructureProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Government Structure
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full overflow-auto" style={{ height: 'calc(100% - 60px)' }}>
          <OrgChart data={data} onNodeClick={onNodeClick} width={800} height={500} />
        </div>
      </CardContent>
    </Card>
  );
}
