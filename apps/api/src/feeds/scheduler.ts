/**
 * Feed Scheduler
 *
 * Manages feed polling schedules using BullMQ repeatable jobs.
 * Handles:
 * - Starting/stopping individual feed polling
 * - Bulk start/stop for project feeds
 * - Dynamic interval updates
 * - Graceful shutdown
 */

import { feedIngestQueue, type FeedIngestJobData } from '../jobs/queues';

import type { FeedConfig } from './adapter.interface';
import { getAllEnabledFeedConfigs, getEnabledFeedConfigs } from './normalizer.service';

// Track active repeat job keys for management
const activeJobs = new Map<string, string>();

/**
 * Get the job key for a feed config
 */
function getJobKey(feedConfigId: string): string {
  return `feed:${feedConfigId}`;
}

/**
 * Start polling for a single feed
 */
export async function startFeedPolling(config: FeedConfig): Promise<void> {
  const jobKey = getJobKey(config.id);

  // Check if already running
  if (activeJobs.has(config.id)) {
    console.log(`[Scheduler] Feed ${config.name} is already polling`);
    return;
  }

  // Add repeatable job
  const jobData: FeedIngestJobData = {
    feedConfigId: config.id,
    projectId: config.projectId,
    feedType: config.type,
    options: config.options as Record<string, unknown>,
  };

  await feedIngestQueue.add(jobKey, jobData, {
    repeat: {
      every: config.pollInterval,
      key: jobKey,
    },
    jobId: jobKey,
  });

  // Also add an immediate job to fetch right away
  await feedIngestQueue.add(`${jobKey}:immediate`, jobData, {
    jobId: `${jobKey}:immediate:${Date.now()}`,
  });

  activeJobs.set(config.id, jobKey);
  console.log(`[Scheduler] Started polling for ${config.name} every ${config.pollInterval}ms`);
}

/**
 * Stop polling for a single feed
 */
export async function stopFeedPolling(feedConfigId: string): Promise<void> {
  const jobKey = getJobKey(feedConfigId);

  // Remove repeatable job
  const removed = await feedIngestQueue.removeRepeatableByKey(jobKey);

  if (removed) {
    activeJobs.delete(feedConfigId);
    console.log(`[Scheduler] Stopped polling for feed ${feedConfigId}`);
  } else {
    console.log(`[Scheduler] No active polling found for feed ${feedConfigId}`);
  }
}

/**
 * Update polling interval for a feed
 */
export async function updateFeedInterval(config: FeedConfig): Promise<void> {
  // Stop existing job
  await stopFeedPolling(config.id);

  // Start with new interval
  await startFeedPolling(config);
}

/**
 * Start polling for all enabled feeds in a project
 */
export async function startProjectFeeds(projectId: string): Promise<void> {
  const configs = await getEnabledFeedConfigs(projectId);

  console.log(`[Scheduler] Starting ${configs.length} feeds for project ${projectId}`);

  for (const config of configs) {
    await startFeedPolling(config);
  }
}

/**
 * Stop polling for all feeds in a project
 */
export async function stopProjectFeeds(projectId: string): Promise<void> {
  const configs = await getEnabledFeedConfigs(projectId);

  console.log(`[Scheduler] Stopping ${configs.length} feeds for project ${projectId}`);

  for (const config of configs) {
    await stopFeedPolling(config.id);
  }
}

/**
 * Start polling for all enabled feeds across all projects
 */
export async function startAllFeeds(): Promise<void> {
  const configs = await getAllEnabledFeedConfigs();

  console.log(`[Scheduler] Starting ${configs.length} feeds globally`);

  for (const config of configs) {
    try {
      await startFeedPolling(config);
    } catch (error) {
      console.error(`[Scheduler] Failed to start feed ${config.name}:`, error);
    }
  }
}

/**
 * Stop all active feed polling
 */
export async function stopAllFeeds(): Promise<void> {
  console.log(`[Scheduler] Stopping ${activeJobs.size} active feeds`);

  // Get all repeatable jobs and remove them
  const repeatableJobs = await feedIngestQueue.getRepeatableJobs();

  for (const job of repeatableJobs) {
    if (job.key) {
      await feedIngestQueue.removeRepeatableByKey(job.key);
    }
  }

  activeJobs.clear();
  console.log('[Scheduler] All feeds stopped');
}

/**
 * Get status of all active feeds
 */
export function getActiveFeedStatus(): { feedConfigId: string; jobKey: string }[] {
  return Array.from(activeJobs.entries()).map(([feedConfigId, jobKey]) => ({
    feedConfigId,
    jobKey,
  }));
}

/**
 * Get count of active feeds
 */
export function getActiveFeedCount(): number {
  return activeJobs.size;
}

/**
 * Check if a feed is currently polling
 */
export function isFeedPolling(feedConfigId: string): boolean {
  return activeJobs.has(feedConfigId);
}

/**
 * Sync feed schedules with database
 * Call this on startup to ensure consistency
 */
export async function syncFeedSchedules(): Promise<void> {
  console.log('[Scheduler] Syncing feed schedules with database...');

  // Get all repeatable jobs currently in the queue
  const repeatableJobs = await feedIngestQueue.getRepeatableJobs();
  const queueJobKeys = new Set(repeatableJobs.map((j) => j.key).filter(Boolean));

  // Get all enabled configs from database
  const enabledConfigs = await getAllEnabledFeedConfigs();
  const enabledIds = new Set(enabledConfigs.map((c) => c.id));

  // Remove jobs for disabled/deleted feeds
  for (const job of repeatableJobs) {
    if (!job.key) continue;

    // Extract feed ID from job key (format: feed:uuid)
    const feedId = job.key.replace('feed:', '');
    if (feedId && !enabledIds.has(feedId)) {
      await feedIngestQueue.removeRepeatableByKey(job.key);
      console.log(`[Scheduler] Removed stale job for deleted/disabled feed: ${feedId}`);
    }
  }

  // Start jobs for enabled feeds that aren't running
  for (const config of enabledConfigs) {
    const jobKey = getJobKey(config.id);
    if (!queueJobKeys.has(jobKey)) {
      await startFeedPolling(config);
    } else {
      // Track it as active
      activeJobs.set(config.id, jobKey);
    }
  }

  console.log(`[Scheduler] Sync complete. ${activeJobs.size} feeds active`);
}
