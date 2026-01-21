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

## WebSocket Security

### Authentication via First Message

The current implementation passes the token via URL query parameter, which exposes it in server logs. Instead, authenticate via the first message after connection:

**File: `apps/api/src/websocket/server.ts`** (secure auth version)
```typescript
import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import type { ServerWebSocket } from 'bun';

import { verifyToken } from '../lib/jwt';
import { redis } from '../lib/redis';

const { upgradeWebSocket, websocket } = createBunWebSocket<{
  userId?: string;
  projectId: string;
  subscriptions: Set<string>;
  authenticated: boolean;
  authTimeout?: ReturnType<typeof setTimeout>;
}>();

const AUTH_TIMEOUT_MS = 5000; // 5 seconds to authenticate
const MAX_MESSAGE_SIZE = 64 * 1024; // 64KB

// Connected clients by project
const clients = new Map<string, Set<ServerWebSocket<any>>>();

export const wsApp = new Hono();

wsApp.get(
  '/ws/map/:projectId',
  upgradeWebSocket((c) => {
    const projectId = c.req.param('projectId');
    // No token in URL - require auth via first message

    return {
      onOpen: async (event, ws) => {
        ws.data = {
          projectId,
          subscriptions: new Set(['markers', 'alerts', 'tracks']),
          authenticated: false,
        };

        // Set auth timeout - close if not authenticated in time
        ws.data.authTimeout = setTimeout(() => {
          if (!ws.data?.authenticated) {
            console.log(`[WS] Auth timeout for connection to project ${projectId}`);
            ws.send(JSON.stringify({
              type: 'error',
              payload: { code: 'AUTH_TIMEOUT', message: 'Authentication required' },
            }));
            ws.close(1008, 'Authentication timeout');
          }
        }, AUTH_TIMEOUT_MS);

        console.log(`[WS] Connection opened to project ${projectId}, awaiting auth`);
      },

      onMessage: async (event, ws) => {
        try {
          const rawData = event.data.toString();

          // Check message size
          if (rawData.length > MAX_MESSAGE_SIZE) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { code: 'MESSAGE_TOO_LARGE', message: 'Message exceeds size limit' },
            }));
            return;
          }

          const message = JSON.parse(rawData);

          // First message must be auth
          if (!ws.data?.authenticated) {
            if (message.type !== 'auth') {
              ws.send(JSON.stringify({
                type: 'error',
                payload: { code: 'AUTH_REQUIRED', message: 'First message must be auth' },
              }));
              return;
            }

            await handleAuth(ws, message);
            return;
          }

          // Handle authenticated messages
          handleClientMessage(ws, message);
        } catch (error) {
          console.error('[WS] Invalid message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            payload: { code: 'INVALID_MESSAGE', message: 'Invalid message format' },
          }));
        }
      },

      onClose: (event, ws) => {
        if (ws.data?.authTimeout) {
          clearTimeout(ws.data.authTimeout);
        }
        if (ws.data?.projectId) {
          clients.get(ws.data.projectId)?.delete(ws.raw);
        }
        console.log('[WS] Client disconnected');
      },

      onError: (event, ws) => {
        console.error('[WS] Error:', event);
      },
    };
  })
);

async function handleAuth(ws: any, message: { type: string; payload: { token: string } }) {
  try {
    const { token } = message.payload;
    const payload = await verifyToken(token);

    // Clear auth timeout
    if (ws.data.authTimeout) {
      clearTimeout(ws.data.authTimeout);
    }

    // Mark as authenticated
    ws.data.authenticated = true;
    ws.data.userId = payload.sub;

    // Add to project clients
    const projectId = ws.data.projectId;
    if (!clients.has(projectId)) {
      clients.set(projectId, new Set());
    }
    clients.get(projectId)!.add(ws.raw);

    // Subscribe to Redis channel
    await subscribeToProject(projectId, ws.raw);

    ws.send(JSON.stringify({
      type: 'auth_success',
      payload: { userId: payload.sub },
    }));

    console.log(`[WS] Client authenticated: ${payload.sub} for project ${projectId}`);
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'auth_error',
      payload: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
    }));
    ws.close(1008, 'Unauthorized');
  }
}
```

---

### Connection Rate Limiting

Prevent abuse with per-IP connection limits:

**File: `apps/api/src/websocket/rateLimit.ts`**
```typescript
import { redis } from '../lib/redis';

const MAX_CONNECTIONS_PER_IP = 10;
const MAX_MESSAGES_PER_MINUTE = 100;
const CONNECTION_WINDOW_MS = 60 * 1000;

interface RateLimitState {
  messageCount: number;
  lastReset: number;
}

const connectionCounts = new Map<string, number>();
const messageLimits = new Map<string, RateLimitState>();

export async function checkConnectionLimit(ip: string): Promise<boolean> {
  const key = `ws:conn:${ip}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.pexpire(key, CONNECTION_WINDOW_MS);
  }

  return count <= MAX_CONNECTIONS_PER_IP;
}

export function onConnectionClose(ip: string): void {
  const current = connectionCounts.get(ip) || 0;
  if (current > 0) {
    connectionCounts.set(ip, current - 1);
  }
}

export function checkMessageLimit(clientId: string): boolean {
  const now = Date.now();
  let state = messageLimits.get(clientId);

  if (!state || now - state.lastReset > 60000) {
    state = { messageCount: 0, lastReset: now };
    messageLimits.set(clientId, state);
  }

  state.messageCount++;

  if (state.messageCount > MAX_MESSAGES_PER_MINUTE) {
    return false; // Rate limited
  }

  return true;
}

// Apply exponential backoff on violations
const violations = new Map<string, { count: number; backoffUntil: number }>();

export function recordViolation(clientId: string): number {
  const now = Date.now();
  const state = violations.get(clientId) || { count: 0, backoffUntil: 0 };

  state.count++;
  // Exponential backoff: 1s, 2s, 4s, 8s, ... max 5 minutes
  const backoffMs = Math.min(1000 * Math.pow(2, state.count - 1), 5 * 60 * 1000);
  state.backoffUntil = now + backoffMs;

  violations.set(clientId, state);

  return backoffMs;
}

export function isBackedOff(clientId: string): boolean {
  const state = violations.get(clientId);
  if (!state) return false;
  return Date.now() < state.backoffUntil;
}
```

---

### Message Validation

Validate incoming WebSocket messages with JSON schema:

**File: `apps/api/src/websocket/validation.ts`**
```typescript
import { z } from 'zod';

// Define allowed message types
const authMessageSchema = z.object({
  type: z.literal('auth'),
  payload: z.object({
    token: z.string().min(1),
  }),
});

const subscribeMessageSchema = z.object({
  type: z.literal('subscribe'),
  payload: z.array(z.string()),
});

const viewportMessageSchema = z.object({
  type: z.literal('viewport'),
  payload: z.object({
    bounds: z.object({
      north: z.number(),
      south: z.number(),
      east: z.number(),
      west: z.number(),
    }),
    zoom: z.number(),
  }),
});

const pingMessageSchema = z.object({
  type: z.literal('ping'),
});

const clientMessageSchema = z.discriminatedUnion('type', [
  authMessageSchema,
  subscribeMessageSchema,
  viewportMessageSchema,
  pingMessageSchema,
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

export function validateMessage(data: unknown): ClientMessage | null {
  const result = clientMessageSchema.safeParse(data);

  if (!result.success) {
    console.warn('[WS] Invalid message:', result.error.errors);
    return null;
  }

  return result.data;
}

// Sanitize outgoing messages (strip sensitive data)
export function sanitizeOutgoingMessage(message: Record<string, unknown>): Record<string, unknown> {
  const { password, token, apiKey, ...safe } = message as any;
  return safe;
}
```

---

### Origin Validation

Validate WebSocket connection origins:

**File: `apps/api/src/websocket/origin.ts`**
```typescript
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  // Add other allowed origins
];

export function validateOrigin(origin: string | undefined): boolean {
  if (!origin) {
    // Allow connections without origin in development
    return process.env.NODE_ENV === 'development';
  }

  return ALLOWED_ORIGINS.some((allowed) => {
    // Exact match or wildcard subdomain match
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain) || origin === `https://${domain}` || origin === `http://${domain}`;
    }
    return origin === allowed;
  });
}
```

---

## Graceful Shutdown

### WebSocket Connection Draining

Properly close WebSocket connections during shutdown:

**File: `apps/api/src/websocket/shutdown.ts`**
```typescript
import type { ServerWebSocket } from 'bun';

const DRAIN_TIMEOUT_MS = 30000; // 30 seconds max

// Track all active connections
const activeConnections = new Set<ServerWebSocket<any>>();

export function trackConnection(ws: ServerWebSocket<any>): void {
  activeConnections.add(ws);
}

export function untrackConnection(ws: ServerWebSocket<any>): void {
  activeConnections.delete(ws);
}

export async function drainConnections(): Promise<void> {
  const connectionCount = activeConnections.size;

  if (connectionCount === 0) {
    console.log('[WS Shutdown] No active connections');
    return;
  }

  console.log(`[WS Shutdown] Draining ${connectionCount} connections...`);

  // Send close notification to all clients
  const closeMessage = JSON.stringify({
    type: 'server_shutdown',
    payload: {
      message: 'Server is shutting down',
      reconnectAfterMs: 5000,
    },
  });

  for (const ws of activeConnections) {
    try {
      if (ws.readyState === 1) { // OPEN
        ws.send(closeMessage);
      }
    } catch {
      // Ignore send errors during shutdown
    }
  }

  // Wait for clients to close gracefully, with timeout
  const startTime = Date.now();

  while (activeConnections.size > 0 && Date.now() - startTime < DRAIN_TIMEOUT_MS) {
    // Close connections that haven't closed themselves
    for (const ws of activeConnections) {
      try {
        if (ws.readyState === 1) { // OPEN
          ws.close(1001, 'Server shutdown');
        }
      } catch {
        // Ignore errors
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Force close any remaining connections
  for (const ws of activeConnections) {
    try {
      ws.terminate?.();
    } catch {
      // Ignore
    }
  }

  activeConnections.clear();
  console.log('[WS Shutdown] All connections closed');
}
```

---

### BullMQ Worker Shutdown

Wait for running jobs to complete:

**File: `apps/api/src/jobs/shutdown.ts`**
```typescript
import { ingestWorker } from './workers/ingest.worker';
import { processWorker } from './workers/process.worker';
import { ingestQueue, processQueue, alertQueue } from './queues';

const WORKER_SHUTDOWN_TIMEOUT_MS = 30000;

export async function shutdownWorkers(): Promise<void> {
  console.log('[Jobs] Shutting down workers...');

  // Stop accepting new jobs
  await Promise.all([
    ingestWorker.pause(),
    processWorker.pause(),
  ]);

  // Wait for active jobs to complete
  const waitForActive = async (worker: typeof ingestWorker, name: string) => {
    const startTime = Date.now();

    while (Date.now() - startTime < WORKER_SHUTDOWN_TIMEOUT_MS) {
      const activeCount = await worker.getMetrics('active');

      if (!activeCount?.active || activeCount.active === 0) {
        console.log(`[Jobs] ${name} worker drained`);
        return;
      }

      console.log(`[Jobs] Waiting for ${activeCount.active} active jobs in ${name}...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.warn(`[Jobs] ${name} worker shutdown timeout, forcing close`);
  };

  await Promise.all([
    waitForActive(ingestWorker, 'ingest'),
    waitForActive(processWorker, 'process'),
  ]);

  // Close workers
  await Promise.all([
    ingestWorker.close(),
    processWorker.close(),
  ]);

  console.log('[Jobs] All workers closed');
}

export async function shutdownQueues(): Promise<void> {
  console.log('[Jobs] Closing queues...');

  await Promise.all([
    ingestQueue.close(),
    processQueue.close(),
    alertQueue.close(),
  ]);

  console.log('[Jobs] All queues closed');
}
```

---

### Redis Pub/Sub Cleanup

Properly unsubscribe and close Redis connections:

**File: `apps/api/src/lib/redis.ts`** (updated with shutdown)
```typescript
import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  lazyConnect: true,
});

// Track subscriber connections for cleanup
const subscribers: Redis[] = [];

export function createSubscriber(): Redis {
  const subscriber = redis.duplicate();
  subscribers.push(subscriber);
  return subscriber;
}

export async function shutdownRedis(): Promise<void> {
  console.log('[Redis] Shutting down...');

  // Close all subscriber connections
  for (const subscriber of subscribers) {
    try {
      await subscriber.quit();
    } catch {
      subscriber.disconnect();
    }
  }
  subscribers.length = 0;

  // Close main connection
  try {
    await redis.quit();
  } catch {
    redis.disconnect();
  }

  console.log('[Redis] All connections closed');
}
```

---

### Complete Shutdown Orchestration

**File: `apps/api/src/shutdown.ts`**
```typescript
import { drainConnections } from './websocket/shutdown';
import { shutdownWorkers, shutdownQueues } from './jobs/shutdown';
import { closeDatabase } from './db';
import { shutdownRedis } from './lib/redis';
import { stopAllFeeds } from './feeds/scheduler';

let isShuttingDown = false;

export async function gracefulShutdown(
  server: { close: (cb: (err?: Error) => void) => void },
  signal: string
): Promise<void> {
  if (isShuttingDown) {
    console.log('[Shutdown] Already in progress...');
    return;
  }

  isShuttingDown = true;
  console.log(`\n[Shutdown] ${signal} received. Starting graceful shutdown...`);

  const timeout = setTimeout(() => {
    console.error('[Shutdown] Timeout exceeded, forcing exit');
    process.exit(1);
  }, 45000); // 45 second total timeout

  try {
    // 1. Stop accepting new HTTP connections
    console.log('[Shutdown] Step 1: Closing HTTP server...');
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });

    // 2. Drain WebSocket connections
    console.log('[Shutdown] Step 2: Draining WebSocket connections...');
    await drainConnections();

    // 3. Stop feed scheduler
    console.log('[Shutdown] Step 3: Stopping feed scheduler...');
    await stopAllFeeds();

    // 4. Shutdown BullMQ workers (wait for active jobs)
    console.log('[Shutdown] Step 4: Shutting down workers...');
    await shutdownWorkers();

    // 5. Close BullMQ queues
    console.log('[Shutdown] Step 5: Closing queues...');
    await shutdownQueues();

    // 6. Close database pool
    console.log('[Shutdown] Step 6: Closing database connections...');
    await closeDatabase();

    // 7. Close Redis connections
    console.log('[Shutdown] Step 7: Closing Redis connections...');
    await shutdownRedis();

    clearTimeout(timeout);
    console.log('[Shutdown] Complete. Exiting.');
    process.exit(0);
  } catch (error) {
    console.error('[Shutdown] Error:', error);
    clearTimeout(timeout);
    process.exit(1);
  }
}
```

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/websocket/server.ts` | WebSocket server with secure auth |
| `apps/api/src/websocket/rateLimit.ts` | WebSocket connection rate limiting |
| `apps/api/src/websocket/validation.ts` | WebSocket message validation |
| `apps/api/src/websocket/origin.ts` | WebSocket origin validation |
| `apps/api/src/websocket/shutdown.ts` | WebSocket connection draining |
| `apps/api/src/lib/redis.ts` | Redis client with shutdown support |
| `apps/api/src/jobs/queues.ts` | BullMQ queue definitions |
| `apps/api/src/jobs/workers/ingest.worker.ts` | Ingestion worker |
| `apps/api/src/jobs/workers/process.worker.ts` | Processing worker |
| `apps/api/src/jobs/shutdown.ts` | BullMQ worker shutdown |
| `apps/api/src/feeds/adapter.interface.ts` | Base adapter interface |
| `apps/api/src/feeds/scheduler.ts` | Feed scheduling service |
| `apps/api/src/feeds/normalizer.service.ts` | Adapter registry and normalization |
| `apps/api/src/shutdown.ts` | Complete shutdown orchestration |

---

## Acceptance Criteria

### Core Functionality
- [ ] WebSocket server accepts connections with JWT authentication
- [ ] Redis pub/sub distributes messages across server instances
- [ ] BullMQ queues process jobs with proper retry logic
- [ ] Feed adapters can be registered and scheduled
- [ ] Ingestion worker normalizes data correctly
- [ ] Processing worker stores items and broadcasts updates
- [ ] Feed scheduler handles start/stop operations
- [ ] WebSocket clients receive filtered updates based on subscriptions

### WebSocket Security
- [ ] WebSocket authentication not visible in URL/logs (via first message)
- [ ] Connection rate limiting prevents abuse (max 10 per IP)
- [ ] Message rate limiting enforced (max 100 per minute)
- [ ] Message size limits enforced (max 64KB)
- [ ] Invalid messages rejected with appropriate error codes
- [ ] Origin validation prevents unauthorized connections
- [ ] Unauthenticated connections closed after 5 second timeout

### Graceful Shutdown
- [ ] Graceful shutdown drains WebSocket connections
- [ ] Clients receive shutdown notification with reconnect hint
- [ ] BullMQ workers wait for active jobs to complete
- [ ] Redis connections properly closed (subscribers and main)
- [ ] Database connections properly drained
- [ ] Shutdown completes within 45 seconds or times out
- [ ] All resources cleaned up on SIGTERM/SIGINT

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
