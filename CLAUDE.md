# CLAUDE.md - Situation Monitor Project Context

## Project Overview

**Situation Monitor** (internal codename: Strategic Assessment Platform / SAP) is a strategic planning and intelligence analysis web application that translates JP 5-0 military planning doctrine into software for structured decision-making under uncertainty.

### Purpose
Transform complex strategic assessment methodologies used by military planners into accessible tools for:
- Personal security planning & High Net Worth Individuals
- VC & PE portfolio risk and due diligence
- Startup market entry and competitive intelligence
- Corporate strategy, M&A, and geopolitical risk
- Security & Risk consulting firms
- Government & Defense organizations

---

## Core Concepts

### PMESII-PT Analysis Framework
Structured environmental analysis across eight domains:
- **P**olitical - Government stability, policy changes, regulatory environment
- **M**ilitary - Security forces, defense posture, conflict potential
- **E**conomic - Market conditions, financial stability, trade dynamics
- **S**ocial - Demographics, cultural factors, public sentiment
- **I**nformation - Media landscape, narratives, information operations
- **I**nfrastructure - Critical systems, transportation, utilities
- **P**hysical Environment - Geography, climate, natural resources
- **T**ime - Temporal factors, deadlines, windows of opportunity

### Threat Assessment Matrix
Risk analysis using Probability × Impact calculations:
- Configurable probability scales (1-5 or percentage-based)
- Impact categories (negligible, minor, moderate, significant, catastrophic)
- Visual heat map representation
- Historical trend tracking

### Center of Gravity (CoG) Analysis
Identifying critical nodes in systems:
- **Critical Capabilities (CC)** - What the CoG can do
- **Critical Requirements (CR)** - What the CoG needs to function
- **Critical Vulnerabilities (CV)** - Exploitable weaknesses

### Intelligence Collection
- **Priority Intelligence Requirements (PIRs)** - Key questions requiring answers
- **Named Areas of Interest (NAIs)** - Geographic or topical focus areas
- **Collection plans** - Assigned sources and methods

### Tripwire/Indicator Monitoring
Early warning system with:
- Configurable thresholds and triggers
- Multi-source data aggregation
- Alert escalation workflows
- Historical indicator tracking

---

## Architecture

### 4-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  React 18 + TypeScript │ shadcn/ui │ TanStack Router/Query  │
│  D3.js Visualizations │ Mapbox/Leaflet │ Tailwind CSS       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│  NestJS/Hono API │ Business Logic │ Authentication          │
│  RBAC │ Validation │ Rate Limiting                          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                             │
│  PostgreSQL + pgvector │ Redis Cache │ BullMQ Jobs          │
│  Drizzle/Prisma ORM │ Migrations                            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    INTEGRATION LAYER                         │
│  LLM APIs (Claude/OpenAI) │ RAG Pipeline │ External APIs    │
│  Webhooks │ Data Ingestion │ Export Services                │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18+ | UI framework with concurrent features |
| TypeScript | Type safety throughout |
| shadcn/ui | Component library (Radix primitives + Tailwind) |
| TanStack Query | Server state management, caching |
| TanStack Router | Type-safe file-based routing |
| D3.js | Data visualizations, charts |
| Mapbox/Leaflet | Geospatial mapping features |
| Tailwind CSS | Utility-first styling |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| TypeScript | Type safety |
| NestJS or Hono | API framework |
| PostgreSQL | Primary database |
| pgvector | Vector embeddings for RAG |
| Redis | Caching, sessions |
| BullMQ | Background job processing |

### AI/ML
| Technology | Purpose |
|------------|---------|
| Claude API | Primary LLM for analysis |
| OpenAI API | Alternative LLM option |
| pgvector | Vector storage for RAG |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Kubernetes | Orchestration (production) |
| Terraform | Infrastructure as Code |
| AWS/GCP/Azure | Cloud platform support |

---

## Design System

### Theme: Ops-Center Dark
Inspired by tactical operations centers and situation.watch:

```css
/* Core Colors */
--background: #0a0a0a;       /* Near-black base */
--foreground: #e5e5e5;       /* Light gray text */
--accent-green: #00ff88;     /* Terminal green */
--accent-blue: #00d4ff;      /* Tactical blue */
--accent-amber: #ffaa00;     /* Warning/alert */
--accent-red: #ff3333;       /* Critical/danger */

/* Typography */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
--font-sans: 'Inter', system-ui, sans-serif;
```

### Visual Elements
- Scanline overlays for tactical aesthetic
- Grid-based layouts with clear hierarchy
- Glowing borders on focus/active states
- Monospace fonts for data displays
- High contrast for accessibility in low-light

---

## Project Structure

```
situation-monitor/
├── apps/
│   ├── web/                 # React frontend application
│   │   ├── src/
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── features/    # Feature-based modules
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── lib/         # Utilities and helpers
│   │   │   ├── routes/      # TanStack Router pages
│   │   │   └── styles/      # Global styles
│   │   └── public/
│   └── api/                 # Backend API service
│       ├── src/
│       │   ├── modules/     # Feature modules
│       │   ├── common/      # Shared utilities
│       │   ├── config/      # Configuration
│       │   └── database/    # DB schemas, migrations
│       └── test/
├── packages/                # Shared packages (if monorepo)
│   ├── shared/              # Shared types and utilities
│   └── ui/                  # Shared UI components
├── infrastructure/          # Terraform/IaC configs
├── docker/                  # Docker configurations
└── docs/                    # Additional documentation
```

---

## Core Modules

### 1. Situations
Container for all analysis related to a specific scenario or operation.
- Metadata (name, description, timeframe)
- Associated PMESII-PT analyses
- Linked assessments and collections

### 2. PMESII-PT Analysis
Environmental scanning module with:
- Domain-specific data entry forms
- AI-assisted analysis suggestions
- Trend tracking over time
- Export to standard formats

### 3. Threat Assessment
Risk matrix functionality:
- Threat actor profiles
- Probability/impact scoring
- Visual heat map display
- Mitigation tracking

### 4. Center of Gravity
CoG analysis workspace:
- CC/CR/CV identification
- Relationship mapping
- Vulnerability prioritization

### 5. Intelligence Collection
PIR and NAI management:
- Collection plan builder
- Source assignment
- Status tracking
- Reporting integration

### 6. Tripwire Monitoring
Early warning system:
- Indicator definition
- Threshold configuration
- Alert management
- Dashboard displays

---

## Development Conventions

### Code Style
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use named exports (not default exports)
- Follow ESLint/Prettier configurations

### Naming Conventions
- **Components**: PascalCase (`ThreatMatrix.tsx`)
- **Hooks**: camelCase with `use` prefix (`useSituation.ts`)
- **Utils**: camelCase (`formatDate.ts`)
- **Types**: PascalCase with descriptive names (`ThreatAssessment`)
- **Constants**: SCREAMING_SNAKE_CASE

### File Organization
- Co-locate related files (component + styles + tests)
- Feature-based folder structure over type-based
- Index files for clean imports

### API Conventions
- RESTful endpoints with consistent naming
- Use DTOs for request/response validation
- Implement proper error handling with typed errors
- Version APIs when breaking changes occur

---

## Common Tasks

### Development Commands
```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Run linting
pnpm lint

# Database migrations
pnpm db:migrate
pnpm db:seed
```

### Adding a New Feature
1. Create feature folder in `apps/web/src/features/`
2. Define types in `types.ts`
3. Create API hooks in `hooks/`
4. Build components in `components/`
5. Add route in `apps/web/src/routes/`
6. Create corresponding API module in `apps/api/src/modules/`

### Database Changes
1. Create migration file
2. Update schema definitions
3. Run migration
4. Update types if using code generation

---

## Key Decisions

### Why TanStack over Redux?
- Built-in caching and synchronization
- Less boilerplate
- Type-safe by design
- Optimistic updates support

### Why shadcn/ui?
- Copy-paste component ownership
- Highly customizable
- Radix primitives for accessibility
- Tailwind integration

### Why PostgreSQL + pgvector?
- Single database for relational + vector data
- Simplified infrastructure
- Strong ACID compliance
- Mature ecosystem

---

## Security Considerations

- All user input must be validated and sanitized
- Use parameterized queries (ORM handles this)
- Implement proper RBAC for multi-tenant scenarios
- Encrypt sensitive data at rest
- Use HTTPS everywhere
- Implement rate limiting on all endpoints
- Audit logging for sensitive operations

---

## Testing Strategy

- **Unit Tests**: Business logic, utilities
- **Integration Tests**: API endpoints, database operations
- **Component Tests**: React components with Testing Library
- **E2E Tests**: Critical user flows with Playwright

---

## Resources

- [JP 5-0 Joint Planning Doctrine](https://www.jcs.mil/Doctrine/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [TanStack Query Docs](https://tanstack.com/query)
- [TanStack Router Docs](https://tanstack.com/router)
