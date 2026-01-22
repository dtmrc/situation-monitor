/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Feed Ingest Worker
 *
 * Handles raw data fetching from external APIs.
 * Processes jobs from the feed-ingest queue and:
 * 1. Looks up the feed configuration
 * 2. Calls the appropriate adapter to fetch data
 * 3. Enqueues items for processing
 */

import { Worker, type Job } from 'bullmq';
import { eq } from 'drizzle-orm';

import { db } from '../../db';
import { feedConfigs } from '../../db/schema/feeds';
import { fetchFeedItems, createProcessingLog } from '../../feeds/normalizer.service';
import {
  feedProcessQueue,
  createWorkerConnection,
  type FeedIngestJobData,
  type FeedProcessJobData,
} from '../queues';

// Worker configuration
const WORKER_CONCURRENCY = 10;
const _WORKER_NAME = 'feed-ingest'; // Used for logging/metrics

/**
 * Create the ingest worker
 */
export function createIngestWorker(): Worker<FeedIngestJobData> {
  const worker = new Worker<FeedIngestJobData>(
    'feed-ingest',
    async (job: Job<FeedIngestJobData>) => {
      const { feedConfigId, projectId, feedType } = job.data;

      console.log(`[Ingest] Processing job ${job.id} for feed ${feedConfigId}`);

      // Lookup feed configuration
      const config = await db.query.feedConfigs.findFirst({
        where: eq(feedConfigs.id, feedConfigId),
      });

      if (!config) {
        throw new Error(`Feed config not found: ${feedConfigId}`);
      }

      if (!config.enabled) {
        console.log(`[Ingest] Feed ${config.name} is disabled, skipping`);
        return { skipped: true, reason: 'disabled' };
      }

      // Create processing log entry
      const logId = await createProcessingLog(feedConfigId, job.id);

      try {
        // Fetch items using the normalizer service
        const result = await fetchFeedItems(config);

        if (result.errors.length > 0) {
          console.warn(`[Ingest] Errors fetching ${config.name}:`, result.errors);
        }

        if (result.items.length === 0) {
          console.log(`[Ingest] No items fetched for ${config.name}`);
          return {
            itemsFetched: 0,
            logId,
          };
        }

        console.log(`[Ingest] Fetched ${result.items.length} items from ${config.name}`);

        // Enqueue items for processing in batches
        const BATCH_SIZE = 50;
        const batches: FeedProcessJobData[] = [];

        for (let i = 0; i < result.items.length; i += BATCH_SIZE) {
          const batchItems = result.items.slice(i, i + BATCH_SIZE);
          batches.push({
            feedConfigId,
            projectId,
            feedType,
            rawItems: batchItems,
            processingLogId: logId,
            feedOptions: config.options as Record<string, unknown> | null,
          });
        }

        // Add all batches to process queue
        await feedProcessQueue.addBulk(
          batches.map((data, index) => ({
            name: `process:${feedConfigId}:${index}`,
            data,
            opts: {
              jobId: `${job.id}:batch:${index}`,
            },
          }))
        );

        return {
          itemsFetched: result.items.length,
          batchesQueued: batches.length,
          logId,
          hasMore: result.hasMore,
        };
      } catch (error) {
        console.error(`[Ingest] Error processing ${config.name}:`, error);
        throw error;
      }
    },
    {
      connection: createWorkerConnection(),
      concurrency: WORKER_CONCURRENCY,
      limiter: {
        max: 20, // Max 20 jobs per minute
        duration: 60000,
      },
    }
  );

  // Event handlers
  worker.on('completed', (job, result) => {
    console.log(`[Ingest] Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Ingest] Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('[Ingest] Worker error:', error);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[Ingest] Job ${jobId} stalled`);
  });

  console.log(`[Ingest] Worker started with concurrency ${WORKER_CONCURRENCY}`);

  return worker;
}

let workerInstance: Worker<FeedIngestJobData> | null = null;

/**
 * Start the ingest worker
 */
export function startIngestWorker(): Worker<FeedIngestJobData> {
  if (workerInstance) {
    console.warn('[Ingest] Worker already running');
    return workerInstance;
  }

  workerInstance = createIngestWorker();
  return workerInstance;
}

/**
 * Stop the ingest worker gracefully
 */
export async function stopIngestWorker(): Promise<void> {
  if (!workerInstance) {
    return;
  }

  console.log('[Ingest] Stopping worker...');
  await workerInstance.close();
  workerInstance = null;
  console.log('[Ingest] Worker stopped');
}

/**
 * Get worker status
 */
export function getIngestWorkerStatus(): {
  running: boolean;
  isPaused: boolean;
} {
  if (!workerInstance) {
    return { running: false, isPaused: false };
  }

  return {
    running: workerInstance.isRunning(),
    isPaused: workerInstance.isPaused(),
  };
}
