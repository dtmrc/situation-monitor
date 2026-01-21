# Phase 9a: Real-Time Infrastructure

Parent: [09-REALTIME-DATA-FEEDS.md](./09-REALTIME-DATA-FEEDS.md)

## Overview

This document covers the core infrastructure components for real-time data feeds:
- WebSocket server for bidirectional communication
- Redis pub/sub for distributed messaging
- BullMQ queues for background job processing
- Base feed adapter interface for data source integration

**Tasks Covered:** 9.1, 9.2, 9.3, 9.4

---

## 9.1 WebSocket Server

**File: `apps/api/src/websocket/server.ts`**
```typescript
import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import type { ServerWebSocket } from 'bun';

import { verifyToken } from '../lib/jwt';
import { redis } from '../lib/redis';

const { upgradeWebSocket, websocket } = createBunWebSocket<{
  userId: string;
  projectId: string;
  subscriptions: Set<string>;
}>();

interface WebSocketMessage {
  type: string;
  payload: unknown;
}

// Connected clients by project
const clients = new Map<string, Set<ServerWebSocket<any>>>();

export const wsApp = new Hono();

wsApp.get(
  '/ws/map/:projectId',
  upgradeWebSocket((c) => {
    const projectId = c.req.param('projectId');
    const token = c.req.query('token');

    return {
      onOpen: async (event, ws) => {
        // Verify auth
        try {
          const payload = await verifyToken(token || '');
          ws.data = {
            userId: payload.sub,
            projectId,
            subscriptions: new Set(['markers', 'alerts', 'tracks']),
          };

          // Add to project clients
          if (!clients.has(projectId)) {
            clients.set(projectId, new Set());
          }
          clients.get(projectId)!.add(ws.raw);

          // Subscribe to Redis channel
          subscribeToProject(projectId, ws.raw);

          console.log(`Client connected to project ${projectId}`);
        } catch (error) {
          ws.close(1008, 'Unauthorized');
        }
      },

      onMessage: (event, ws) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data.toString());
          handleClientMessage(ws, message);
        } catch (error) {
          console.error('Invalid message:', error);
        }
      },

      onClose: (event, ws) => {
        if (ws.data?.projectId) {
          clients.get(ws.data.projectId)?.delete(ws.raw);
        }
        console.log('Client disconnected');
      },

      onError: (event, ws) => {
        console.error('WebSocket error:', event);
      },
    };
  })
);

function handleClientMessage(ws: any, message: WebSocketMessage) {
  switch (message.type) {
    case 'subscribe':
      const layers = message.payload as string[];
      ws.data.subscriptions = new Set(layers);
      break;

    case 'viewport':
      // Client viewport changed - could optimize data sent
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
  }
}

// Subscribe to Redis pub/sub for project updates
async function subscribeToProject(projectId: string, ws: ServerWebSocket<any>) {
  const subscriber = redis.duplicate();
  await subscriber.subscribe(`project:${projectId}:updates`);

  subscriber.on('message', (channel, message) => {
    const data = JSON.parse(message);

    // Filter by subscription type
    if (ws.data?.subscriptions.has(data.type)) {
      ws.send(message);
    }
  });
}

// Broadcast to all clients of a project
export function broadcastToProject(projectId: string, message: WebSocketMessage) {
  const projectClients = clients.get(projectId);
  if (!projectClients) return;

  const messageStr = JSON.stringify(message);
  projectClients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(messageStr);
    }
  });
}

// Publish to Redis (for multi-instance support)
export async function publishUpdate(projectId: string, message: WebSocketMessage) {
  await redis.publish(
    `project:${projectId}:updates`,
    JSON.stringify(message)
  );
}

export { websocket };
```

---

## 9.2 Redis Client Configuration

**File: `apps/api/src/lib/redis.ts`**
```typescript
import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  lazyConnect: true,
});

export const redisConnection = {
  host: new URL(REDIS_URL).hostname,
  port: parseInt(new URL(REDIS_URL).port || '6379'),
};

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

redis.on('error', (error) => {
  console.error('[Redis] Error:', error);
});

redis.on('close', () => {
  console.log('[Redis] Connection closed');
});

export async function initializeRedis(): Promise<void> {
  await redis.connect();
}

export async function shutdownRedis(): Promise<void> {
  await redis.quit();
}
```

---

## 9.3 BullMQ Queue Setup

**File: `apps/api/src/jobs/queues.ts`**
```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';

import { redis } from '../lib/redis';

// Queue definitions
export const ingestQueue = new Queue('feed-ingest', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export const processQueue = new Queue('feed-process', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

export const alertQueue = new Queue('alerts', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Job types
export interface IngestJobData {
  feedId: string;
  sourceType: string;
  rawData: unknown;
  metadata: {
    projectId: string;
    timestamp: string;
    source: string;
  };
}

export interface ProcessJobData {
  feedItemId: string;
  projectId: string;
  type: string;
  normalizedData: NormalizedFeedItem;
}

export interface AlertJobData {
  alertId: string;
  projectId: string;
  tripwireId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data: unknown;
  notifyUsers: string[];
}

export interface NormalizedFeedItem {
  id: string;
  type: 'news' | 'flight' | 'maritime' | 'weather' | 'event' | 'observation';
  title: string;
  content?: string;
  timestamp: Date;
  location?: {
    lat: number;
    lng: number;
    name?: string;
  };
  metadata: Record<string, unknown>;
  raw: unknown;
}
```

### Ingestion Worker

**File: `apps/api/src/jobs/workers/ingest.worker.ts`**
```typescript
import { Worker, Job } from 'bullmq';
import { redis } from '../../lib/redis';
import { processQueue, type IngestJobData, type ProcessJobData } from '../queues';
import { getAdapter } from '../../feeds/normalizer.service';

export const ingestWorker = new Worker<IngestJobData>(
  'feed-ingest',
  async (job: Job<IngestJobData>) => {
    const { feedId, sourceType, rawData, metadata } = job.data;

    console.log(`[Ingest] Processing ${sourceType} feed: ${feedId}`);

    // Get appropriate adapter
    const adapter = getAdapter(sourceType);

    // Normalize raw data
    const normalized = adapter.normalize(rawData);

    // Queue for processing
    await processQueue.add('process', {
      feedItemId: normalized.id,
      projectId: metadata.projectId,
      type: sourceType,
      normalizedData: normalized,
    } as ProcessJobData);

    return { processed: 1, feedItemId: normalized.id };
  },
  {
    connection: redis,
    concurrency: 10,
  }
);

ingestWorker.on('completed', (job, result) => {
  console.log(`[Ingest] Job ${job.id} completed:`, result);
});

ingestWorker.on('failed', (job, error) => {
  console.error(`[Ingest] Job ${job?.id} failed:`, error);
});
```

### Processing Worker

**File: `apps/api/src/jobs/workers/process.worker.ts`**
```typescript
import { Worker, Job } from 'bullmq';
import { redis } from '../../lib/redis';
import { db } from '../../db';
import { feedItems } from '../../db/schema';
import { publishUpdate } from '../../websocket/server';
import type { ProcessJobData } from '../queues';

export const processWorker = new Worker<ProcessJobData>(
  'feed-process',
  async (job: Job<ProcessJobData>) => {
    const { feedItemId, projectId, type, normalizedData } = job.data;

    console.log(`[Process] Processing item: ${feedItemId}`);

    // Store in database
    await db.insert(feedItems).values({
      id: feedItemId,
      projectId,
      type,
      title: normalizedData.title,
      content: normalizedData.content,
      timestamp: normalizedData.timestamp,
      latitude: normalizedData.location?.lat,
      longitude: normalizedData.location?.lng,
      locationName: normalizedData.location?.name,
      metadata: JSON.stringify(normalizedData.metadata),
      raw: JSON.stringify(normalizedData.raw),
    }).onConflictDoNothing();

    // Broadcast to WebSocket clients
    await publishUpdate(projectId, {
      type: 'feed_item',
      payload: normalizedData,
    });

    return { stored: true };
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

processWorker.on('completed', (job, result) => {
  console.log(`[Process] Job ${job.id} completed`);
});

processWorker.on('failed', (job, error) => {
  console.error(`[Process] Job ${job?.id} failed:`, error);
});
```

---

## 9.4 Feed Adapter Interface

**File: `apps/api/src/feeds/adapter.interface.ts`**
```typescript
import type { NormalizedFeedItem } from '../jobs/queues';

export interface FeedConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  pollInterval: number; // milliseconds
  apiKey?: string;
  endpoint?: string;
  options?: Record<string, unknown>;
}

export interface FeedAdapter {
  name: string;
  type: string;

  // Initialize the adapter with config
  initialize(config: FeedConfig): Promise<void>;

  // Fetch new data from the source
  fetch(): Promise<unknown[]>;

  // Normalize raw data to common schema
  normalize(rawItem: unknown): NormalizedFeedItem;

  // Clean up resources
  destroy(): Promise<void>;
}

export abstract class BaseFeedAdapter implements FeedAdapter {
  abstract name: string;
  abstract type: string;

  protected config!: FeedConfig;

  async initialize(config: FeedConfig): Promise<void> {
    this.config = config;
  }

  abstract fetch(): Promise<unknown[]>;
  abstract normalize(rawItem: unknown): NormalizedFeedItem;

  async destroy(): Promise<void> {
    // Override in subclasses if needed
  }
}
```

### Feed Scheduler

**File: `apps/api/src/feeds/scheduler.ts`**
```typescript
import { ingestQueue, type IngestJobData } from '../jobs/queues';
import { db } from '../db';
import { feeds } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { FeedAdapter, FeedConfig } from './adapter.interface';
import { getAdapter } from './normalizer.service';

interface ScheduledFeed {
  config: FeedConfig;
  adapter: FeedAdapter;
  intervalId: NodeJS.Timeout;
}

const scheduledFeeds = new Map<string, ScheduledFeed>();

export async function startFeedScheduler(): Promise<void> {
  // Load all enabled feeds from database
  const enabledFeeds = await db
    .select()
    .from(feeds)
    .where(eq(feeds.enabled, true));

  for (const feed of enabledFeeds) {
    await scheduleFeed(feed as FeedConfig);
  }

  console.log(`[Scheduler] Started ${enabledFeeds.length} feeds`);
}

export async function scheduleFeed(config: FeedConfig): Promise<void> {
  // Stop existing schedule if any
  if (scheduledFeeds.has(config.id)) {
    stopFeed(config.id);
  }

  const adapter = getAdapter(config.type);
  await adapter.initialize(config);

  // Initial fetch
  await fetchAndQueue(config, adapter);

  // Schedule recurring fetches
  const intervalId = setInterval(
    () => fetchAndQueue(config, adapter),
    config.pollInterval
  );

  scheduledFeeds.set(config.id, { config, adapter, intervalId });
  console.log(`[Scheduler] Feed ${config.id} scheduled every ${config.pollInterval}ms`);
}

export function stopFeed(feedId: string): void {
  const scheduled = scheduledFeeds.get(feedId);
  if (scheduled) {
    clearInterval(scheduled.intervalId);
    scheduled.adapter.destroy();
    scheduledFeeds.delete(feedId);
    console.log(`[Scheduler] Feed ${feedId} stopped`);
  }
}

async function fetchAndQueue(config: FeedConfig, adapter: FeedAdapter): Promise<void> {
  try {
    const items = await adapter.fetch();

    for (const item of items) {
      await ingestQueue.add('ingest', {
        feedId: config.id,
        sourceType: config.type,
        rawData: item,
        metadata: {
          projectId: config.options?.projectId as string,
          timestamp: new Date().toISOString(),
          source: config.name,
        },
      } as IngestJobData);
    }

    console.log(`[Scheduler] Feed ${config.id} fetched ${items.length} items`);
  } catch (error) {
    console.error(`[Scheduler] Feed ${config.id} fetch error:`, error);
  }
}

export async function stopAllFeeds(): Promise<void> {
  for (const [feedId] of scheduledFeeds) {
    stopFeed(feedId);
  }
}
```

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/websocket/server.ts` | WebSocket server with Bun |
| `apps/api/src/lib/redis.ts` | Redis client configuration |
| `apps/api/src/jobs/queues.ts` | BullMQ queue definitions |
| `apps/api/src/jobs/workers/ingest.worker.ts` | Ingestion worker |
| `apps/api/src/jobs/workers/process.worker.ts` | Processing worker |
| `apps/api/src/feeds/adapter.interface.ts` | Base adapter interface |
| `apps/api/src/feeds/scheduler.ts` | Feed scheduling service |
| `apps/api/src/feeds/normalizer.service.ts` | Adapter registry and normalization |

---

## Acceptance Criteria

- [ ] WebSocket server accepts connections with JWT authentication
- [ ] Redis pub/sub distributes messages across server instances
- [ ] BullMQ queues process jobs with proper retry logic
- [ ] Feed adapters can be registered and scheduled
- [ ] Ingestion worker normalizes data correctly
- [ ] Processing worker stores items and broadcasts updates
- [ ] Feed scheduler handles start/stop operations
- [ ] WebSocket clients receive filtered updates based on subscriptions

---

## Dependencies

```bash
cd apps/api
pnpm add bullmq ioredis
```

---

## Environment Variables

```bash
# Redis connection
REDIS_URL=redis://localhost:6379

# WebSocket (if not using Bun native)
WS_PORT=8080
```
