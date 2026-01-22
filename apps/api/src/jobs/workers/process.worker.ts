/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Feed Process Worker
 *
 * Handles normalization and storage of feed items.
 * Processes jobs from the feed-process queue and:
 * 1. Applies enrichment (entity extraction, sentiment, topics, credibility)
 * 2. Stores items in the database
 * 3. Publishes items for real-time delivery
 * 4. Enqueues items for tripwire checking
 */

import { Worker, type Job } from 'bullmq';

import type { NormalizedFeedItem } from '../../feeds/adapter.interface';
import { storeItems, completeProcessingLog } from '../../feeds/normalizer.service';
import {
  extractEntities,
  getPrimaryLocation,
  analyzeSentiment,
  classifyTopics,
  checkDuplicate,
  calculateCredibility,
  extractDomain,
  startDeduplicationCleanup,
  stopDeduplicationCleanup,
} from '../../feeds/services';
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
 * Enrichment options for news feeds
 */
interface EnrichmentOptions {
  extractEntities?: boolean;
  analyzeSentiment?: boolean;
  classifyTopics?: boolean;
  checkCredibility?: boolean;
}

/**
 * Enrich a news item with entity extraction, sentiment, topics, and credibility
 */
function enrichNewsItem(
  item: NormalizedFeedItem,
  options: EnrichmentOptions
): { enrichedMetadata: Record<string, unknown>; isDuplicate: boolean } {
  // Check deduplication first
  const dedupResult = checkDuplicate(
    item.externalId || item.url || '',
    item.title,
    item.url || '',
    item.content
  );

  if (dedupResult.isDuplicate) {
    return { enrichedMetadata: {}, isDuplicate: true };
  }

  const text = `${item.title} ${item.content || ''}`;
  const enrichedMetadata: Record<string, unknown> = {};

  // Entity extraction
  if (options.extractEntities) {
    const entities = extractEntities(text);
    enrichedMetadata.entities = entities;

    // Use primary location for geocoding if item doesn't have location
    if (!item.location) {
      const primaryLoc = getPrimaryLocation(entities);
      if (primaryLoc?.coordinates) {
        enrichedMetadata.extractedLocation = {
          name: primaryLoc.name,
          type: primaryLoc.type,
          latitude: primaryLoc.coordinates.lat,
          longitude: primaryLoc.coordinates.lng,
        };
      }
    }
  }

  // Sentiment analysis
  if (options.analyzeSentiment) {
    enrichedMetadata.sentiment = analyzeSentiment(text);
  }

  // Topic classification
  if (options.classifyTopics) {
    enrichedMetadata.topics = classifyTopics(text);
  }

  // Credibility scoring
  if (options.checkCredibility && item.url) {
    const domain = extractDomain(item.url);
    enrichedMetadata.credibility = calculateCredibility(
      domain,
      !!item.metadata?.author,
      (item.content || '').length
    );
  }

  return { enrichedMetadata, isDuplicate: false };
}

/**
 * Get enrichment options from feed config options
 */
function getEnrichmentOptions(feedOptions: Record<string, unknown> | null): EnrichmentOptions {
  if (!feedOptions) return {};

  return {
    extractEntities: feedOptions.extractEntities === true,
    analyzeSentiment: feedOptions.analyzeSentiment === true,
    classifyTopics: feedOptions.classifyTopics === true,
    checkCredibility: feedOptions.checkCredibility === true,
  };
}

/**
 * Create the process worker
 */
export function createProcessWorker(): Worker<FeedProcessJobData> {
  const worker = new Worker<FeedProcessJobData>(
    'feed-process',
    async (job: Job<FeedProcessJobData>) => {
      const { feedConfigId, projectId, feedType, rawItems, processingLogId, feedOptions } =
        job.data;
      const startTime = new Date();

      console.log(`[Process] Processing ${rawItems.length} items for feed ${feedConfigId}`);

      try {
        // Items are already normalized by the ingest step
        let items = rawItems as NormalizedFeedItem[];

        // Apply enrichment for news feeds
        if (feedType === 'news') {
          const enrichmentOptions = getEnrichmentOptions(feedOptions || null);
          const hasAnyEnrichment = Object.values(enrichmentOptions).some(Boolean);

          if (hasAnyEnrichment) {
            console.log(`[Process] Applying enrichment for news feed ${feedConfigId}`);

            const enrichedItems: NormalizedFeedItem[] = [];
            let dedupSkipped = 0;

            for (const item of items) {
              const { enrichedMetadata, isDuplicate } = enrichNewsItem(item, enrichmentOptions);

              if (isDuplicate) {
                dedupSkipped++;
                continue;
              }

              // Merge enriched metadata into item metadata
              enrichedItems.push({
                ...item,
                metadata: {
                  ...item.metadata,
                  ...enrichedMetadata,
                },
                // Use extracted location if item doesn't have one
                location:
                  item.location ||
                  (enrichedMetadata.extractedLocation
                    ? {
                        latitude: (enrichedMetadata.extractedLocation as { latitude: number })
                          .latitude,
                        longitude: (enrichedMetadata.extractedLocation as { longitude: number })
                          .longitude,
                        name: (enrichedMetadata.extractedLocation as { name: string }).name,
                      }
                    : undefined),
              });
            }

            if (dedupSkipped > 0) {
              console.log(`[Process] Skipped ${dedupSkipped} duplicate items via enrichment dedup`);
            }

            items = enrichedItems;
          }
        }

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

  // Start deduplication cleanup interval
  startDeduplicationCleanup();
  console.log('[Process] Deduplication cleanup started');

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

  // Stop deduplication cleanup interval
  stopDeduplicationCleanup();
  console.log('[Process] Deduplication cleanup stopped');

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
