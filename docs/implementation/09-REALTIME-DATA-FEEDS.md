# Phase 9: Real-Time Data Feeds

## Overview

Phase 9 implements the real-time data ingestion pipeline for F.19 (External Data Sources). This includes WebSocket infrastructure, background job processing, and adapters for various intelligence data feeds.

**Prerequisites**: Phases 1-3 (database, API, frontend foundation), Phase 7 (geospatial)

**Parallel With**: Phase 8 (RAG/AI Integration)

---

## Sub-Documents

This phase is split into focused sub-documents for easier implementation:

| Document | Scope | Tasks |
|----------|-------|-------|
| [09a-REALTIME-INFRASTRUCTURE.md](./09a-REALTIME-INFRASTRUCTURE.md) | WebSocket server, BullMQ queues, Feed adapter interface | 9.1-9.4 |
| [09b-FEED-NEWS-OSINT.md](./09b-FEED-NEWS-OSINT.md) | News/OSINT adapters, enrichment services | 9.5 |
| [09c-FEED-FLIGHT-TRACKING.md](./09c-FEED-FLIGHT-TRACKING.md) | ADS-B flight tracking | 9.6, 9.12 |
| [09d-FEED-MARITIME-TRACKING.md](./09d-FEED-MARITIME-TRACKING.md) | AIS maritime tracking | 9.7, 9.13 |
| [09e-FEED-CIVIL-UNREST.md](./09e-FEED-CIVIL-UNREST.md) | ACLED + GDELT civil unrest layer | 9.18-9.20 |
| [09f-FEED-INFRASTRUCTURE-FIRE.md](./09f-FEED-INFRASTRUCTURE-FIRE.md) | NASA FIRMS fire detection | 9.21-9.22 |
| [09g-FEED-AVIATION-INCIDENTS.md](./09g-FEED-AVIATION-INCIDENTS.md) | Aviation incidents + ADS-B anomaly detection | 9.23-9.25 |
| [09h-FEED-TELEGRAM-OSINT.md](./09h-FEED-TELEGRAM-OSINT.md) | Telegram channel ingestion | 9.26-9.28 |
| [09i-REALTIME-PROCESSING.md](./09i-REALTIME-PROCESSING.md) | Normalizer, Tripwire worker, Live feed panel | 9.9-9.11, 9.14-9.17 |
| [09j-REALTIME-OPERATIONS.md](./09j-REALTIME-OPERATIONS.md) | API endpoints, Data retention, WebSocket reconnection | - |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     REAL-TIME DATA PIPELINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  EXTERNAL SOURCES                                                │
│  ─────────────────                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  News    │ │  ADS-B   │ │   AIS    │ │ Telegram │           │
│  │  APIs    │ │  Flight  │ │ Maritime │ │ Channels │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │            │            │            │                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  ACLED   │ │   NASA   │ │ Aviation │ │  Custom  │           │
│  │  GDELT   │ │  FIRMS   │ │   ASN    │ │ Webhooks │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │            │            │            │                   │
│       └────────────┴────────────┴────────────┘                   │
│                           │                                      │
│                           ▼                                      │
│  INGESTION LAYER                                                 │
│  ───────────────                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     FEED ADAPTERS                         │   │
│  │  • Source-specific parsing and normalization              │   │
│  │  • Rate limiting and error handling                       │   │
│  │  • Credential management                                  │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│                             ▼                                    │
│  PROCESSING LAYER                                                │
│  ────────────────                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    BullMQ JOB QUEUES                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │   │
│  │  │  Ingest     │  │  Process    │  │  Tripwire   │       │   │
│  │  │  Queue      │  │  Queue      │  │  Queue      │       │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│                             ▼                                    │
│  OUTPUT LAYER                                                    │
│  ────────────                                                    │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │   PostgreSQL     │  │    WebSocket     │                     │
│  │   + pgvector     │  │    Server        │                     │
│  │   (persistence)  │  │  (real-time)     │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Source Types

| Type | Sources | Format | Update Frequency |
|------|---------|--------|------------------|
| News/OSINT | NewsAPI, RSS, GDELT | JSON/XML/CSV | 1-15 minutes |
| Flight Tracking | ADS-B Exchange, FlightRadar24 | JSON | 5-30 seconds |
| Maritime AIS | AISStream, MarineTraffic | JSON | 1-5 minutes |
| Weather | OpenWeather, NWS | JSON | 5-60 minutes |
| Social Media | Twitter/X API | JSON | 1-5 minutes |
| Custom Webhooks | User-defined | JSON | Event-driven |
| Civil Unrest | ACLED, GDELT | JSON/CSV | 15min - Daily |
| Satellite Fire | NASA FIRMS | CSV | 3 hours |
| Aviation Incidents | ASN, FAA, NTSB | RSS/JSON | Hourly / Daily |
| Telegram OSINT | Telegram API (MTProto) | JSON | Real-time |

---

## Implementation Tasks

| ID | Task | Sub-Document | Agent | Priority | Dependencies |
|----|------|--------------|-------|----------|--------------|
| 9.1 | Set up WebSocket server | [09a](./09a-REALTIME-INFRASTRUCTURE.md) | `node-developer` | High | 2.x |
| 9.2 | Implement WebSocket authentication | [09a](./09a-REALTIME-INFRASTRUCTURE.md) | `node-developer` | High | 9.1, 2.3 |
| 9.3 | Configure BullMQ queues | [09a](./09a-REALTIME-INFRASTRUCTURE.md) | `node-developer` | High | 2.x |
| 9.4 | Create feed adapter interface | [09a](./09a-REALTIME-INFRASTRUCTURE.md) | `node-developer` | High | 9.3 |
| 9.5 | Implement news/OSINT adapters | [09b](./09b-FEED-NEWS-OSINT.md) | `node-developer` | High | 9.4 |
| 9.6 | Implement ADS-B flight adapter | [09c](./09c-FEED-FLIGHT-TRACKING.md) | `node-developer` | Medium | 9.4 |
| 9.7 | Implement AIS maritime adapter | [09d](./09d-FEED-MARITIME-TRACKING.md) | `node-developer` | Medium | 9.4 |
| 9.8 | Implement weather adapter | [09i](./09i-REALTIME-PROCESSING.md) | `node-developer` | Low | 9.4 |
| 9.9 | Create data normalizer service | [09i](./09i-REALTIME-PROCESSING.md) | `node-developer` | High | 9.4 |
| 9.10 | Implement tripwire checking worker | [09i](./09i-REALTIME-PROCESSING.md) | `node-developer` | High | 9.9, 1.x |
| 9.11 | Build feed management API | [09j](./09j-REALTIME-OPERATIONS.md) | `node-developer` | Medium | 9.4 |
| 9.12 | Create flight layer component | [09c](./09c-FEED-FLIGHT-TRACKING.md) | `tactical-visualization-expert` | Medium | 9.6, 7.x |
| 9.13 | Create maritime layer component | [09d](./09d-FEED-MARITIME-TRACKING.md) | `tactical-visualization-expert` | Medium | 9.7, 7.x |
| 9.14 | Build live feed panel | [09i](./09i-REALTIME-PROCESSING.md) | `frontend-developer-designer` | High | 9.1, 3.x |
| 9.15 | Implement feed configuration UI | [09i](./09i-REALTIME-PROCESSING.md) | `frontend-developer-designer` | Medium | 9.11 |
| 9.16 | Add WebSocket connection status | [09i](./09i-REALTIME-PROCESSING.md) | `frontend-developer-designer` | Medium | 9.1 |
| 9.17 | Create feed health dashboard | [09i](./09i-REALTIME-PROCESSING.md) | `frontend-developer-designer` | Low | 9.11 |
| 9.18 | Implement civil unrest adapters | [09e](./09e-FEED-CIVIL-UNREST.md) | `node-developer` | High | 9.4 |
| 9.19 | Create civil unrest map layer | [09e](./09e-FEED-CIVIL-UNREST.md) | `tactical-visualization-expert` | High | 9.18, 7.x |
| 9.20 | Build unrest analytics panel | [09e](./09e-FEED-CIVIL-UNREST.md) | `frontend-developer-designer` | Medium | 9.18 |
| 9.21 | Implement NASA FIRMS adapter | [09f](./09f-FEED-INFRASTRUCTURE-FIRE.md) | `node-developer` | High | 9.4 |
| 9.22 | Create infrastructure fire layer | [09f](./09f-FEED-INFRASTRUCTURE-FIRE.md) | `tactical-visualization-expert` | High | 9.21, 7.x |
| 9.23 | Implement ASN aviation adapter | [09g](./09g-FEED-AVIATION-INCIDENTS.md) | `node-developer` | Medium | 9.4 |
| 9.24 | Implement ADS-B anomaly detector | [09g](./09g-FEED-AVIATION-INCIDENTS.md) | `node-developer` | Medium | 9.6 |
| 9.25 | Create aviation incident layer | [09g](./09g-FEED-AVIATION-INCIDENTS.md) | `tactical-visualization-expert` | Medium | 9.23, 9.24 |
| 9.26 | Implement Telegram channel adapter | [09h](./09h-FEED-TELEGRAM-OSINT.md) | `node-developer` | High | 9.4 |
| 9.27 | Build Telegram translation service | [09h](./09h-FEED-TELEGRAM-OSINT.md) | `node-developer` | Medium | 9.26 |
| 9.28 | Create Telegram feed UI panel | [09h](./09h-FEED-TELEGRAM-OSINT.md) | `frontend-developer-designer` | Medium | 9.26 |

---

## Quick Reference

### Key Files

| Category | Files |
|----------|-------|
| WebSocket | `apps/api/src/websocket/server.ts` |
| Queues | `apps/api/src/jobs/queues.ts`, `apps/api/src/jobs/scheduler.ts` |
| Adapters | `apps/api/src/feeds/adapters/*.adapter.ts` |
| Workers | `apps/api/src/jobs/workers/*.worker.ts` |
| Frontend | `apps/web/src/features/feeds/*.tsx`, `apps/web/src/hooks/useWebSocket.ts` |

### Environment Variables

```bash
# WebSocket
WS_PORT=3001

# News APIs
NEWSAPI_KEY=...
GDELT_API_KEY=...

# Tracking APIs
ADSB_EXCHANGE_API_KEY=...
AISSTREAM_API_KEY=...

# Civil Unrest
ACLED_API_KEY=...
ACLED_EMAIL=...

# Fire Detection
NASA_FIRMS_MAP_KEY=...

# Telegram
TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...
TELEGRAM_SESSION_STRING=...

# Translation
GOOGLE_TRANSLATE_API_KEY=...
DEEPL_API_KEY=...
```

### Data Retention

- **Raw Feed Data**: 7-day rolling window
- **Aggregates**: Daily summaries retained indefinitely
- **Cleanup**: Nightly job at 3 AM UTC

---

## Acceptance Criteria Summary

See individual sub-documents for detailed acceptance criteria. High-level requirements:

- [ ] WebSocket server handles 1000+ concurrent connections
- [ ] All feed adapters normalize to common schema
- [ ] Tripwire alerts trigger within 30 seconds of data ingestion
- [ ] Real-time map layers update without page refresh
- [ ] Feed health monitoring with automatic retry logic
- [ ] Telegram messages translate non-English text correctly
- [ ] Civil unrest events cluster on map with severity indicators
- [ ] Infrastructure fires cross-reference with facility database
- [ ] Aviation anomalies detected from ADS-B squawk codes

---

## Dependencies

```json
{
  "dependencies": {
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.0",
    "ws": "^8.14.0",
    "rss-parser": "^3.13.0",
    "@mozilla/readability": "^0.4.4",
    "jsdom": "^22.1.0",
    "csv-parse": "^5.5.0",
    "telegram": "^2.19.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.0"
  }
}
```
