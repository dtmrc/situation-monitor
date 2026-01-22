import { Queue, QueueEvents, type QueueOptions, type ConnectionOptions } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Parse Redis URL for connection options (avoids ioredis version mismatch)
function parseRedisUrl(url: string): ConnectionOptions {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port, 10) || 6379,
      password: parsed.password || undefined,
      db: parsed.pathname ? parseInt(parsed.pathname.slice(1), 10) || 0 : 0,
      maxRetriesPerRequest: null, // Required for BullMQ
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
}

// Shared queue options
const defaultQueueOptions: Partial<QueueOptions> = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

// Create connection options for queues
function createQueueConnection(): ConnectionOptions {
  return parseRedisUrl(REDIS_URL);
}

// Export for workers to use the same connection pattern
export function createWorkerConnection(): ConnectionOptions {
  return parseRedisUrl(REDIS_URL);
}

// ============================================================================
// Queue Definitions
// ============================================================================

/**
 * Feed Ingest Queue
 * Handles raw data fetching from external APIs
 * High concurrency since most operations are I/O bound
 */
export const feedIngestQueue = new Queue('feed-ingest', {
  connection: createQueueConnection(),
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 5, // More retries for network operations
  },
});

/**
 * Feed Process Queue
 * Handles normalization and storage of feed items
 * Moderate concurrency to balance CPU and DB load
 */
export const feedProcessQueue = new Queue('feed-process', {
  connection: createQueueConnection(),
  ...defaultQueueOptions,
});

/**
 * Tripwire Check Queue
 * Evaluates feed items against tripwire conditions
 * Lower concurrency to ensure ordered evaluation
 */
export const tripwireCheckQueue = new Queue('tripwire-check', {
  connection: createQueueConnection(),
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 2, // Fewer retries for tripwire checks
  },
});

/**
 * Data Retention Queue
 * Handles cleanup of old feed data
 * Runs infrequently with low priority
 */
export const retentionQueue = new Queue('data-retention', {
  connection: createQueueConnection(),
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    priority: 10, // Lower priority
  },
});

// ============================================================================
// Queue Events (for monitoring)
// ============================================================================

export const feedIngestEvents = new QueueEvents('feed-ingest', {
  connection: createQueueConnection(),
});

export const feedProcessEvents = new QueueEvents('feed-process', {
  connection: createQueueConnection(),
});

export const tripwireCheckEvents = new QueueEvents('tripwire-check', {
  connection: createQueueConnection(),
});

// ============================================================================
// Job Types
// ============================================================================

export interface FeedIngestJobData {
  feedConfigId: string;
  projectId: string;
  feedType: string;
  options: Record<string, unknown>;
}

export interface FeedProcessJobData {
  feedConfigId: string;
  projectId: string;
  feedType: string;
  rawItems: unknown[];
  processingLogId: string;
  feedOptions?: Record<string, unknown> | null;
}

export interface TripwireCheckJobData {
  feedItemId: string;
  projectId: string;
  feedType: string;
  latitude?: number;
  longitude?: number;
  metadata: Record<string, unknown>;
}

export interface RetentionJobData {
  feedType?: string; // Optional: specific feed type to clean
  olderThan: number; // Timestamp
}

// ============================================================================
// Queue Management
// ============================================================================

const allQueues = [feedIngestQueue, feedProcessQueue, tripwireCheckQueue, retentionQueue];

const allEvents = [feedIngestEvents, feedProcessEvents, tripwireCheckEvents];

/**
 * Get queue statistics for health checks
 */
export async function getQueueStats() {
  const stats = await Promise.all(
    allQueues.map(async (queue) => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      return {
        name: queue.name,
        waiting,
        active,
        completed,
        failed,
        delayed,
      };
    })
  );

  return stats;
}

/**
 * Pause all queues (for graceful shutdown)
 */
export async function pauseAllQueues() {
  console.log('[Queues] Pausing all queues...');
  await Promise.all(allQueues.map((queue) => queue.pause()));
  console.log('[Queues] All queues paused');
}

/**
 * Resume all queues
 */
export async function resumeAllQueues() {
  console.log('[Queues] Resuming all queues...');
  await Promise.all(allQueues.map((queue) => queue.resume()));
  console.log('[Queues] All queues resumed');
}

/**
 * Close all queues and events (for shutdown)
 */
export async function closeAllQueues() {
  console.log('[Queues] Closing all queues and events...');

  await Promise.all([
    ...allQueues.map((queue) => queue.close()),
    ...allEvents.map((events) => events.close()),
  ]);

  console.log('[Queues] All queues and events closed');
}

/**
 * Drain all queues (remove all waiting jobs)
 */
export async function drainAllQueues() {
  console.log('[Queues] Draining all queues...');
  await Promise.all(allQueues.map((queue) => queue.drain()));
  console.log('[Queues] All queues drained');
}
