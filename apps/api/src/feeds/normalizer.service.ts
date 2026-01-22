/**
 * Feed Normalizer Service
 *
 * Manages the adapter registry and handles:
 * - Adapter registration and lookup
 * - Fetching and normalizing feed items
 * - Storing items in the database
 * - Publishing items for real-time delivery
 */

import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { db } from '../db';
import { feedConfigs, feedItems, feedProcessingLog } from '../db/schema/feeds';
import { redisPub } from '../lib/redis';

import type {
  FeedAdapter,
  FeedType,
  NormalizedFeedItem,
  FeedConfig,
  FeedFilterOptions,
  FeedFetchResult,
  AdapterRegistry,
} from './adapter.interface';

// Redis channel for feed item broadcasts
const FEED_CHANNEL_PREFIX = 'feed:items:';

/**
 * Adapter registry singleton
 */
const adapterRegistry: AdapterRegistry = new Map();

/**
 * Register a feed adapter
 */
export function registerAdapter(adapter: FeedAdapter): void {
  if (adapterRegistry.has(adapter.type)) {
    console.warn(`[Normalizer] Overwriting existing adapter for type: ${adapter.type}`);
  }
  adapterRegistry.set(adapter.type, adapter);
  console.log(`[Normalizer] Registered adapter: ${adapter.name} (${adapter.type})`);
}

/**
 * Get a registered adapter by type
 */
export function getAdapter(type: FeedType): FeedAdapter | undefined {
  return adapterRegistry.get(type);
}

/**
 * Get all registered adapters
 */
export function getAllAdapters(): FeedAdapter[] {
  return Array.from(adapterRegistry.values());
}

/**
 * Get available feed types
 */
export function getAvailableFeedTypes(): FeedType[] {
  return Array.from(adapterRegistry.keys());
}

/**
 * Fetch items from a feed configuration
 */
export async function fetchFeedItems(
  config: FeedConfig,
  filters?: FeedFilterOptions
): Promise<FeedFetchResult> {
  const adapter = adapterRegistry.get(config.type as FeedType);

  if (!adapter) {
    return {
      items: [],
      failedCount: 0,
      errors: [`No adapter registered for feed type: ${config.type}`],
      hasMore: false,
    };
  }

  try {
    // Merge config filters with request filters
    const mergedFilters = {
      ...((config.filters as FeedFilterOptions) || {}),
      ...filters,
    };

    const result = await adapter.fetch(config, mergedFilters);

    // Update last fetch timestamp
    await db
      .update(feedConfigs)
      .set({
        lastFetchAt: new Date(),
        lastError: null,
        errorCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(feedConfigs.id, config.id));

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update error state
    await db
      .update(feedConfigs)
      .set({
        lastError: errorMessage,
        errorCount: (config.errorCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(feedConfigs.id, config.id));

    return {
      items: [],
      failedCount: 0,
      errors: [errorMessage],
      hasMore: false,
    };
  }
}

/**
 * Store normalized items in the database
 */
export async function storeItems(
  projectId: string,
  feedConfigId: string,
  items: NormalizedFeedItem[]
): Promise<{ created: number; duplicates: number }> {
  if (items.length === 0) {
    return { created: 0, duplicates: 0 };
  }

  let created = 0;
  let duplicates = 0;

  // Process items in batches to avoid overwhelming the DB
  const BATCH_SIZE = 100;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    // Check for existing items by external ID
    const externalIds = batch
      .map((item) => item.externalId)
      .filter((id): id is string => id !== undefined);

    const existing =
      externalIds.length > 0
        ? await db.query.feedItems.findMany({
            where: and(eq(feedItems.feedConfigId, feedConfigId)),
            columns: { externalId: true },
          })
        : [];

    const existingIds = new Set(existing.map((e) => e.externalId));

    // Prepare items for insert
    const newItems = batch.filter((item) => !item.externalId || !existingIds.has(item.externalId));

    duplicates += batch.length - newItems.length;

    if (newItems.length > 0) {
      const insertData = newItems.map((item) => ({
        id: uuidv4(),
        projectId,
        feedConfigId,
        type: item.type,
        externalId: item.externalId,
        title: item.title,
        content: item.content,
        url: item.url,
        timestamp: item.timestamp,
        latitude: item.location?.latitude,
        longitude: item.location?.longitude,
        locationName: item.location?.name,
        severity: item.severity,
        metadata: item.metadata,
        raw: item.raw,
      }));

      await db.insert(feedItems).values(insertData);
      created += newItems.length;

      // Publish each new item for real-time delivery
      for (const item of insertData) {
        await publishFeedItem(projectId, item);
      }
    }
  }

  return { created, duplicates };
}

/**
 * Publish a feed item to Redis for real-time delivery
 */
async function publishFeedItem(
  projectId: string,
  item: typeof feedItems.$inferInsert
): Promise<void> {
  const channel = `${FEED_CHANNEL_PREFIX}${projectId}`;
  const message = JSON.stringify({
    type: 'feed_item',
    payload: {
      id: item.id,
      feedType: item.type,
      title: item.title,
      content: item.content,
      url: item.url,
      timestamp: item.timestamp,
      location:
        item.latitude && item.longitude
          ? { lat: item.latitude, lng: item.longitude, name: item.locationName }
          : null,
      severity: item.severity,
      metadata: item.metadata,
    },
    timestamp: new Date().toISOString(),
  });

  try {
    await redisPub.publish(channel, message);
  } catch (error) {
    console.error(`[Normalizer] Failed to publish feed item to Redis:`, error);
  }
}

/**
 * Create a processing log entry
 */
export async function createProcessingLog(feedConfigId: string, jobId?: string): Promise<string> {
  const id = uuidv4();

  await db.insert(feedProcessingLog).values({
    id,
    feedConfigId,
    jobId,
    status: 'running',
    itemsProcessed: 0,
    itemsCreated: 0,
    startedAt: new Date(),
  });

  return id;
}

/**
 * Update a processing log entry
 */
export async function updateProcessingLog(
  logId: string,
  data: {
    status?: string;
    itemsProcessed?: number;
    itemsCreated?: number;
    errorMessage?: string;
    completedAt?: Date;
    durationMs?: number;
  }
): Promise<void> {
  await db.update(feedProcessingLog).set(data).where(eq(feedProcessingLog.id, logId));
}

/**
 * Complete a processing log entry
 */
export async function completeProcessingLog(
  logId: string,
  itemsProcessed: number,
  itemsCreated: number,
  startTime: Date,
  error?: string
): Promise<void> {
  const now = new Date();
  const durationMs = now.getTime() - startTime.getTime();

  await updateProcessingLog(logId, {
    status: error ? 'failed' : 'completed',
    itemsProcessed,
    itemsCreated,
    errorMessage: error,
    completedAt: now,
    durationMs,
  });
}

/**
 * Get enabled feed configs for a project
 */
export async function getEnabledFeedConfigs(projectId: string): Promise<FeedConfig[]> {
  return db.query.feedConfigs.findMany({
    where: and(eq(feedConfigs.projectId, projectId), eq(feedConfigs.enabled, true)),
  });
}

/**
 * Get all enabled feed configs across all projects
 */
export async function getAllEnabledFeedConfigs(): Promise<FeedConfig[]> {
  return db.query.feedConfigs.findMany({
    where: eq(feedConfigs.enabled, true),
  });
}
