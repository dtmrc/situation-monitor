# Phase 4: Strategic Dashboards

## Overview

**Purpose:** Build the strategic-level dashboards that provide executive summaries, geopolitical context, alliance mapping, scenario comparison, and strategic synthesis.

**Dependencies:** Phase 3 (Frontend Foundation)

**Parallel Execution:** Can run concurrently with Phases 5 and 6 after Phase 3 completes.

**Deliverables:**
- F.1 Executive Command Dashboard
- F.14 Political Landscape Dashboard
- F.15 Alliance Mapping Dashboard
- F.16 Scenario Comparison Dashboard
- F.17 Strategic Synthesis Dashboard

---

## Dashboard Specifications

### F.1: Executive Command Dashboard

**Purpose:** One-glance strategic overview for decision-makers. Consolidates critical information from all other dashboards.

**Layout:** Full-screen grid with 6 major panels

```
┌─────────────────────────────────────────────────────────────────┐
│ EXECUTIVE COMMAND                               [UTC] [ALERTS]  │
├─────────────────┬─────────────────┬─────────────────────────────┤
│                 │                 │                             │
│  SITUATION      │  THREAT         │     GEOSPATIAL OVERVIEW     │
│  SUMMARY        │  MATRIX         │     (Mini-map with          │
│  (Key metrics   │  (Heat map      │      hotspots)              │
│   & status)     │   overview)     │                             │
│                 │                 │                             │
├─────────────────┼─────────────────┼─────────────────────────────┤
│                 │                 │                             │
│  ACTIVE PIRs    │  TRIPWIRE       │     ASSESSMENT TIMELINE     │
│  (Priority      │  STATUS         │     (Gantt-style view       │
│   questions)    │  (Alert panel)  │      of assessments)        │
│                 │                 │                             │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

**Components:**

| Component | Description | Data Source |
|-----------|-------------|-------------|
| Situation Summary | Key metrics cards (active threats, PIRs pending, NAIs monitored) | Aggregated from all modules |
| Threat Matrix Mini | Condensed 5x5 heat map showing threat distribution | Threat assessments |
| Geospatial Overview | Interactive mini-map with NAI markers and activity heat | NAIs, observations |
| Active PIRs | List of top-priority intelligence requirements | PIRs table |
| Tripwire Status | Active alerts and recently triggered tripwires | Alerts table |
| Assessment Timeline | Horizontal timeline of assessment dates and deadlines | Assessments table |

---

### F.14: Political Landscape Dashboard

**Purpose:** Visualize government structures, political actors, and power dynamics.

**Layout:** Three-panel with org chart focus

```
┌─────────────────────────────────────────────────────────────────┐
│ POLITICAL LANDSCAPE                           [Region Selector] │
├─────────────────────────────────────┬───────────────────────────┤
│                                     │                           │
│                                     │   ACTOR PROFILES          │
│   GOVERNMENT STRUCTURE              │   (Selected actor         │
│   (Interactive org chart            │    details, history,      │
│    with hierarchy)                  │    affiliations)          │
│                                     │                           │
│                                     ├───────────────────────────┤
│                                     │                           │
│                                     │   POLITICAL EVENTS        │
│                                     │   (Timeline of key        │
│                                     │    political events)      │
│                                     │                           │
├─────────────────────────────────────┴───────────────────────────┤
│                    POLITICAL STABILITY INDICATORS               │
│    (Gauge charts: stability index, corruption, freedom, etc.)   │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Description | Visualization |
|-----------|-------------|---------------|
| Government Structure | Interactive org chart showing hierarchy | D3.js tree/hierarchy layout |
| Actor Profiles | Detailed cards for political figures | Card component with tabs |
| Political Events | Timeline of elections, coups, transitions | D3.js timeline |
| Stability Indicators | Gauge charts for key indices | Radial gauge components |

---

### F.15: Alliance Mapping Dashboard

**Purpose:** Visualize relationships between actors, organizations, and nations.

**Layout:** Network-graph focused with details panel

```
┌─────────────────────────────────────────────────────────────────┐
│ ALLIANCE MAPPING                              [Filter] [Layout] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                                                 │
│              RELATIONSHIP NETWORK GRAPH                         │
│              (Force-directed graph showing                      │
│               alliances, rivalries, dependencies)               │
│                                                                 │
│                                                                 │
├─────────────────────────────────┬───────────────────────────────┤
│                                 │                               │
│   RELATIONSHIP MATRIX           │   SELECTED RELATIONSHIP       │
│   (Adjacency matrix showing     │   (Details on selected        │
│    relationship strengths)      │    connection/actor)          │
│                                 │                               │
└─────────────────────────────────┴───────────────────────────────┘
```

**Edge Types:**
- **Alliance** (green, solid) - Formal alliance or partnership
- **Trade** (blue, dashed) - Economic relationship
- **Rivalry** (red, solid) - Adversarial relationship
- **Dependency** (amber, dotted) - One-way dependency

---

### F.16: Scenario Comparison Dashboard

**Purpose:** Compare multiple scenarios/courses of action side-by-side.

**Layout:** Multi-column comparison with shared metrics

```
┌─────────────────────────────────────────────────────────────────┐
│ SCENARIO COMPARISON                    [+ Add Scenario] [Export]│
├───────────────────┬───────────────────┬─────────────────────────┤
│                   │                   │                         │
│   SCENARIO A      │   SCENARIO B      │   SCENARIO C            │
│   "Status Quo"    │   "Escalation"    │   "De-escalation"       │
│                   │                   │                         │
│   Probability: 60%│   Probability: 25%│   Probability: 15%      │
│                   │                   │                         │
├───────────────────┼───────────────────┼─────────────────────────┤
│   Key Indicators  │   Key Indicators  │   Key Indicators        │
│   • Indicator 1   │   • Indicator 1   │   • Indicator 1         │
│   • Indicator 2   │   • Indicator 2   │   • Indicator 2         │
│                   │                   │                         │
├───────────────────┼───────────────────┼─────────────────────────┤
│   Impact Analysis │   Impact Analysis │   Impact Analysis       │
│   [Spider Chart]  │   [Spider Chart]  │   [Spider Chart]        │
│                   │                   │                         │
├───────────────────┴───────────────────┴─────────────────────────┤
│                    COMPARATIVE METRICS                          │
│   [Bar chart comparing key metrics across all scenarios]        │
└─────────────────────────────────────────────────────────────────┘
```

---

### F.17: Strategic Synthesis Dashboard

**Purpose:** Integrate findings from all analysis modules into actionable strategic assessments.

**Layout:** Document-centric with supporting visualizations

```
┌─────────────────────────────────────────────────────────────────┐
│ STRATEGIC SYNTHESIS                          [Generate] [Export]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   EXECUTIVE SUMMARY (AI-assisted synthesis)                     │
│   ──────────────────────────────────────────                    │
│   [Rich text editor with key findings, generated from           │
│    PMESII-PT, threats, CoG analysis, and PIR answers]           │
│                                                                 │
├───────────────────────────────────┬─────────────────────────────┤
│                                   │                             │
│   KEY FINDINGS                    │   RECOMMENDED ACTIONS       │
│   • Finding 1 (from PMESII)       │   □ Action item 1           │
│   • Finding 2 (from Threats)      │   □ Action item 2           │
│   • Finding 3 (from CoG)          │   □ Action item 3           │
│                                   │                             │
├───────────────────────────────────┼─────────────────────────────┤
│                                   │                             │
│   RISK SUMMARY                    │   CONFIDENCE ASSESSMENT     │
│   [Condensed risk matrix]         │   [Sources, gaps, caveats]  │
│                                   │                             │
└───────────────────────────────────┴─────────────────────────────┘
```

---

## Implementation Tasks

| ID | Task | Agent | Priority | Dependencies |
|----|------|-------|----------|--------------|
| 4.1 | Create dashboard page routing structure | `frontend-developer-designer` | Critical | Phase 3 |
| 4.2 | Build Executive Command layout | `ops-center-ui-expert` | Critical | 4.1 |
| 4.3 | Create Situation Summary cards | `ops-center-ui-expert` | High | 4.2 |
| 4.4 | Build mini threat heat map | `tactical-visualization-expert` | High | 4.2 |
| 4.5 | Create mini geospatial map component | `tactical-visualization-expert` | High | 4.2 |
| 4.6 | Build PIR list component | `frontend-developer-designer` | High | 4.2 |
| 4.7 | Create tripwire alert panel | `ops-center-ui-expert` | High | 4.2 |
| 4.8 | Build assessment timeline (Gantt) | `tactical-visualization-expert` | Medium | 4.2 |
| 4.9 | Build Political Landscape layout | `ops-center-ui-expert` | High | 4.1 |
| 4.10 | Create org chart visualization | `tactical-visualization-expert` | High | 4.9 |
| 4.11 | Build actor profile cards | `frontend-developer-designer` | Medium | 4.9 |
| 4.12 | Create political events timeline | `tactical-visualization-expert` | Medium | 4.9 |
| 4.13 | Build stability gauge charts | `tactical-visualization-expert` | Medium | 4.9 |
| 4.14 | Build Alliance Mapping layout | `ops-center-ui-expert` | High | 4.1 |
| 4.15 | Create force-directed network graph | `tactical-visualization-expert` | Critical | 4.14 |
| 4.16 | Build relationship matrix | `tactical-visualization-expert` | Medium | 4.14 |
| 4.17 | Create relationship detail panel | `frontend-developer-designer` | Medium | 4.14 |
| 4.18 | Build Scenario Comparison layout | `ops-center-ui-expert` | High | 4.1 |
| 4.19 | Create scenario cards | `frontend-developer-designer` | High | 4.18 |
| 4.20 | Build spider/radar charts | `tactical-visualization-expert` | High | 4.18 |
| 4.21 | Create comparative bar charts | `tactical-visualization-expert` | Medium | 4.18 |
| 4.22 | Build Strategic Synthesis layout | `ops-center-ui-expert` | High | 4.1 |
| 4.23 | Create synthesis text editor | `frontend-developer-designer` | High | 4.22 |
| 4.24 | Build key findings list | `frontend-developer-designer` | Medium | 4.22 |
| 4.25 | Create action items checklist | `frontend-developer-designer` | Medium | 4.22 |
| 4.26 | Implement AI synthesis generation | `intelligence-analysis-expert` | High | 4.22, Phase 8 |

---

## Detailed Component Specifications

### Executive Summary Cards

**File: `apps/web/src/features/dashboards/executive/SummaryCards.tsx`**
```typescript
import { Shield, Target, AlertTriangle, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'warning' | 'critical';
}

function MetricCard({ title, value, change, icon: Icon, variant = 'default' }: MetricCardProps) {
  const variantStyles = {
    default: 'border-border',
    warning: 'border-tactical-amber/50 glow-amber',
    critical: 'border-tactical-red/50 glow-red',
  };

  return (
    <Card className={cn('bg-card', variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-mono">{value}</div>
        {change !== undefined && (
          <p className={cn(
            'text-xs mt-1',
            change > 0 ? 'text-tactical-red' : 'text-tactical-green'
          )}>
            {change > 0 ? '+' : ''}{change}% from last assessment
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface SummaryCardsProps {
  data: {
    activeThreats: number;
    threatsChange: number;
    pendingPirs: number;
    activeNais: number;
    triggeredAlerts: number;
  };
}

export function SummaryCards({ data }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Active Threats"
        value={data.activeThreats}
        change={data.threatsChange}
        icon={Shield}
        variant={data.activeThreats > 10 ? 'critical' : 'default'}
      />
      <MetricCard
        title="Pending PIRs"
        value={data.pendingPirs}
        icon={Target}
        variant={data.pendingPirs > 5 ? 'warning' : 'default'}
      />
      <MetricCard
        title="Active NAIs"
        value={data.activeNais}
        icon={Radio}
      />
      <MetricCard
        title="Triggered Alerts"
        value={data.triggeredAlerts}
        icon={AlertTriangle}
        variant={data.triggeredAlerts > 0 ? 'critical' : 'default'}
      />
    </div>
  );
}
```

### Mini Threat Heat Map

**File: `apps/web/src/features/dashboards/executive/MiniThreatMatrix.tsx`**
```typescript
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ThreatCell {
  probability: number; // 1-5
  impact: number;      // 1-5
  count: number;
}

interface MiniThreatMatrixProps {
  threats: ThreatCell[];
}

export function MiniThreatMatrix({ threats }: MiniThreatMatrixProps) {
  // Build 5x5 matrix
  const matrix = useMemo(() => {
    const grid: number[][] = Array(5).fill(null).map(() => Array(5).fill(0));
    threats.forEach(({ probability, impact, count }) => {
      grid[5 - probability][impact - 1] = count;
    });
    return grid;
  }, [threats]);

  const getCellColor = (row: number, col: number, value: number) => {
    // Risk = row * col (higher = more severe)
    const risk = (5 - row) * (col + 1);
    if (value === 0) return 'bg-card';
    if (risk >= 20) return 'bg-tactical-red/80';
    if (risk >= 12) return 'bg-tactical-amber/80';
    if (risk >= 6) return 'bg-tactical-amber/40';
    return 'bg-tactical-green/40';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Threat Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-0.5">
          {matrix.map((row, rowIdx) =>
            row.map((value, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={cn(
                  'aspect-square flex items-center justify-center text-xs font-mono rounded-sm',
                  getCellColor(rowIdx, colIdx, value),
                  value > 0 && 'text-foreground font-medium'
                )}
              >
                {value > 0 ? value : ''}
              </div>
            ))
          )}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Impact →</span>
          <span>↑ Probability</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Force-Directed Network Graph

**File: `apps/web/src/features/dashboards/alliance/NetworkGraph.tsx`**
```typescript
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  name: string;
  type: 'nation' | 'organization' | 'actor';
  group?: string;
}

interface Link {
  source: string;
  target: string;
  type: 'alliance' | 'trade' | 'rivalry' | 'dependency';
  strength: number;
}

interface NetworkGraphProps {
  nodes: Node[];
  links: Link[];
  onNodeClick?: (node: Node) => void;
  onLinkClick?: (link: Link) => void;
}

export function NetworkGraph({ nodes, links, onNodeClick, onLinkClick }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous
    svg.selectAll('*').remove();

    // Color scales
    const linkColors: Record<Link['type'], string> = {
      alliance: '#00ff88',
      trade: '#00d4ff',
      rivalry: '#ff3333',
      dependency: '#ffaa00',
    };

    const nodeColors: Record<Node['type'], string> = {
      nation: '#00d4ff',
      organization: '#a855f7',
      actor: '#00ff88',
    };

    // Create simulation
    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
        .distance(100)
        .strength((d: any) => d.strength * 0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Container for zoom
    const g = svg.append('g');

    // Zoom behavior
    svg.call(d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      }) as any);

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => linkColors[d.type])
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.strength) * 2)
      .attr('stroke-dasharray', d =>
        d.type === 'trade' ? '5,5' :
        d.type === 'dependency' ? '2,2' : 'none')
      .style('cursor', 'pointer')
      .on('click', (event, d) => onLinkClick?.(d));

    // Nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 12)
      .attr('fill', d => nodeColors[d.type])
      .attr('stroke', '#0a0a0a')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => onNodeClick?.(d as Node))
      .call(d3.drag<SVGCircleElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Labels
    const labels = g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text(d => d.name)
      .attr('font-size', '10px')
      .attr('fill', '#a3a3a3')
      .attr('text-anchor', 'middle')
      .attr('dy', 25);

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      labels
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links, onNodeClick, onLinkClick]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full bg-background"
      style={{ minHeight: '400px' }}
    />
  );
}
```

### Spider/Radar Chart for Scenarios

**File: `apps/web/src/features/dashboards/scenario/SpiderChart.tsx`**
```typescript
import { useMemo } from 'react';

interface SpiderChartProps {
  data: {
    label: string;
    value: number; // 0-100
  }[];
  color?: string;
  size?: number;
}

export function SpiderChart({ data, color = '#00ff88', size = 200 }: SpiderChartProps) {
  const { points, labels, gridLines } = useMemo(() => {
    const cx = size / 2;
    const cy = size / 2;
    const radius = (size / 2) - 30;
    const angleSlice = (Math.PI * 2) / data.length;

    // Data points
    const points = data.map((d, i) => {
      const r = (d.value / 100) * radius;
      const angle = angleSlice * i - Math.PI / 2;
      return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });

    // Axis labels
    const labels = data.map((d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const labelRadius = radius + 20;
      return {
        x: cx + labelRadius * Math.cos(angle),
        y: cy + labelRadius * Math.sin(angle),
        text: d.label,
      };
    });

    // Grid circles (20%, 40%, 60%, 80%, 100%)
    const gridLines = [20, 40, 60, 80, 100].map(pct => ({
      radius: (pct / 100) * radius,
    }));

    return { points, labels, gridLines };
  }, [data, size]);

  const pathD = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ') + ' Z';

  return (
    <svg width={size} height={size} className="overflow-visible">
      {/* Grid circles */}
      {gridLines.map((g, i) => (
        <circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={g.radius}
          fill="none"
          stroke="#2a2a2a"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {data.map((_, i) => {
        const angle = ((Math.PI * 2) / data.length) * i - Math.PI / 2;
        const radius = (size / 2) - 30;
        return (
          <line
            key={i}
            x1={size / 2}
            y1={size / 2}
            x2={size / 2 + radius * Math.cos(angle)}
            y2={size / 2 + radius * Math.sin(angle)}
            stroke="#2a2a2a"
            strokeWidth={1}
          />
        );
      })}

      {/* Data area */}
      <path
        d={pathD}
        fill={color}
        fillOpacity={0.2}
        stroke={color}
        strokeWidth={2}
      />

      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill={color}
        />
      ))}

      {/* Labels */}
      {labels.map((l, i) => (
        <text
          key={i}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs fill-muted-foreground"
        >
          {l.text}
        </text>
      ))}
    </svg>
  );
}
```

---

## API Endpoints Required

### Executive Dashboard Data
```
GET /api/dashboards/executive
Response: {
  summary: {
    activeThreats: number;
    threatsChange: number;
    pendingPirs: number;
    activeNais: number;
    triggeredAlerts: number;
  };
  threatDistribution: ThreatCell[];
  recentAlerts: Alert[];
  upcomingDeadlines: Deadline[];
}
```

### Alliance Network Data
```
GET /api/projects/:projectId/alliances
Response: {
  nodes: Node[];
  links: Link[];
}

POST /api/projects/:projectId/alliances/relationships
Body: { sourceId, targetId, type, strength }

DELETE /api/alliances/relationships/:id
```

### Scenarios
```
GET /api/assessments/:assessmentId/scenarios
POST /api/assessments/:assessmentId/scenarios
PATCH /api/scenarios/:id
DELETE /api/scenarios/:id
```

---

## Acceptance Criteria

- [ ] Executive Command shows real-time aggregated metrics
- [ ] Mini threat matrix accurately reflects threat distribution
- [ ] Political org chart is interactive and navigable
- [ ] Alliance network graph supports zoom/pan/drag
- [ ] Scenario comparison supports 2-4 scenarios side-by-side
- [ ] Spider charts render correctly for scenario metrics
- [ ] Strategic synthesis generates AI-assisted summaries
- [ ] All dashboards are responsive
- [ ] Dark theme styling consistent across all dashboards

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/web/src/routes/_app.dashboards.executive.tsx` | Executive Command page |
| `apps/web/src/routes/_app.dashboards.political.tsx` | Political Landscape page |
| `apps/web/src/routes/_app.dashboards.alliances.tsx` | Alliance Mapping page |
| `apps/web/src/routes/_app.dashboards.scenarios.tsx` | Scenario Comparison page |
| `apps/web/src/routes/_app.dashboards.synthesis.tsx` | Strategic Synthesis page |
| `apps/web/src/features/dashboards/executive/` | Executive dashboard components |
| `apps/web/src/features/dashboards/political/` | Political dashboard components |
| `apps/web/src/features/dashboards/alliance/` | Alliance dashboard components |
| `apps/web/src/features/dashboards/scenario/` | Scenario dashboard components |
| `apps/web/src/features/dashboards/synthesis/` | Synthesis dashboard components |
| `apps/web/src/components/charts/SpiderChart.tsx` | Reusable spider chart |
| `apps/web/src/components/charts/NetworkGraph.tsx` | Reusable network graph |
| `apps/web/src/components/charts/OrgChart.tsx` | Reusable org chart |
| `apps/web/src/components/charts/Timeline.tsx` | Reusable timeline |
