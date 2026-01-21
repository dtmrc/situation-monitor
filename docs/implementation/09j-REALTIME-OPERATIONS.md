# Phase 9j: Real-Time Operations & Maintenance

Parent: [09-REALTIME-DATA-FEEDS.md](./09-REALTIME-DATA-FEEDS.md)

## Overview

This document covers operational concerns for the real-time data feed system:
- Feed CRUD API endpoints for managing data sources
- Data retention policies and cleanup jobs
- WebSocket reconnection with exponential backoff
- Health monitoring, metrics, and observability

These components ensure the real-time system remains stable, performant, and maintainable in production environments.

---

## API Endpoints

### Feed Management Routes

**File: `apps/api/src/feeds/feeds.routes.ts`**
```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

import { db } from '../db';
import { feeds, feedItems } from '../db/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { scheduleFeed, stopFeed } from './scheduler';
import { authMiddleware } from '../middleware/auth';

const feedsApp = new Hono();

// Apply auth middleware to all routes
feedsApp.use('/*', authMiddleware);

// Schema definitions
const createFeedSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['news', 'flight', 'maritime', 'weather', 'civil_unrest', 'fire', 'telegram', 'custom']),
  enabled: z.boolean().default(true),
  pollInterval: z.number().min(5000).max(3600000).default(60000), // 5s to 1hr
  apiKey: z.string().optional(),
  endpoint: z.string().url().optional(),
  options: z.record(z.unknown()).optional(),
  projectId: z.string().uuid(),
});

const updateFeedSchema = createFeedSchema.partial().omit({ projectId: true });

const feedItemsQuerySchema = z.object({
  feedId: z.string().uuid().optional(),
  type: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

// GET /feeds - List all feeds for a project
feedsApp.get('/', zValidator('query', z.object({ projectId: z.string().uuid() })), async (c) => {
  const { projectId } = c.req.valid('query');
  const userId = c.get('userId');

  const result = await db
    .select()
    .from(feeds)
    .where(eq(feeds.projectId, projectId))
    .orderBy(desc(feeds.createdAt));

  return c.json({ feeds: result });
});

// GET /feeds/:id - Get a specific feed
feedsApp.get('/:id', async (c) => {
  const feedId = c.req.param('id');

  const result = await db
    .select()
    .from(feeds)
    .where(eq(feeds.id, feedId))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: 'Feed not found' }, 404);
  }

  return c.json({ feed: result[0] });
});

// POST /feeds - Create a new feed
feedsApp.post('/', zValidator('json', createFeedSchema), async (c) => {
  const data = c.req.valid('json');
  const userId = c.get('userId');

  const [feed] = await db
    .insert(feeds)
    .values({
      ...data,
      createdBy: userId,
    })
    .returning();

  // Start feed if enabled
  if (feed.enabled) {
    await scheduleFeed(feed);
  }

  return c.json({ feed }, 201);
});

// PUT /feeds/:id - Update a feed
feedsApp.put('/:id', zValidator('json', updateFeedSchema), async (c) => {
  const feedId = c.req.param('id');
  const data = c.req.valid('json');

  // Get current feed state
  const [currentFeed] = await db
    .select()
    .from(feeds)
    .where(eq(feeds.id, feedId))
    .limit(1);

  if (!currentFeed) {
    return c.json({ error: 'Feed not found' }, 404);
  }

  // Update in database
  const [updatedFeed] = await db
    .update(feeds)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(feeds.id, feedId))
    .returning();

  // Handle scheduler updates
  if (currentFeed.enabled && !updatedFeed.enabled) {
    stopFeed(feedId);
  } else if (updatedFeed.enabled) {
    // Restart with new config
    stopFeed(feedId);
    await scheduleFeed(updatedFeed);
  }

  return c.json({ feed: updatedFeed });
});

// DELETE /feeds/:id - Delete a feed
feedsApp.delete('/:id', async (c) => {
  const feedId = c.req.param('id');

  // Stop the feed scheduler
  stopFeed(feedId);

  // Delete feed (cascade deletes items via FK)
  const result = await db
    .delete(feeds)
    .where(eq(feeds.id, feedId))
    .returning();

  if (result.length === 0) {
    return c.json({ error: 'Feed not found' }, 404);
  }

  return c.json({ deleted: true });
});

// POST /feeds/:id/start - Start a feed
feedsApp.post('/:id/start', async (c) => {
  const feedId = c.req.param('id');

  const [feed] = await db
    .select()
    .from(feeds)
    .where(eq(feeds.id, feedId))
    .limit(1);

  if (!feed) {
    return c.json({ error: 'Feed not found' }, 404);
  }

  await db
    .update(feeds)
    .set({ enabled: true, updatedAt: new Date() })
    .where(eq(feeds.id, feedId));

  await scheduleFeed(feed);

  return c.json({ started: true });
});

// POST /feeds/:id/stop - Stop a feed
feedsApp.post('/:id/stop', async (c) => {
  const feedId = c.req.param('id');

  const [feed] = await db
    .select()
    .from(feeds)
    .where(eq(feeds.id, feedId))
    .limit(1);

  if (!feed) {
    return c.json({ error: 'Feed not found' }, 404);
  }

  stopFeed(feedId);

  await db
    .update(feeds)
    .set({ enabled: false, updatedAt: new Date() })
    .where(eq(feeds.id, feedId));

  return c.json({ stopped: true });
});

// GET /feeds/:id/items - Get feed items
feedsApp.get('/:id/items', zValidator('query', feedItemsQuerySchema), async (c) => {
  const feedId = c.req.param('id');
  const { type, startDate, endDate, limit, offset } = c.req.valid('query');

  const conditions = [eq(feedItems.feedId, feedId)];

  if (type) {
    conditions.push(eq(feedItems.type, type));
  }
  if (startDate) {
    conditions.push(gte(feedItems.timestamp, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(feedItems.timestamp, new Date(endDate)));
  }

  const items = await db
    .select()
    .from(feedItems)
    .where(and(...conditions))
    .orderBy(desc(feedItems.timestamp))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(feedItems)
    .where(and(...conditions));

  return c.json({
    items,
    pagination: {
      total: Number(count),
      limit,
      offset,
      hasMore: offset + items.length < Number(count),
    },
  });
});

// GET /feeds/items/search - Search across all feed items
feedsApp.get('/items/search', zValidator('query', z.object({
  projectId: z.string().uuid(),
  query: z.string().min(1),
  type: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
})), async (c) => {
  const { projectId, query, type, limit } = c.req.valid('query');

  const conditions = [
    eq(feedItems.projectId, projectId),
    sql`to_tsvector('english', ${feedItems.title} || ' ' || coalesce(${feedItems.content}, '')) @@ plainto_tsquery('english', ${query})`,
  ];

  if (type) {
    conditions.push(eq(feedItems.type, type));
  }

  const items = await db
    .select()
    .from(feedItems)
    .where(and(...conditions))
    .orderBy(desc(feedItems.timestamp))
    .limit(limit);

  return c.json({ items });
});

export { feedsApp };
```

---

## Data Retention Policy

### Retention Configuration

**File: `apps/api/src/feeds/retention.config.ts`**
```typescript
export interface RetentionPolicy {
  type: string;
  retentionDays: number;
  archiveEnabled: boolean;
  archiveBucket?: string;
}

export const DEFAULT_RETENTION_POLICIES: Record<string, RetentionPolicy> = {
  news: {
    type: 'news',
    retentionDays: 90,
    archiveEnabled: true,
    archiveBucket: 'sitmon-archive-news',
  },
  flight: {
    type: 'flight',
    retentionDays: 7,
    archiveEnabled: false, // High volume, short-term relevance
  },
  maritime: {
    type: 'maritime',
    retentionDays: 14,
    archiveEnabled: false,
  },
  weather: {
    type: 'weather',
    retentionDays: 30,
    archiveEnabled: false,
  },
  civil_unrest: {
    type: 'civil_unrest',
    retentionDays: 365,
    archiveEnabled: true,
    archiveBucket: 'sitmon-archive-events',
  },
  fire: {
    type: 'fire',
    retentionDays: 180,
    archiveEnabled: true,
    archiveBucket: 'sitmon-archive-events',
  },
  telegram: {
    type: 'telegram',
    retentionDays: 60,
    archiveEnabled: true,
    archiveBucket: 'sitmon-archive-osint',
  },
  custom: {
    type: 'custom',
    retentionDays: 30,
    archiveEnabled: false,
  },
};

export function getRetentionPolicy(type: string): RetentionPolicy {
  return DEFAULT_RETENTION_POLICIES[type] || DEFAULT_RETENTION_POLICIES.custom;
}
```

### Retention Cleanup Job

**File: `apps/api/src/jobs/workers/retention.worker.ts`**
```typescript
import { Worker, Job } from 'bullmq';
import { redis } from '../../lib/redis';
import { db } from '../../db';
import { feedItems } from '../../db/schema';
import { lt, eq, and, sql } from 'drizzle-orm';
import { getRetentionPolicy } from '../../feeds/retention.config';
import { archiveToS3 } from '../../lib/archive';

interface RetentionJobData {
  type?: string; // If not specified, run for all types
  dryRun?: boolean;
}

interface RetentionResult {
  type: string;
  deleted: number;
  archived: number;
}

export const retentionWorker = new Worker<RetentionJobData>(
  'data-retention',
  async (job: Job<RetentionJobData>) => {
    const { type, dryRun = false } = job.data;
    const results: RetentionResult[] = [];

    const types = type
      ? [type]
      : ['news', 'flight', 'maritime', 'weather', 'civil_unrest', 'fire', 'telegram', 'custom'];

    for (const feedType of types) {
      const policy = getRetentionPolicy(feedType);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      console.log(`[Retention] Processing ${feedType}, cutoff: ${cutoffDate.toISOString()}`);

      // Count items to process
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(feedItems)
        .where(and(
          eq(feedItems.type, feedType),
          lt(feedItems.timestamp, cutoffDate)
        ));

      const itemCount = Number(count);
      if (itemCount === 0) {
        results.push({ type: feedType, deleted: 0, archived: 0 });
        continue;
      }

      let archivedCount = 0;

      // Archive if enabled
      if (policy.archiveEnabled && policy.archiveBucket && !dryRun) {
        const itemsToArchive = await db
          .select()
          .from(feedItems)
          .where(and(
            eq(feedItems.type, feedType),
            lt(feedItems.timestamp, cutoffDate)
          ))
          .limit(10000); // Batch size

        if (itemsToArchive.length > 0) {
          const archiveKey = `${feedType}/${cutoffDate.toISOString().split('T')[0]}.jsonl`;
          await archiveToS3(policy.archiveBucket, archiveKey, itemsToArchive);
          archivedCount = itemsToArchive.length;
          console.log(`[Retention] Archived ${archivedCount} ${feedType} items to ${archiveKey}`);
        }
      }

      // Delete old items
      if (!dryRun) {
        const deleteResult = await db
          .delete(feedItems)
          .where(and(
            eq(feedItems.type, feedType),
            lt(feedItems.timestamp, cutoffDate)
          ));

        console.log(`[Retention] Deleted ${itemCount} ${feedType} items`);
      }

      results.push({
        type: feedType,
        deleted: dryRun ? 0 : itemCount,
        archived: archivedCount,
      });

      // Update job progress
      await job.updateProgress((types.indexOf(feedType) + 1) / types.length * 100);
    }

    return { results, dryRun };
  },
  {
    connection: redis,
    concurrency: 1, // Run sequentially to avoid resource contention
  }
);

retentionWorker.on('completed', (job, result) => {
  console.log(`[Retention] Job ${job.id} completed:`, result);
});

retentionWorker.on('failed', (job, error) => {
  console.error(`[Retention] Job ${job?.id} failed:`, error);
});
```

### Archive Utility

**File: `apps/api/src/lib/archive.ts`**
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

export async function archiveToS3(
  bucket: string,
  key: string,
  items: unknown[]
): Promise<void> {
  // Convert to JSONL format
  const jsonl = items.map(item => JSON.stringify(item)).join('\n');

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: jsonl,
    ContentType: 'application/x-ndjson',
    ContentEncoding: 'gzip',
  }));
}
```

### Scheduled Retention Job

**File: `apps/api/src/jobs/scheduled/retention.cron.ts`**
```typescript
import { Queue } from 'bullmq';
import { redis } from '../../lib/redis';

const retentionQueue = new Queue('data-retention', { connection: redis });

// Schedule daily retention cleanup at 3:00 AM UTC
export async function scheduleRetentionJob(): Promise<void> {
  await retentionQueue.add(
    'daily-cleanup',
    { dryRun: false },
    {
      repeat: {
        pattern: '0 3 * * *', // 3:00 AM UTC daily
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  console.log('[Retention] Daily cleanup job scheduled');
}

// Manual trigger for testing
export async function triggerRetentionJob(options?: { type?: string; dryRun?: boolean }): Promise<string> {
  const job = await retentionQueue.add('manual-cleanup', options || {});
  return job.id!;
}
```

---

## WebSocket Reconnection Strategy

### Client-Side Reconnection Hook

**File: `apps/web/src/hooks/useWebSocketReconnect.ts`**
```typescript
import { useCallback, useEffect, useRef, useState } from 'react';

interface WebSocketOptions {
  url: string;
  onMessage: (event: MessageEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

interface WebSocketState {
  isConnected: boolean;
  isReconnecting: boolean;
  retryCount: number;
  lastError: string | null;
}

export function useWebSocketReconnect({
  url,
  onMessage,
  onOpen,
  onClose,
  onError,
  reconnect = true,
  maxRetries = 10,
  baseDelay = 1000,
  maxDelay = 30000,
}: WebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isReconnecting: false,
    retryCount: 0,
    lastError: null,
  });

  // Calculate exponential backoff delay with jitter
  const getReconnectDelay = useCallback(() => {
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, retryCountRef.current),
      maxDelay
    );
    // Add jitter (0-25% of delay)
    const jitter = exponentialDelay * Math.random() * 0.25;
    return exponentialDelay + jitter;
  }, [baseDelay, maxDelay]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        retryCountRef.current = 0;
        setState({
          isConnected: true,
          isReconnecting: false,
          retryCount: 0,
          lastError: null,
        });
        onOpen?.();
      };

      ws.onmessage = onMessage;

      ws.onclose = (event) => {
        console.log(`[WebSocket] Closed: ${event.code} ${event.reason}`);
        setState(prev => ({
          ...prev,
          isConnected: false,
        }));
        onClose?.();

        // Attempt reconnect if enabled and not a normal closure
        if (reconnect && event.code !== 1000 && retryCountRef.current < maxRetries) {
          const delay = getReconnectDelay();
          retryCountRef.current++;

          setState(prev => ({
            ...prev,
            isReconnecting: true,
            retryCount: retryCountRef.current,
          }));

          console.log(`[WebSocket] Reconnecting in ${Math.round(delay)}ms (attempt ${retryCountRef.current}/${maxRetries})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (retryCountRef.current >= maxRetries) {
          setState(prev => ({
            ...prev,
            isReconnecting: false,
            lastError: 'Max reconnection attempts reached',
          }));
        }
      };

      ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        setState(prev => ({
          ...prev,
          lastError: 'Connection error',
        }));
        onError?.(event);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      setState(prev => ({
        ...prev,
        lastError: 'Failed to create connection',
      }));
    }
  }, [url, onMessage, onOpen, onClose, onError, reconnect, maxRetries, getReconnectDelay]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    retryCountRef.current = 0;
    setState({
      isConnected: false,
      isReconnecting: false,
      retryCount: 0,
      lastError: null,
    });
  }, []);

  // Send message
  const send = useCallback((data: string | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
      return true;
    }
    console.warn('[WebSocket] Cannot send: not connected');
    return false;
  }, []);

  // Force reconnect
  const forceReconnect = useCallback(() => {
    disconnect();
    retryCountRef.current = 0;
    connect();
  }, [connect, disconnect]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    ...state,
    send,
    disconnect,
    forceReconnect,
  };
}
```

### Connection Status Component

**File: `apps/web/src/components/ConnectionStatus.tsx`**
```tsx
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting: boolean;
  retryCount: number;
  lastError: string | null;
  className?: string;
}

export function ConnectionStatus({
  isConnected,
  isReconnecting,
  retryCount,
  lastError,
  className,
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    if (isConnected) return 'text-green-500';
    if (isReconnecting) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (isReconnecting) return `Reconnecting (${retryCount})...`;
    if (lastError) return lastError;
    return 'Disconnected';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('flex items-center gap-1.5', className)}>
          {isReconnecting ? (
            <Loader2 className={cn('w-4 h-4 animate-spin', getStatusColor())} />
          ) : isConnected ? (
            <Wifi className={cn('w-4 h-4', getStatusColor())} />
          ) : (
            <WifiOff className={cn('w-4 h-4', getStatusColor())} />
          )}
          <span className={cn('text-xs font-mono', getStatusColor())}>
            {isConnected ? 'LIVE' : isReconnecting ? 'RETRY' : 'OFFLINE'}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getStatusText()}</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

### Server-Side Heartbeat

**File: `apps/api/src/websocket/heartbeat.ts`**
```typescript
import type { ServerWebSocket } from 'bun';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 10000;  // 10 seconds to respond

interface HeartbeatState {
  lastPing: number;
  lastPong: number;
  isAlive: boolean;
}

const clientHeartbeats = new Map<ServerWebSocket<any>, HeartbeatState>();

export function initHeartbeat(ws: ServerWebSocket<any>): void {
  clientHeartbeats.set(ws, {
    lastPing: Date.now(),
    lastPong: Date.now(),
    isAlive: true,
  });
}

export function handlePong(ws: ServerWebSocket<any>): void {
  const state = clientHeartbeats.get(ws);
  if (state) {
    state.lastPong = Date.now();
    state.isAlive = true;
  }
}

export function removeHeartbeat(ws: ServerWebSocket<any>): void {
  clientHeartbeats.delete(ws);
}

// Run heartbeat check for all connected clients
export function startHeartbeatChecker(): NodeJS.Timeout {
  return setInterval(() => {
    const now = Date.now();

    for (const [ws, state] of clientHeartbeats) {
      // Check if previous ping was acknowledged
      if (!state.isAlive) {
        console.log('[Heartbeat] Client unresponsive, closing connection');
        ws.close(1001, 'Heartbeat timeout');
        clientHeartbeats.delete(ws);
        continue;
      }

      // Send new ping
      state.isAlive = false;
      state.lastPing = now;

      try {
        ws.send(JSON.stringify({ type: 'ping', timestamp: now }));
      } catch (error) {
        console.error('[Heartbeat] Failed to send ping:', error);
        clientHeartbeats.delete(ws);
      }
    }
  }, HEARTBEAT_INTERVAL);
}

export function stopHeartbeatChecker(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
}
```

---

## Health Monitoring & Metrics

### Health Check Endpoint

**File: `apps/api/src/health/health.routes.ts`**
```typescript
import { Hono } from 'hono';
import { db } from '../db';
import { redis } from '../lib/redis';
import { ingestQueue, processQueue, alertQueue } from '../jobs/queues';
import { sql } from 'drizzle-orm';

const healthApp = new Hono();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    queues: ComponentHealth;
    websocket: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

const startTime = Date.now();

// GET /health - Basic health check
healthApp.get('/', async (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /health/ready - Readiness check (for k8s)
healthApp.get('/ready', async (c) => {
  try {
    // Check database connection
    await db.execute(sql`SELECT 1`);

    // Check Redis connection
    await redis.ping();

    return c.json({ ready: true });
  } catch (error) {
    return c.json({ ready: false, error: String(error) }, 503);
  }
});

// GET /health/live - Liveness check (for k8s)
healthApp.get('/live', (c) => {
  return c.json({ alive: true });
});

// GET /health/detailed - Detailed health status
healthApp.get('/detailed', async (c) => {
  const checks: HealthStatus['checks'] = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    queues: await checkQueues(),
    websocket: checkWebSocket(),
  };

  const allUp = Object.values(checks).every(c => c.status === 'up');
  const anyDown = Object.values(checks).some(c => c.status === 'down');

  const status: HealthStatus = {
    status: allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '0.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };

  const httpStatus = status.status === 'healthy' ? 200 : status.status === 'degraded' ? 200 : 503;
  return c.json(status, httpStatus);
});

async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      message: String(error),
    };
  }
}

async function checkRedis(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    await redis.ping();
    const info = await redis.info('memory');
    const usedMemory = info.match(/used_memory:(\d+)/)?.[1];

    return {
      status: 'up',
      latency: Date.now() - start,
      details: {
        usedMemoryBytes: usedMemory ? parseInt(usedMemory) : null,
      },
    };
  } catch (error) {
    return {
      status: 'down',
      message: String(error),
    };
  }
}

async function checkQueues(): Promise<ComponentHealth> {
  try {
    const [ingestCounts, processCounts, alertCounts] = await Promise.all([
      ingestQueue.getJobCounts(),
      processQueue.getJobCounts(),
      alertQueue.getJobCounts(),
    ]);

    const totalWaiting =
      ingestCounts.waiting + processCounts.waiting + alertCounts.waiting;
    const totalFailed =
      ingestCounts.failed + processCounts.failed + alertCounts.failed;

    // Degraded if too many jobs waiting or failed
    const status =
      totalFailed > 100 ? 'degraded' :
      totalWaiting > 10000 ? 'degraded' : 'up';

    return {
      status,
      details: {
        ingest: ingestCounts,
        process: processCounts,
        alerts: alertCounts,
      },
    };
  } catch (error) {
    return {
      status: 'down',
      message: String(error),
    };
  }
}

function checkWebSocket(): ComponentHealth {
  // WebSocket health is tracked separately via metrics
  // This is a simplified check
  return {
    status: 'up',
    details: {
      // Would be populated from WebSocket server stats
      activeConnections: 0,
    },
  };
}

export { healthApp };
```

### Metrics Collection

**File: `apps/api/src/metrics/metrics.ts`**
```typescript
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

export const metricsRegistry = new Registry();

// Feed metrics
export const feedItemsProcessed = new Counter({
  name: 'sitmon_feed_items_processed_total',
  help: 'Total number of feed items processed',
  labelNames: ['type', 'status'],
  registers: [metricsRegistry],
});

export const feedItemsLatency = new Histogram({
  name: 'sitmon_feed_items_latency_seconds',
  help: 'Feed item processing latency in seconds',
  labelNames: ['type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10],
  registers: [metricsRegistry],
});

export const activeFeedsGauge = new Gauge({
  name: 'sitmon_active_feeds',
  help: 'Number of active feed schedules',
  labelNames: ['type'],
  registers: [metricsRegistry],
});

// Queue metrics
export const queueJobsGauge = new Gauge({
  name: 'sitmon_queue_jobs',
  help: 'Number of jobs in queue by status',
  labelNames: ['queue', 'status'],
  registers: [metricsRegistry],
});

export const queueJobDuration = new Histogram({
  name: 'sitmon_queue_job_duration_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['queue'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [metricsRegistry],
});

// WebSocket metrics
export const wsConnectionsGauge = new Gauge({
  name: 'sitmon_websocket_connections',
  help: 'Number of active WebSocket connections',
  labelNames: ['project'],
  registers: [metricsRegistry],
});

export const wsMessagesTotal = new Counter({
  name: 'sitmon_websocket_messages_total',
  help: 'Total WebSocket messages sent',
  labelNames: ['type', 'direction'],
  registers: [metricsRegistry],
});

// Alert metrics
export const alertsTriggered = new Counter({
  name: 'sitmon_alerts_triggered_total',
  help: 'Total alerts triggered',
  labelNames: ['severity', 'type'],
  registers: [metricsRegistry],
});

export const alertsDelivered = new Counter({
  name: 'sitmon_alerts_delivered_total',
  help: 'Total alerts delivered',
  labelNames: ['channel'], // websocket, email, push
  registers: [metricsRegistry],
});

// Retention metrics
export const retentionItemsDeleted = new Counter({
  name: 'sitmon_retention_items_deleted_total',
  help: 'Total items deleted by retention policy',
  labelNames: ['type'],
  registers: [metricsRegistry],
});

export const retentionItemsArchived = new Counter({
  name: 'sitmon_retention_items_archived_total',
  help: 'Total items archived by retention policy',
  labelNames: ['type'],
  registers: [metricsRegistry],
});
```

### Metrics Endpoint

**File: `apps/api/src/metrics/metrics.routes.ts`**
```typescript
import { Hono } from 'hono';
import { metricsRegistry } from './metrics';

const metricsApp = new Hono();

// GET /metrics - Prometheus metrics endpoint
metricsApp.get('/', async (c) => {
  const metrics = await metricsRegistry.metrics();
  return c.text(metrics, 200, {
    'Content-Type': metricsRegistry.contentType,
  });
});

export { metricsApp };
```

---

## Additional Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/feeds/feeds.routes.ts` | Feed CRUD API endpoints |
| `apps/api/src/feeds/retention.config.ts` | Retention policy configuration |
| `apps/api/src/jobs/workers/retention.worker.ts` | Data retention cleanup worker |
| `apps/api/src/jobs/scheduled/retention.cron.ts` | Scheduled retention job |
| `apps/api/src/lib/archive.ts` | S3 archive utility |
| `apps/web/src/hooks/useWebSocketReconnect.ts` | WebSocket reconnection hook |
| `apps/web/src/components/ConnectionStatus.tsx` | Connection status indicator |
| `apps/api/src/websocket/heartbeat.ts` | Server-side heartbeat management |
| `apps/api/src/health/health.routes.ts` | Health check endpoints |
| `apps/api/src/metrics/metrics.ts` | Prometheus metrics definitions |
| `apps/api/src/metrics/metrics.routes.ts` | Metrics endpoint |

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/feeds/feeds.routes.ts` | Feed management REST API endpoints |
| `apps/api/src/feeds/retention.config.ts` | Data retention policy configuration |
| `apps/api/src/jobs/workers/retention.worker.ts` | Retention cleanup BullMQ worker |
| `apps/api/src/jobs/scheduled/retention.cron.ts` | Scheduled retention job setup |
| `apps/api/src/lib/archive.ts` | S3 archive utility for expired data |
| `apps/web/src/hooks/useWebSocketReconnect.ts` | Client-side WebSocket reconnection with exponential backoff |
| `apps/web/src/components/ConnectionStatus.tsx` | Real-time connection status UI component |
| `apps/api/src/websocket/heartbeat.ts` | Server-side WebSocket heartbeat management |
| `apps/api/src/health/health.routes.ts` | Health check endpoints for k8s probes |
| `apps/api/src/metrics/metrics.ts` | Prometheus metrics definitions |
| `apps/api/src/metrics/metrics.routes.ts` | Metrics scrape endpoint |

---

## Acceptance Criteria

### API Endpoints
- [ ] GET /feeds returns all feeds for a project
- [ ] POST /feeds creates and schedules a new feed
- [ ] PUT /feeds/:id updates feed configuration and restarts scheduler
- [ ] DELETE /feeds/:id stops and removes a feed
- [ ] POST /feeds/:id/start and /stop control feed execution
- [ ] GET /feeds/:id/items returns paginated feed items with filtering
- [ ] GET /feeds/items/search performs full-text search across feed items

### Data Retention
- [ ] Retention policies are configurable per feed type
- [ ] Retention worker runs daily at scheduled time
- [ ] Items older than retention period are deleted
- [ ] Archiving to S3 works for configured feed types
- [ ] Dry run mode allows testing without deletion
- [ ] Metrics track items deleted and archived

### WebSocket Reconnection
- [ ] Client reconnects automatically on connection loss
- [ ] Exponential backoff prevents server overload
- [ ] Jitter prevents thundering herd on mass reconnection
- [ ] Maximum retry limit prevents infinite loops
- [ ] Connection status is visible to users
- [ ] Server heartbeat detects stale connections

### Health Monitoring
- [ ] /health returns basic status
- [ ] /health/ready checks all dependencies (k8s readiness)
- [ ] /health/live confirms process is running (k8s liveness)
- [ ] /health/detailed provides component-level health
- [ ] /metrics exposes Prometheus-compatible metrics
- [ ] Queue, WebSocket, and feed metrics are tracked

---

## Environment Variables

```bash
# API Server
APP_VERSION=1.0.0

# AWS (for archiving)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Archive buckets
ARCHIVE_BUCKET_NEWS=sitmon-archive-news
ARCHIVE_BUCKET_EVENTS=sitmon-archive-events
ARCHIVE_BUCKET_OSINT=sitmon-archive-osint

# Retention defaults (can override per-feed)
DEFAULT_RETENTION_DAYS=30

# WebSocket
WS_HEARTBEAT_INTERVAL=30000
WS_HEARTBEAT_TIMEOUT=10000

# Metrics
METRICS_ENABLED=true
```

---

## Dependencies

```bash
# API
cd apps/api
pnpm add prom-client @aws-sdk/client-s3

# No additional web dependencies required
```
