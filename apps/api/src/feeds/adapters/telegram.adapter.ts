/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Telegram OSINT Feed Adapter
 *
 * Supports:
 * - Public channel message ingestion
 * - MTProto API via gramjs (if configured)
 * - Translation service integration
 *
 * Note: Requires Telegram API credentials for MTProto access.
 * Alternatively, can use public channel RSS bridges.
 */

import {
  BaseFeedAdapter,
  type FeedConfig,
  type FeedFilterOptions,
  type FeedFetchResult,
  type NormalizedFeedItem,
  type FeedSeverity,
} from '../adapter.interface';

// Telegram message structure (reserved for MTProto implementation)
interface _TelegramMessage {
  id: number;
  date: number; // Unix timestamp
  message?: string;
  entities?: {
    type: string;
    offset: number;
    length: number;
    url?: string;
  }[];
  media?: {
    type: string;
    photo?: { id: string };
    document?: { id: string; mimeType: string };
  };
  fwdFrom?: {
    fromId?: number | string;
    channelId?: number;
    date?: number;
  };
  replyTo?: {
    replyToMsgId: number;
  };
  views?: number;
  forwards?: number;
  reactions?: {
    results: { reaction: string; count: number }[];
  };
}

// Channel info (reserved for MTProto implementation)
interface _TelegramChannel {
  id: number | string;
  username?: string;
  title: string;
  participantsCount?: number;
}

/**
 * Telegram OSINT Feed Adapter
 */
export class TelegramAdapter extends BaseFeedAdapter {
  readonly type = 'telegram' as const;
  readonly name = 'Telegram OSINT';
  readonly description = 'Messages from Telegram channels for OSINT monitoring';
  readonly requiredConfig = ['channels'];

  async fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    const options = config.options as Record<string, unknown>;
    const configFilters = config.filters as Record<string, unknown>;

    // Get channels to monitor
    const channels = (configFilters?.channels as string[]) || (options.channels as string[]);

    if (!channels || channels.length === 0) {
      return {
        items: [],
        failedCount: 0,
        errors: ['At least one Telegram channel required'],
        hasMore: false,
      };
    }

    // Determine fetch method
    const method = (options.method as string) || 'rss';

    switch (method) {
      case 'mtproto':
        return this.fetchViaMTProto(config, channels, filters);
      case 'rss':
      default:
        return this.fetchViaRSS(channels, filters);
    }
  }

  /**
   * Fetch via RSS bridge (no API key required)
   * Uses public RSS bridges that mirror Telegram channels
   */
  private async fetchViaRSS(
    channels: string[],
    filters?: FeedFilterOptions
  ): Promise<FeedFetchResult> {
    const items: NormalizedFeedItem[] = [];
    const errors: string[] = [];

    // RSS bridges for Telegram (public services)
    const rssBridges = ['https://rsshub.app/telegram/channel/', 'https://tg.i-c-a.su/rss/'];

    for (const channel of channels) {
      // Clean channel name (remove @)
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

          if (!response.ok) {
            continue;
          }

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
   * Parse RSS feed XML into items
   */
  private parseRSSFeed(xml: string, channel: string): NormalizedFeedItem[] {
    const items: NormalizedFeedItem[] = [];

    // Simple XML parsing without external dependency
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const title = this.extractXmlTag(itemXml, 'title') || 'Untitled';
      const description = this.extractXmlTag(itemXml, 'description');
      const link = this.extractXmlTag(itemXml, 'link');
      const pubDate = this.extractXmlTag(itemXml, 'pubDate');
      const guid = this.extractXmlTag(itemXml, 'guid');

      // Clean HTML from description
      const content = description ? this.stripHtml(description) : undefined;

      // Extract message ID from link or guid
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

  /**
   * Fetch via MTProto API (requires credentials)
   */
  private async fetchViaMTProto(
    config: FeedConfig,
    channels: string[],
    filters?: FeedFilterOptions
  ): Promise<FeedFetchResult> {
    const options = config.options as Record<string, unknown>;

    const apiId = options.apiId || process.env.TELEGRAM_API_ID;
    const apiHash = options.apiHash || process.env.TELEGRAM_API_HASH;
    // Session string reserved for persistent auth (not yet implemented)
    const _sessionString = options.sessionString || process.env.TELEGRAM_SESSION_STRING;

    if (!apiId || !apiHash) {
      return {
        items: [],
        failedCount: 0,
        errors: [
          'Telegram API credentials required for MTProto method. Use RSS method for unauthenticated access.',
        ],
        hasMore: false,
      };
    }

    // MTProto implementation would go here
    // For now, fall back to RSS
    console.warn('[Telegram] MTProto not implemented, falling back to RSS');
    return this.fetchViaRSS(channels, filters);
  }

  /**
   * Extract XML tag content
   */
  private extractXmlTag(xml: string, tag: string): string | undefined {
    // Handle CDATA
    const cdataRegex = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i');
    const cdataMatch = cdataRegex.exec(xml);
    if (cdataMatch) {
      return cdataMatch[1];
    }

    // Handle regular content
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
    const match = regex.exec(xml);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Strip HTML tags from text
   */
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

  /**
   * Extract message ID from URL
   */
  private extractMessageId(url: string): string | undefined {
    // Format: https://t.me/channel/12345
    const match = /\/(\d+)\/?$/.exec(url);
    return match ? match[1] : undefined;
  }

  /**
   * Truncate title to reasonable length
   */
  private truncateTitle(title: string): string {
    const maxLength = 200;
    const cleaned = this.stripHtml(title).replace(/\s+/g, ' ').trim();

    if (cleaned.length <= maxLength) {
      return cleaned;
    }

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
        // Filter by keywords
        if (filters.keywords?.length) {
          const text = `${item.title} ${item.content || ''}`;
          if (!this.matchesKeywords(text, filters.keywords)) {
            return false;
          }
        }

        // Filter by severity
        if (filters.minSeverity) {
          const severityOrder: FeedSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];
          const minIndex = severityOrder.indexOf(filters.minSeverity);
          const itemIndex = severityOrder.indexOf(item.severity);
          if (itemIndex < minIndex) {
            return false;
          }
        }

        // Filter by age
        if (filters.maxAge) {
          const age = Date.now() - item.timestamp.getTime();
          if (age > filters.maxAge) {
            return false;
          }
        }

        // Apply limit
        return true;
      })
      .slice(0, filters.limit);
  }

  override getDefaultConfig(): Partial<FeedConfig> {
    return {
      ...super.getDefaultConfig(),
      pollInterval: 300000, // 5 minutes
      options: {
        method: 'rss',
        channels: [],
      },
    };
  }

  override validateConfig(config: Partial<FeedConfig>): { valid: boolean; errors: string[] } {
    const result = super.validateConfig(config);

    // Check for channels
    const options = config.options as Record<string, unknown> | undefined;
    const filters = config.filters as Record<string, unknown> | undefined;
    const channels = filters?.channels || options?.channels;

    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      result.errors.push('At least one Telegram channel required');
      result.valid = false;
    }

    return result;
  }
}

// Export singleton instance
export const telegramAdapter = new TelegramAdapter();
