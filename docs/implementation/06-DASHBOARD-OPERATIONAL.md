# Phase 6: Operational Dashboards

## Overview

**Purpose:** Build the operational-level dashboards that manage day-to-day intelligence collection, indicator monitoring, source management, and reporting workflows.

**Dependencies:** Phase 3 (Frontend Foundation)

**Parallel Execution:** Can run concurrently with Phases 4 and 5 after Phase 3 completes.

**Deliverables:**
- F.3 Intelligence Collection Management Dashboard
- F.5 Indicator Monitoring Dashboard
- F.6 Named Area of Interest (NAI) Dashboard
- F.11 Timeline Dashboard
- F.12 Source Reliability Dashboard
- F.13 Report Generation Dashboard

---

## Dashboard Specifications

### F.3: Intelligence Collection Management Dashboard

**Purpose:** Manage Priority Intelligence Requirements (PIRs), collection tasks, and source assignments.

**Layout:** Kanban-style workflow with PIR details

```
┌─────────────────────────────────────────────────────────────────┐
│ INTELLIGENCE COLLECTION MANAGEMENT              [+ New PIR] [↻] │
├─────────────────────────────────────────────────────────────────┤
│ Filter: [All ▼] [Priority ▼] [Status ▼]        Search: [____]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐ │
│  │    DRAFT     │ │    ACTIVE    │ │  COLLECTING  │ │ANSWERED│ │
│  │              │ │              │ │              │ │        │ │
│  │ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌────┐ │ │
│  │ │ PIR-001  │ │ │ │ PIR-003  │ │ │ │ PIR-005  │ │ │ │PIR │ │ │
│  │ │ ★ Flash  │ │ │ │ Priority │ │ │ │ Routine  │ │ │ │007 │ │ │
│  │ └──────────┘ │ │ │ 3/5 tasks│ │ │ │ 2 sources│ │ │ └────┘ │ │
│  │              │ │ └──────────┘ │ │ └──────────┘ │ │        │ │
│  │ ┌──────────┐ │ │ ┌──────────┐ │ │              │ │ ┌────┐ │ │
│  │ │ PIR-002  │ │ │ │ PIR-004  │ │ │              │ │ │PIR │ │ │
│  │ │ Routine  │ │ │ │ ★ Immed  │ │ │              │ │ │008 │ │ │
│  │ └──────────┘ │ │ └──────────┘ │ │              │ │ └────┘ │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SELECTED: PIR-003 - What are adversary force dispositions?    │
│  ──────────────────────────────────────────────────────────────│
│  Priority: PRIORITY      │ Status: ACTIVE     │ Due: 2025-02-01│
│  Created: 2025-01-15     │ Owner: Analyst A   │                │
│                                                                 │
│  Context: [Expanded PIR context and requirements...]            │
│                                                                 │
│  COLLECTION TASKS                              [+ Add Task]     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ □ Task 1: Monitor OSINT feeds    │ Source: Reuters      │   │
│  │ ✓ Task 2: Review SIGINT reports  │ Source: NSA-Feed    │   │
│  │ □ Task 3: Query HUMINT contact   │ Source: HUMINT-12   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  LINKED INDICATORS                                              │
│  ├─ IND-001: Troop movements (Partially Observed)              │
│  └─ IND-002: Equipment staging (Not Observed)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**PIR Priority Levels:**
| Priority | Response Time | Color |
|----------|---------------|-------|
| Flash | < 1 hour | Red |
| Immediate | < 6 hours | Orange |
| Priority | < 24 hours | Yellow |
| Routine | As available | Gray |

---

### F.5: Indicator Monitoring Dashboard

**Purpose:** Track indicators and tripwires with real-time status updates and alert management.

**Layout:** Indicator list with observation logging

```
┌─────────────────────────────────────────────────────────────────┐
│ INDICATOR MONITORING                           [Alerts: 3 🔔]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INDICATOR STATUS OVERVIEW                                      │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ││
│  │  Observed (8)    Partial (5)    Not Observed (12)          ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
├───────────────────────────────────┬─────────────────────────────┤
│  ACTIVE INDICATORS                │  RECENT OBSERVATIONS        │
│  [Filter: Status ▼] [PIR ▼]       │                             │
│  ──────────────────────────────── │  ┌───────────────────────┐ │
│  ● IND-001: Troop movements       │  │ 10:45 - IND-001       │ │
│    Status: OBSERVED               │  │ Movement detected at   │ │
│    PIR: PIR-003                   │  │ grid ref 123456       │ │
│    Last update: 10:45             │  │ Source: SAT-IMG       │ │
│                                   │  │ Reliability: B-2      │ │
│  ◐ IND-002: Equipment staging     │  └───────────────────────┘ │
│    Status: PARTIALLY OBSERVED     │                             │
│    PIR: PIR-003                   │  ┌───────────────────────┐ │
│    Progress: 60%                  │  │ 09:30 - IND-005       │ │
│                                   │  │ Comms intercept...     │ │
│  ○ IND-003: Communications spike  │  │ Source: SIGINT        │ │
│    Status: NOT OBSERVED           │  │ Reliability: A-1      │ │
│    PIR: PIR-004                   │  └───────────────────────┘ │
│                                   │                             │
├───────────────────────────────────┼─────────────────────────────┤
│  TRIGGERED TRIPWIRES              │  OBSERVATION INPUT          │
│  ⚠️ TW-001: Force threshold       │  ┌───────────────────────┐ │
│     Triggered: 2 hours ago        │  │ Indicator: [Select ▼] │ │
│     NAI: Border Crossing A        │  │ Content: [__________] │ │
│                                   │  │ Source: [Select ▼]    │ │
│  ⚠️ TW-003: Comms blackout        │  │ Reliability: [__]     │ │
│     Triggered: 30 min ago         │  │ Location: [__________]│ │
│     NAI: Military Base X          │  │ [+ Add Observation]   │ │
│                                   │  └───────────────────────┘ │
└───────────────────────────────────┴─────────────────────────────┘
```

**Indicator Status States:**
- ● **Observed** (Green): Fully confirmed
- ◐ **Partially Observed** (Yellow): Some criteria met
- ○ **Not Observed** (Gray): No evidence yet

---

### F.6: Named Area of Interest (NAI) Dashboard

**Purpose:** Manage geographic and topical areas of interest with associated tripwires and observations.

**Layout:** Map-centric with NAI list and details

```
┌─────────────────────────────────────────────────────────────────┐
│ NAMED AREAS OF INTEREST                        [+ New NAI] [🗺️] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │                    INTERACTIVE MAP                        │  │
│  │                                                           │  │
│  │    [NAI-001]●        ○[NAI-003]                          │  │
│  │         ╲                                                 │  │
│  │          ╲    ●[NAI-002]                                 │  │
│  │           ╲                                               │  │
│  │    ┌──────────────┐                                       │  │
│  │    │ NAI-001      │  ← Popup on hover/click              │  │
│  │    │ Border Cross │                                       │  │
│  │    │ Tripwires: 2 │                                       │  │
│  │    └──────────────┘                                       │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
├───────────────────────────────────┬─────────────────────────────┤
│  NAI LIST                         │  NAI DETAILS: NAI-001       │
│  [Active ▼] [Search...]           │  ────────────────────────── │
│  ──────────────────────────────── │  Name: Border Crossing A    │
│  ● NAI-001: Border Crossing A     │  Type: Geographic           │
│    Tripwires: 2 (1 triggered)     │  Status: Active             │
│    Last activity: 2 hours ago     │                             │
│                                   │  Coordinates:               │
│  ● NAI-002: Military Base X       │  Lat: 48.8566               │
│    Tripwires: 3 (0 triggered)     │  Long: 2.3522               │
│    Last activity: 1 day ago       │  Radius: 5 km               │
│                                   │                             │
│  ● NAI-003: Port Facility Y       │  TRIPWIRES                  │
│    Tripwires: 1 (0 triggered)     │  ├─ ⚠️ TW-001: Force > 100  │
│    Last activity: 3 days ago      │  │   Status: TRIGGERED      │
│                                   │  └─ ○ TW-002: Vehicle count │
│  ○ NAI-004: Communications Hub    │      Status: Active         │
│    Tripwires: 0                   │                             │
│    Status: Inactive               │  RECENT OBSERVATIONS (5)    │
│                                   │  [View all →]               │
└───────────────────────────────────┴─────────────────────────────┘
```

---

### F.11: Timeline Dashboard

**Purpose:** Visualize events, observations, and assessments on a temporal axis.

**Layout:** Gantt-style timeline with event markers

```
┌─────────────────────────────────────────────────────────────────┐
│ TIMELINE                           [Day] [Week] [Month] [Year]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filter: [All Events ▼] [Category ▼]              [◄] [Today] [►]│
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ JAN 15   JAN 16   JAN 17   JAN 18   JAN 19   JAN 20      │  │
│  │ ──────── ──────── ──────── ──────── ──────── ────────    │  │
│  │                                                           │  │
│  │ Assessments ═══════════════════════════════════          │  │
│  │ │         ├─ Q1 Assessment ────────────────────│         │  │
│  │                                                           │  │
│  │ Intelligence  ●        ●              ●                  │  │
│  │              PIR-001  PIR-003       PIR-005              │  │
│  │                                                           │  │
│  │ Observations      ▲    ▲  ▲      ▲       ▲              │  │
│  │                 obs1  obs2 obs3  obs4   obs5             │  │
│  │                                                           │  │
│  │ Alerts                    ⚠️            ⚠️                │  │
│  │                        TW-001       TW-003               │  │
│  │                                                           │  │
│  │ Events         ◆──────────────◆     ◆                    │  │
│  │              Exercise      Handover  Summit              │  │
│  │                                           ▼ TODAY        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  EVENT DETAILS: Q1 Assessment                                   │
│  ─────────────────────────────────────────────────────────────  │
│  Type: Assessment        │ Start: Jan 15    │ End: Jan 30      │
│  Status: In Progress     │ Owner: Team Lead │                   │
│  Description: Quarterly strategic assessment for Eastern region │
│  Related PIRs: PIR-001, PIR-003, PIR-005                       │
└─────────────────────────────────────────────────────────────────┘
```

---

### F.12: Source Reliability Dashboard

**Purpose:** Track and evaluate source reliability using the standard A-F scale.

**Layout:** Source matrix with evaluation history

```
┌─────────────────────────────────────────────────────────────────┐
│ SOURCE RELIABILITY                             [+ New Source]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RELIABILITY MATRIX                                             │
│  ┌────────────────────────────────────────────────────────────┐│
│  │         │ 1-Conf │ 2-Prob │ 3-Poss │ 4-Doubt│ 5-Imp │ 6-? ││
│  │ A-Compl │   ██   │   ██   │   █    │        │       │     ││
│  │ B-Usual │   ██   │   ███  │   ██   │   █    │       │     ││
│  │ C-Fair  │   █    │   ██   │   ███  │   ██   │   █   │  █  ││
│  │ D-NotUs │        │   █    │   ██   │   ██   │   █   │  █  ││
│  │ E-Unrel │        │        │   █    │   █    │   ██  │  ██ ││
│  │ F-Unk   │        │        │   █    │   █    │   █   │  ███││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
├───────────────────────────────────┬─────────────────────────────┤
│  SOURCES                          │  SOURCE: HUMINT-12          │
│  [Type ▼] [Reliability ▼]         │  ────────────────────────── │
│  ──────────────────────────────── │  Type: HUMINT               │
│  A HUMINT-12                      │  Current Rating: B          │
│    Type: HUMINT                   │  Total Reports: 47          │
│    Rating: B (Usually Reliable)   │  Confirmed: 32 (68%)        │
│    Reports: 47                    │                             │
│                                   │  RATING HISTORY             │
│  B OSINT-Reuters                  │  ├─ Jan: B-2 (Confirmed)    │
│    Type: OSINT                    │  ├─ Dec: B-2 (Confirmed)    │
│    Rating: A (Completely Rel.)    │  ├─ Nov: B-3 (Possible)     │
│    Reports: 234                   │  └─ Oct: C-2 (Downgraded)   │
│                                   │                             │
│  C SIGINT-Feed-1                  │  RECENT REPORTS             │
│    Type: SIGINT                   │  ├─ 2025-01-18: Force movmt │
│    Rating: A                      │  ├─ 2025-01-15: Comms inter │
│    Reports: 89                    │  └─ 2025-01-10: Equipment   │
│                                   │                             │
│  D Social-Twitter                 │  [Edit] [Deactivate]        │
│    Type: OSINT                    │                             │
│    Rating: D                      │                             │
└───────────────────────────────────┴─────────────────────────────┘
```

**Reliability Scale (NATO Standard):**
| Code | Description | Expected Accuracy |
|------|-------------|-------------------|
| A | Completely Reliable | 90%+ |
| B | Usually Reliable | 70-90% |
| C | Fairly Reliable | 50-70% |
| D | Not Usually Reliable | 30-50% |
| E | Unreliable | <30% |
| F | Cannot Be Judged | Unknown |

---

### F.13: Report Generation Dashboard

**Purpose:** Create and export structured intelligence reports from collected data.

**Layout:** Report builder with templates and preview

```
┌─────────────────────────────────────────────────────────────────┐
│ REPORT GENERATION                    [Templates ▼] [+ New Report]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RECENT REPORTS                                                 │
│  ├─ SITREP-2025-01-20 (Draft)           [Edit] [Preview]        │
│  ├─ INTSUM-2025-01-19 (Published)       [View] [Export]         │
│  └─ Assessment-Q4-2024 (Published)      [View] [Export]         │
│                                                                 │
├───────────────────────────────┬─────────────────────────────────┤
│  REPORT BUILDER               │  LIVE PREVIEW                   │
│                               │  ┌───────────────────────────┐ │
│  Template: [SITREP ▼]         │  │ SITUATION REPORT          │ │
│  Title: [________________]    │  │ DTG: 201200ZJAN25         │ │
│  Classification: [UNCLAS ▼]   │  │                           │ │
│                               │  │ 1. SITUATION              │ │
│  SECTIONS                     │  │ [Auto-generated from      │ │
│  ┌───────────────────────┐   │  │  selected data...]        │ │
│  │ □ Executive Summary   │   │  │                           │ │
│  │ ☑ Situation Overview  │   │  │ 2. ENEMY FORCES           │ │
│  │ ☑ Enemy Forces        │   │  │ [Threat assessment data]  │ │
│  │ ☑ Friendly Forces     │   │  │                           │ │
│  │ □ Weather/Terrain     │   │  │ 3. FRIENDLY FORCES        │ │
│  │ ☑ Intelligence Summary│   │  │ [Selected content...]     │ │
│  │ ☑ PIR Status          │   │  │                           │ │
│  │ □ Attachments         │   │  │ 4. INTEL SUMMARY          │ │
│  └───────────────────────┘   │  │ [PIR answers, indicators] │ │
│                               │  │                           │ │
│  DATA SOURCES                 │  │ APPENDICES                │ │
│  ├─ Assessment: Q1 2025      │  │ A. Threat Matrix          │ │
│  ├─ PIRs: 3 selected         │  │ B. NAI Map                │ │
│  └─ Observations: 12 selected │  └───────────────────────────┘ │
│                               │                                 │
│  [Generate Draft] [AI Assist] │  [Export PDF] [Export DOCX]    │
└───────────────────────────────┴─────────────────────────────────┘
```

**Report Templates:**
- SITREP (Situation Report)
- INTSUM (Intelligence Summary)
- SPOTREP (Spot Report)
- Assessment Report
- Custom Template

---

## Implementation Tasks

| ID | Task | Agent | Priority | Dependencies |
|----|------|-------|----------|--------------|
| 6.1 | Create operational dashboard routing | `frontend-developer-designer` | Critical | Phase 3 |
| 6.2 | Build Collection Management layout | `ops-center-ui-expert` | Critical | 6.1 |
| 6.3 | Create PIR Kanban board | `frontend-developer-designer` | Critical | 6.2 |
| 6.4 | Build PIR detail panel | `frontend-developer-designer` | High | 6.2 |
| 6.5 | Create collection task management | `frontend-developer-designer` | High | 6.4 |
| 6.6 | Build Indicator Monitoring layout | `ops-center-ui-expert` | Critical | 6.1 |
| 6.7 | Create indicator list with status | `frontend-developer-designer` | High | 6.6 |
| 6.8 | Build observation input form | `frontend-developer-designer` | High | 6.6 |
| 6.9 | Create tripwire alert panel | `ops-center-ui-expert` | High | 6.6 |
| 6.10 | Build observation timeline | `tactical-visualization-expert` | Medium | 6.6 |
| 6.11 | Build NAI Dashboard layout | `ops-center-ui-expert` | High | 6.1 |
| 6.12 | Create NAI map component | `tactical-visualization-expert` | Critical | 6.11 |
| 6.13 | Build NAI list and details | `frontend-developer-designer` | High | 6.11 |
| 6.14 | Create tripwire management | `frontend-developer-designer` | High | 6.11 |
| 6.15 | Build Timeline Dashboard layout | `ops-center-ui-expert` | High | 6.1 |
| 6.16 | Create Gantt-style timeline | `tactical-visualization-expert` | Critical | 6.15 |
| 6.17 | Build event management | `frontend-developer-designer` | Medium | 6.15 |
| 6.18 | Create timeline filters | `frontend-developer-designer` | Medium | 6.15 |
| 6.19 | Build Source Reliability layout | `ops-center-ui-expert` | High | 6.1 |
| 6.20 | Create reliability matrix viz | `tactical-visualization-expert` | High | 6.19 |
| 6.21 | Build source list and details | `frontend-developer-designer` | High | 6.19 |
| 6.22 | Create rating history chart | `tactical-visualization-expert` | Medium | 6.19 |
| 6.23 | Build Report Generation layout | `ops-center-ui-expert` | High | 6.1 |
| 6.24 | Create report builder form | `frontend-developer-designer` | High | 6.23 |
| 6.25 | Build live preview component | `frontend-developer-designer` | High | 6.23 |
| 6.26 | Create PDF/DOCX export | `node-developer` | High | 6.23 |
| 6.27 | Implement AI report assistance | `intelligence-analysis-expert` | Medium | 6.23, Phase 8 |

---

## Detailed Component Specifications

### PIR Kanban Board

**File: `apps/web/src/features/intel/collection/PirKanban.tsx`**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { cn } from '@/lib/utils';
import { PirCard } from './PirCard';

type PirStatus = 'draft' | 'active' | 'collecting' | 'answered';

interface Pir {
  id: string;
  question: string;
  priority: 'flash' | 'immediate' | 'priority' | 'routine';
  status: PirStatus;
  dueDate?: string;
  taskCount?: number;
}

interface PirKanbanProps {
  pirs: Pir[];
  onSelect: (pir: Pir) => void;
  selectedId?: string;
}

const columns: { id: PirStatus; label: string }[] = [
  { id: 'draft', label: 'Draft' },
  { id: 'active', label: 'Active' },
  { id: 'collecting', label: 'Collecting' },
  { id: 'answered', label: 'Answered' },
];

const priorityColors = {
  flash: 'border-l-tactical-red',
  immediate: 'border-l-orange-500',
  priority: 'border-l-tactical-amber',
  routine: 'border-l-muted',
};

export function PirKanban({ pirs, onSelect, selectedId }: PirKanbanProps) {
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PirStatus }) => {
      // API call to update PIR status
      const response = await fetch(`/api/pirs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pirs'] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const newStatus = over.id as PirStatus;
      updateStatus.mutate({ id: active.id as string, status: newStatus });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-4 gap-4 h-full">
        {columns.map((column) => {
          const columnPirs = pirs.filter((p) => p.status === column.id);

          return (
            <div
              key={column.id}
              className="flex flex-col bg-card rounded-lg border border-border"
            >
              <div className="p-3 border-b border-border">
                <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
                  {column.label}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {columnPirs.length} items
                </span>
              </div>

              <SortableContext
                items={columnPirs.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {columnPirs.map((pir) => (
                    <PirCard
                      key={pir.id}
                      pir={pir}
                      isSelected={pir.id === selectedId}
                      onClick={() => onSelect(pir)}
                      className={cn(
                        'border-l-4',
                        priorityColors[pir.priority]
                      )}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
```

### Indicator Status List

**File: `apps/web/src/features/intel/indicators/IndicatorList.tsx`**
```typescript
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type IndicatorStatus = 'not_observed' | 'partially_observed' | 'fully_observed';

interface Indicator {
  id: string;
  name: string;
  status: IndicatorStatus;
  pirId: string;
  pirQuestion: string;
  progress: number;
  lastUpdate?: string;
  observationCount: number;
}

interface IndicatorListProps {
  indicators: Indicator[];
  onSelect: (indicator: Indicator) => void;
  selectedId?: string;
}

const statusConfig: Record<IndicatorStatus, { icon: string; color: string; label: string }> = {
  not_observed: { icon: '○', color: 'text-muted-foreground', label: 'Not Observed' },
  partially_observed: { icon: '◐', color: 'text-tactical-amber', label: 'Partial' },
  fully_observed: { icon: '●', color: 'text-tactical-green', label: 'Observed' },
};

export function IndicatorList({ indicators, onSelect, selectedId }: IndicatorListProps) {
  return (
    <div className="space-y-2">
      {indicators.map((indicator) => {
        const config = statusConfig[indicator.status];
        const isSelected = indicator.id === selectedId;

        return (
          <div
            key={indicator.id}
            onClick={() => onSelect(indicator)}
            className={cn(
              'p-3 rounded-lg border cursor-pointer transition-colors',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className="flex items-start gap-3">
              <span className={cn('text-xl', config.color)}>
                {config.icon}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm truncate">
                    {indicator.name}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {config.label}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground mt-1 truncate">
                  PIR: {indicator.pirQuestion}
                </p>

                {indicator.status === 'partially_observed' && (
                  <div className="mt-2">
                    <Progress value={indicator.progress} className="h-1" />
                    <span className="text-xs text-muted-foreground">
                      {indicator.progress}% observed
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{indicator.observationCount} observations</span>
                  {indicator.lastUpdate && (
                    <span>Updated: {indicator.lastUpdate}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### Timeline Component

**File: `apps/web/src/features/timeline/TimelineChart.tsx`**
```typescript
import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

interface TimelineEvent {
  id: string;
  type: 'assessment' | 'pir' | 'observation' | 'alert' | 'event';
  title: string;
  start: Date;
  end?: Date;
  color?: string;
}

interface TimelineChartProps {
  events: TimelineEvent[];
  startDate: Date;
  endDate: Date;
  onEventClick?: (event: TimelineEvent) => void;
}

const typeColors: Record<TimelineEvent['type'], string> = {
  assessment: '#00d4ff',
  pir: '#00ff88',
  observation: '#a855f7',
  alert: '#ff3333',
  event: '#ffaa00',
};

const typeRows: TimelineEvent['type'][] = ['assessment', 'pir', 'observation', 'alert', 'event'];

export function TimelineChart({ events, startDate, endDate, onEventClick }: TimelineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll('*').remove();

    const margin = { top: 30, right: 20, bottom: 30, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleTime()
      .domain([startDate, endDate])
      .range([0, innerWidth]);

    const yScale = d3.scaleBand()
      .domain(typeRows)
      .range([0, innerHeight])
      .padding(0.2);

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(7))
      .attr('color', '#737373');

    // Y Axis labels
    g.append('g')
      .selectAll('text')
      .data(typeRows)
      .join('text')
      .attr('x', -10)
      .attr('y', d => (yScale(d) || 0) + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#a3a3a3')
      .attr('font-size', '12px')
      .text(d => d.charAt(0).toUpperCase() + d.slice(1));

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(xScale.ticks(7))
      .join('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#2a2a2a')
      .attr('stroke-dasharray', '2,2');

    // Events
    events.forEach(event => {
      const y = yScale(event.type) || 0;
      const x = xScale(event.start);
      const color = event.color || typeColors[event.type];

      if (event.end) {
        // Duration bar
        const width = xScale(event.end) - x;
        g.append('rect')
          .attr('x', x)
          .attr('y', y)
          .attr('width', Math.max(width, 4))
          .attr('height', yScale.bandwidth())
          .attr('fill', color)
          .attr('rx', 4)
          .attr('cursor', 'pointer')
          .on('click', () => onEventClick?.(event));

        // Label
        if (width > 50) {
          g.append('text')
            .attr('x', x + 8)
            .attr('y', y + yScale.bandwidth() / 2)
            .attr('dominant-baseline', 'middle')
            .attr('fill', '#0a0a0a')
            .attr('font-size', '10px')
            .text(event.title);
        }
      } else {
        // Point marker
        g.append('circle')
          .attr('cx', x)
          .attr('cy', y + yScale.bandwidth() / 2)
          .attr('r', 6)
          .attr('fill', color)
          .attr('cursor', 'pointer')
          .on('click', () => onEventClick?.(event));
      }
    });

    // Today marker
    const today = new Date();
    if (today >= startDate && today <= endDate) {
      const todayX = xScale(today);
      g.append('line')
        .attr('x1', todayX)
        .attr('x2', todayX)
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#ff3333')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4');

      g.append('text')
        .attr('x', todayX)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ff3333')
        .attr('font-size', '10px')
        .text('TODAY');
    }

  }, [events, startDate, endDate, onEventClick]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ minHeight: '300px' }}
    />
  );
}
```

---

## API Endpoints Required

### PIRs & Collection
```
GET /api/projects/:id/pirs
POST /api/projects/:id/pirs
PATCH /api/pirs/:id
DELETE /api/pirs/:id
GET /api/pirs/:id/tasks
POST /api/pirs/:id/tasks
```

### Indicators & Observations
```
GET /api/pirs/:id/indicators
POST /api/pirs/:id/indicators
PATCH /api/indicators/:id
POST /api/indicators/:id/observations
GET /api/observations?indicatorId=
```

### NAIs & Tripwires
```
GET /api/projects/:id/nais
POST /api/projects/:id/nais
PATCH /api/nais/:id
POST /api/nais/:id/tripwires
GET /api/tripwires/:id/alerts
```

### Sources
```
GET /api/projects/:id/sources
POST /api/projects/:id/sources
PATCH /api/sources/:id
GET /api/sources/:id/history
```

### Reports
```
GET /api/projects/:id/reports
POST /api/projects/:id/reports
GET /api/reports/:id
POST /api/reports/:id/generate
GET /api/reports/:id/export?format=pdf|docx
```

---

## Acceptance Criteria

- [ ] PIR Kanban supports drag-and-drop status changes
- [ ] Collection tasks link to PIRs and sources
- [ ] Indicator status updates reflect in real-time
- [ ] Observations can be added with source reliability
- [ ] Tripwires trigger alerts when conditions met
- [ ] NAI map displays markers with popups
- [ ] Timeline supports zoom and pan
- [ ] Event filtering works correctly
- [ ] Source reliability matrix visualizes A-F/1-6 grid
- [ ] Reports can be exported to PDF/DOCX
- [ ] All dashboards maintain dark theme

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/web/src/routes/_app.intel.collection.tsx` | Collection Management page |
| `apps/web/src/routes/_app.intel.indicators.tsx` | Indicator Monitoring page |
| `apps/web/src/routes/_app.intel.nais.tsx` | NAI Dashboard page |
| `apps/web/src/routes/_app.intel.timeline.tsx` | Timeline page |
| `apps/web/src/routes/_app.intel.sources.tsx` | Source Reliability page |
| `apps/web/src/routes/_app.intel.reports.tsx` | Report Generation page |
| `apps/web/src/features/intel/collection/` | Collection components |
| `apps/web/src/features/intel/indicators/` | Indicator components |
| `apps/web/src/features/intel/nais/` | NAI components |
| `apps/web/src/features/timeline/` | Timeline components |
| `apps/web/src/features/sources/` | Source components |
| `apps/web/src/features/reports/` | Report components |
