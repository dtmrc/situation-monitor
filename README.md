# Situation Monitor

**Strategic planning and intelligence analysis for decision-making under uncertainty.**

Situation Monitor translates JP 5-0 military planning doctrine into accessible software tools for structured threat assessment, environmental analysis, and early warning systems.

---

## Features

### PMESII-PT Analysis
Comprehensive environmental scanning across Political, Military, Economic, Social, Information, Infrastructure, Physical Environment, and Time domains.

### Threat Assessment Matrix
Visual risk analysis using probability × impact calculations with configurable scales, heat map displays, and historical trend tracking.

### Center of Gravity Analysis
Identify and analyze critical capabilities, requirements, and vulnerabilities within complex systems.

### Intelligence Collection Management
Organize Priority Intelligence Requirements (PIRs), Named Areas of Interest (NAIs), and collection plans with source tracking.

### Tripwire Monitoring
Early warning system with configurable indicators, thresholds, and alert escalation workflows.

### AI-Powered Analysis
LLM integration for analysis suggestions, pattern recognition, and report generation.

---

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- PostgreSQL 15+ (with pgvector extension)
- Redis 7+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/situation-monitor.git
cd situation-monitor

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

The application will be available at `http://localhost:5173` (frontend) and `http://localhost:3000` (API).

---

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **shadcn/ui** component library
- **TanStack Query** for data fetching
- **TanStack Router** for navigation
- **D3.js** for visualizations
- **Mapbox/Leaflet** for geospatial features
- **Tailwind CSS** with custom ops-center dark theme

### Backend
- **Node.js** with TypeScript
- **NestJS** or **Hono** API framework
- **PostgreSQL** with pgvector extension
- **Redis** for caching
- **BullMQ** for background jobs

### AI/ML
- LLM integration (Claude, OpenAI)
- RAG pipeline using pgvector for semantic search

### Infrastructure
- Docker containerization
- Kubernetes orchestration
- Terraform IaC
- Multi-cloud support (AWS/GCP/Azure)

---

## Project Structure

```
situation-monitor/
├── apps/
│   ├── web/                 # React frontend
│   └── api/                 # Node.js backend
├── packages/                # Shared packages
├── infrastructure/          # Terraform configs
├── docker/                  # Docker configs
└── docs/                    # Documentation
```

---

## Development

```bash
# Start development servers
pnpm dev

# Run tests
pnpm test

# Run linting
pnpm lint

# Build for production
pnpm build

# Database operations
pnpm db:migrate          # Run migrations
pnpm db:seed             # Seed database
pnpm db:studio           # Open database GUI
```

---

## Design

Ops-center dark theme inspired by tactical operations centers:

- Near-black background (`#0a0a0a`)
- Terminal green and tactical blue accents
- Monospace fonts for data displays
- High contrast for low-light readability
- Scanline overlays for tactical aesthetic

---

## Target Markets

- Personal security planning & High Net Worth Individuals
- VC & PE portfolio risk and due diligence
- Startup market entry and competitive intelligence
- Corporate strategy, M&A, and geopolitical risk
- Security & Risk consulting
- Government & Defense

---

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Detailed project context for AI assistants
- [Architecture Guide](./docs/architecture.md) - System design documentation
- [API Reference](./docs/api.md) - API endpoint documentation
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines

---

## License

[License Type] - See [LICENSE](./LICENSE) for details.

---

## Acknowledgments

Built upon concepts from [JP 5-0 Joint Planning](https://www.jcs.mil/Doctrine/) military doctrine, adapted for civilian strategic planning applications.
