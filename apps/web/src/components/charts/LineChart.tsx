import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

import { cn } from '@/lib/utils';

export interface DataPoint {
  x: number | Date;
  y: number;
}

export interface LineSeries {
  id: string;
  name: string;
  data: DataPoint[];
  color?: string;
}

interface LineChartProps {
  series: LineSeries[];
  width?: number;
  height?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
}

const DEFAULT_COLORS = [
  '#00ff88',
  '#00d4ff',
  '#ffaa00',
  '#ff3333',
  '#a855f7',
  '#3b82f6',
];

export function LineChart({
  series,
  width = 600,
  height = 300,
  xAxisLabel,
  yAxisLabel,
  showGrid = true,
  showLegend = true,
  className,
}: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || series.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Flatten all data points for scales
    const allData = series.flatMap((s) => s.data);
    const allX = allData.map((d) => (d.x instanceof Date ? d.x.getTime() : (d.x as number)));
    const allY = allData.map((d) => d.y);

    // Calculate extents manually to avoid d3.extent typing issues
    const xMin = Math.min(...allX);
    const xMax = Math.max(...allX);
    const yMin = Math.min(0, Math.min(...allY));
    const yMax = Math.max(...allY) * 1.1;

    // X Scale (always linear for simplicity)
    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerWidth]);

    // Y Scale
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]);

    // Grid
    if (showGrid) {
      g.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(
          d3
            .axisLeft(yScale)
            .tickSize(-innerWidth)
            .tickFormat(() => '')
        );
    }

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .attr('class', 'text-muted-foreground')
      .call(d3.axisBottom(xScale).ticks(6))
      .selectAll('text')
      .attr('fill', 'currentColor')
      .attr('font-size', '10px');

    // Y Axis
    g.append('g')
      .attr('class', 'text-muted-foreground')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .attr('fill', 'currentColor')
      .attr('font-size', '10px');

    // Axis labels
    if (xAxisLabel) {
      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 35)
        .attr('text-anchor', 'middle')
        .attr('fill', 'currentColor')
        .attr('font-size', '11px')
        .attr('class', 'text-muted-foreground')
        .text(xAxisLabel);
    }

    if (yAxisLabel) {
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -40)
        .attr('text-anchor', 'middle')
        .attr('fill', 'currentColor')
        .attr('font-size', '11px')
        .attr('class', 'text-muted-foreground')
        .text(yAxisLabel);
    }

    // Line generator
    const line = d3
      .line<DataPoint>()
      .x((d) => xScale(d.x instanceof Date ? d.x.getTime() : (d.x as number)))
      .y((d) => yScale(d.y))
      .curve(d3.curveMonotoneX);

    // Draw lines and dots
    series.forEach((s, i) => {
      const color = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];

      // Draw line
      g.append('path')
        .datum(s.data)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('d', line);

      // Draw dots using explicit data iteration
      s.data.forEach((d) => {
        g.append('circle')
          .attr('cx', xScale(d.x instanceof Date ? d.x.getTime() : (d.x as number)))
          .attr('cy', yScale(d.y))
          .attr('r', 3)
          .attr('fill', color)
          .attr('stroke', 'var(--background)')
          .attr('stroke-width', 1);
      });
    });

    // Legend
    if (showLegend && series.length > 1) {
      const legend = g
        .append('g')
        .attr('transform', `translate(${innerWidth - 100}, 0)`);

      series.forEach((s, i) => {
        const color = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        const ly = i * 16;

        legend
          .append('rect')
          .attr('x', 0)
          .attr('y', ly)
          .attr('width', 12)
          .attr('height', 3)
          .attr('fill', color);

        legend
          .append('text')
          .attr('x', 16)
          .attr('y', ly + 3)
          .attr('font-size', '10px')
          .attr('fill', 'currentColor')
          .attr('class', 'text-muted-foreground')
          .text(s.name);
      });
    }
  }, [series, width, height, xAxisLabel, yAxisLabel, showGrid, showLegend]);

  return (
    <div className={cn('overflow-hidden', className)}>
      <svg ref={svgRef} width={width} height={height} className="text-foreground" />
    </div>
  );
}
