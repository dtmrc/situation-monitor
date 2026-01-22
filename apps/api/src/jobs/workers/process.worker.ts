/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Feed Process Worker
 *
 * Handles normalization and storage of feed items.
 * Processes jobs from the feed-process queue and:
 * 1. Stores items in the database
 * 2. Publishes items for real-time delivery
 * 3. Enqueues items for tripwire checking
 */

import { Worker, type Job } from 'bullmq';

import type { NormalizedFeedItem } from '../../feeds/adapter.interface';
import { storeItems, completeProcessingLog } from '../../feeds/normalizer.service';
import {
  tripwireCheckQueue,
  createWorkerConnection,
  type FeedProcessJobData,
  type TripwireCheckJobData,
} from '../queues';

// Worker configuration
const WORKER_CONCURRENCY = 5;
const _WORKER_NAME = 'feed-process'; // Used for logging/metrics

/**
 * Create the process worker
 */
export function createProcessWorker(): Worker<FeedProcessJobData> {
  const worker = new Worker<FeedProcessJobData>(
    'feed-process',
    async (job: Job<FeedProcessJobData>) => {
      const { feedConfigId, projectId, feedType, rawItems, processingLogId } = job.data;
      const startTime = new Date();

      console.log(`[Process] Processing ${rawItems.length} items for feed ${feedConfigId}`);

      try {
        // Items are already normalized by the ingest step
        const items = rawItems as NormalizedFeedItem[];

        // Store items in database
        const { created, duplicates } = await storeItems(projectId, feedConfigId, items);

        console.log(`[Process] Stored ${created} new items, ${duplicates} duplicates`);

        // Enqueue tripwire checks for items with location data
        const itemsWithLocation = items.filter((item) => item.location);

        if (itemsWithLocation.length > 0) {
          const tripwireJobs: { name: string; data: TripwireCheckJobData }[] =
            itemsWithLocation.map((item, index) => ({
              name: `tripwire:${feedConfigId}:${index}`,
              data: {
                feedItemId: item.externalId || `${feedConfigId}:${index}`,
                projectId,
                feedType,
                latitude: item.location!.latitude,
                longitude: item.location!.longitude,
                metadata: {
                  title: item.title,
                  severity: item.severity,
                  timestamp: item.timestamp,
                  ...item.metadata,
                },
              },
            }));

          await tripwireCheckQueue.addBulk(tripwireJobs);
          console.log(`[Process] Queued ${tripwireJobs.length} tripwire checks`);
        }

        // Update processing log
        await completeProcessingLog(processingLogId, items.length, created, startTime);

        return {
          processed: items.length,
          created,
          duplicates,
          tripwireChecks: itemsWithLocation.length,
        };
      } catch (error) {
        // Log the error
        await completeProcessingLog(
          processingLogId,
          rawItems.length,
          0,
          startTime,
          error instanceof Error ? error.message : 'Unknown error'
        );

        throw error;
      }
    },
    {
      connection: createWorkerConnection(),
      concurrency: WORKER_CONCURRENCY,
    }
  );

  // Event handlers
  worker.on('completed', (job, result) => {
    console.log(`[Process] Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Process] Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('[Process] Worker error:', error);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[Process] Job ${jobId} stalled`);
  });

  console.log(`[Process] Worker started with concurrency ${WORKER_CONCURRENCY}`);

  return worker;
}

let workerInstance: Worker<FeedProcessJobData> | null = null;

/**
 * Start the process worker
 */
export function startProcessWorker(): Worker<FeedProcessJobData> {
  if (workerInstance) {
    console.warn('[Process] Worker already running');
    return workerInstance;
  }

  workerInstance = createProcessWorker();
  return workerInstance;
}

/**
 * Stop the process worker gracefully
 */
export async function stopProcessWorker(): Promise<void> {
  if (!workerInstance) {
    return;
  }

  console.log('[Process] Stopping worker...');
  await workerInstance.close();
  workerInstance = null;
  console.log('[Process] Worker stopped');
}

/**
 * Get worker status
 */
export function getProcessWorkerStatus(): {
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
