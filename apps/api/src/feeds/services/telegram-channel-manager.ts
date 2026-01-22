/**
 * Telegram Channel Manager Service
 *
 * CRUD operations for Telegram channel subscriptions with:
 * - Database persistence
 * - Category management
 * - Stats aggregation
 * - Batch operations
 */

import { eq, and, desc, sql, count, avg, gte } from 'drizzle-orm';

import { db } from '../../db';
import {
  telegramChannels,
  telegramMessages,
  type TelegramChannelSelect,
  type TelegramChannelCategory,
  TELEGRAM_CHANNEL_CATEGORIES,
} from '../../db/schema/telegram';
import type { TelegramChannelStats } from '../types/telegram.types';

/**
 * Channel add options
 */
export interface AddChannelOptions {
  /** Telegram channel username or ID */
  identifier: string;
  /** Channel title (if known) */
  title?: string;
  /** Category for grouping */
  category?: TelegramChannelCategory;
  /** Description */
  description?: string;
  /** Feed config ID to associate with */
  feedConfigId?: string;
}

/**
 * Channel update options
 */
export interface UpdateChannelOptions {
  title?: string;
  category?: TelegramChannelCategory;
  description?: string;
  active?: boolean;
  lastMessageId?: number;
  participantsCount?: number;
  lastError?: string;
}

/**
 * Channel query options
 */
export interface ChannelQueryOptions {
  /** Filter by categories */
  categories?: TelegramChannelCategory[];
  /** Filter by active status */
  active?: boolean;
  /** Include message count */
  includeMessageCount?: boolean;
  /** Pagination */
  limit?: number;
  offset?: number;
}

/**
 * Channel with message count
 */
export interface ChannelWithStats extends TelegramChannelSelect {
  messageCount?: number;
}

/**
 * Telegram Channel Manager
 */
export class TelegramChannelManager {
  /**
   * Add a new channel to monitor
   */
  async addChannel(projectId: string, options: AddChannelOptions): Promise<TelegramChannelSelect> {
    const { identifier, title, category, description, feedConfigId } = options;

    // Normalize identifier (remove @ if present)
    const username = identifier.replace(/^@/, '');

    // Check if channel already exists for this project
    const existing = await db.query.telegramChannels.findFirst({
      where: and(
        eq(telegramChannels.projectId, projectId),
        eq(telegramChannels.username, username.toLowerCase())
      ),
    });

    if (existing) {
      throw new Error(`Channel @${username} already exists for this project`);
    }

    // Insert new channel
    const [channel] = await db
      .insert(telegramChannels)
      .values({
        projectId,
        username: username.toLowerCase(),
        telegramId: '', // Will be populated when first fetched
        title: title || `@${username}`,
        category: category || 'other',
        description,
        feedConfigId,
        active: true,
        errorCount: 0,
        metadata: {},
      })
      .returning();

    if (!channel) {
      throw new Error('Failed to insert channel');
    }

    console.log(`[ChannelManager] Added channel @${username} for project ${projectId}`);

    return channel;
  }

  /**
   * Add multiple channels at once
   */
  async addChannelsBatch(
    projectId: string,
    channels: AddChannelOptions[]
  ): Promise<{ added: TelegramChannelSelect[]; errors: string[] }> {
    const added: TelegramChannelSelect[] = [];
    const errors: string[] = [];

    for (const channelOpts of channels) {
      try {
        const channel = await this.addChannel(projectId, channelOpts);
        added.push(channel);
      } catch (error) {
        errors.push(
          `${channelOpts.identifier}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return { added, errors };
  }

  /**
   * Remove a channel from monitoring
   */
  async removeChannel(projectId: string, channelId: string): Promise<boolean> {
    const deletedChannels = await db
      .delete(telegramChannels)
      .where(and(eq(telegramChannels.id, channelId), eq(telegramChannels.projectId, projectId)))
      .returning({ id: telegramChannels.id });

    const deleted = deletedChannels.length > 0;

    if (deleted) {
      console.log(`[ChannelManager] Removed channel ${channelId} from project ${projectId}`);
    }

    return deleted;
  }

  /**
   * Update channel settings
   */
  async updateChannel(
    projectId: string,
    channelId: string,
    options: UpdateChannelOptions
  ): Promise<TelegramChannelSelect | null> {
    const [updated] = await db
      .update(telegramChannels)
      .set({
        ...options,
        updatedAt: new Date(),
      })
      .where(and(eq(telegramChannels.id, channelId), eq(telegramChannels.projectId, projectId)))
      .returning();

    return updated || null;
  }

  /**
   * Get a single channel by ID
   */
  async getChannel(projectId: string, channelId: string): Promise<TelegramChannelSelect | null> {
    const channel = await db.query.telegramChannels.findFirst({
      where: and(eq(telegramChannels.id, channelId), eq(telegramChannels.projectId, projectId)),
    });

    return channel || null;
  }

  /**
   * Get channel by username
   */
  async getChannelByUsername(
    projectId: string,
    username: string
  ): Promise<TelegramChannelSelect | null> {
    const cleanUsername = username.replace(/^@/, '').toLowerCase();

    const channel = await db.query.telegramChannels.findFirst({
      where: and(
        eq(telegramChannels.projectId, projectId),
        eq(telegramChannels.username, cleanUsername)
      ),
    });

    return channel || null;
  }

  /**
   * Get all channels for a project
   */
  async getChannels(
    projectId: string,
    options: ChannelQueryOptions = {}
  ): Promise<ChannelWithStats[]> {
    const { categories, active, limit = 100, offset = 0 } = options;

    // Build conditions array
    const conditions = [eq(telegramChannels.projectId, projectId)];

    if (active !== undefined) {
      conditions.push(eq(telegramChannels.active, active));
    }

    if (categories && categories.length > 0) {
      conditions.push(sql`${telegramChannels.category} = ANY(${categories})`);
    }

    // Execute query with all conditions
    const channels = await db
      .select()
      .from(telegramChannels)
      .where(and(...conditions))
      .orderBy(desc(telegramChannels.createdAt))
      .limit(limit)
      .offset(offset);

    // Optionally include message counts
    if (options.includeMessageCount) {
      const channelIds = channels.map((c) => c.id);

      if (channelIds.length > 0) {
        const counts = await db
          .select({
            channelId: telegramMessages.channelId,
            count: count(),
          })
          .from(telegramMessages)
          .where(sql`${telegramMessages.channelId} = ANY(${channelIds})`)
          .groupBy(telegramMessages.channelId);

        const countMap = new Map(counts.map((c) => [c.channelId, Number(c.count)]));

        return channels.map((channel) => ({
          ...channel,
          messageCount: countMap.get(channel.id) || 0,
        }));
      }
    }

    return channels;
  }

  /**
   * Get active channels for a project
   */
  async getActiveChannels(projectId: string): Promise<TelegramChannelSelect[]> {
    return this.getChannels(projectId, { active: true });
  }

  /**
   * Get channels by category
   */
  async getChannelsByCategory(
    projectId: string,
    category: TelegramChannelCategory
  ): Promise<TelegramChannelSelect[]> {
    return this.getChannels(projectId, { categories: [category] });
  }

  /**
   * Set channel active status
   */
  async setChannelActive(
    projectId: string,
    channelId: string,
    active: boolean
  ): Promise<TelegramChannelSelect | null> {
    return this.updateChannel(projectId, channelId, { active });
  }

  /**
   * Update last message ID (for incremental fetching)
   */
  async updateLastMessageId(
    channelId: string,
    lastMessageId: number
  ): Promise<void> {
    await db
      .update(telegramChannels)
      .set({
        lastMessageId,
        lastFetchAt: new Date(),
        errorCount: 0,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(telegramChannels.id, channelId));
  }

  /**
   * Record a fetch error
   */
  async recordError(channelId: string, error: string): Promise<void> {
    await db
      .update(telegramChannels)
      .set({
        lastError: error,
        errorCount: sql`${telegramChannels.errorCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(telegramChannels.id, channelId));
  }

  /**
   * Update channel info from Telegram
   */
  async updateChannelInfo(
    channelId: string,
    info: {
      telegramId: string;
      title: string;
      participantsCount?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    await db
      .update(telegramChannels)
      .set({
        telegramId: info.telegramId,
        title: info.title,
        participantsCount: info.participantsCount,
        metadata: info.metadata || {},
        updatedAt: new Date(),
      })
      .where(eq(telegramChannels.id, channelId));
  }

  /**
   * Get channel statistics
   */
  async getChannelStats(projectId: string, channelId: string): Promise<TelegramChannelStats | null> {
    const channel = await this.getChannel(projectId, channelId);
    if (!channel) return null;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get message counts
    const [totalResult] = await db
      .select({ count: count() })
      .from(telegramMessages)
      .where(eq(telegramMessages.channelId, channelId));

    const [last24hResult] = await db
      .select({ count: count() })
      .from(telegramMessages)
      .where(
        and(
          eq(telegramMessages.channelId, channelId),
          gte(telegramMessages.messageDate, oneDayAgo)
        )
      );

    const [last7dResult] = await db
      .select({ count: count() })
      .from(telegramMessages)
      .where(
        and(eq(telegramMessages.channelId, channelId), gte(telegramMessages.messageDate, sevenDaysAgo))
      );

    // Get average sentiment
    const [sentimentResult] = await db
      .select({ avgSentiment: avg(telegramMessages.sentimentScore) })
      .from(telegramMessages)
      .where(eq(telegramMessages.channelId, channelId));

    // Get most common language
    const languageResult = await db
      .select({
        languageCode: telegramMessages.languageCode,
        count: count(),
      })
      .from(telegramMessages)
      .where(eq(telegramMessages.channelId, channelId))
      .groupBy(telegramMessages.languageCode)
      .orderBy(desc(count()))
      .limit(1);

    const totalMessages = Number(totalResult?.count || 0);
    const messagesLast7d = Number(last7dResult?.count || 0);

    return {
      channelId,
      totalMessages,
      messagesLast24h: Number(last24hResult?.count || 0),
      messagesLast7d,
      avgMessagesPerDay: messagesLast7d / 7,
      primaryLanguage: languageResult[0]?.languageCode || undefined,
      avgSentiment:
        sentimentResult?.avgSentiment != null
          ? Number(sentimentResult.avgSentiment)
          : undefined,
    };
  }

  /**
   * Get aggregate stats for all channels in a project
   */
  async getProjectStats(projectId: string): Promise<{
    totalChannels: number;
    activeChannels: number;
    totalMessages: number;
    messagesLast24h: number;
    channelsByCategory: Record<TelegramChannelCategory, number>;
  }> {
    const channels = await this.getChannels(projectId);
    const activeChannels = channels.filter((c) => c.active);

    // Count by category
    const channelsByCategory = {} as Record<TelegramChannelCategory, number>;
    for (const cat of TELEGRAM_CHANNEL_CATEGORIES) {
      channelsByCategory[cat] = channels.filter((c) => c.category === cat).length;
    }

    // Get message counts
    const [totalResult] = await db
      .select({ count: count() })
      .from(telegramMessages)
      .where(eq(telegramMessages.projectId, projectId));

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [last24hResult] = await db
      .select({ count: count() })
      .from(telegramMessages)
      .where(
        and(
          eq(telegramMessages.projectId, projectId),
          gte(telegramMessages.messageDate, oneDayAgo)
        )
      );

    return {
      totalChannels: channels.length,
      activeChannels: activeChannels.length,
      totalMessages: Number(totalResult?.count || 0),
      messagesLast24h: Number(last24hResult?.count || 0),
      channelsByCategory,
    };
  }

  /**
   * Get available channel categories
   */
  getCategories(): TelegramChannelCategory[] {
    return [...TELEGRAM_CHANNEL_CATEGORIES];
  }

  /**
   * Validate category
   */
  isValidCategory(category: string): category is TelegramChannelCategory {
    return TELEGRAM_CHANNEL_CATEGORIES.includes(category as TelegramChannelCategory);
  }
}

// Export singleton instance
export const telegramChannelManager = new TelegramChannelManager();
