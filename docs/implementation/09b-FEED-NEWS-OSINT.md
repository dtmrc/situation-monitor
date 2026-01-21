# Phase 9b: News/OSINT Data Feeds

Parent: [09-REALTIME-DATA-FEEDS.md](./09-REALTIME-DATA-FEEDS.md)

## Overview

This document covers comprehensive news data ingestion, parsing, and enrichment strategies for intelligence gathering. It includes multiple adapter implementations, content extraction, entity extraction, sentiment analysis, topic classification, deduplication, and credibility scoring.

**Tasks Covered:** 9.5

---

## News Source Types

| Source Type | Examples | Pros | Cons |
|-------------|----------|------|------|
| **REST APIs** | NewsAPI, Bing News, Google News | Structured JSON, easy parsing | Rate limits, costs, limited history |
| **RSS/Atom Feeds** | Reuters, BBC, AP, local outlets | Free, real-time, wide coverage | XML parsing, inconsistent formats |
| **GDELT** | GDELT Project | Massive scale, event coding, free | Complex schema, delayed processing |
| **Web Scraping** | Custom targets | Full control, any source | Maintenance, legal considerations |
| **Aggregators** | Feedly, Inoreader APIs | Curated, normalized | Costs, dependency |

---

## News Data Architecture

```
                         NEWS INGESTION PIPELINE

  RAW SOURCES
  +----------+ +----------+ +----------+ +----------+ +----------+
  | NewsAPI  | |   RSS    | |  GDELT   | |  Custom  | |  Social  |
  |  (JSON)  | |  (XML)   | |  (CSV)   | |   API    | |  Media   |
  +----+-----+ +----+-----+ +----+-----+ +----+-----+ +----+-----+
       |            |            |            |            |
       +------------+------------+------------+------------+
                                 |
                                 v
  PARSING LAYER
  +----------------------------------------------------------+
  |                    SOURCE ADAPTERS                        |
  |  +-------------+  +-------------+  +-------------+       |
  |  | JSON Parser |  | XML/RSS     |  | HTML        |       |
  |  |             |  | Parser      |  | Extractor   |       |
  |  +------+------+  +------+------+  +------+------+       |
  |         +----------------+----------------+               |
  |                          |                                |
  |                          v                                |
  |              +-------------------+                        |
  |              | Content Normalizer|                        |
  |              | - Clean HTML      |                        |
  |              | - Extract text    |                        |
  |              | - Detect language |                        |
  |              +--------+----------+                        |
  +---------------------------+-------------------------------+
                              |
                              v
  ENRICHMENT LAYER
  +----------------------------------------------------------+
  |  +-------------+  +-------------+  +-------------+       |
  |  |   Entity    |  |  Location   |  |  Sentiment  |       |
  |  | Extraction  |  |  Geocoding  |  |  Analysis   |       |
  |  |   (NER)     |  |             |  |             |       |
  |  +------+------+  +------+------+  +------+------+       |
  |         |                |                |              |
  |  +------+------+  +------+------+  +------+------+       |
  |  |   Topic     |  |   Source    |  | Dedup &     |       |
  |  | Classifier  |  | Credibility |  | Clustering  |       |
  |  +------+------+  +------+------+  +------+------+       |
  |         +----------------+----------------+               |
  +---------------------------+-------------------------------+
                              |
                              v
  OUTPUT
  +----------------------------------------------------------+
  |              NORMALIZED NEWS ITEM                         |
  |  {                                                        |
  |    id, title, content, summary, timestamp,                |
  |    source: { name, url, credibility },                    |
  |    location: { lat, lng, name, country },                 |
  |    entities: { people, orgs, locations },                 |
  |    sentiment: { score, label },                           |
  |    topics: ['conflict', 'political'],                     |
  |    language, clusterId, embeddings                        |
  |  }                                                        |
  +----------------------------------------------------------+
```

---

## Base News Adapter

**File: `apps/api/src/feeds/adapters/news/base.adapter.ts`**
```typescript
import { BaseFeedAdapter, type FeedConfig } from '../../adapter.interface';
import type { NormalizedFeedItem } from '../../../jobs/queues';

export interface NewsArticle {
  title: string;
  content: string;
  summary?: string;
  url: string;
  publishedAt: Date;
  author?: string;
  source: {
    name: string;
    url?: string;
  };
  imageUrl?: string;
  language?: string;
  raw?: unknown;
}

export interface EnrichedNewsItem extends NormalizedFeedItem {
  metadata: {
    source: string;
    sourceUrl?: string;
    author?: string;
    url: string;
    imageUrl?: string;
    language: string;
    entities: ExtractedEntities;
    sentiment: SentimentResult;
    topics: string[];
    credibilityScore: number;
    clusterId?: string;
  };
}

export interface ExtractedEntities {
  people: string[];
  organizations: string[];
  locations: Array<{
    name: string;
    type: 'country' | 'city' | 'region' | 'landmark';
    coordinates?: { lat: number; lng: number };
  }>;
  events: string[];
}

export interface SentimentResult {
  score: number;      // -1 to 1
  label: 'negative' | 'neutral' | 'positive';
  confidence: number; // 0 to 1
}

export abstract class BaseNewsAdapter extends BaseFeedAdapter {
  type = 'news';

  abstract fetchArticles(): Promise<NewsArticle[]>;

  async fetch(): Promise<NewsArticle[]> {
    return this.fetchArticles();
  }

  normalize(article: NewsArticle): NormalizedFeedItem {
    return {
      id: this.generateArticleId(article),
      type: 'news',
      title: article.title,
      content: article.content,
      timestamp: article.publishedAt,
      metadata: {
        source: article.source.name,
        sourceUrl: article.source.url,
        author: article.author,
        url: article.url,
        imageUrl: article.imageUrl,
        language: article.language || 'en',
      },
      raw: article.raw || article,
    };
  }

  protected generateArticleId(article: NewsArticle): string {
    // URL-based deduplication key
    const urlHash = Buffer.from(article.url).toString('base64').slice(0, 20);
    return `news-${urlHash}`;
  }
}
```

---

## NewsAPI Adapter

**File: `apps/api/src/feeds/adapters/news/newsapi.adapter.ts`**
```typescript
import { BaseNewsAdapter, type NewsArticle } from './base.adapter';
import type { FeedConfig } from '../../adapter.interface';

interface NewsApiArticle {
  source: { id: string; name: string };
  author: string;
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  content: string;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

export class NewsApiAdapter extends BaseNewsAdapter {
  name = 'NewsAPI';

  private apiKey!: string;
  private keywords!: string[];
  private domains?: string[];
  private excludeDomains?: string[];
  private lastFetchTime: Date = new Date(Date.now() - 3600000); // 1 hour ago

  async initialize(config: FeedConfig): Promise<void> {
    await super.initialize(config);
    this.apiKey = config.apiKey!;
    this.keywords = (config.options?.keywords as string[]) || [];
    this.domains = config.options?.domains as string[];
    this.excludeDomains = config.options?.excludeDomains as string[];
  }

  async fetchArticles(): Promise<NewsArticle[]> {
    const query = this.buildQuery();
    const from = this.lastFetchTime.toISOString();

    const url = new URL('https://newsapi.org/v2/everything');
    url.searchParams.set('q', query);
    url.searchParams.set('from', from);
    url.searchParams.set('sortBy', 'publishedAt');
    url.searchParams.set('language', 'en');
    url.searchParams.set('pageSize', '100');

    if (this.domains?.length) {
      url.searchParams.set('domains', this.domains.join(','));
    }
    if (this.excludeDomains?.length) {
      url.searchParams.set('excludeDomains', this.excludeDomains.join(','));
    }

    const response = await fetch(url.toString(), {
      headers: { 'X-Api-Key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.statusText}`);
    }

    const data: NewsApiResponse = await response.json();
    this.lastFetchTime = new Date();

    return data.articles.map((article) => ({
      title: article.title,
      content: article.content || article.description,
      summary: article.description,
      url: article.url,
      publishedAt: new Date(article.publishedAt),
      author: article.author,
      source: {
        name: article.source.name,
        url: `https://${new URL(article.url).hostname}`,
      },
      imageUrl: article.urlToImage,
      raw: article,
    }));
  }

  private buildQuery(): string {
    return this.keywords
      .map((kw) => (kw.includes(' ') ? `"${kw}"` : kw))
      .join(' OR ');
  }
}
```

---

## RSS Feed Adapter

**File: `apps/api/src/feeds/adapters/news/rss.adapter.ts`**
```typescript
import Parser from 'rss-parser';
import { BaseNewsAdapter, type NewsArticle } from './base.adapter';
import type { FeedConfig } from '../../adapter.interface';
import { extractContent } from '../../../lib/content-extractor';

interface RSSFeedConfig extends FeedConfig {
  options: {
    feedUrls: string[];
    fetchFullContent?: boolean;
    maxAgeHours?: number;
  };
}

export class RSSFeedAdapter extends BaseNewsAdapter {
  name = 'RSS Feed';

  private parser: Parser;
  private feedUrls!: string[];
  private fetchFullContent!: boolean;
  private maxAgeMs!: number;
  private seenUrls: Set<string> = new Set();

  constructor() {
    super();
    this.parser = new Parser({
      customFields: {
        item: [
          ['media:content', 'mediaContent'],
          ['dc:creator', 'creator'],
        ],
      },
    });
  }

  async initialize(config: RSSFeedConfig): Promise<void> {
    await super.initialize(config);
    this.feedUrls = config.options.feedUrls;
    this.fetchFullContent = config.options.fetchFullContent ?? false;
    this.maxAgeMs = (config.options.maxAgeHours ?? 24) * 3600000;
  }

  async fetchArticles(): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    const cutoffTime = Date.now() - this.maxAgeMs;

    for (const feedUrl of this.feedUrls) {
      try {
        const feed = await this.parser.parseURL(feedUrl);
        const sourceName = feed.title || new URL(feedUrl).hostname;

        for (const item of feed.items || []) {
          if (!item.link || this.seenUrls.has(item.link)) continue;

          const pubDate = item.isoDate || item.pubDate;
          const publishedAt = pubDate ? new Date(pubDate) : new Date();

          if (publishedAt.getTime() < cutoffTime) continue;

          this.seenUrls.add(item.link);

          let content = item.content || item.contentSnippet || '';

          if (this.fetchFullContent && item.link) {
            try {
              const fullContent = await extractContent(item.link);
              if (fullContent) {
                content = fullContent.content;
              }
            } catch (error) {
              console.warn(`Failed to extract content from ${item.link}:`, error);
            }
          }

          articles.push({
            title: item.title || 'Untitled',
            content: this.cleanHtml(content),
            summary: item.contentSnippet,
            url: item.link,
            publishedAt,
            author: (item as any).creator,
            source: {
              name: sourceName,
              url: feedUrl,
            },
            imageUrl: (item as any).enclosure?.url,
            raw: item,
          });
        }
      } catch (error) {
        console.error(`Failed to parse RSS feed ${feedUrl}:`, error);
      }
    }

    return articles;
  }

  private cleanHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}
```

---

## GDELT Adapter

**File: `apps/api/src/feeds/adapters/news/gdelt.adapter.ts`**
```typescript
import { BaseNewsAdapter, type NewsArticle } from './base.adapter';
import type { FeedConfig } from '../../adapter.interface';

interface GdeltDocResult {
  url: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
  tone: number;
}

interface GdeltDocResponse {
  articles: GdeltDocResult[];
}

export class GdeltAdapter extends BaseNewsAdapter {
  name = 'GDELT';

  private mode!: 'doc' | 'gkg';
  private query!: string;
  private sourceCountries?: string[];
  private themes?: string[];
  private lastFetchTime: Date = new Date(Date.now() - 900000);

  async initialize(config: FeedConfig): Promise<void> {
    await super.initialize(config);
    this.mode = (config.options?.mode as 'doc' | 'gkg') || 'doc';
    this.query = config.options?.query as string || '';
    this.sourceCountries = config.options?.sourceCountries as string[];
    this.themes = config.options?.themes as string[];
  }

  async fetchArticles(): Promise<NewsArticle[]> {
    if (this.mode === 'doc') {
      return this.fetchDocApi();
    }
    return this.fetchGkg();
  }

  private async fetchDocApi(): Promise<NewsArticle[]> {
    const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc');

    url.searchParams.set('query', this.buildDocQuery());
    url.searchParams.set('mode', 'artlist');
    url.searchParams.set('format', 'json');
    url.searchParams.set('maxrecords', '250');
    url.searchParams.set('sort', 'datedesc');

    const startDate = this.formatGdeltDate(this.lastFetchTime);
    const endDate = this.formatGdeltDate(new Date());
    url.searchParams.set('startdatetime', startDate);
    url.searchParams.set('enddatetime', endDate);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`GDELT DOC API error: ${response.statusText}`);
    }

    const data: GdeltDocResponse = await response.json();
    this.lastFetchTime = new Date();

    return (data.articles || []).map((article) => ({
      title: article.title,
      content: '',
      url: article.url,
      publishedAt: this.parseGdeltDate(article.seendate),
      source: {
        name: article.domain,
        url: `https://${article.domain}`,
      },
      imageUrl: article.socialimage,
      language: article.language,
      raw: article,
    }));
  }

  private async fetchGkg(): Promise<NewsArticle[]> {
    // GKG implementation - fetches from GDELT Global Knowledge Graph
    // Returns articles with rich entity and theme metadata
    return [];
  }

  private buildDocQuery(): string {
    const parts: string[] = [];
    if (this.query) parts.push(this.query);
    if (this.sourceCountries?.length) {
      parts.push(`sourcecountry:(${this.sourceCountries.join(' OR ')})`);
    }
    if (this.themes?.length) {
      parts.push(`theme:(${this.themes.join(' OR ')})`);
    }
    return parts.join(' ') || '*';
  }

  private formatGdeltDate(date: Date): string {
    return date.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  }

  private parseGdeltDate(gdeltDate: string): Date {
    const year = gdeltDate.slice(0, 4);
    const month = gdeltDate.slice(4, 6);
    const day = gdeltDate.slice(6, 8);
    const hour = gdeltDate.slice(8, 10);
    const minute = gdeltDate.slice(10, 12);
    const second = gdeltDate.slice(12, 14);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  }
}
```

---

## Content Extraction Service

**File: `apps/api/src/lib/content-extractor.ts`**
```typescript
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface ExtractedContent {
  title: string;
  content: string;
  textContent: string;
  excerpt: string;
  byline: string | null;
  siteName: string | null;
  publishedTime: string | null;
}

export async function extractContent(url: string): Promise<ExtractedContent | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SituationMonitor/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const dom = new JSDOM(html, { url });

    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) return null;

    const publishedTime =
      dom.window.document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
      dom.window.document.querySelector('meta[name="date"]')?.getAttribute('content') ||
      null;

    return {
      title: article.title,
      content: article.content,
      textContent: article.textContent,
      excerpt: article.excerpt,
      byline: article.byline,
      siteName: article.siteName,
      publishedTime,
    };
  } catch (error) {
    console.error(`Content extraction failed for ${url}:`, error);
    return null;
  }
}

export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\[.*?\]/g, '')
    .replace(/Advertisement/gi, '')
    .replace(/Continue reading.*/gi, '')
    .replace(/Read more.*/gi, '')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim();
}
```

---

## Entity Extraction Service

**File: `apps/api/src/feeds/services/entity-extractor.ts`**
```typescript
import type { ExtractedEntities } from '../adapters/news/base.adapter';

const PATTERNS = {
  countries: /\b(United States|Russia|China|Ukraine|Iran|Israel|Germany|France|United Kingdom|Japan|India|Brazil|Mexico|Turkey|Saudi Arabia|Egypt|South Korea|North Korea|Pakistan|Afghanistan|Syria|Iraq)\b/gi,
  cities: /\b(Washington|Moscow|Beijing|Kyiv|Tehran|Jerusalem|Berlin|Paris|London|Tokyo|Delhi|Brasilia|Riyadh|Cairo|Seoul|Pyongyang|Kabul|Damascus|Baghdad|New York|Los Angeles|Chicago)\b/gi,
  organizations: /\b(United Nations|NATO|European Union|World Bank|IMF|WHO|CIA|FBI|NSA|Pentagon|Kremlin|White House|State Department|Ministry of|Department of)\b/gi,
  personTitles: /\b(President|Prime Minister|Secretary|Minister|General|Admiral|Chairman|CEO|Director|Ambassador|Senator|Representative)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
};

const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  'United States': { lat: 39.8283, lng: -98.5795 },
  'Russia': { lat: 61.5240, lng: 105.3188 },
  'China': { lat: 35.8617, lng: 104.1954 },
  'Ukraine': { lat: 48.3794, lng: 31.1656 },
  'Iran': { lat: 32.4279, lng: 53.6880 },
  'Israel': { lat: 31.0461, lng: 34.8516 },
};

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Washington': { lat: 38.9072, lng: -77.0369 },
  'Moscow': { lat: 55.7558, lng: 37.6173 },
  'Beijing': { lat: 39.9042, lng: 116.4074 },
  'Kyiv': { lat: 50.4501, lng: 30.5234 },
};

export function extractEntities(text: string): ExtractedEntities {
  const entities: ExtractedEntities = {
    people: [],
    organizations: [],
    locations: [],
    events: [],
  };

  // Extract countries
  const countries = new Set<string>();
  let match;
  while ((match = PATTERNS.countries.exec(text)) !== null) {
    countries.add(match[0]);
  }

  for (const country of countries) {
    const coords = COUNTRY_COORDS[country];
    entities.locations.push({
      name: country,
      type: 'country',
      coordinates: coords,
    });
  }

  // Extract cities
  const cities = new Set<string>();
  PATTERNS.cities.lastIndex = 0;
  while ((match = PATTERNS.cities.exec(text)) !== null) {
    cities.add(match[0]);
  }

  for (const city of cities) {
    const coords = CITY_COORDS[city];
    entities.locations.push({
      name: city,
      type: 'city',
      coordinates: coords,
    });
  }

  // Extract organizations
  const orgs = new Set<string>();
  PATTERNS.organizations.lastIndex = 0;
  while ((match = PATTERNS.organizations.exec(text)) !== null) {
    orgs.add(match[0]);
  }
  entities.organizations = Array.from(orgs);

  // Extract people
  const people = new Set<string>();
  PATTERNS.personTitles.lastIndex = 0;
  while ((match = PATTERNS.personTitles.exec(text)) !== null) {
    people.add(`${match[1]} ${match[2]}`);
  }
  entities.people = Array.from(people);

  return entities;
}
```

---

## Sentiment Analysis Service

**File: `apps/api/src/feeds/services/sentiment.ts`**
```typescript
import type { SentimentResult } from '../adapters/news/base.adapter';

const POSITIVE_WORDS = new Set([
  'good', 'great', 'excellent', 'positive', 'success', 'successful', 'win',
  'agreement', 'peace', 'progress', 'growth', 'improve', 'improvement',
  'support', 'cooperation', 'ally', 'alliance', 'stable', 'stability',
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'negative', 'failure', 'fail', 'lose', 'loss',
  'conflict', 'war', 'attack', 'crisis', 'threat', 'danger', 'dangerous',
  'violence', 'violent', 'death', 'kill', 'destroy', 'destruction',
  'sanction', 'condemn', 'criticism', 'tension', 'dispute', 'protest',
]);

const INTENSIFIERS = new Set([
  'very', 'extremely', 'highly', 'absolutely', 'completely', 'totally',
]);

const NEGATORS = new Set([
  'not', 'no', 'never', 'neither', "don't", "doesn't", "didn't",
]);

export function analyzeSentiment(text: string): SentimentResult {
  const words = text.toLowerCase().split(/\W+/);

  let score = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let intensifierActive = false;
  let negatorActive = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    if (INTENSIFIERS.has(word)) {
      intensifierActive = true;
      continue;
    }

    if (NEGATORS.has(word)) {
      negatorActive = true;
      continue;
    }

    let wordScore = 0;
    if (POSITIVE_WORDS.has(word)) {
      wordScore = 1;
      positiveCount++;
    } else if (NEGATIVE_WORDS.has(word)) {
      wordScore = -1;
      negativeCount++;
    }

    if (wordScore !== 0) {
      if (intensifierActive) wordScore *= 1.5;
      if (negatorActive) wordScore *= -1;
      score += wordScore;
    }

    intensifierActive = false;
    negatorActive = false;
  }

  const totalSentimentWords = positiveCount + negativeCount;
  const normalizedScore = totalSentimentWords > 0
    ? Math.max(-1, Math.min(1, score / (totalSentimentWords * 1.5)))
    : 0;

  const confidence = Math.min(1, totalSentimentWords / (words.length * 0.1));

  return {
    score: normalizedScore,
    label: normalizedScore > 0.1 ? 'positive' : normalizedScore < -0.1 ? 'negative' : 'neutral',
    confidence,
  };
}
```

---

## Topic Classification Service

**File: `apps/api/src/feeds/services/topic-classifier.ts`**
```typescript
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'conflict': [
    'war', 'attack', 'military', 'troops', 'strike', 'bomb', 'missile',
    'combat', 'battle', 'offensive', 'invasion', 'casualties', 'soldier',
  ],
  'political': [
    'government', 'election', 'president', 'minister', 'parliament',
    'congress', 'senate', 'legislation', 'policy', 'vote', 'democracy',
  ],
  'economic': [
    'economy', 'market', 'trade', 'inflation', 'gdp', 'currency',
    'stock', 'investment', 'bank', 'finance', 'budget', 'debt',
  ],
  'diplomatic': [
    'diplomat', 'embassy', 'treaty', 'agreement', 'negotiation',
    'summit', 'talks', 'alliance', 'relations', 'ambassador',
  ],
  'humanitarian': [
    'refugee', 'humanitarian', 'aid', 'crisis', 'disaster',
    'famine', 'drought', 'flood', 'earthquake', 'relief',
  ],
  'terrorism': [
    'terror', 'terrorist', 'extremist', 'militant', 'insurgent',
    'bombing', 'explosion', 'hostage', 'kidnapping', 'assassination',
  ],
  'cyber': [
    'cyber', 'hack', 'hacker', 'malware', 'ransomware', 'breach',
    'data leak', 'phishing', 'ddos', 'cybersecurity',
  ],
  'energy': [
    'oil', 'gas', 'energy', 'pipeline', 'opec', 'petroleum',
    'nuclear', 'renewable', 'solar', 'wind', 'electricity',
  ],
};

export interface TopicScore {
  topic: string;
  score: number;
  keywords: string[];
}

export function classifyTopics(text: string, threshold = 0.5): TopicScore[] {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\W+/);
  const wordSet = new Set(words);
  const results: TopicScore[] = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const matchedKeywords = keywords.filter(kw => {
      if (kw.includes(' ')) {
        return lowerText.includes(kw);
      }
      return wordSet.has(kw);
    });

    const score = matchedKeywords.length / keywords.length;

    if (score >= threshold || matchedKeywords.length >= 2) {
      results.push({ topic, score, keywords: matchedKeywords });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
```

---

## Deduplication Service

**File: `apps/api/src/feeds/services/deduplication.ts`**
```typescript
import crypto from 'crypto';

export interface DeduplicationResult {
  isDuplicate: boolean;
  originalId?: string;
  similarity?: number;
}

// In-memory cache for recent articles (use Redis in production)
const recentArticles = new Map<string, { id: string; timestamp: Date; titleHash: string }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function checkDuplicate(
  articleId: string,
  title: string,
  url: string
): DeduplicationResult {
  // Clean up old entries
  const now = new Date();
  for (const [key, value] of recentArticles) {
    if (now.getTime() - value.timestamp.getTime() > CACHE_TTL_MS) {
      recentArticles.delete(key);
    }
  }

  // 1. Exact URL match
  const urlHash = hashString(url);
  if (recentArticles.has(urlHash)) {
    return {
      isDuplicate: true,
      originalId: recentArticles.get(urlHash)!.id,
      similarity: 1.0,
    };
  }

  // 2. Title similarity check
  const titleHash = hashString(normalizeTitle(title));
  for (const [, value] of recentArticles) {
    if (value.titleHash === titleHash) {
      return {
        isDuplicate: true,
        originalId: value.id,
        similarity: 0.95,
      };
    }
  }

  // Not a duplicate - add to cache
  recentArticles.set(urlHash, { id: articleId, timestamp: now, titleHash });

  return { isDuplicate: false };
}

function hashString(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
```

---

## Credibility Scoring Service

**File: `apps/api/src/feeds/services/credibility.ts`**
```typescript
// Domain credibility tiers
const TIER_1_DOMAINS = new Set([
  'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk',
  'nytimes.com', 'washingtonpost.com', 'theguardian.com',
  'ft.com', 'economist.com', 'wsj.com',
]);

const TIER_2_DOMAINS = new Set([
  'cnn.com', 'foxnews.com', 'nbcnews.com', 'cbsnews.com',
  'abcnews.go.com', 'politico.com', 'thehill.com',
  'bloomberg.com', 'cnbc.com', 'aljazeera.com',
]);

const LOW_CREDIBILITY_DOMAINS = new Set([
  // Known misinformation or satire sites
  'theonion.com', 'babylonbee.com',
]);

export interface CredibilityScore {
  score: number;        // 0-100
  tier: 1 | 2 | 3;
  factors: string[];
}

export function calculateCredibility(
  domain: string,
  hasAuthor: boolean,
  contentLength: number
): CredibilityScore {
  const factors: string[] = [];
  let score = 50; // Base score

  // Domain tier check
  const cleanDomain = domain.replace('www.', '').toLowerCase();

  if (TIER_1_DOMAINS.has(cleanDomain)) {
    score += 40;
    factors.push('Tier 1 source');
  } else if (TIER_2_DOMAINS.has(cleanDomain)) {
    score += 25;
    factors.push('Tier 2 source');
  } else if (LOW_CREDIBILITY_DOMAINS.has(cleanDomain)) {
    score -= 40;
    factors.push('Known low credibility');
  }

  // Author attribution
  if (hasAuthor) {
    score += 5;
    factors.push('Has author attribution');
  }

  // Content length (very short articles may be summaries/snippets)
  if (contentLength > 500) {
    score += 5;
    factors.push('Substantial content');
  }

  // Normalize score
  score = Math.max(0, Math.min(100, score));

  // Determine tier
  let tier: 1 | 2 | 3 = 3;
  if (score >= 80) tier = 1;
  else if (score >= 60) tier = 2;

  return { score, tier, factors };
}
```

---

## News Ingestion Worker

**File: `apps/api/src/jobs/workers/news.worker.ts`**
```typescript
import { Worker, Job } from 'bullmq';
import { redis } from '../../lib/redis';
import { processQueue, type IngestJobData } from '../queues';
import { extractEntities } from '../../feeds/services/entity-extractor';
import { analyzeSentiment } from '../../feeds/services/sentiment';
import { classifyTopics } from '../../feeds/services/topic-classifier';
import { checkDuplicate } from '../../feeds/services/deduplication';
import { calculateCredibility } from '../../feeds/services/credibility';
import type { NewsArticle, EnrichedNewsItem } from '../../feeds/adapters/news/base.adapter';

export const newsWorker = new Worker<IngestJobData>(
  'news-ingest',
  async (job: Job<IngestJobData>) => {
    const article = job.data.rawData as NewsArticle;

    // Check for duplicates
    const dedupResult = checkDuplicate(
      job.data.feedId,
      article.title,
      article.url
    );

    if (dedupResult.isDuplicate) {
      return { skipped: true, reason: 'duplicate', originalId: dedupResult.originalId };
    }

    // Extract entities
    const text = `${article.title} ${article.content}`;
    const entities = extractEntities(text);

    // Analyze sentiment
    const sentiment = analyzeSentiment(text);

    // Classify topics
    const topics = classifyTopics(text);

    // Calculate credibility
    const credibility = calculateCredibility(
      new URL(article.url).hostname,
      !!article.author,
      article.content?.length || 0
    );

    // Build enriched item
    const enrichedItem: EnrichedNewsItem = {
      id: `news-${Buffer.from(article.url).toString('base64').slice(0, 20)}`,
      type: 'news',
      title: article.title,
      content: article.content,
      timestamp: article.publishedAt,
      location: entities.locations[0]?.coordinates
        ? {
            lat: entities.locations[0].coordinates.lat,
            lng: entities.locations[0].coordinates.lng,
            name: entities.locations[0].name,
          }
        : undefined,
      metadata: {
        source: article.source.name,
        sourceUrl: article.source.url,
        author: article.author,
        url: article.url,
        imageUrl: article.imageUrl,
        language: article.language || 'en',
        entities,
        sentiment,
        topics: topics.map(t => t.topic),
        credibilityScore: credibility.score,
      },
      raw: article,
    };

    // Queue for processing
    await processQueue.add('process', {
      feedItemId: enrichedItem.id,
      projectId: job.data.metadata.projectId,
      type: 'news',
      normalizedData: enrichedItem,
    });

    return { processed: true, id: enrichedItem.id };
  },
  { connection: redis, concurrency: 5 }
);
```

---

## News Feed Configuration UI

**File: `apps/web/src/features/feeds/components/news-feed-config.tsx`**
```typescript
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Plus, Newspaper, Rss, Globe } from 'lucide-react';
import { api } from '@/lib/api';

const newsFeedSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  enabled: z.boolean().default(true),
  sourceType: z.enum(['newsapi', 'rss', 'gdelt']),
  pollIntervalSeconds: z.number().min(60).max(3600),
  // NewsAPI options
  newsApiKey: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  domains: z.array(z.string()).optional(),
  excludeDomains: z.array(z.string()).optional(),
  // RSS options
  feedUrls: z.array(z.string().url()).optional(),
  fetchFullContent: z.boolean().optional(),
  maxAgeHours: z.number().min(1).max(168).optional(),
  // GDELT options
  gdeltQuery: z.string().optional(),
  gdeltMode: z.enum(['doc', 'gkg']).optional(),
  sourceCountries: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
  // Common options
  enrichmentOptions: z.object({
    extractEntities: z.boolean().default(true),
    analyzeSentiment: z.boolean().default(true),
    classifyTopics: z.boolean().default(true),
    checkCredibility: z.boolean().default(true),
  }),
});

type NewsFeedFormData = z.infer<typeof newsFeedSchema>;

interface NewsFeedConfigProps {
  projectId: string;
  existingConfig?: NewsFeedFormData & { id: string };
  onSuccess?: () => void;
}

export function NewsFeedConfig({ projectId, existingConfig, onSuccess }: NewsFeedConfigProps) {
  const queryClient = useQueryClient();
  const [keywords, setKeywords] = useState<string[]>(existingConfig?.keywords || []);
  const [feedUrls, setFeedUrls] = useState<string[]>(existingConfig?.feedUrls || []);
  const [domains, setDomains] = useState<string[]>(existingConfig?.domains || []);
  const [keywordInput, setKeywordInput] = useState('');
  const [feedUrlInput, setFeedUrlInput] = useState('');
  const [domainInput, setDomainInput] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NewsFeedFormData>({
    resolver: zodResolver(newsFeedSchema),
    defaultValues: existingConfig || {
      name: '',
      enabled: true,
      sourceType: 'newsapi',
      pollIntervalSeconds: 300,
      enrichmentOptions: {
        extractEntities: true,
        analyzeSentiment: true,
        classifyTopics: true,
        checkCredibility: true,
      },
    },
  });

  const sourceType = watch('sourceType');

  const mutation = useMutation({
    mutationFn: async (data: NewsFeedFormData) => {
      const payload = {
        ...data,
        keywords,
        feedUrls,
        domains,
      };
      if (existingConfig?.id) {
        return api.put(`/projects/${projectId}/feeds/${existingConfig.id}`, payload);
      }
      return api.post(`/projects/${projectId}/feeds`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds', projectId] });
      onSuccess?.();
    },
  });

  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const addFeedUrl = () => {
    if (feedUrlInput.trim() && !feedUrls.includes(feedUrlInput.trim())) {
      setFeedUrls([...feedUrls, feedUrlInput.trim()]);
      setFeedUrlInput('');
    }
  };

  const removeFeedUrl = (url: string) => {
    setFeedUrls(feedUrls.filter((u) => u !== url));
  };

  const addDomain = () => {
    if (domainInput.trim() && !domains.includes(domainInput.trim())) {
      setDomains([...domains, domainInput.trim()]);
      setDomainInput('');
    }
  };

  const removeDomain = (domain: string) => {
    setDomains(domains.filter((d) => d !== domain));
  };

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-accent-green">
            {existingConfig ? 'Edit News Feed' : 'Configure News Feed'}
          </CardTitle>
          <CardDescription>
            Set up news ingestion from NewsAPI, RSS feeds, or GDELT
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Settings */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Feed Name</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Ukraine Conflict News"
                className="bg-zinc-800 border-zinc-700"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceType">Source Type</Label>
              <Select
                value={sourceType}
                onValueChange={(value) => setValue('sourceType', value as any)}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newsapi">
                    <div className="flex items-center gap-2">
                      <Newspaper className="h-4 w-4" />
                      NewsAPI
                    </div>
                  </SelectItem>
                  <SelectItem value="rss">
                    <div className="flex items-center gap-2">
                      <Rss className="h-4 w-4" />
                      RSS Feeds
                    </div>
                  </SelectItem>
                  <SelectItem value="gdelt">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      GDELT Project
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={watch('enabled')}
                onCheckedChange={(checked) => setValue('enabled', checked)}
              />
              <Label htmlFor="enabled">Enabled</Label>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="pollInterval">Poll Interval (seconds)</Label>
              <Input
                id="pollInterval"
                type="number"
                {...register('pollIntervalSeconds', { valueAsNumber: true })}
                className="w-24 bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          {/* Source-specific configuration */}
          <Tabs value={sourceType} className="mt-4">
            <TabsList className="bg-zinc-800">
              <TabsTrigger value="newsapi">NewsAPI</TabsTrigger>
              <TabsTrigger value="rss">RSS</TabsTrigger>
              <TabsTrigger value="gdelt">GDELT</TabsTrigger>
            </TabsList>

            <TabsContent value="newsapi" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="newsApiKey">API Key</Label>
                <Input
                  id="newsApiKey"
                  type="password"
                  {...register('newsApiKey')}
                  placeholder="Your NewsAPI key"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div className="space-y-2">
                <Label>Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="Add keyword"
                    className="bg-zinc-800 border-zinc-700"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button type="button" variant="outline" onClick={addKeyword}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="bg-zinc-800">
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(keyword)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Domains (optional - restrict to these sources)</Label>
                <div className="flex gap-2">
                  <Input
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="e.g., reuters.com"
                    className="bg-zinc-800 border-zinc-700"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDomain())}
                  />
                  <Button type="button" variant="outline" onClick={addDomain}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {domains.map((domain) => (
                    <Badge key={domain} variant="secondary" className="bg-zinc-800">
                      {domain}
                      <button
                        type="button"
                        onClick={() => removeDomain(domain)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rss" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>RSS Feed URLs</Label>
                <div className="flex gap-2">
                  <Input
                    value={feedUrlInput}
                    onChange={(e) => setFeedUrlInput(e.target.value)}
                    placeholder="https://example.com/feed.xml"
                    className="bg-zinc-800 border-zinc-700"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeedUrl())}
                  />
                  <Button type="button" variant="outline" onClick={addFeedUrl}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {feedUrls.map((url) => (
                    <Badge key={url} variant="secondary" className="bg-zinc-800 max-w-full">
                      <span className="truncate">{url}</span>
                      <button
                        type="button"
                        onClick={() => removeFeedUrl(url)}
                        className="ml-1 hover:text-red-500 flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="fetchFullContent"
                  checked={watch('fetchFullContent')}
                  onCheckedChange={(checked) => setValue('fetchFullContent', checked)}
                />
                <Label htmlFor="fetchFullContent">Fetch full article content</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAgeHours">Max Article Age (hours)</Label>
                <Input
                  id="maxAgeHours"
                  type="number"
                  {...register('maxAgeHours', { valueAsNumber: true })}
                  placeholder="24"
                  className="w-24 bg-zinc-800 border-zinc-700"
                />
              </div>
            </TabsContent>

            <TabsContent value="gdelt" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="gdeltQuery">Search Query</Label>
                <Textarea
                  id="gdeltQuery"
                  {...register('gdeltQuery')}
                  placeholder="e.g., Ukraine conflict OR Russia military"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gdeltMode">API Mode</Label>
                <Select
                  value={watch('gdeltMode') || 'doc'}
                  onValueChange={(value) => setValue('gdeltMode', value as any)}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doc">Document API</SelectItem>
                    <SelectItem value="gkg">Global Knowledge Graph</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Source Countries (ISO codes)</Label>
                <Input
                  placeholder="e.g., US, GB, UA"
                  className="bg-zinc-800 border-zinc-700"
                  onChange={(e) =>
                    setValue(
                      'sourceCountries',
                      e.target.value.split(',').map((s) => s.trim().toUpperCase())
                    )
                  }
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Enrichment Options */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <h4 className="text-sm font-medium text-zinc-400">Enrichment Options</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="extractEntities"
                  checked={watch('enrichmentOptions.extractEntities')}
                  onCheckedChange={(checked) =>
                    setValue('enrichmentOptions.extractEntities', checked)
                  }
                />
                <Label htmlFor="extractEntities">Extract entities (people, orgs, locations)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="analyzeSentiment"
                  checked={watch('enrichmentOptions.analyzeSentiment')}
                  onCheckedChange={(checked) =>
                    setValue('enrichmentOptions.analyzeSentiment', checked)
                  }
                />
                <Label htmlFor="analyzeSentiment">Analyze sentiment</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="classifyTopics"
                  checked={watch('enrichmentOptions.classifyTopics')}
                  onCheckedChange={(checked) =>
                    setValue('enrichmentOptions.classifyTopics', checked)
                  }
                />
                <Label htmlFor="classifyTopics">Classify topics</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="checkCredibility"
                  checked={watch('enrichmentOptions.checkCredibility')}
                  onCheckedChange={(checked) =>
                    setValue('enrichmentOptions.checkCredibility', checked)
                  }
                />
                <Label htmlFor="checkCredibility">Check source credibility</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onSuccess?.()}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : existingConfig ? 'Update Feed' : 'Create Feed'}
        </Button>
      </div>
    </form>
  );
}
```

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/feeds/adapters/news/base.adapter.ts` | Base news adapter class |
| `apps/api/src/feeds/adapters/news/newsapi.adapter.ts` | NewsAPI adapter |
| `apps/api/src/feeds/adapters/news/rss.adapter.ts` | RSS feed adapter |
| `apps/api/src/feeds/adapters/news/gdelt.adapter.ts` | GDELT adapter |
| `apps/api/src/lib/content-extractor.ts` | Article content extraction |
| `apps/api/src/feeds/services/entity-extractor.ts` | Entity extraction (NER) |
| `apps/api/src/feeds/services/sentiment.ts` | Sentiment analysis |
| `apps/api/src/feeds/services/topic-classifier.ts` | Topic classification |
| `apps/api/src/feeds/services/deduplication.ts` | Article deduplication |
| `apps/api/src/feeds/services/credibility.ts` | Source credibility scoring |
| `apps/api/src/jobs/workers/news.worker.ts` | News ingestion worker |
| `apps/web/src/features/feeds/components/news-feed-config.tsx` | News feed configuration UI |

---

## Acceptance Criteria

- [ ] NewsAPI adapter fetches articles with keyword filtering
- [ ] RSS adapter parses multiple feed URLs
- [ ] GDELT adapter queries DOC API with date range
- [ ] Content extractor handles various HTML formats
- [ ] Entity extraction identifies people, organizations, locations
- [ ] Sentiment analysis returns score -1 to 1
- [ ] Topic classifier identifies relevant categories
- [ ] Deduplication prevents duplicate articles
- [ ] Credibility scoring assigns proper tiers to sources
- [ ] News worker enriches and queues articles correctly
- [ ] News feed configuration UI allows creating/editing feeds for NewsAPI, RSS, and GDELT
- [ ] Enrichment options can be toggled per feed

---

## Dependencies

```bash
cd apps/api
pnpm add rss-parser @mozilla/readability jsdom
pnpm add -D @types/jsdom
```

---

## Environment Variables

```bash
# News APIs
NEWSAPI_KEY=your_newsapi_key
GDELT_MODE=doc  # or 'gkg'
```
