/**
 * Telegram OSINT Feed Adapter (MTProto)
 *
 * Full GramJS-based MTProto adapter with:
 * - Session string authentication
 * - Channel message fetching with pagination
 * - Message parsing (text, media, entities, forwards, replies)
 * - lastMessageIds tracking for incremental fetches
 * - RSS fallback when MTProto unavailable
 */

import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';

import {
  BaseFeedAdapter,
  type FeedConfig,
  type FeedFilterOptions,
  type FeedFetchResult,
  type NormalizedFeedItem,
  type FeedSeverity,
} from '../../adapter.interface';
import type {
  TelegramMessage,
  TelegramEntity,
  TelegramMedia,
  TelegramForwardInfo,
  TelegramReplyInfo,
  TelegramReaction,
  TelegramFeedConfig,
} from '../../types/telegram.types';

/**
 * Parsed message from Telegram API
 */
interface ParsedMessage {
  telegramMessageId: number;
  text: string;
  entities: TelegramEntity[];
  media: TelegramMedia[];
  forwardedFrom?: TelegramForwardInfo;
  replyTo?: TelegramReplyInfo;
  views?: number;
  forwards?: number;
  reactions?: TelegramReaction[];
  date: Date;
  editDate?: Date;
  pinned: boolean;
  raw: unknown;
}

/**
 * Channel info from Telegram API
 */
interface ChannelInfo {
  telegramId: string;
  username: string;
  title: string;
  participantsCount?: number;
}

/**
 * Telegram OSINT Feed Adapter with MTProto support
 */
export class TelegramAdapter extends BaseFeedAdapter {
  readonly type = 'telegram' as const;
  readonly name = 'Telegram OSINT';
  readonly description = 'Messages from Telegram channels via MTProto or RSS';
  readonly requiredConfig = ['channels'];

  private client: TelegramClient | null = null;
  private lastMessageIds: Map<string, number> = new Map();
  private isConnected = false;

  /**
   * Initialize the MTProto client
   */
  private async initClient(): Promise<TelegramClient | null> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    const apiId = process.env.TELEGRAM_API_ID;
    const apiHash = process.env.TELEGRAM_API_HASH;
    const sessionString = process.env.TELEGRAM_SESSION_STRING;

    if (!apiId || !apiHash || !sessionString) {
      console.warn('[Telegram] MTProto credentials not configured');
      return null;
    }

    try {
      const session = new StringSession(sessionString);
      this.client = new TelegramClient(session, parseInt(apiId, 10), apiHash, {
        connectionRetries: 5,
        useWSS: false,
      });

      await this.client.connect();
      this.isConnected = true;

      console.log('[Telegram] MTProto client connected');
      return this.client;
    } catch (error) {
      console.error('[Telegram] Failed to initialize MTProto client:', error);
      this.client = null;
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Disconnect the client
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
      console.log('[Telegram] MTProto client disconnected');
    }
  }

  async fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    const options = config.options as TelegramFeedConfig | undefined;
    const configFilters = config.filters as Record<string, unknown>;

    // Get channels to monitor
    const channels =
      options?.channels ||
      (configFilters?.channels as string[]) ||
      [];

    if (!channels || channels.length === 0) {
      return {
        items: [],
        failedCount: 0,
        errors: ['At least one Telegram channel required'],
        hasMore: false,
      };
    }

    // Determine fetch method
    const method = options?.method || 'mtproto';

    if (method === 'mtproto') {
      const client = await this.initClient();
      if (client) {
        return this.fetchViaMTProto(client, channels, options, filters);
      }
      // Fall back to RSS if MTProto not available
      console.warn('[Telegram] MTProto not available, falling back to RSS');
    }

    return this.fetchViaRSS(channels, filters);
  }

  /**
   * Fetch via MTProto API
   */
  private async fetchViaMTProto(
    client: TelegramClient,
    channels: string[],
    options?: TelegramFeedConfig,
    filters?: FeedFilterOptions
  ): Promise<FeedFetchResult> {
    const items: NormalizedFeedItem[] = [];
    const errors: string[] = [];
    const limit = options?.messagesPerFetch || filters?.limit || 50;

    for (const channel of channels) {
      try {
        // Resolve channel entity
        const entity = await client.getEntity(channel);

        if (!entity || !('id' in entity)) {
          errors.push(`Channel not found: ${channel}`);
          continue;
        }

        const channelInfo = this.extractChannelInfo(entity as Api.Chat | Api.Channel | Api.User, channel);

        // Get last message ID for incremental fetch
        const lastMessageId = this.lastMessageIds.get(channelInfo.telegramId);

        // Fetch messages
        const messages = await client.getMessages(entity, {
          limit,
          minId: lastMessageId,
        });

        if (messages.length === 0) {
          continue;
        }

        // Update last message ID
        const maxMessageId = Math.max(...messages.map((m: Api.Message) => m.id));
        this.lastMessageIds.set(channelInfo.telegramId, maxMessageId);

        // Parse messages
        for (const message of messages) {
          if (!message.message && !message.media) {
            continue; // Skip empty messages
          }

          const parsed = this.parseMessage(message);
          const normalized = this.normalize(parsed, channelInfo);
          items.push(normalized);
        }

        console.log(`[Telegram] Fetched ${messages.length} messages from ${channelInfo.title}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Error fetching ${channel}: ${errorMsg}`);
        console.error(`[Telegram] Error fetching ${channel}:`, error);
      }
    }

    // Apply filters
    const filtered = this.filterItems(items, filters);

    return {
      items: filtered,
      failedCount: items.length - filtered.length,
      errors,
      hasMore: false,
    };
  }

  /**
   * Extract channel info from entity
   */
  private extractChannelInfo(entity: Api.Chat | Api.Channel | Api.User, fallbackUsername: string): ChannelInfo {
    const id = 'id' in entity ? entity.id.toString() : '';
    const username =
      'username' in entity && entity.username ? entity.username : fallbackUsername.replace(/^@/, '');
    const title = 'title' in entity && entity.title ? entity.title : `@${username}`;
    const participantsCount =
      'participantsCount' in entity ? entity.participantsCount : undefined;

    return {
      telegramId: id,
      username,
      title,
      participantsCount: participantsCount ?? undefined,
    };
  }

  /**
   * Parse a Telegram message
   */
  private parseMessage(message: Api.Message): ParsedMessage {
    // Parse entities
    const entities = this.parseEntities(message);

    // Parse media
    const media = this.parseMedia(message);

    // Parse forward info
    const forwardedFrom = this.parseForwardInfo(message);

    // Parse reply info
    const replyTo = this.parseReplyInfo(message);

    // Parse reactions
    const reactions = this.parseReactions(message);

    return {
      telegramMessageId: message.id,
      text: message.message || '',
      entities,
      media,
      forwardedFrom,
      replyTo,
      views: message.views,
      forwards: message.forwards,
      reactions,
      date: new Date(message.date * 1000),
      editDate: message.editDate ? new Date(message.editDate * 1000) : undefined,
      pinned: message.pinned || false,
      raw: message,
    };
  }

  /**
   * Parse message entities
   */
  private parseEntities(message: Api.Message): TelegramEntity[] {
    if (!message.entities) return [];

    return message.entities.map((entity: Api.TypeMessageEntity) => {
      const type = this.mapEntityType(entity.className);
      const text = message.message
        ? message.message.slice(entity.offset, entity.offset + entity.length)
        : undefined;

      const result: TelegramEntity = {
        type,
        offset: entity.offset,
        length: entity.length,
        text,
      };

      // Extract URL for link entities
      if (entity instanceof Api.MessageEntityTextUrl) {
        result.url = entity.url;
      } else if (entity instanceof Api.MessageEntityUrl && text) {
        result.url = text;
      }

      return result;
    });
  }

  /**
   * Map entity class name to our type
   */
  private mapEntityType(className: string): TelegramEntity['type'] {
    const mapping: Record<string, TelegramEntity['type']> = {
      MessageEntityUrl: 'url',
      MessageEntityTextUrl: 'text_url',
      MessageEntityMention: 'mention',
      MessageEntityHashtag: 'hashtag',
      MessageEntityCashtag: 'cashtag',
      MessageEntityBold: 'bold',
      MessageEntityItalic: 'italic',
      MessageEntityCode: 'code',
      MessageEntityPre: 'pre',
      MessageEntityEmail: 'email',
      MessageEntityPhone: 'phone',
      MessageEntityBotCommand: 'bot_command',
    };

    return mapping[className] || 'url';
  }

  /**
   * Parse message media
   */
  private parseMedia(message: Api.Message): TelegramMedia[] {
    if (!message.media) return [];

    const media: TelegramMedia[] = [];

    if (message.media instanceof Api.MessageMediaPhoto) {
      media.push({
        type: 'photo',
        fileId: message.media.photo && 'id' in message.media.photo
          ? message.media.photo.id.toString()
          : undefined,
      });
    } else if (message.media instanceof Api.MessageMediaDocument) {
      const doc = message.media.document;
      if (doc && doc instanceof Api.Document) {
        const mimeType = doc.mimeType || '';
        let type: TelegramMedia['type'] = 'document';

        if (mimeType.startsWith('video/')) type = 'video';
        else if (mimeType.startsWith('audio/')) type = 'audio';
        else if (mimeType === 'image/gif') type = 'animation';

        // Check for sticker
        const stickerAttr = doc.attributes?.find(
          (a: Api.TypeDocumentAttribute) => a instanceof Api.DocumentAttributeSticker
        );
        if (stickerAttr) type = 'sticker';

        // Check for voice/video note
        const audioAttr = doc.attributes?.find(
          (a: Api.TypeDocumentAttribute) => a instanceof Api.DocumentAttributeAudio
        ) as Api.DocumentAttributeAudio | undefined;
        if (audioAttr?.voice) type = 'voice';

        // Get dimensions
        const videoAttr = doc.attributes?.find(
          (a: Api.TypeDocumentAttribute) => a instanceof Api.DocumentAttributeVideo
        ) as Api.DocumentAttributeVideo | undefined;

        // Get filename
        const filenameAttr = doc.attributes?.find(
          (a: Api.TypeDocumentAttribute) => a instanceof Api.DocumentAttributeFilename
        ) as Api.DocumentAttributeFilename | undefined;

        media.push({
          type,
          fileId: doc.id.toString(),
          fileSize: doc.size ? Number(doc.size) : undefined,
          mimeType,
          fileName: filenameAttr?.fileName,
          duration: audioAttr?.duration || videoAttr?.duration,
          width: videoAttr?.w,
          height: videoAttr?.h,
        });
      }
    }

    return media;
  }

  /**
   * Parse forward information
   */
  private parseForwardInfo(message: Api.Message): TelegramForwardInfo | undefined {
    if (!message.fwdFrom) return undefined;

    const fwd = message.fwdFrom;

    return {
      fromId: fwd.fromId
        ? 'userId' in fwd.fromId
          ? fwd.fromId.userId.toString()
          : 'channelId' in fwd.fromId
            ? fwd.fromId.channelId.toString()
            : undefined
        : undefined,
      fromChannelId:
        fwd.fromId && 'channelId' in fwd.fromId
          ? fwd.fromId.channelId.toString()
          : undefined,
      fromName: fwd.fromName,
      fromMessageId: fwd.channelPost,
      date: fwd.date ? new Date(fwd.date * 1000) : undefined,
    };
  }

  /**
   * Parse reply information
   */
  private parseReplyInfo(message: Api.Message): TelegramReplyInfo | undefined {
    if (!message.replyTo) return undefined;

    if (message.replyTo instanceof Api.MessageReplyHeader) {
      return {
        replyToMsgId: message.replyTo.replyToMsgId ?? 0,
        topMsgId: message.replyTo.replyToTopId,
      };
    }

    return undefined;
  }

  /**
   * Parse reactions
   */
  private parseReactions(message: Api.Message): TelegramReaction[] | undefined {
    if (!message.reactions?.results) return undefined;

    return message.reactions.results.map((r: Api.ReactionCount) => ({
      reaction:
        r.reaction instanceof Api.ReactionEmoji
          ? r.reaction.emoticon
          : 'custom',
      count: r.count,
    }));
  }

  /**
   * Normalize parsed message to standard feed item format
   */
  private normalize(parsed: ParsedMessage, channelInfo: ChannelInfo): NormalizedFeedItem {
    // Build title from first line or truncate content
    const title = this.buildTitle(parsed.text);

    // Extract URLs from entities
    const urls = parsed.entities
      .filter((e) => e.type === 'url' || e.type === 'text_url')
      .map((e) => e.url || e.text)
      .filter(Boolean);

    return {
      externalId: `telegram:${channelInfo.telegramId}:${parsed.telegramMessageId}`,
      type: 'telegram',
      title,
      content: parsed.text,
      url: `https://t.me/${channelInfo.username}/${parsed.telegramMessageId}`,
      timestamp: parsed.date,
      severity: this.determineSeverity(parsed.text),
      metadata: {
        channel: channelInfo.username,
        channelTitle: channelInfo.title,
        channelId: channelInfo.telegramId,
        messageId: parsed.telegramMessageId,
        views: parsed.views,
        forwards: parsed.forwards,
        pinned: parsed.pinned,
        hasMedia: parsed.media.length > 0,
        mediaTypes: parsed.media.map((m) => m.type),
        isForwarded: !!parsed.forwardedFrom,
        forwardedFrom: parsed.forwardedFrom,
        replyTo: parsed.replyTo,
        reactions: parsed.reactions,
        entities: parsed.entities,
        urls,
        source: 'mtproto',
      },
      raw: parsed.raw,
    };
  }

  /**
   * Build title from message text
   */
  private buildTitle(text: string): string {
    if (!text) return 'Media message';

    // Use first line or first 200 characters
    const firstLine = text.split('\n')[0] || '';
    const truncated = firstLine.length > 200 ? firstLine.slice(0, 197) + '...' : firstLine;

    return truncated.trim() || 'Message';
  }

  /**
   * Fetch via RSS bridge (fallback)
   */
  private async fetchViaRSS(
    channels: string[],
    filters?: FeedFilterOptions
  ): Promise<FeedFetchResult> {
    const items: NormalizedFeedItem[] = [];
    const errors: string[] = [];

    const rssBridges = [
      'https://rsshub.app/telegram/channel/',
      'https://tg.i-c-a.su/rss/',
    ];

    for (const channel of channels) {
      const cleanChannel = channel.replace(/^@/, '');
      let fetched = false;

      for (const bridge of rssBridges) {
        if (fetched) break;

        try {
          const url = `${bridge}${cleanChannel}`;
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'SituationMonitor/1.0',
            },
          });

          if (!response.ok) continue;

          const xml = await response.text();
          const channelItems = this.parseRSSFeed(xml, cleanChannel);
          items.push(...channelItems);
          fetched = true;
        } catch {
          // Try next bridge
        }
      }

      if (!fetched) {
        errors.push(`Failed to fetch channel: ${channel}`);
      }
    }

    const filtered = this.filterItems(items, filters);

    return {
      items: filtered,
      failedCount: items.length - filtered.length,
      errors,
      hasMore: false,
    };
  }

  /**
   * Parse RSS feed XML
   */
  private parseRSSFeed(xml: string, channel: string): NormalizedFeedItem[] {
    const items: NormalizedFeedItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1] ?? '';

      const title = this.extractXmlTag(itemXml, 'title') ?? 'Untitled';
      const description = this.extractXmlTag(itemXml, 'description');
      const link = this.extractXmlTag(itemXml, 'link');
      const pubDate = this.extractXmlTag(itemXml, 'pubDate');
      const guid = this.extractXmlTag(itemXml, 'guid');

      const content = description ? this.stripHtml(description) : undefined;
      const messageId = this.extractMessageId(link || guid || '');

      items.push({
        externalId: `telegram:${channel}:${messageId || Date.now()}`,
        type: 'telegram' as const,
        title: this.truncateTitle(title),
        content,
        url: link,
        timestamp: pubDate ? new Date(pubDate) : new Date(),
        severity: this.determineSeverity(`${title} ${content || ''}`),
        metadata: {
          channel,
          source: 'rss',
          messageId,
        },
      });
    }

    return items;
  }

  private extractXmlTag(xml: string, tag: string): string | undefined {
    const cdataRegex = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i');
    const cdataMatch = cdataRegex.exec(xml);
    if (cdataMatch) return cdataMatch[1];

    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
    const match = regex.exec(xml);
    return match?.[1]?.trim();
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  private extractMessageId(url: string): string | undefined {
    const match = /\/(\d+)\/?$/.exec(url);
    return match ? match[1] : undefined;
  }

  private truncateTitle(title: string): string {
    const maxLength = 200;
    const cleaned = this.stripHtml(title).replace(/\s+/g, ' ').trim();

    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.slice(0, maxLength - 3) + '...';
  }

  /**
   * Filter items based on filter options
   */
  private filterItems(
    items: NormalizedFeedItem[],
    filters?: FeedFilterOptions
  ): NormalizedFeedItem[] {
    if (!filters) return items;

    return items
      .filter((item) => {
        if (filters.keywords?.length) {
          const text = `${item.title} ${item.content || ''}`;
          if (!this.matchesKeywords(text, filters.keywords)) return false;
        }

        if (filters.minSeverity) {
          const severityOrder: FeedSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];
          const minIndex = severityOrder.indexOf(filters.minSeverity);
          const itemIndex = severityOrder.indexOf(item.severity);
          if (itemIndex < minIndex) return false;
        }

        if (filters.maxAge) {
          const age = Date.now() - item.timestamp.getTime();
          if (age > filters.maxAge) return false;
        }

        return true;
      })
      .slice(0, filters.limit);
  }

  override getDefaultConfig(): Partial<FeedConfig> {
    return {
      ...super.getDefaultConfig(),
      pollInterval: 300000, // 5 minutes
      options: {
        method: 'mtproto',
        channels: [],
        translateEnabled: true,
        translateTargetLanguage: 'en',
        translationProvider: 'google',
        autoTranslateLanguages: ['ru', 'uk', 'ar', 'he', 'zh', 'fa'],
        messagesPerFetch: 50,
        includeMedia: true,
        extractEntities: true,
        analyzeSentiment: true,
      } as TelegramFeedConfig,
    };
  }

  override validateConfig(config: Partial<FeedConfig>): { valid: boolean; errors: string[] } {
    const result = super.validateConfig(config);

    const options = config.options as TelegramFeedConfig | undefined;
    const filters = config.filters as Record<string, unknown> | undefined;
    const channels = options?.channels || filters?.channels;

    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      result.errors.push('At least one Telegram channel required');
      result.valid = false;
    }

    return result;
  }

  /**
   * Get the last message ID for a channel
   */
  getLastMessageId(channelId: string): number | undefined {
    return this.lastMessageIds.get(channelId);
  }

  /**
   * Set the last message ID for a channel
   */
  setLastMessageId(channelId: string, messageId: number): void {
    this.lastMessageIds.set(channelId, messageId);
  }

  /**
   * Clear tracking state
   */
  clearTrackingState(): void {
    this.lastMessageIds.clear();
  }
}

// Export singleton instance
export const telegramAdapter = new TelegramAdapter();
