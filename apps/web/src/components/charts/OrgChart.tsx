import * as d3 from 'd3';
import { useEffect, useRef, useCallback } from 'react';

export interface OrgNode {
  id: string;
  name: string;
  title?: string;
  children?: OrgNode[];
}

interface OrgChartProps {
  data: OrgNode;
  onNodeClick?: (node: OrgNode) => void;
  width?: number;
  height?: number;
}

export function OrgChart({ data, onNodeClick, width = 800, height = 600 }: OrgChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleNodeClick = useCallback(
    (node: d3.HierarchyPointNode<OrgNode>) => {
      if (onNodeClick) {
        onNodeClick(node.data);
      }
    },
    [onNodeClick]
  );

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 120, bottom: 40, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create hierarchy
    const root = d3.hierarchy(data);
    const treeLayout = d3.tree<OrgNode>().size([innerHeight, innerWidth]);
    const treeData = treeLayout(root);

    // Container with margin
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Zoom behavior
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 2])
        .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
          g.attr('transform', event.transform.toString());
        })
    );

    // Links
    g.selectAll('.link')
      .data(treeData.links())
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-width', 1.5)
      .attr(
        'd',
        d3
          .linkHorizontal<d3.HierarchyPointLink<OrgNode>, d3.HierarchyPointNode<OrgNode>>()
          .x((d) => d.y)
          .y((d) => d.x)
      );

    // Nodes
    const nodes = g
      .selectAll('.node')
      .data(treeData.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (_, d) => handleNodeClick(d));

    // Node background
    nodes
      .append('rect')
      .attr('x', -60)
      .attr('y', -20)
      .attr('width', 120)
      .attr('height', 40)
      .attr('rx', 4)
      .attr('fill', 'hsl(var(--card))')
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-width', 1);

    // Node name
    nodes
      .append('text')
      .attr('dy', -4)
      .attr('text-anchor', 'middle')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .text((d) => d.data.name);

    // Node title
    nodes
      .append('text')
      .attr('dy', 12)
      .attr('text-anchor', 'middle')
      .attr('fill', 'hsl(var(--muted-foreground))')
      .attr('font-size', '10px')
      .text((d) => d.data.title || '');

    // Hover effect
    nodes
      .on('mouseenter', function () {
        d3.select(this).select('rect').attr('stroke', '#00ff88').attr('stroke-width', 2);
      })
      .on('mouseleave', function () {
        d3.select(this).select('rect').attr('stroke', 'hsl(var(--border))').attr('stroke-width', 1);
      });
  }, [data, width, height, handleNodeClick]);

  return <svg ref={svgRef} width={width} height={height} className="bg-background" />;
}
