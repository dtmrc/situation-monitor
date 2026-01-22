/**
 * Retention Worker
 *
 * Processes retention cleanup jobs to remove old feed items
 * based on configured retention policies.
 */

import type { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { lt, and, eq, inArray } from 'drizzle-orm';

import { db } from '../../db';
import { feedItems, feedProcessingLog } from '../../db/schema/feeds';
import type { FeedType } from '../../db/schema/feeds';
import {
  retentionPolicies,
  retentionSettings,
  getRetentionCutoff,
} from '../../feeds/retention.config';
import { retentionItemsDeleted, retentionRunDuration } from '../../metrics/metrics';
import { createWorkerConnection } from '../queues';
import { registerWorker } from '../shutdown';

export interface RetentionJobData {
  feedType?: FeedType; // If specified, only cleanup this type
  projectId?: string; // If specified, only cleanup this project
  force?: boolean; // If true, ignore keepAlerting policy
}

export interface RetentionJobResult {
  deletedCount: number;
  feedType?: FeedType;
  projectId?: string;
  duration: number;
}

/**
 * Delete old feed items in batches
 */
async function deleteFeedItems(
  feedType: FeedType,
  cutoff: Date,
  projectId?: string
): Promise<number> {
  let totalDeleted = 0;
  let batchDeleted = 0;

  do {
    // Build conditions
    const conditions = [eq(feedItems.type, feedType), lt(feedItems.createdAt, cutoff)];

    if (projectId) {
      conditions.push(eq(feedItems.projectId, projectId));
    }

    // Find items to delete (batch)
    const itemsToDelete = await db
      .select({ id: feedItems.id })
      .from(feedItems)
      .where(and(...conditions))
      .limit(retentionSettings.batchSize);

    if (itemsToDelete.length === 0) {
      break;
    }

    const ids = itemsToDelete.map((i) => i.id);

    // Delete the batch
    await db.delete(feedItems).where(inArray(feedItems.id, ids));

    batchDeleted = ids.length;
    totalDeleted += batchDeleted;

    // Update metrics
    retentionItemsDeleted.inc({ feed_type: feedType }, batchDeleted);

    // Delay between batches to avoid overwhelming the database
    if (batchDeleted === retentionSettings.batchSize) {
      await new Promise((resolve) => setTimeout(resolve, retentionSettings.batchDelayMs));
    }
  } while (batchDeleted === retentionSettings.batchSize);

  return totalDeleted;
}

/**
 * Delete old processing logs
 */
async function deleteProcessingLogs(_cutoff: Date): Promise<number> {
  let totalDeleted = 0;
  let batchDeleted = 0;

  // Processing logs have a shorter retention (7 days by default)
  const logCutoff = new Date();
  logCutoff.setDate(logCutoff.getDate() - 7);

  do {
    const logsToDelete = await db
      .select({ id: feedProcessingLog.id })
      .from(feedProcessingLog)
      .where(lt(feedProcessingLog.startedAt, logCutoff))
      .limit(retentionSettings.batchSize);

    if (logsToDelete.length === 0) {
      break;
    }

    const ids = logsToDelete.map((l) => l.id);

    await db.delete(feedProcessingLog).where(inArray(feedProcessingLog.id, ids));

    batchDeleted = ids.length;
    totalDeleted += batchDeleted;

    if (batchDeleted === retentionSettings.batchSize) {
      await new Promise((resolve) => setTimeout(resolve, retentionSettings.batchDelayMs));
    }
  } while (batchDeleted === retentionSettings.batchSize);

  return totalDeleted;
}

/**
 * Process a retention cleanup job
 */
async function processRetentionJob(job: Job<RetentionJobData>): Promise<RetentionJobResult> {
  const startTime = Date.now();
  const { feedType, projectId, force } = job.data;

  console.log(`[Retention] Starting cleanup`, {
    feedType: feedType || 'all',
    projectId: projectId || 'all',
    force,
  });

  let totalDeleted = 0;

  // Get feed types to process
  const feedTypes = feedType ? [feedType] : (Object.keys(retentionPolicies) as FeedType[]);

  // Process each feed type
  for (const type of feedTypes) {
    const cutoff = getRetentionCutoff(type);
    const deleted = await deleteFeedItems(type, cutoff, projectId);

    if (deleted > 0) {
      console.log(
        `[Retention] Deleted ${deleted} ${type} items older than ${cutoff.toISOString()}`
      );
    }

    totalDeleted += deleted;

    // Update job progress
    const progress = Math.round(((feedTypes.indexOf(type) + 1) / feedTypes.length) * 100);
    await job.updateProgress(progress);
  }

  // Also cleanup processing logs
  const logsDeleted = await deleteProcessingLogs(new Date());
  if (logsDeleted > 0) {
    console.log(`[Retention] Deleted ${logsDeleted} old processing logs`);
  }

  const duration = Date.now() - startTime;
  retentionRunDuration.observe(duration / 1000);

  console.log(`[Retention] Cleanup complete`, {
    totalDeleted,
    logsDeleted,
    duration: `${duration}ms`,
  });

  return {
    deletedCount: totalDeleted + logsDeleted,
    feedType,
    projectId,
    duration,
  };
}

/**
 * Create and start the retention worker
 */
export function createRetentionWorker(): Worker<RetentionJobData, RetentionJobResult> {
  const connection = createWorkerConnection();

  const worker = new Worker<RetentionJobData, RetentionJobResult>(
    'retention',
    processRetentionJob,
    {
      connection,
      concurrency: 1, // Only one retention job at a time
      limiter: {
        max: 1,
        duration: 60000, // Max 1 job per minute
      },
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`[Retention] Job ${job.id} completed`, {
      deletedCount: result.deletedCount,
      duration: `${result.duration}ms`,
    });
  });

  worker.on('failed', (job, error) => {
    console.error(`[Retention] Job ${job?.id} failed:`, error);
  });

  // Register for graceful shutdown
  registerWorker(worker);

  console.log('[Retention] Worker started');

  return worker;
}
