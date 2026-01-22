/**
 * Worker Shutdown Manager
 *
 * Handles graceful shutdown of all BullMQ workers and queues.
 * Ensures:
 * 1. No new jobs are started
 * 2. Running jobs complete or are released
 * 3. Connections are properly closed
 */

import type { Worker } from 'bullmq';

import { stopAllFeeds } from '../feeds/scheduler';

import { pauseAllQueues, closeAllQueues, getQueueStats } from './queues';
import { stopIngestWorker, getIngestWorkerStatus } from './workers/ingest.worker';
import { stopProcessWorker, getProcessWorkerStatus } from './workers/process.worker';
import { stopTripwireWorker, getTripwireWorkerStatus } from './workers/tripwire.worker';

// Track registered workers for graceful shutdown
const registeredWorkers: Worker[] = [];

// Timeout for graceful shutdown (30 seconds)
const SHUTDOWN_TIMEOUT_MS = 30000;

// Track shutdown state
let isShuttingDown = false;

/**
 * Register a worker for graceful shutdown tracking
 */
export function registerWorker(worker: Worker): void {
  registeredWorkers.push(worker);
  console.log(`[Workers] Registered worker: ${worker.name}`);
}

/**
 * Check if shutdown is in progress
 */
export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}

/**
 * Get overall worker status
 */
export async function getWorkerStatus(): Promise<{
  isShuttingDown: boolean;
  workers: {
    ingest: { running: boolean; isPaused: boolean };
    process: { running: boolean; isPaused: boolean };
    tripwire: { running: boolean; isPaused: boolean };
  };
  queues: Awaited<ReturnType<typeof getQueueStats>>;
}> {
  return {
    isShuttingDown,
    workers: {
      ingest: getIngestWorkerStatus(),
      process: getProcessWorkerStatus(),
      tripwire: getTripwireWorkerStatus(),
    },
    queues: await getQueueStats(),
  };
}

/**
 * Gracefully shutdown all workers
 */
export async function shutdownWorkers(): Promise<void> {
  if (isShuttingDown) {
    console.log('[Shutdown] Already shutting down...');
    return;
  }

  isShuttingDown = true;
  console.log('[Shutdown] Beginning graceful worker shutdown...');

  // Create a timeout promise
  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Shutdown timeout exceeded'));
    }, SHUTDOWN_TIMEOUT_MS);
  });

  try {
    // Shutdown sequence wrapped in timeout
    await Promise.race([performShutdown(), timeoutPromise]);

    console.log('[Shutdown] All workers stopped gracefully');
  } catch (error) {
    console.error('[Shutdown] Error during shutdown:', error);

    // Force stop if timeout exceeded
    console.log('[Shutdown] Force stopping workers...');
    await forceStopWorkers();
  } finally {
    isShuttingDown = false;
  }
}

/**
 * Perform the actual shutdown sequence
 */
async function performShutdown(): Promise<void> {
  // Step 1: Stop feed schedulers (no new jobs will be added)
  console.log('[Shutdown] Step 1: Stopping feed schedulers...');
  await stopAllFeeds();

  // Step 2: Pause all queues (workers won't pick up new jobs)
  console.log('[Shutdown] Step 2: Pausing all queues...');
  await pauseAllQueues();

  // Step 3: Wait for active jobs to complete
  console.log('[Shutdown] Step 3: Waiting for active jobs...');
  await waitForActiveJobs();

  // Step 4: Stop all workers
  console.log('[Shutdown] Step 4: Stopping workers...');
  await Promise.all([stopIngestWorker(), stopProcessWorker(), stopTripwireWorker()]);

  // Step 5: Close all queues
  console.log('[Shutdown] Step 5: Closing queues...');
  await closeAllQueues();
}

/**
 * Wait for all active jobs to complete
 */
async function waitForActiveJobs(maxWaitMs = 20000): Promise<void> {
  const startTime = Date.now();
  const checkInterval = 1000; // Check every second

  while (Date.now() - startTime < maxWaitMs) {
    const stats = await getQueueStats();
    const activeJobs = stats.reduce((sum, q) => sum + q.active, 0);

    if (activeJobs === 0) {
      console.log('[Shutdown] All active jobs completed');
      return;
    }

    console.log(`[Shutdown] Waiting for ${activeJobs} active jobs...`);
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  const finalStats = await getQueueStats();
  const remainingActive = finalStats.reduce((sum, q) => sum + q.active, 0);

  if (remainingActive > 0) {
    console.warn(`[Shutdown] ${remainingActive} jobs still active after wait period`);
  }
}

/**
 * Force stop all workers (used when graceful shutdown times out)
 */
async function forceStopWorkers(): Promise<void> {
  // These calls will abort any running jobs
  await Promise.allSettled([
    stopIngestWorker(),
    stopProcessWorker(),
    stopTripwireWorker(),
    closeAllQueues(),
  ]);
}

/**
 * Start all workers
 */
export async function startWorkers(): Promise<void> {
  console.log('[Workers] Starting all workers...');

  // Import and start workers
  const { startIngestWorker } = await import('./workers/ingest.worker');
  const { startProcessWorker } = await import('./workers/process.worker');
  const { startTripwireWorker } = await import('./workers/tripwire.worker');
  const { createRetentionWorker } = await import('./workers/retention.worker');
  const { scheduleRetentionJob } = await import('./scheduled/retention.cron');

  startIngestWorker();
  startProcessWorker();
  startTripwireWorker();

  // Create and register retention worker
  createRetentionWorker();

  // Schedule daily retention cleanup
  await scheduleRetentionJob();

  console.log('[Workers] All workers started');
}

/**
 * Stop all registered workers
 */
export async function stopRegisteredWorkers(): Promise<void> {
  console.log(`[Workers] Stopping ${registeredWorkers.length} registered workers...`);

  await Promise.all(
    registeredWorkers.map(async (worker) => {
      try {
        await worker.close();
        console.log(`[Workers] Stopped worker: ${worker.name}`);
      } catch (error) {
        console.error(`[Workers] Error stopping ${worker.name}:`, error);
      }
    })
  );

  registeredWorkers.length = 0; // Clear the array
}
