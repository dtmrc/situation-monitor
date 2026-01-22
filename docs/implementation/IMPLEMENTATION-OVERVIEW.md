# Situation Monitor - Implementation Overview

## Project Summary

Situation Monitor is a strategic planning and intelligence analysis platform that translates JP 5-0 military planning doctrine into accessible software tools. This documentation provides a phased implementation roadmap for building the complete system.

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18+ | UI framework with concurrent features |
| TypeScript | 5.x | Type safety throughout |
| Vite | 5.x | Build tooling and dev server |
| TanStack Query | 5.x | Server state management, caching |
| TanStack Router | 1.x | Type-safe file-based routing |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui | Latest | Component library (Radix + Tailwind) |
| D3.js | 7.x | Data visualizations |
| Mapbox GL JS | 3.x | Geospatial mapping |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 LTS | Runtime environment |
| TypeScript | 5.x | Type safety |
| Hono | 4.x | Lightweight API framework |
| PostgreSQL | 14 | Primary database |
| pgvector | 0.7+ | Vector embeddings for RAG |
| Drizzle ORM | Latest | Type-safe database queries |
| Redis | 7.x | Caching, sessions, pub/sub |
| BullMQ | 5.x | Background job processing |

### AI/ML
| Technology | Purpose |
|------------|---------|
| Claude API | Primary LLM for analysis assistance |
| OpenAI API | Alternative/fallback LLM |
| pgvector | Vector storage for RAG pipeline |

---

## Phase Dependency Graph

```
Phase 0 (Infrastructure)
    │
    └── Phase 1 (Data Layer)
         │
         └── Phase 2 (Backend API)
              │
              └── Phase 3 (Frontend Foundation)
                   │
                   ├── Phase 4 (Strategic Dashboards)
                   │
                   ├── Phase 5 (Analysis Dashboards)    ──┐
                   │                                      │ Parallel
                   └── Phase 6 (Operational Dashboards)  ─┘
                        │
                        └── Phase 7 (Geospatial Command Center)
                             │
                             ├── Phase 8 (RAG/AI Integration)  ──┐
                             │                                   │ Parallel
                             └── Phase 9 (Real-Time Data Feeds) ─┘
                                  │
                                  └── Phase 10 (Testing, CI/CD & Deployment)
```

**Parallel Execution Points:**
- Phases 4, 5, 6 can run concurrently after Phase 3 completes
- Phases 8, 9 can run concurrently after Phase 7 completes

**Note:** Phase 10 (Testing/CI/CD) can begin partially in Phase 0 for infrastructure setup, but full test coverage requires all phases to be complete.

---

## Phase Documents

| Phase | Document | Scope |
|-------|----------|-------|
| 0 | [00-INFRASTRUCTURE-SETUP.md](./00-INFRASTRUCTURE-SETUP.md) | Monorepo, tooling, dev environment (see sub-documents below) |
| 1 | [01-DATA-LAYER.md](./01-DATA-LAYER.md) | PostgreSQL schemas, pgvector, migrations (see sub-documents below) |
| 2 | [02-BACKEND-API.md](./02-BACKEND-API.md) | Hono API, auth, core services |
| 3 | [03-FRONTEND-FOUNDATION.md](./03-FRONTEND-FOUNDATION.md) | React, TanStack, design system (see sub-documents below) |
| 4 | [04-DASHBOARD-STRATEGIC.md](./04-DASHBOARD-STRATEGIC.md) | F.1, F.14, F.15, F.16, F.17 dashboards |
| 5 | [05-DASHBOARD-ANALYSIS.md](./05-DASHBOARD-ANALYSIS.md) | F.2, F.4, F.7, F.8, F.9, F.10 dashboards |
| 6 | [06-DASHBOARD-OPERATIONAL.md](./06-DASHBOARD-OPERATIONAL.md) | F.3, F.5, F.6, F.11, F.12, F.13 dashboards |
| 7 | [07-GEOSPATIAL-COMMAND.md](./07-GEOSPATIAL-COMMAND.md) | F.0 map-centric interface |
| 8 | [08-RAG-AI-INTEGRATION.md](./08-RAG-AI-INTEGRATION.md) | pgvector RAG, embeddings, LLM |
| 9 | [09-REALTIME-DATA-FEEDS.md](./09-REALTIME-DATA-FEEDS.md) | F.19 data sources, WebSocket (see sub-documents below) |
| 10 | [10-TESTING-CICD-DEPLOYMENT.md](./10-TESTING-CICD-DEPLOYMENT.md) | Testing, CI/CD, deployment |

### Phase 0 Sub-Documents

| Document | Scope | Tasks |
|----------|-------|-------|
| [00a-DOCKER-CONFIGURATION.md](./00a-DOCKER-CONFIGURATION.md) | Docker Compose, Dockerfiles, nginx, production config | 0.5, production |

### Phase 1 Sub-Documents

| Document | Scope | Tasks |
|----------|-------|-------|
| [01a-SEED-DATA.md](./01a-SEED-DATA.md) | Development seed data, sample data for testing | 1.11 |

### Phase 3 Sub-Documents

| Document | Scope | Tasks |
|----------|-------|-------|
| [03a-VISUAL-COMPONENTS.md](./03a-VISUAL-COMPONENTS.md) | Tailwind theme, shadcn/ui, layout components | 3.4-3.9 |
| [03b-ROUTES-AUTHENTICATION.md](./03b-ROUTES-AUTHENTICATION.md) | TanStack Router/Query, auth flow, pages | 3.1-3.3, 3.10-3.12 |

### Phase 9 Sub-Documents

Phase 9 is split into focused sub-documents for smaller implementation units:

| Document | Scope | Tasks |
|----------|-------|-------|
| [09a-REALTIME-INFRASTRUCTURE.md](./09a-REALTIME-INFRASTRUCTURE.md) | WebSocket server, BullMQ queues, Redis pub/sub, Feed adapter interface | 9.1-9.4 |
| [09b-FEED-NEWS-OSINT.md](./09b-FEED-NEWS-OSINT.md) | NewsAPI, RSS, GDELT adapters, content enrichment | 9.5 |
| [09c-FEED-FLIGHT-TRACKING.md](./09c-FEED-FLIGHT-TRACKING.md) | ADS-B Exchange adapter, flight tracking map layer | 9.6, 9.12 |
| [09d-FEED-MARITIME-TRACKING.md](./09d-FEED-MARITIME-TRACKING.md) | AIS maritime tracking adapter, vessel layer | 9.7, 9.13 |
| [09e-FEED-CIVIL-UNREST.md](./09e-FEED-CIVIL-UNREST.md) | ACLED + GDELT civil unrest adapters, event clustering | 9.18-9.20 |
| [09f-FEED-INFRASTRUCTURE-FIRE.md](./09f-FEED-INFRASTRUCTURE-FIRE.md) | NASA FIRMS fire detection adapter, thermal layer | 9.21-9.22 |
| [09g-FEED-AVIATION-INCIDENTS.md](./09g-FEED-AVIATION-INCIDENTS.md) | ASN adapter, ADS-B anomaly detection (squawk codes) | 9.23-9.25 |
| [09h-FEED-TELEGRAM-OSINT.md](./09h-FEED-TELEGRAM-OSINT.md) | Telegram channel ingestion via GramJS, translation | 9.26-9.28 |
| [09i-REALTIME-PROCESSING.md](./09i-REALTIME-PROCESSING.md) | Normalizer service, Tripwire worker, Live feed panel, Timeline scrubber | 9.9-9.11, 9.14-9.17 |
| [09j-REALTIME-OPERATIONS.md](./09j-REALTIME-OPERATIONS.md) | Feed management API, data retention, WebSocket reconnection, health monitoring | — |

### Setup Guides

Step-by-step configuration guides for specific integrations:

| Guide | Scope |
|-------|-------|
| [TELEGRAM-SETUP.md](../guides/TELEGRAM-SETUP.md) | Telegram OSINT feed: MTProto credentials, session setup, channel configuration, translation |

---

## Dashboard Suite Reference

### F.0: Geospatial Command Center (Primary Interface)
The central hub - a map-centric interface with floating panels and 9-layer architecture.

### Strategic Dashboards (Phase 4)
| ID | Dashboard | Purpose |
|----|-----------|---------|
| F.1 | Executive Command | High-level situation overview |
| F.14 | Political Landscape | Government structure analysis |
| F.15 | Alliance Mapping | Relationship networks |
| F.16 | Scenario Comparison | What-if analysis |
| F.17 | Strategic Synthesis | Integrated assessment |

### Analysis Dashboards (Phase 5)
| ID | Dashboard | Purpose |
|----|-----------|---------|
| F.2 | PMESII-PT Analysis | 8-domain environmental scanning |
| F.4 | Threat Assessment | Probability × Impact matrices |
| F.7 | Center of Gravity | CC/CR/CV relationship mapping |
| F.8 | Analysis of Competing Hypotheses | Structured analytical technique |
| F.9 | Risk Matrix | Risk categorization and tracking |
| F.10 | Trend Analysis | Pattern detection over time |

### Operational Dashboards (Phase 6)
| ID | Dashboard | Purpose |
|----|-----------|---------|
| F.3 | Collection Management | PIR/NAI/source tracking |
| F.5 | Indicator Monitoring | Tripwire and threshold tracking |
| F.6 | NAI Dashboard | Named Area of Interest management |
| F.11 | Timeline Dashboard | Temporal event visualization |
| F.12 | Source Reliability | Source evaluation matrix |
| F.13 | Report Generation | Automated reporting workflows |

---

## Design System

### Theme: Ops-Center Dark

```css
/* Core Palette */
--bg-primary: #0a0a0a;        /* Near-black base */
--bg-secondary: #111111;       /* Elevated surfaces */
--bg-tertiary: #1a1a1a;        /* Cards, panels */
--border: #2a2a2a;             /* Subtle borders */

/* Text */
--text-primary: #e5e5e5;       /* Primary text */
--text-secondary: #a3a3a3;     /* Secondary text */
--text-muted: #737373;         /* Muted text */

/* Accent Colors */
--accent-green: #00ff88;       /* Terminal green - success, active */
--accent-blue: #00d4ff;        /* Tactical blue - info, links */
--accent-amber: #ffaa00;       /* Warning states */
--accent-red: #ff3333;         /* Critical, danger */
--accent-purple: #a855f7;      /* AI/analysis features */

/* Typography */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
--font-sans: 'Inter', system-ui, sans-serif;
```

### Visual Elements
- **Scanline overlays** for tactical CRT aesthetic
- **Grid-based layouts** with clear visual hierarchy
- **Glowing borders** on focus/hover states
- **Monospace fonts** for data displays and metrics
- **High contrast** for low-light readability

---

## Core Domain Models

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Project   │────▶│  Assessment │────▶│   Factor    │
│             │     │             │     │ (PMESII-PT) │
└─────────────┘     └─────────────┘     └─────────────┘
      │
      │             ┌─────────────┐     ┌─────────────┐
      ├────────────▶│     PIR     │────▶│  Indicator  │
      │             │             │     │             │
      │             └─────────────┘     └──────┬──────┘
      │                                        │
      │             ┌─────────────┐     ┌──────▼──────┐
      ├────────────▶│     NAI     │────▶│ Observation │
      │             │             │     │             │
      │             └──────┬──────┘     └─────────────┘
      │                    │
      │             ┌──────▼──────┐
      │             │  Tripwire   │
      │             │             │
      │             └─────────────┘
      │
      │             ┌─────────────┐
      └────────────▶│   Source    │
                    │             │
                    └─────────────┘
```

---

## Sub-Agent Delegation Guide

Each phase document includes sub-agent delegation tables. Available agents:

| Agent | Expertise |
|-------|-----------|
| `node-developer` | Backend API, TypeScript, PostgreSQL, AWS |
| `frontend-developer-designer` | React, TanStack, shadcn/ui, Tailwind |
| `intelligence-analysis-expert` | JP 5-0 doctrine, PMESII-PT, CoG, PIR/NAI |
| `tactical-visualization-expert` | D3.js, Mapbox, charts, tactical styling |
| `ops-center-ui-expert` | Dark theme, scanlines, ops-center aesthetics |
| `rag-pipeline-expert` | pgvector, embeddings, LLM integration |

---

## Getting Started

1. **Read Phase 0** - Set up the monorepo and development environment
2. **Follow sequential phases** - Complete 0→1→2→3 in order
3. **Parallelize where possible** - Phases 4/5/6 and 8/9 can run concurrently
4. **Reference the source** - See `docs/STRATEGIC_PLANNING_OPERATIONAL_ENVIRONMENT.md` for detailed specifications

---

## File Structure (Target)

```
situation-monitor/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/     # Shared UI components
│   │   │   ├── features/       # Feature modules
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── lib/            # Utilities
│   │   │   ├── routes/         # TanStack Router pages
│   │   │   └── styles/         # Global styles
│   │   └── index.html
│   └── api/                    # Hono backend
│       ├── src/
│       │   ├── routes/         # API routes
│       │   ├── services/       # Business logic
│       │   ├── db/             # Database schemas
│       │   └── lib/            # Utilities
│       └── drizzle/            # Migrations
├── packages/
│   ├── shared/                 # Shared types
│   └── ui/                     # Shared UI (optional)
├── docker/
├── docs/
│   └── implementation/         # This documentation
└── package.json                # Workspace root
```

---

## Architectural Decisions

Key decisions made during implementation planning:

### Authentication & Authorization
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth Method | Password-only (email/password) | Simplicity for initial release; OAuth/SSO deferred |
| Session Management | JWT with refresh tokens | Stateless API, easy horizontal scaling |
| Password Reset | Email-based token flow | Standard secure approach |

### Multi-Tenancy
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tenancy Model | Row-level with `organization_id` | Simpler than schema-per-tenant, good for <10 users |
| Data Isolation | Foreign key + query filters | `tenantFilter()` helper ensures consistent filtering |
| Soft Delete | `deletedAt` timestamp | Audit trail, easy recovery, query exclusion |

### Deployment & Infrastructure
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Deployment | Docker Compose (self-hosted) | Small team, single-server simplicity |
| CI/CD | GitHub Actions | Native GitHub integration, free for public repos |
| Container Registry | GitHub Container Registry (ghcr.io) | Integrated with GitHub Actions |

### AI & Embeddings
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Embedding Model | Multi-provider (OpenAI + Ollama) | Flexibility, local option for sensitive data |
| LLM Provider | Multi-provider (Claude + OpenAI) | Redundancy, model-specific strengths |
| Vector Storage | pgvector (dynamic dimensions) | Single database, model-agnostic embeddings |

### Frontend
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Offline Support | Basic PWA (cache assets + offline indicator) | Simple offline awareness without full sync |
| Map Style | Custom tactical Mapbox style | Ops-center aesthetic, dark theme consistency |
| Toast System | Sonner | Lightweight, good UX, TailwindCSS compatible |
| Form Handling | React Hook Form + Zod | Type-safe validation, good DX |

### Data Management
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Feed Data Retention | 7-day rolling window | Balance storage vs. historical analysis |
| Historical Aggregates | Daily summary tables | Preserve trends without raw data bloat |
| Pagination | Cursor-based for feeds | Efficient for real-time data streams |

### Testing
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Unit/Integration | Vitest | Fast, Vite-native, TypeScript-first |
| E2E Tests | Playwright | Cross-browser, reliable, good DX |
| Coverage Targets | 70% backend, 60% frontend | Practical balance for small team |

### Notifications
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Notification Channels | In-app only (toast + notification panel) | Simplicity; email/push deferred |

---

## Future Considerations

Items deferred for later phases:

- **OAuth/SSO** - Google, GitHub, SAML for enterprise
- **Export Formats** - PDF reports, CSV exports, API integrations
- **Email Notifications** - Alert subscriptions, digests
- **Push Notifications** - Mobile PWA push, browser notifications
- **Full Offline Sync** - Local database with sync queue
- **Kubernetes** - Production orchestration at scale
- **Multi-region** - Geographic redundancy and latency optimization
