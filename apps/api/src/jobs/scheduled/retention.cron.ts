/**
 * Retention Cron Scheduler
 *
 * Schedules daily retention cleanup jobs using BullMQ's
 * built-in repeatable job support.
 */

import { retentionSettings } from '../../feeds/retention.config';
import { retentionQueue } from '../queues';

const RETENTION_JOB_NAME = 'daily-retention-cleanup';

/**
 * Schedule the daily retention cleanup job
 */
export async function scheduleRetentionJob(): Promise<void> {
  if (!retentionSettings.enabled) {
    console.log('[Retention] Retention cleanup is disabled');
    return;
  }

  // Remove any existing scheduled retention jobs
  const repeatableJobs = await retentionQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === RETENTION_JOB_NAME) {
      await retentionQueue.removeRepeatableByKey(job.key);
      console.log(`[Retention] Removed existing scheduled job: ${job.key}`);
    }
  }

  // Schedule new daily job at configured hour (UTC)
  const hour = retentionSettings.scheduledHour;
  const cronPattern = `0 ${hour} * * *`; // Every day at configured hour UTC

  await retentionQueue.add(
    RETENTION_JOB_NAME,
    {}, // Empty data - process all feed types
    {
      repeat: {
        pattern: cronPattern,
      },
      removeOnComplete: {
        count: 10, // Keep last 10 completed jobs
      },
      removeOnFail: {
        count: 50, // Keep last 50 failed jobs for debugging
      },
    }
  );

  console.log(`[Retention] Scheduled daily cleanup at ${hour}:00 UTC (cron: ${cronPattern})`);
}

/**
 * Trigger an immediate retention cleanup (for testing/manual use)
 */
export async function triggerImmediateRetention(options?: {
  feedType?: string;
  projectId?: string;
}): Promise<string> {
  const job = await retentionQueue.add(
    'manual-retention-cleanup',
    {
      feedType: options?.feedType,
      projectId: options?.projectId,
    },
    {
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  console.log(`[Retention] Triggered immediate cleanup job: ${job.id}`);
  return job.id!;
}

/**
 * Get retention job status
 */
export async function getRetentionStatus(): Promise<{
  scheduled: boolean;
  nextRun?: Date;
  lastRun?: {
    completedAt: Date;
    deletedCount: number;
    duration: number;
  };
}> {
  const repeatableJobs = await retentionQueue.getRepeatableJobs();
  const scheduledJob = repeatableJobs.find((j) => j.name === RETENTION_JOB_NAME);

  // Get last completed job
  const completedJobs = await retentionQueue.getCompleted(0, 1);
  const lastCompleted = completedJobs[0];

  return {
    scheduled: !!scheduledJob,
    nextRun: scheduledJob ? new Date(scheduledJob.next) : undefined,
    lastRun: lastCompleted
      ? {
          completedAt: new Date(lastCompleted.finishedOn!),
          deletedCount: (lastCompleted.returnvalue as { deletedCount?: number })?.deletedCount ?? 0,
          duration: (lastCompleted.returnvalue as { duration?: number })?.duration ?? 0,
        }
      : undefined,
  };
}

/**
 * Cancel scheduled retention jobs
 */
export async function cancelScheduledRetention(): Promise<void> {
  const repeatableJobs = await retentionQueue.getRepeatableJobs();

  for (const job of repeatableJobs) {
    if (job.name === RETENTION_JOB_NAME) {
      await retentionQueue.removeRepeatableByKey(job.key);
      console.log(`[Retention] Cancelled scheduled job: ${job.key}`);
    }
  }
}
