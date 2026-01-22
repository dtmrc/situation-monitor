/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/**
 * News/OSINT Feed Adapter
 *
 * Supports multiple news sources:
 * - NewsAPI
 * - RSS feeds
 * - GDELT API
 */

import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import Parser from 'rss-parser';

import {
  BaseFeedAdapter,
  type FeedConfig,
  type FeedFilterOptions,
  type FeedFetchResult,
  type NormalizedFeedItem,
  type FeedSeverity,
} from '../adapter.interface';

// NewsAPI response types
interface NewsAPIArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

// RSS parser instance
const rssParser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent': 'SituationMonitor/1.0',
  },
});

/**
 * News Feed Adapter
 */
export class NewsAdapter extends BaseFeedAdapter {
  readonly type = 'news' as const;
  readonly name = 'News & OSINT';
  readonly description = 'News articles from NewsAPI, RSS feeds, and GDELT';
  readonly requiredConfig = ['sourceType'];

  async fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    const options = config.options as Record<string, unknown>;
    const sourceType = options.sourceType as string;

    switch (sourceType) {
      case 'newsapi':
        return this.fetchNewsAPI(config, filters);
      case 'rss':
        return this.fetchRSS(config, filters);
      case 'gdelt':
        return this.fetchGDELT(config, filters);
      default:
        return {
          items: [],
          failedCount: 0,
          errors: [`Unknown source type: ${sourceType}`],
          hasMore: false,
        };
    }
  }

  /**
   * Fetch from NewsAPI
   */
  private async fetchNewsAPI(
    config: FeedConfig,
    filters?: FeedFilterOptions
  ): Promise<FeedFetchResult> {
    const options = config.options as Record<string, unknown>;
    const configFilters = config.filters as Record<string, unknown>;
    const apiKey = config.apiKeyEncrypted || options.apiKey;

    if (!apiKey) {
      return {
        items: [],
        failedCount: 0,
        errors: ['NewsAPI key required'],
        hasMore: false,
      };
    }

    // Build query parameters
    const params = new URLSearchParams();
    params.set('apiKey', apiKey as string);

    // Keywords from filters or config
    const keywords = filters?.keywords || (configFilters?.keywords as string[]);
    if (keywords?.length) {
      params.set('q', keywords.join(' OR '));
    }

    // Categories
    const categories = filters?.categories || (configFilters?.categories as string[]);
    if (categories?.length) {
      params.set('category', categories[0]); // NewsAPI only supports one category
    }

    // Page size
    const limit = filters?.limit || 100;
    params.set('pageSize', String(Math.min(limit, 100)));

    // Sort by recency
    params.set('sortBy', 'publishedAt');

    // Use top headlines or everything endpoint
    const endpoint = keywords?.length
      ? 'https://newsapi.org/v2/everything'
      : 'https://newsapi.org/v2/top-headlines';

    // Add country for top-headlines
    if (!keywords?.length) {
      params.set('country', (options.country as string) || 'us');
    }

    try {
      const response = await fetch(`${endpoint}?${params.toString()}`);
      const data = (await response.json()) as NewsAPIResponse;

      if (data.status !== 'ok') {
        return {
          items: [],
          failedCount: 0,
          errors: [`NewsAPI error: ${(data as { message?: string }).message || 'Unknown error'}`],
          hasMore: false,
        };
      }

      const items: NormalizedFeedItem[] = data.articles.map((article) => ({
        externalId: `newsapi:${Buffer.from(article.url).toString('base64').slice(0, 100)}`,
        type: 'news' as const,
        title: article.title,
        content: article.description || article.content || undefined,
        url: article.url,
        timestamp: new Date(article.publishedAt),
        severity: this.determineSeverity(`${article.title} ${article.description || ''}`),
        metadata: {
          source: article.source.name,
          sourceId: article.source.id,
          author: article.author,
          imageUrl: article.urlToImage,
        },
        raw: article,
      }));

      // Filter by keywords if specified
      const filtered = this.filterItems(items, filters);

      return {
        items: filtered,
        failedCount: data.articles.length - filtered.length,
        errors: [],
        hasMore: data.totalResults > data.articles.length,
      };
    } catch (error) {
      return {
        items: [],
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'NewsAPI fetch failed'],
        hasMore: false,
      };
    }
  }

  /**
   * Fetch from RSS feed
   */
  private async fetchRSS(
    config: FeedConfig,
    filters?: FeedFilterOptions
  ): Promise<FeedFetchResult> {
    const endpoint = config.endpoint;

    if (!endpoint) {
      return {
        items: [],
        failedCount: 0,
        errors: ['RSS feed URL required'],
        hasMore: false,
      };
    }

    try {
      const feed = await rssParser.parseURL(endpoint);
      const items: NormalizedFeedItem[] = [];
      const errors: string[] = [];

      for (const item of feed.items) {
        try {
          // Extract content
          let content = item.contentSnippet || item.content || item.summary;

          // Try to extract full content if URL is available
          if (!content && item.link) {
            try {
              content = await this.extractArticleContent(item.link);
            } catch {
              // Ignore extraction errors
            }
          }

          items.push({
            externalId: `rss:${Buffer.from(item.link || item.guid || item.title || '')
              .toString('base64')
              .slice(0, 100)}`,
            type: 'news' as const,
            title: item.title || 'Untitled',
            content,
            url: item.link,
            timestamp: item.pubDate ? new Date(item.pubDate) : new Date(),
            severity: this.determineSeverity(`${item.title || ''} ${content || ''}`),
            metadata: {
              source: feed.title,
              feedUrl: endpoint,
              categories: item.categories,
              author: item.creator || item.author,
            },
            raw: item,
          });
        } catch (err) {
          errors.push(`Failed to parse item: ${item.title || 'unknown'}`);
        }
      }

      // Apply filters
      const filtered = this.filterItems(items, filters);

      return {
        items: filtered,
        failedCount: errors.length + (items.length - filtered.length),
        errors,
        hasMore: false, // RSS feeds don't support pagination
      };
    } catch (error) {
      return {
        items: [],
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'RSS fetch failed'],
        hasMore: false,
      };
    }
  }

  /**
   * Fetch from GDELT API
   */
  private async fetchGDELT(
    config: FeedConfig,
    filters?: FeedFilterOptions
  ): Promise<FeedFetchResult> {
    const configFilters = config.filters as Record<string, unknown>;

    // Build GDELT query
    const keywords = filters?.keywords || (configFilters?.keywords as string[]);
    const query = keywords?.length ? keywords.join(' OR ') : '*';

    // GDELT DOC API
    const params = new URLSearchParams();
    params.set('query', query);
    params.set('mode', 'artlist');
    params.set('maxrecords', String(filters?.limit || 100));
    params.set('format', 'json');

    // Time range
    if (filters?.maxAge) {
      const startDate = new Date(Date.now() - filters.maxAge);
      params.set('startdatetime', startDate.toISOString().replace(/[-:T]/g, '').slice(0, 14));
    }

    try {
      const response = await fetch(
        `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`
      );
      const data = (await response.json()) as {
        articles?: {
          url: string;
          title: string;
          seendate: string;
          sourcecountry: string;
          language: string;
          domain: string;
        }[];
      };

      if (!data.articles) {
        return {
          items: [],
          failedCount: 0,
          errors: [],
          hasMore: false,
        };
      }

      const items: NormalizedFeedItem[] = data.articles.map((article) => ({
        externalId: `gdelt:${Buffer.from(article.url).toString('base64').slice(0, 100)}`,
        type: 'news' as const,
        title: article.title,
        url: article.url,
        timestamp: this.parseGDELTDate(article.seendate),
        severity: this.determineSeverity(article.title),
        metadata: {
          source: 'GDELT',
          country: article.sourcecountry,
          language: article.language,
          domain: article.domain,
        },
        raw: article,
      }));

      // Apply filters
      const filtered = this.filterItems(items, filters);

      return {
        items: filtered,
        failedCount: items.length - filtered.length,
        errors: [],
        hasMore: false,
      };
    } catch (error) {
      return {
        items: [],
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'GDELT fetch failed'],
        hasMore: false,
      };
    }
  }

  /**
   * Extract article content using Readability
   */
  private async extractArticleContent(url: string): Promise<string | undefined> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SituationMonitor/1.0)',
        },
      });
      const html = await response.text();
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      return article?.textContent || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Parse GDELT date format (YYYYMMDDHHMMSS)
   */
  private parseGDELTDate(dateStr: string): Date {
    if (!dateStr || dateStr.length < 14) {
      return new Date();
    }

    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)) - 1;
    const day = parseInt(dateStr.slice(6, 8));
    const hour = parseInt(dateStr.slice(8, 10));
    const minute = parseInt(dateStr.slice(10, 12));
    const second = parseInt(dateStr.slice(12, 14));

    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  /**
   * Filter items based on filter options
   */
  private filterItems(
    items: NormalizedFeedItem[],
    filters?: FeedFilterOptions
  ): NormalizedFeedItem[] {
    if (!filters) return items;

    return items.filter((item) => {
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

      return true;
    });
  }

  override getDefaultConfig(): Partial<FeedConfig> {
    return {
      ...super.getDefaultConfig(),
      pollInterval: 300000, // 5 minutes
      options: {
        sourceType: 'newsapi',
      },
    };
  }
}

// Export singleton instance
export const newsAdapter = new NewsAdapter();
