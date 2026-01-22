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

## Data Feeds

Real-time data ingestion pipeline supporting multiple intelligence sources.

### Available Feeds

| Feed Type           | Source                      | Update Frequency | Retention |
| ------------------- | --------------------------- | ---------------- | --------- |
| **News/OSINT**      | NewsAPI, RSS, GDELT         | 1-15 minutes     | 90 days   |
| **Telegram OSINT**  | Telegram channels (MTProto) | Real-time        | 90 days   |
| **Flight Tracking** | ADS-B Exchange              | 5-30 seconds     | 7 days    |
| **Maritime AIS**    | AISStream                   | 1-5 minutes      | 7 days    |
| **Civil Unrest**    | ACLED, GDELT                | 15min - Daily    | 365 days  |
| **Satellite Fire**  | NASA FIRMS                  | 3 hours          | 180 days  |
| **Infrastructure**  | Power outages, NRC          | Event-driven     | 365 days  |
| **Traffic Cameras** | State DOT feeds             | 5 minutes        | 7 days    |
| **Citizen Reports** | Citizen app                 | Real-time        | 30 days   |

### Setup Guide

#### 1. Environment Variables

Add the following to your `.env` file based on which feeds you want to enable:

```bash
# WebSocket Server
WS_PORT=3001

# News/OSINT Feeds
NEWSAPI_KEY=your_newsapi_key
GDELT_API_KEY=your_gdelt_key

# Flight Tracking
ADSB_EXCHANGE_API_KEY=your_adsb_key

# Maritime Tracking
AISSTREAM_API_KEY=your_aisstream_key

# Civil Unrest (ACLED)
ACLED_API_KEY=your_acled_key
ACLED_EMAIL=your_email@example.com

# Fire Detection
NASA_FIRMS_MAP_KEY=your_nasa_firms_key

# Telegram OSINT (see detailed guide below)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_STRING=your_session_string

# Translation (for Telegram)
TRANSLATION_PROVIDER=google
GOOGLE_TRANSLATE_API_KEY=your_google_translate_key
# Or use DeepL: DEEPL_API_KEY=your_deepl_key

# Data Retention
RETENTION_ENABLED=true
```

#### 2. Telegram OSINT Setup

Telegram requires additional setup for MTProto authentication:

```bash
# 1. Get API credentials from https://my.telegram.org/apps
# 2. Generate session string
cd apps/api
npx tsx scripts/telegram-session-setup.ts

# 3. Add the output session string to your .env
```

See [docs/guides/TELEGRAM-SETUP.md](./docs/guides/TELEGRAM-SETUP.md) for detailed instructions.

#### 3. Start Feed Workers

```bash
# Start the API with feed workers enabled
pnpm dev

# Workers auto-start when FEATURE_REALTIME_FEEDS=true
```

#### 4. API Key Sources

| Feed             | API Key Source                                                                 | Free Tier              |
| ---------------- | ------------------------------------------------------------------------------ | ---------------------- |
| NewsAPI          | [newsapi.org](https://newsapi.org)                                             | 100 requests/day       |
| ACLED            | [acleddata.com](https://acleddata.com/register/)                               | Academic/research free |
| NASA FIRMS       | [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/api/area/) | Free                   |
| ADS-B Exchange   | [adsbexchange.com](https://www.adsbexchange.com/data/)                         | Paid plans             |
| AISStream        | [aisstream.io](https://aisstream.io)                                           | Free tier available    |
| Telegram         | [my.telegram.org](https://my.telegram.org/apps)                                | Free                   |
| Google Translate | [console.cloud.google.com](https://console.cloud.google.com)                   | Free tier available    |

### Next Steps

#### Immediate Priorities

- [ ] **Feed Health Dashboard** - Implement monitoring UI for feed status, error rates, and data freshness
- [ ] **Alert Configuration UI** - Build interface for users to configure tripwire alerts based on feed data
- [ ] **Historical Analysis** - Add time-series charts for feed data trends

#### Planned Enhancements

- [ ] **Weather Integration** - Add OpenWeather/NWS adapters for weather data correlation
- [ ] **Social Media** - Twitter/X API integration for social sentiment
- [ ] **Custom Webhooks** - Allow users to define custom data sources via webhooks
- [ ] **Feed Fusion** - Cross-reference events across multiple feeds for enriched intelligence
- [ ] **Export Capabilities** - CSV/JSON export for feed data with date range filters

#### Infrastructure

- [ ] **Rate Limit Management** - Centralized rate limit tracking across all feed adapters
- [ ] **Retry Logic Improvements** - Exponential backoff with circuit breaker patterns
- [ ] **Feed Deduplication** - Improved deduplication for events appearing in multiple sources
- [ ] **Batch Processing** - Optimize high-volume feeds with batched database writes

### Architecture

```
External Sources → Feed Adapters → BullMQ Queues → Normalizer → PostgreSQL
                                        ↓                           ↓
                                   Tripwire Worker          WebSocket Server
                                        ↓                           ↓
                                     Alerts                  Live Feed Panel
```

For detailed implementation documentation, see [docs/implementation/09-REALTIME-DATA-FEEDS.md](./docs/implementation/09-REALTIME-DATA-FEEDS.md).

---

## License

[License Type] - See [LICENSE](./LICENSE) for details.

---

## Acknowledgments

Built upon concepts from [JP 5-0 Joint Planning](https://www.jcs.mil/Doctrine/) military doctrine, adapted for civilian strategic planning applications.
