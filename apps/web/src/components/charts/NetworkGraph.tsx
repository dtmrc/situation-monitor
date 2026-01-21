import * as d3 from 'd3';
import { useEffect, useRef, useCallback } from 'react';

export interface NetworkNode {
  id: string;
  name: string;
  type: 'nation' | 'organization' | 'actor';
  group?: string;
}

export interface NetworkLink {
  source: string;
  target: string;
  type: 'alliance' | 'trade' | 'rivalry' | 'dependency';
  strength: number;
}

interface NetworkGraphProps {
  nodes: NetworkNode[];
  links: NetworkLink[];
  onNodeClick?: (node: NetworkNode) => void;
  onLinkClick?: (link: NetworkLink) => void;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'nation' | 'organization' | 'actor';
  group?: string;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  type: 'alliance' | 'trade' | 'rivalry' | 'dependency';
  strength: number;
}

export function NetworkGraph({ nodes, links, onNodeClick, onLinkClick }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

  const linkColors: Record<NetworkLink['type'], string> = {
    alliance: '#00ff88',
    trade: '#00d4ff',
    rivalry: '#ff3333',
    dependency: '#ffaa00',
  };

  const nodeColors: Record<NetworkNode['type'], string> = {
    nation: '#00d4ff',
    organization: '#a855f7',
    actor: '#00ff88',
  };

  const handleNodeClick = useCallback(
    (node: SimNode) => {
      if (onNodeClick) {
        onNodeClick({
          id: node.id,
          name: node.name,
          type: node.type,
          group: node.group,
        });
      }
    },
    [onNodeClick]
  );

  const handleLinkClick = useCallback(
    (link: SimLink) => {
      if (onLinkClick) {
        const sourceId = typeof link.source === 'object' ? link.source.id : String(link.source);
        const targetId = typeof link.target === 'object' ? link.target.id : String(link.target);
        onLinkClick({
          source: sourceId,
          target: targetId,
          type: link.type,
          strength: link.strength,
        });
      }
    },
    [onLinkClick]
  );

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 600;
    const height = svgRef.current.clientHeight || 400;

    // Clear previous
    svg.selectAll('*').remove();

    // Create node and link data copies
    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const simLinks: SimLink[] = links.map((l) => ({
      source: l.source,
      target: l.target,
      type: l.type,
      strength: l.strength,
    }));

    // Create simulation
    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(100)
          .strength((d) => d.strength * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    simulationRef.current = simulation;

    // Container for zoom
    const g = svg.append('g');

    // Zoom behavior
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
          g.attr('transform', event.transform.toString());
        })
    );

    // Links
    const link = g
      .append('g')
      .selectAll<SVGLineElement, SimLink>('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', (d) => linkColors[d.type])
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.sqrt(d.strength) * 2)
      .attr('stroke-dasharray', (d) =>
        d.type === 'trade' ? '5,5' : d.type === 'dependency' ? '2,2' : 'none'
      )
      .style('cursor', 'pointer')
      .on('click', (_, d) => handleLinkClick(d));

    // Nodes
    const node = g
      .append('g')
      .selectAll<SVGCircleElement, SimNode>('circle')
      .data(simNodes)
      .join('circle')
      .attr('r', 12)
      .attr('fill', (d) => nodeColors[d.type])
      .attr('stroke', '#0a0a0a')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (_, d) => handleNodeClick(d))
      .call(
        d3
          .drag<SVGCircleElement, SimNode>()
          .on('start', (event: d3.D3DragEvent<SVGCircleElement, SimNode, SimNode>, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event: d3.D3DragEvent<SVGCircleElement, SimNode, SimNode>, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event: d3.D3DragEvent<SVGCircleElement, SimNode, SimNode>, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Labels
    const labels = g
      .append('g')
      .selectAll<SVGTextElement, SimNode>('text')
      .data(simNodes)
      .join('text')
      .text((d) => d.name)
      .attr('font-size', '10px')
      .attr('fill', '#a3a3a3')
      .attr('text-anchor', 'middle')
      .attr('dy', 25);

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0);

      node.attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0);

      labels.attr('x', (d) => d.x ?? 0).attr('y', (d) => d.y ?? 0);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, handleNodeClick, handleLinkClick, linkColors, nodeColors]);

  return (
    <svg ref={svgRef} className="w-full h-full bg-background" style={{ minHeight: '400px' }} />
  );
}
