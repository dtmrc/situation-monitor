import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type CogNodeType = 'cog' | 'cc' | 'cr' | 'cv';

export interface CogNode {
  id: string;
  name: string;
  type: CogNodeType;
  children?: CogNode[];
}

interface CogTreeProps {
  data: CogNode;
  onNodeClick?: (node: CogNode) => void;
  selectedId?: string;
}

const typeColors: Record<CogNodeType, string> = {
  cog: '#00ff88',
  cc: '#00d4ff',
  cr: '#ffaa00',
  cv: '#ff3333',
};

const typeLabels: Record<CogNodeType, string> = {
  cog: 'CoG',
  cc: 'CC',
  cr: 'CR',
  cv: 'CV',
};

export function CogTree({ data, onNodeClick, selectedId }: CogTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 600;
    const height = svgRef.current.clientHeight || 400;

    svg.selectAll('*').remove();

    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create hierarchy
    const root = d3.hierarchy(data);
    const treeLayout = d3.tree<CogNode>().size([innerWidth, innerHeight]);
    treeLayout(root as d3.HierarchyNode<CogNode>);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Links
    g.selectAll('.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr(
        'd',
        d3
          .linkVertical<d3.HierarchyLink<CogNode>, d3.HierarchyPointNode<CogNode>>()
          .x((d) => (d as d3.HierarchyPointNode<CogNode>).x)
          .y((d) => (d as d3.HierarchyPointNode<CogNode>).y) as any
      )
      .attr('fill', 'none')
      .attr('stroke', '#2a2a2a')
      .attr('stroke-width', 2);

    // Nodes
    const node = g
      .selectAll('.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d: any) => onNodeClick?.(d.data));

    // Node circles
    node
      .append('circle')
      .attr('r', 24)
      .attr('fill', (d: any) => typeColors[d.data.type as CogNodeType])
      .attr('stroke', (d: any) => (d.data.id === selectedId ? '#fff' : 'transparent'))
      .attr('stroke-width', 3)
      .attr('filter', 'drop-shadow(0 0 6px rgba(0, 0, 0, 0.5))');

    // Type labels inside circles
    node
      .append('text')
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#0a0a0a')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text((d: any) => typeLabels[d.data.type as CogNodeType]);

    // Node name labels
    node
      .append('text')
      .attr('dy', 45)
      .attr('text-anchor', 'middle')
      .attr('fill', '#a3a3a3')
      .attr('font-size', '11px')
      .each(function (d: any) {
        const text = d3.select(this);
        const name = d.data.name;
        // Truncate long names
        if (name.length > 20) {
          text.text(name.slice(0, 18) + '...');
          text.append('title').text(name);
        } else {
          text.text(name);
        }
      });
  }, [data, selectedId, onNodeClick]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>CoG Relationship Map</span>
          <div className="flex items-center gap-3 text-xs">
            {Object.entries(typeLabels).map(([type, label]) => (
              <div key={type} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: typeColors[type as CogNodeType] }}
                />
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <svg ref={svgRef} className="w-full h-full" />
      </CardContent>
    </Card>
  );
}
