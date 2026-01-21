# Phase 5: Analysis Dashboards

## Overview

**Purpose:** Build the analytical dashboards that implement structured analysis techniques including PMESII-PT, threat assessment, Center of Gravity analysis, ACH, risk matrix, and trend analysis.

**Dependencies:** Phase 3 (Frontend Foundation)

**Parallel Execution:** Can run concurrently with Phases 4 and 6 after Phase 3 completes.

**Deliverables:**
- F.2 PMESII-PT Analysis Dashboard
- F.4 Threat Assessment Dashboard
- F.7 Center of Gravity Analysis Dashboard
- F.8 Analysis of Competing Hypotheses (ACH) Dashboard
- F.9 Risk Matrix Dashboard
- F.10 Trend Analysis Dashboard

---

## Dashboard Specifications

### F.2: PMESII-PT Analysis Dashboard

**Purpose:** Comprehensive environmental analysis across eight domains with structured data entry, visualization, and AI-assisted analysis.

**Layout:** Domain-centric with expandable sections

```
┌─────────────────────────────────────────────────────────────────┐
│ PMESII-PT ANALYSIS                     [Assessment: Q1 2025 ▼] │
├─────────────────────────────────────────────────────────────────┤
│ [P] [M] [E] [S] [I] [I] [P] [T]  ← Domain tabs (octagonal nav) │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DOMAIN: POLITICAL                                              │
│  ────────────────────────────────────────────────────          │
│                                                                 │
│  ┌─────────────────────────┐  ┌────────────────────────────┐   │
│  │ FACTORS (Draggable)     │  │ DOMAIN SUMMARY             │   │
│  │ ├─ Government Stability │  │ Overall Impact: MODERATE   │   │
│  │ │   Impact: High ●●●○○  │  │ Trend: DECLINING ↓         │   │
│  │ │   Trend: Declining ↓  │  │ Confidence: 72%            │   │
│  │ ├─ Policy Changes       │  │                            │   │
│  │ │   Impact: Mod ●●○○○   │  │ [AI Analysis] [Export]     │   │
│  │ └─ [+ Add Factor]       │  └────────────────────────────┘   │
│  └─────────────────────────┘                                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ SELECTED FACTOR: Government Stability                     │  │
│  │ ─────────────────────────────────────────────────────────│  │
│  │ Description: [Editable text field]                        │  │
│  │ Analysis: [Rich text with AI suggestions]                 │  │
│  │ Evidence: [List of supporting observations]               │  │
│  │ Sources: [Source citations]                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ CROSS-DOMAIN ANALYSIS                                           │
│ [Radar chart showing all 8 domains] [Domain correlation matrix] │
└─────────────────────────────────────────────────────────────────┘
```

**Domains:**
| Code | Domain | Description |
|------|--------|-------------|
| P | Political | Governance, policy, political stability |
| M | Military | Armed forces, security, defense posture |
| E | Economic | Markets, trade, financial systems |
| S | Social | Demographics, culture, civil society |
| I | Information | Media, cyber, information operations |
| I | Infrastructure | Critical systems, utilities, transport |
| P | Physical | Geography, climate, natural resources |
| T | Time | Temporal factors, deadlines, windows |

---

### F.4: Threat Assessment Dashboard

**Purpose:** Probability × Impact risk matrix with threat actor profiles and mitigation tracking.

**Layout:** Matrix-centric with threat list and details

```
┌─────────────────────────────────────────────────────────────────┐
│ THREAT ASSESSMENT                              [Add Threat] [↻] │
├──────────────────────────────────┬──────────────────────────────┤
│                                  │                              │
│      THREAT MATRIX (5x5)         │   THREAT ACTORS              │
│                                  │   ├─ ★ State Actor A         │
│      ↑ PROBABILITY               │   │   Risk: CRITICAL         │
│      5 │ ○ ○ ● ● ★              │   ├─ ● Non-State Group B     │
│      4 │ ○ ○ ● ● ●              │   │   Risk: HIGH             │
│      3 │ ○ ○ ○ ● ●              │   ├─ ○ Cyber Threat C        │
│      2 │ ○ ○ ○ ○ ●              │   │   Risk: MODERATE         │
│      1 │ ○ ○ ○ ○ ○              │   └─ [+ Add Actor]           │
│        └─────────────────        │                              │
│          1 2 3 4 5               │   Filter: [All ▼] [Active ▼] │
│          IMPACT →                │                              │
│                                  │                              │
├──────────────────────────────────┴──────────────────────────────┤
│                                                                 │
│  SELECTED: State Actor A                                        │
│  ───────────────────────────────────────────────────────────── │
│  Category: State Actor          │ Probability: LIKELY (4/5)    │
│  Capabilities: [High] [Medium]  │ Impact: SIGNIFICANT (4/5)    │
│  Intentions: Hostile            │ Risk Score: 16 (CRITICAL)    │
│                                                                 │
│  Scenario: [Detailed threat scenario description...]            │
│                                                                 │
│  Impact Breakdown:                                              │
│  ├─ Casualties:      ●●●●○ (4)                                 │
│  ├─ Economic:        ●●●○○ (3)                                 │
│  ├─ Infrastructure:  ●●●●● (5)                                 │
│  └─ Reputation:      ●●○○○ (2)                                 │
│                                                                 │
│  Mitigations: [Editable list of countermeasures]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Risk Score Calculation:**
- Risk Score = Probability × Average Impact
- Color coding: 1-4 (Green), 5-9 (Yellow), 10-14 (Orange), 15-25 (Red)

---

### F.7: Center of Gravity Analysis Dashboard

**Purpose:** Identify and analyze critical capabilities, requirements, and vulnerabilities for CoG analysis.

**Layout:** Entity-centric with relationship mapping

```
┌─────────────────────────────────────────────────────────────────┐
│ CENTER OF GRAVITY ANALYSIS                    [Friendly ▼] [+] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    CoG RELATIONSHIP MAP                  │   │
│  │                                                          │   │
│  │     ┌─────────┐                                         │   │
│  │     │   CoG   │ ← Center of Gravity                     │   │
│  │     │ "Enemy  │                                         │   │
│  │     │ Command"│                                         │   │
│  │     └────┬────┘                                         │   │
│  │          │                                              │   │
│  │    ┌─────┼─────┐                                        │   │
│  │    ▼     ▼     ▼                                        │   │
│  │  ┌───┐ ┌───┐ ┌───┐  ← Critical Capabilities (CC)       │   │
│  │  │CC1│ │CC2│ │CC3│                                      │   │
│  │  └─┬─┘ └─┬─┘ └─┬─┘                                      │   │
│  │    │     │     │                                        │   │
│  │  ┌─▼─┐ ┌─▼─┐ ┌─▼─┐  ← Critical Requirements (CR)       │   │
│  │  │CR1│ │CR2│ │CR3│                                      │   │
│  │  └─┬─┘ └─┬─┘ └─┬─┘                                      │   │
│  │    │     │     │                                        │   │
│  │  ┌─▼─┐ ┌─▼─┐ ┌─▼─┐  ← Critical Vulnerabilities (CV)    │   │
│  │  │CV1│ │CV2│ │CV3│                                      │   │
│  │  └───┘ └───┘ └───┘                                      │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├───────────────────────────────┬─────────────────────────────────┤
│  ELEMENTS                     │  SELECTED: CC1 - Force Proj.   │
│  ──────────────────────────── │  ────────────────────────────── │
│  Critical Capabilities:       │  Type: Critical Capability      │
│  ├─ CC1: Force Projection     │  Description: Ability to...     │
│  ├─ CC2: C2 Network           │                                 │
│  └─ CC3: Intel Gathering      │  Linked Requirements:           │
│                               │  ├─ CR1: Logistics network      │
│  Critical Requirements:       │  └─ CR2: Air superiority        │
│  ├─ CR1: Logistics            │                                 │
│  ├─ CR2: Air Superiority      │  Priority: HIGH                 │
│  └─ CR3: Communications       │                                 │
│                               │  [Edit] [Link] [Delete]         │
│  Critical Vulnerabilities:    │                                 │
│  ├─ CV1: Supply Lines         │                                 │
│  └─ CV2: Single POF           │                                 │
└───────────────────────────────┴─────────────────────────────────┘
```

---

### F.8: Analysis of Competing Hypotheses (ACH) Dashboard

**Purpose:** Structured technique for evaluating multiple hypotheses against evidence.

**Layout:** Matrix-based with hypothesis/evidence management

```
┌─────────────────────────────────────────────────────────────────┐
│ ANALYSIS OF COMPETING HYPOTHESES               [New ACH] [Help] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ACH MATRIX                                                     │
│  ┌──────────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │              │    H1    │    H2    │    H3    │    H4    │  │
│  │   Evidence   │ Scenario │ Scenario │ Scenario │ Scenario │  │
│  │              │    A     │    B     │    C     │    D     │  │
│  ├──────────────┼──────────┼──────────┼──────────┼──────────┤  │
│  │ E1: Intel    │    ++    │    +     │    --    │    N     │  │
│  │ E2: SIGINT   │    +     │    ++    │    -     │    N     │  │
│  │ E3: OSINT    │    N     │    +     │    +     │    ++    │  │
│  │ E4: HUMINT   │    --    │    N     │    ++    │    +     │  │
│  ├──────────────┼──────────┼──────────┼──────────┼──────────┤  │
│  │ WEIGHTED     │   2.5    │   3.8    │   1.2    │   2.0    │  │
│  │ SCORE        │          │  ★ Best  │          │          │  │
│  └──────────────┴──────────┴──────────┴──────────┴──────────┘  │
│                                                                 │
│  Legend: ++ Strongly Supports | + Supports | N Neutral          │
│          - Contradicts | -- Strongly Contradicts                │
│                                                                 │
├───────────────────────────────┬─────────────────────────────────┤
│  HYPOTHESES                   │  EVIDENCE                       │
│  [+ Add Hypothesis]           │  [+ Add Evidence]               │
│  ├─ H1: Scenario A           │  ├─ E1: Intel report dated...   │
│  │   Status: Under review    │  │   Reliability: B-2            │
│  ├─ H2: Scenario B ★         │  │   Weight: 1.5                 │
│  │   Status: Most likely     │  ├─ E2: SIGINT intercept...     │
│  ├─ H3: Scenario C           │  │   Reliability: A-1            │
│  │   Status: Unlikely        │  │   Weight: 2.0                 │
│  └─ H4: Scenario D           │  └─ E3: Open source...          │
│      Status: Possible        │      Reliability: C-3            │
└───────────────────────────────┴─────────────────────────────────┘
```

**Scoring System:**
- ++: +2 (Strongly supports)
- +: +1 (Supports)
- N: 0 (Neutral/Not applicable)
- -: -1 (Contradicts)
- --: -2 (Strongly contradicts)

Weight multiplier based on source reliability (A-1 = 2.0, F-6 = 0.5)

---

### F.9: Risk Matrix Dashboard

**Purpose:** Categorize and track risks across multiple dimensions with mitigation status.

**Layout:** Similar to threat matrix but for general risks

```
┌─────────────────────────────────────────────────────────────────┐
│ RISK MATRIX                                    [Categories ▼]   │
├──────────────────────────────────┬──────────────────────────────┤
│                                  │                              │
│      RISK HEAT MAP               │   RISK REGISTER              │
│      ↑ LIKELIHOOD                │   ──────────────────────     │
│      5 │ ○ ○ ● ● ★              │   Critical (3)               │
│      4 │ ○ ○ ● ● ●              │   ├─ R1: Supply chain        │
│      3 │ ○ ○ ○ ● ●              │   ├─ R2: Cyber attack        │
│      2 │ ○ ○ ○ ○ ●              │   └─ R3: Key personnel       │
│      1 │ ○ ○ ○ ○ ○              │                              │
│        └─────────────────        │   High (5)                   │
│          1 2 3 4 5               │   ├─ R4: Budget overrun      │
│          CONSEQUENCE →           │   └─ ...                     │
│                                  │                              │
│  Categories:                     │   Medium (8)                 │
│  ● Operational  ● Financial      │   └─ ...                     │
│  ● Reputational ● Strategic      │                              │
│                                  │   Low (12)                   │
│                                  │   └─ ...                     │
├──────────────────────────────────┴──────────────────────────────┤
│  RISK DETAILS: R1 - Supply Chain Disruption                     │
│  ─────────────────────────────────────────────────────────────  │
│  Category: Operational     │ Owner: Operations Team             │
│  Likelihood: 4 (Likely)    │ Consequence: 5 (Catastrophic)      │
│  Inherent Risk: 20         │ Residual Risk: 12                  │
│                                                                 │
│  Controls:                 │ Mitigation Status:                 │
│  ├─ Dual sourcing [✓]      │ ████████░░░░░░░░ 50% complete     │
│  ├─ Buffer stock [✓]       │                                   │
│  └─ Alt suppliers [○]      │ Next Review: 2025-02-15           │
└─────────────────────────────────────────────────────────────────┘
```

---

### F.10: Trend Analysis Dashboard

**Purpose:** Track indicators and metrics over time to identify patterns and trajectories.

**Layout:** Time-series focused with multiple visualization options

```
┌─────────────────────────────────────────────────────────────────┐
│ TREND ANALYSIS                          [1M] [3M] [6M] [1Y] [+] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           MULTI-SERIES TREND CHART                        │  │
│  │  ▲                                           ───────      │  │
│  │  │    ╱╲                                    Economic      │  │
│  │  │   ╱  ╲    ╱╲                            ───────       │  │
│  │  │  ╱    ╲  ╱  ╲     ╱                     Political     │  │
│  │  │ ╱      ╲╱    ╲   ╱                      ───────       │  │
│  │  │╱              ╲ ╱                       Security      │  │
│  │  └────────────────────────────────────────►              │  │
│  │    Jan   Feb   Mar   Apr   May   Jun   Jul               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
├───────────────────────────────┬─────────────────────────────────┤
│  TRACKED INDICATORS           │  TREND SUMMARY                  │
│  [+ Add Indicator]            │                                 │
│  ────────────────────────     │  ↑ Improving: 3                 │
│  ▲ Economic Index             │  → Stable: 5                    │
│    Current: 72 (+5)           │  ↓ Declining: 2                 │
│    Trend: Improving           │                                 │
│                               │  Key Changes This Period:       │
│  ▼ Political Stability        │  ├─ Economic +8.3%              │
│    Current: 45 (-12)          │  ├─ Political -15.2%            │
│    Trend: Declining           │  └─ Security +2.1%              │
│                               │                                 │
│  → Security Index             │  Forecast (30 days):            │
│    Current: 68 (+2)           │  [Confidence bands shown]       │
│    Trend: Stable              │                                 │
└───────────────────────────────┴─────────────────────────────────┘
```

---

## Implementation Tasks

| ID | Task | Agent | Priority | Dependencies |
|----|------|-------|----------|--------------|
| 5.1 | Create analysis dashboard routing | `frontend-developer-designer` | Critical | Phase 3 |
| 5.2 | Build PMESII-PT dashboard layout | `ops-center-ui-expert` | Critical | 5.1 |
| 5.3 | Create domain tab navigation (octagonal) | `ops-center-ui-expert` | High | 5.2 |
| 5.4 | Build factor list with drag-and-drop | `frontend-developer-designer` | High | 5.2 |
| 5.5 | Create factor detail editor | `frontend-developer-designer` | High | 5.2 |
| 5.6 | Build PMESII radar chart | `tactical-visualization-expert` | High | 5.2 |
| 5.7 | Implement AI-assisted analysis | `intelligence-analysis-expert` | Medium | 5.5, Phase 8 |
| 5.8 | Build Threat Assessment layout | `ops-center-ui-expert` | Critical | 5.1 |
| 5.9 | Create interactive 5x5 threat matrix | `tactical-visualization-expert` | Critical | 5.8 |
| 5.10 | Build threat actor list | `frontend-developer-designer` | High | 5.8 |
| 5.11 | Create threat detail panel | `frontend-developer-designer` | High | 5.8 |
| 5.12 | Build impact breakdown visualization | `tactical-visualization-expert` | Medium | 5.11 |
| 5.13 | Build CoG Analysis layout | `ops-center-ui-expert` | High | 5.1 |
| 5.14 | Create CoG tree visualization | `tactical-visualization-expert` | Critical | 5.13 |
| 5.15 | Build CC/CR/CV element management | `frontend-developer-designer` | High | 5.13 |
| 5.16 | Create element linking interface | `frontend-developer-designer` | High | 5.15 |
| 5.17 | Build ACH dashboard layout | `ops-center-ui-expert` | High | 5.1 |
| 5.18 | Create ACH matrix component | `tactical-visualization-expert` | Critical | 5.17 |
| 5.19 | Build hypothesis management | `frontend-developer-designer` | High | 5.17 |
| 5.20 | Build evidence management | `frontend-developer-designer` | High | 5.17 |
| 5.21 | Implement weighted scoring | `intelligence-analysis-expert` | High | 5.18 |
| 5.22 | Build Risk Matrix layout | `ops-center-ui-expert` | High | 5.1 |
| 5.23 | Create risk heat map (reuse threat matrix) | `tactical-visualization-expert` | Medium | 5.22 |
| 5.24 | Build risk register list | `frontend-developer-designer` | High | 5.22 |
| 5.25 | Create mitigation tracker | `frontend-developer-designer` | Medium | 5.22 |
| 5.26 | Build Trend Analysis layout | `ops-center-ui-expert` | High | 5.1 |
| 5.27 | Create multi-series line chart | `tactical-visualization-expert` | Critical | 5.26 |
| 5.28 | Build indicator management | `frontend-developer-designer` | High | 5.26 |
| 5.29 | Create trend summary cards | `ops-center-ui-expert` | Medium | 5.26 |

---

## Detailed Component Specifications

### Interactive Threat Matrix

**File: `apps/web/src/features/analysis/threat/ThreatMatrix.tsx`**
```typescript
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ThreatPoint {
  id: string;
  name: string;
  probability: number; // 1-5
  impact: number;      // 1-5
  category: string;
}

interface ThreatMatrixProps {
  threats: ThreatPoint[];
  onSelect: (threat: ThreatPoint) => void;
  selectedId?: string;
}

const probabilityLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const impactLabels = ['Negligible', 'Minor', 'Moderate', 'Significant', 'Catastrophic'];

export function ThreatMatrix({ threats, onSelect, selectedId }: ThreatMatrixProps) {
  // Group threats by cell
  const grid = useMemo(() => {
    const cells: Record<string, ThreatPoint[]> = {};
    threats.forEach(threat => {
      const key = `${threat.probability}-${threat.impact}`;
      if (!cells[key]) cells[key] = [];
      cells[key].push(threat);
    });
    return cells;
  }, [threats]);

  const getRiskColor = (prob: number, impact: number) => {
    const risk = prob * impact;
    if (risk >= 15) return 'bg-tactical-red/80 hover:bg-tactical-red';
    if (risk >= 10) return 'bg-orange-500/80 hover:bg-orange-500';
    if (risk >= 5) return 'bg-tactical-amber/80 hover:bg-tactical-amber';
    return 'bg-tactical-green/40 hover:bg-tactical-green/60';
  };

  return (
    <div className="relative">
      {/* Y-axis label */}
      <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground whitespace-nowrap">
        PROBABILITY →
      </div>

      <div className="ml-20">
        {/* Matrix grid */}
        <div className="grid grid-cols-5 gap-1">
          {/* Rows (probability 5 to 1) */}
          {[5, 4, 3, 2, 1].map(prob => (
            [1, 2, 3, 4, 5].map(impact => {
              const key = `${prob}-${impact}`;
              const cellThreats = grid[key] || [];

              return (
                <div
                  key={key}
                  className={cn(
                    'aspect-square flex flex-col items-center justify-center rounded-sm transition-colors cursor-pointer p-1',
                    getRiskColor(prob, impact),
                    cellThreats.length === 0 && 'opacity-40'
                  )}
                  onClick={() => cellThreats[0] && onSelect(cellThreats[0])}
                >
                  {cellThreats.length > 0 && (
                    <>
                      <span className="text-lg font-bold text-foreground">
                        {cellThreats.length}
                      </span>
                      {cellThreats.some(t => t.id === selectedId) && (
                        <span className="text-xs">★</span>
                      )}
                    </>
                  )}
                </div>
              );
            })
          ))}
        </div>

        {/* X-axis labels */}
        <div className="grid grid-cols-5 gap-1 mt-2">
          {impactLabels.map(label => (
            <div key={label} className="text-xs text-muted-foreground text-center">
              {label}
            </div>
          ))}
        </div>

        {/* X-axis title */}
        <div className="text-xs text-muted-foreground text-center mt-2">
          IMPACT →
        </div>
      </div>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-around py-2">
        {probabilityLabels.slice().reverse().map(label => (
          <div key={label} className="text-xs text-muted-foreground text-right pr-2 w-16">
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### CoG Tree Visualization

**File: `apps/web/src/features/analysis/cog/CogTree.tsx`**
```typescript
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface CogNode {
  id: string;
  name: string;
  type: 'cog' | 'cc' | 'cr' | 'cv';
  children?: CogNode[];
}

interface CogTreeProps {
  data: CogNode;
  onNodeClick?: (node: CogNode) => void;
  selectedId?: string;
}

export function CogTree({ data, onNodeClick, selectedId }: CogTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll('*').remove();

    const typeColors: Record<string, string> = {
      cog: '#00ff88',
      cc: '#00d4ff',
      cr: '#ffaa00',
      cv: '#ff3333',
    };

    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create hierarchy
    const root = d3.hierarchy(data);
    const treeLayout = d3.tree<CogNode>().size([innerWidth, innerHeight]);
    treeLayout(root);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Links
    g.selectAll('.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical<any, any>()
        .x((d: any) => d.x)
        .y((d: any) => d.y))
      .attr('fill', 'none')
      .attr('stroke', '#2a2a2a')
      .attr('stroke-width', 2);

    // Nodes
    const node = g.selectAll('.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => onNodeClick?.(d.data));

    // Node circles
    node.append('circle')
      .attr('r', 20)
      .attr('fill', d => typeColors[d.data.type])
      .attr('stroke', d => d.data.id === selectedId ? '#fff' : 'transparent')
      .attr('stroke-width', 3);

    // Node labels
    node.append('text')
      .attr('dy', 35)
      .attr('text-anchor', 'middle')
      .attr('fill', '#a3a3a3')
      .attr('font-size', '12px')
      .text(d => d.data.name);

    // Type indicators
    node.append('text')
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#0a0a0a')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text(d => d.data.type.toUpperCase());

  }, [data, selectedId, onNodeClick]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    />
  );
}
```

### ACH Matrix Component

**File: `apps/web/src/features/analysis/ach/AchMatrix.tsx`**
```typescript
import { cn } from '@/lib/utils';

type Rating = '++' | '+' | 'N' | '-' | '--';

interface Hypothesis {
  id: string;
  name: string;
  score?: number;
}

interface Evidence {
  id: string;
  description: string;
  reliability: string;
  weight: number;
}

interface AchRating {
  hypothesisId: string;
  evidenceId: string;
  rating: Rating;
}

interface AchMatrixProps {
  hypotheses: Hypothesis[];
  evidence: Evidence[];
  ratings: AchRating[];
  onRatingChange: (hypothesisId: string, evidenceId: string, rating: Rating) => void;
}

const ratingColors: Record<Rating, string> = {
  '++': 'bg-tactical-green/60 text-tactical-green',
  '+': 'bg-tactical-green/30 text-tactical-green',
  'N': 'bg-muted text-muted-foreground',
  '-': 'bg-tactical-red/30 text-tactical-red',
  '--': 'bg-tactical-red/60 text-tactical-red',
};

const ratingOptions: Rating[] = ['++', '+', 'N', '-', '--'];

export function AchMatrix({ hypotheses, evidence, ratings, onRatingChange }: AchMatrixProps) {
  const getRating = (hId: string, eId: string): Rating => {
    return ratings.find(r => r.hypothesisId === hId && r.evidenceId === eId)?.rating || 'N';
  };

  const calculateScore = (hypothesisId: string): number => {
    return evidence.reduce((sum, e) => {
      const rating = getRating(hypothesisId, e.id);
      const ratingValue = { '++': 2, '+': 1, 'N': 0, '-': -1, '--': -2 }[rating];
      return sum + (ratingValue * e.weight);
    }, 0);
  };

  const maxScore = Math.max(...hypotheses.map(h => calculateScore(h.id)));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-sm font-medium text-muted-foreground border-b border-border">
              Evidence
            </th>
            {hypotheses.map(h => (
              <th
                key={h.id}
                className={cn(
                  'p-2 text-center text-sm font-medium border-b border-border min-w-[100px]',
                  calculateScore(h.id) === maxScore && 'text-tactical-green'
                )}
              >
                {h.name}
                {calculateScore(h.id) === maxScore && ' ★'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {evidence.map(e => (
            <tr key={e.id} className="border-b border-border/50">
              <td className="p-2 text-sm">
                <div className="font-medium">{e.description}</div>
                <div className="text-xs text-muted-foreground">
                  Reliability: {e.reliability} | Weight: {e.weight}
                </div>
              </td>
              {hypotheses.map(h => {
                const rating = getRating(h.id, e.id);
                return (
                  <td key={h.id} className="p-1 text-center">
                    <select
                      value={rating}
                      onChange={(event) => onRatingChange(h.id, e.id, event.target.value as Rating)}
                      className={cn(
                        'w-16 h-8 rounded text-center font-bold cursor-pointer border-0',
                        ratingColors[rating]
                      )}
                    >
                      {ratingOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Score row */}
          <tr className="bg-card">
            <td className="p-2 text-sm font-bold">WEIGHTED SCORE</td>
            {hypotheses.map(h => {
              const score = calculateScore(h.id);
              return (
                <td
                  key={h.id}
                  className={cn(
                    'p-2 text-center font-mono font-bold',
                    score === maxScore && 'text-tactical-green'
                  )}
                >
                  {score.toFixed(1)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
```

---

## API Endpoints Required

### PMESII-PT
```
GET /api/assessments/:id/factors
POST /api/assessments/:id/factors
PATCH /api/factors/:id
DELETE /api/factors/:id
POST /api/factors/:id/evidence
```

### Threats
```
GET /api/projects/:id/threat-actors
POST /api/projects/:id/threat-actors
GET /api/assessments/:id/threat-assessments
POST /api/assessments/:id/threat-assessments
PATCH /api/threat-assessments/:id
```

### Center of Gravity
```
GET /api/assessments/:id/cog
POST /api/assessments/:id/cog
POST /api/cog/:id/elements
POST /api/cog/elements/:id/links
```

### ACH
```
GET /api/assessments/:id/ach
POST /api/assessments/:id/ach
POST /api/ach/:id/hypotheses
POST /api/ach/:id/evidence
PATCH /api/ach/:id/ratings
```

---

## Acceptance Criteria

- [ ] PMESII-PT supports all 8 domains with tab navigation
- [ ] Factors can be created, edited, reordered
- [ ] Threat matrix is interactive with click-to-select
- [ ] Threat details show impact breakdown
- [ ] CoG tree visualizes CC/CR/CV hierarchy
- [ ] Elements can be linked with relationships
- [ ] ACH matrix allows rating each hypothesis/evidence pair
- [ ] Weighted scores calculate correctly
- [ ] Risk matrix categorizes risks by severity
- [ ] Trend charts show multiple time series
- [ ] All dashboards maintain dark theme styling

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/web/src/routes/_app.analysis.pmesii.tsx` | PMESII-PT page |
| `apps/web/src/routes/_app.analysis.threats.tsx` | Threat Assessment page |
| `apps/web/src/routes/_app.analysis.cog.tsx` | CoG Analysis page |
| `apps/web/src/routes/_app.analysis.ach.tsx` | ACH page |
| `apps/web/src/routes/_app.analysis.risk.tsx` | Risk Matrix page |
| `apps/web/src/routes/_app.analysis.trends.tsx` | Trend Analysis page |
| `apps/web/src/features/analysis/pmesii/` | PMESII components |
| `apps/web/src/features/analysis/threat/` | Threat components |
| `apps/web/src/features/analysis/cog/` | CoG components |
| `apps/web/src/features/analysis/ach/` | ACH components |
| `apps/web/src/features/analysis/risk/` | Risk components |
| `apps/web/src/features/analysis/trend/` | Trend components |
| `apps/web/src/components/charts/HeatMatrix.tsx` | Reusable heat matrix |
| `apps/web/src/components/charts/LineChart.tsx` | Reusable line chart |
