/**
 * Feed Management Routes
 *
 * Endpoints for managing feed subscriptions, viewing feed items,
 * and controlling feed polling.
 */

import { eq, and, desc, gte, isNull, count } from 'drizzle-orm';
import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { db } from '../db';
import { projects } from '../db/schema/core';
import { feedConfigs, feedItems, feedProcessingLog } from '../db/schema/feeds';
import { organizationMembers } from '../db/schema/organizations';
import {
  getAdapter,
  getAdapterInfo,
  startFeedPolling,
  stopFeedPolling,
  isFeedPolling,
} from '../feeds';
import type { FeedConfig } from '../feeds/adapter.interface';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import { offsetPaginationSchema, offsetPaginatedResponse } from '../lib/pagination';
import { authMiddleware } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import type { AppEnv } from '../types';

// Request schemas
const createFeedSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(['news', 'flight', 'maritime', 'civil_unrest', 'fire', 'telegram', 'custom']),
  enabled: z.boolean().default(true),
  pollInterval: z.number().int().min(5000).max(86400000).default(60000),
  apiKey: z.string().optional(),
  endpoint: z.string().url().optional(),
  options: z.record(z.unknown()).default({}),
  filters: z.record(z.unknown()).default({}),
});

const updateFeedSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  pollInterval: z.number().int().min(5000).max(86400000).optional(),
  apiKey: z.string().optional(),
  endpoint: z.string().url().optional(),
  options: z.record(z.unknown()).optional(),
  filters: z.record(z.unknown()).optional(),
});

const feedItemsQuerySchema = offsetPaginationSchema.extend({
  feedConfigId: z.string().uuid().optional(),
  type: z
    .enum(['news', 'flight', 'maritime', 'civil_unrest', 'fire', 'telegram', 'custom'])
    .optional(),
  severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).optional(),
  since: z.string().datetime().optional(),
  search: z.string().optional(),
});

// Feed routes
export const feedRoutes = new Hono<AppEnv>();

// Apply auth to all routes
feedRoutes.use('*', authMiddleware);

/**
 * GET /feeds/types
 * Get available feed types with their configurations
 */
feedRoutes.get('/types', (c) => {
  const types = getAdapterInfo();
  return c.json({ types });
});

/**
 * GET /feeds
 * List feed subscriptions for a project
 */
feedRoutes.get('/', validateQuery(z.object({ projectId: z.string().uuid() })), async (c) => {
  const user = c.get('user');
  const { projectId } = c.get('validatedQuery') as { projectId: string };

  // Verify project access
  await verifyProjectAccess(projectId, user.sub);

  const configs = await db.query.feedConfigs.findMany({
    where: eq(feedConfigs.projectId, projectId),
    orderBy: [desc(feedConfigs.createdAt)],
  });

  // Add polling status to each config
  const configsWithStatus = configs.map((config) => ({
    ...config,
    isPolling: isFeedPolling(config.id),
  }));

  return c.json({ feeds: configsWithStatus });
});

/**
 * POST /feeds
 * Create a new feed subscription
 */
feedRoutes.post('/', validateBody(createFeedSchema), async (c) => {
  const user = c.get('user');
  const body = c.get('validatedBody') as z.infer<typeof createFeedSchema>;

  // Verify project access
  await verifyProjectAccess(body.projectId, user.sub);

  // Validate adapter exists
  const adapter = getAdapter(body.type);
  if (!adapter) {
    return c.json(
      { error: { message: `Unknown feed type: ${body.type}`, code: 'INVALID_FEED_TYPE' } },
      400
    );
  }

  // Validate config with adapter
  const validation = adapter.validateConfig({
    ...body,
    apiKeyEncrypted: body.apiKey,
  } as Partial<FeedConfig>);

  if (!validation.valid) {
    return c.json(
      {
        error: {
          message: 'Invalid feed configuration',
          code: 'INVALID_CONFIG',
          details: validation.errors,
        },
      },
      400
    );
  }

  // Create feed config
  const id = uuidv4();
  const now = new Date();

  await db.insert(feedConfigs).values({
    id,
    projectId: body.projectId,
    name: body.name,
    type: body.type,
    enabled: body.enabled,
    pollInterval: body.pollInterval,
    apiKeyEncrypted: body.apiKey, // TODO: Encrypt in production
    endpoint: body.endpoint,
    options: body.options,
    filters: body.filters,
    createdAt: now,
    updatedAt: now,
  });

  const config = await db.query.feedConfigs.findFirst({
    where: eq(feedConfigs.id, id),
  });

  // Start polling if enabled
  if (body.enabled && config) {
    await startFeedPolling(config);
  }

  return c.json({ feed: config }, 201);
});

/**
 * GET /feeds/:feedId
 * Get feed subscription details
 */
feedRoutes.get('/:feedId', async (c) => {
  const user = c.get('user');
  const feedId = c.req.param('feedId');

  const config = await db.query.feedConfigs.findFirst({
    where: eq(feedConfigs.id, feedId),
  });

  if (!config) {
    throw new NotFoundError('Feed configuration');
  }

  // Verify project access
  await verifyProjectAccess(config.projectId, user.sub);

  // Get recent processing logs
  const logs = await db.query.feedProcessingLog.findMany({
    where: eq(feedProcessingLog.feedConfigId, feedId),
    orderBy: [desc(feedProcessingLog.startedAt)],
    limit: 10,
  });

  return c.json({
    feed: {
      ...config,
      isPolling: isFeedPolling(config.id),
    },
    recentLogs: logs,
  });
});

/**
 * PATCH /feeds/:feedId
 * Update feed subscription
 */
feedRoutes.patch('/:feedId', validateBody(updateFeedSchema), async (c) => {
  const user = c.get('user');
  const feedId = c.req.param('feedId');
  const body = c.get('validatedBody') as z.infer<typeof updateFeedSchema>;

  const config = await db.query.feedConfigs.findFirst({
    where: eq(feedConfigs.id, feedId),
  });

  if (!config) {
    throw new NotFoundError('Feed configuration');
  }

  // Verify project access
  await verifyProjectAccess(config.projectId, user.sub);

  // Update config
  await db
    .update(feedConfigs)
    .set({
      ...body,
      apiKeyEncrypted: body.apiKey ?? config.apiKeyEncrypted,
      updatedAt: new Date(),
    })
    .where(eq(feedConfigs.id, feedId));

  const updated = await db.query.feedConfigs.findFirst({
    where: eq(feedConfigs.id, feedId),
  });

  // Handle polling state changes
  if (body.enabled !== undefined && updated) {
    if (body.enabled && !isFeedPolling(feedId)) {
      await startFeedPolling(updated);
    } else if (!body.enabled && isFeedPolling(feedId)) {
      await stopFeedPolling(feedId);
    }
  } else if (body.pollInterval !== undefined && updated && isFeedPolling(feedId)) {
    // Restart polling with new interval
    await stopFeedPolling(feedId);
    await startFeedPolling(updated);
  }

  return c.json({ feed: updated });
});

/**
 * DELETE /feeds/:feedId
 * Delete feed subscription
 */
feedRoutes.delete('/:feedId', async (c) => {
  const user = c.get('user');
  const feedId = c.req.param('feedId');

  const config = await db.query.feedConfigs.findFirst({
    where: eq(feedConfigs.id, feedId),
  });

  if (!config) {
    throw new NotFoundError('Feed configuration');
  }

  // Verify project access
  await verifyProjectAccess(config.projectId, user.sub);

  // Stop polling if active
  if (isFeedPolling(feedId)) {
    await stopFeedPolling(feedId);
  }

  // Delete config (cascade will delete items and logs)
  await db.delete(feedConfigs).where(eq(feedConfigs.id, feedId));

  return c.json({ success: true });
});

/**
 * POST /feeds/:feedId/start
 * Start feed polling
 */
feedRoutes.post('/:feedId/start', async (c) => {
  const user = c.get('user');
  const feedId = c.req.param('feedId');

  const config = await db.query.feedConfigs.findFirst({
    where: eq(feedConfigs.id, feedId),
  });

  if (!config) {
    throw new NotFoundError('Feed configuration');
  }

  // Verify project access
  await verifyProjectAccess(config.projectId, user.sub);

  if (isFeedPolling(feedId)) {
    return c.json({ message: 'Feed is already polling' });
  }

  await startFeedPolling(config);

  // Update enabled status
  await db
    .update(feedConfigs)
    .set({ enabled: true, updatedAt: new Date() })
    .where(eq(feedConfigs.id, feedId));

  return c.json({ message: 'Feed polling started' });
});

/**
 * POST /feeds/:feedId/stop
 * Stop feed polling
 */
feedRoutes.post('/:feedId/stop', async (c) => {
  const user = c.get('user');
  const feedId = c.req.param('feedId');

  const config = await db.query.feedConfigs.findFirst({
    where: eq(feedConfigs.id, feedId),
  });

  if (!config) {
    throw new NotFoundError('Feed configuration');
  }

  // Verify project access
  await verifyProjectAccess(config.projectId, user.sub);

  if (!isFeedPolling(feedId)) {
    return c.json({ message: 'Feed is not polling' });
  }

  await stopFeedPolling(feedId);

  return c.json({ message: 'Feed polling stopped' });
});

/**
 * GET /feeds/:feedId/items
 * Get feed items (paginated)
 */
feedRoutes.get('/:feedId/items', validateQuery(feedItemsQuerySchema), async (c) => {
  const user = c.get('user');
  const feedId = c.req.param('feedId');
  const query = c.get('validatedQuery') as z.infer<typeof feedItemsQuerySchema>;

  const config = await db.query.feedConfigs.findFirst({
    where: eq(feedConfigs.id, feedId),
  });

  if (!config) {
    throw new NotFoundError('Feed configuration');
  }

  // Verify project access
  await verifyProjectAccess(config.projectId, user.sub);

  // Build query conditions
  const conditions = [eq(feedItems.feedConfigId, feedId)];

  if (query.severity) {
    conditions.push(eq(feedItems.severity, query.severity));
  }

  if (query.since) {
    conditions.push(gte(feedItems.timestamp, new Date(query.since)));
  }

  // Count total items
  const countResult = await db
    .select({ count: count() })
    .from(feedItems)
    .where(and(...conditions));

  const total = countResult[0]?.count || 0;

  // Get paginated items
  const items = await db.query.feedItems.findMany({
    where: and(...conditions),
    orderBy: [desc(feedItems.timestamp)],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });

  return c.json(offsetPaginatedResponse(items, Number(total), query.page, query.limit));
});

/**
 * GET /feeds/items/search
 * Search feed items across all feeds in a project
 */
feedRoutes.get(
  '/items/search',
  validateQuery(feedItemsQuerySchema.extend({ projectId: z.string().uuid() })),
  async (c) => {
    const user = c.get('user');
    const query = c.get('validatedQuery') as z.infer<typeof feedItemsQuerySchema> & {
      projectId: string;
    };

    // Verify project access
    await verifyProjectAccess(query.projectId, user.sub);

    // Build query conditions
    const conditions = [eq(feedItems.projectId, query.projectId)];

    if (query.feedConfigId) {
      conditions.push(eq(feedItems.feedConfigId, query.feedConfigId));
    }

    if (query.type) {
      conditions.push(eq(feedItems.type, query.type));
    }

    if (query.severity) {
      conditions.push(eq(feedItems.severity, query.severity));
    }

    if (query.since) {
      conditions.push(gte(feedItems.timestamp, new Date(query.since)));
    }

    // TODO: Add full-text search when query.search is provided

    // Count total items
    const countResult = await db
      .select({ count: count() })
      .from(feedItems)
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    // Get paginated items
    const items = await db.query.feedItems.findMany({
      where: and(...conditions),
      orderBy: [desc(feedItems.timestamp)],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    return c.json(offsetPaginatedResponse(items, Number(total), query.page, query.limit));
  }
);

/**
 * GET /feeds/health
 * Get feed health status
 */
feedRoutes.get('/health', validateQuery(z.object({ projectId: z.string().uuid() })), async (c) => {
  const user = c.get('user');
  const { projectId } = c.get('validatedQuery') as { projectId: string };

  // Verify project access
  await verifyProjectAccess(projectId, user.sub);

  const configs = await db.query.feedConfigs.findMany({
    where: eq(feedConfigs.projectId, projectId),
  });

  const health = configs.map((config) => ({
    id: config.id,
    name: config.name,
    type: config.type,
    enabled: config.enabled,
    isPolling: isFeedPolling(config.id),
    lastFetchAt: config.lastFetchAt,
    lastError: config.lastError,
    errorCount: config.errorCount,
    status: getHealthStatus(config),
  }));

  return c.json({ health });
});

/**
 * Test feed configuration
 */
feedRoutes.post('/:feedId/test', async (c) => {
  const user = c.get('user');
  const feedId = c.req.param('feedId');

  const config = await db.query.feedConfigs.findFirst({
    where: eq(feedConfigs.id, feedId),
  });

  if (!config) {
    throw new NotFoundError('Feed configuration');
  }

  // Verify project access
  await verifyProjectAccess(config.projectId, user.sub);

  // Get adapter and test connection
  const adapter = getAdapter(config.type);
  if (!adapter) {
    return c.json({ error: { message: 'Adapter not found', code: 'ADAPTER_NOT_FOUND' } }, 400);
  }

  const result = await adapter.testConnection(config);

  return c.json({ health: result });
});

// Helper functions

async function verifyProjectAccess(projectId: string, userId: string): Promise<void> {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), isNull(projects.deletedAt)),
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check org membership
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, project.organizationId),
      eq(organizationMembers.userId, userId)
    ),
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this organization');
  }
}

function getHealthStatus(
  config: typeof feedConfigs.$inferSelect
): 'healthy' | 'degraded' | 'unhealthy' {
  if (!config.enabled) {
    return 'healthy'; // Disabled feeds are "healthy" (not broken)
  }

  if (config.errorCount >= 5) {
    return 'unhealthy';
  }

  if (config.errorCount > 0 || config.lastError) {
    return 'degraded';
  }

  // Check if last fetch was too long ago
  if (config.lastFetchAt) {
    const timeSinceLastFetch = Date.now() - config.lastFetchAt.getTime();
    const expectedInterval = config.pollInterval * 2; // Allow 2x interval

    if (timeSinceLastFetch > expectedInterval) {
      return 'degraded';
    }
  }

  return 'healthy';
}
