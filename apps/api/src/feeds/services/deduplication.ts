/**
 * Article Deduplication Service
 *
 * Detects and prevents duplicate articles using:
 * - Exact URL matching
 * - Title similarity (normalized)
 * - Content fingerprinting (simhash-style)
 *
 * Uses in-memory cache for fast lookups with TTL expiration.
 * For production scale, consider Redis-backed storage.
 */

import crypto from 'crypto';

/**
 * Deduplication check result
 */
export interface DeduplicationResult {
  /** Whether the article is a duplicate */
  isDuplicate: boolean;
  /** ID of the original article if duplicate */
  originalId?: string;
  /** Similarity score (0-1) */
  similarity?: number;
  /** How the duplicate was detected */
  matchType?: 'url' | 'title' | 'content';
}

/**
 * Cached article entry
 */
interface ArticleEntry {
  id: string;
  timestamp: Date;
  urlHash: string;
  titleHash: string;
  contentFingerprint: string;
}

// In-memory cache with TTL (use Redis for production scale)
const articleCache = new Map<string, ArticleEntry>();

// Default TTL: 24 hours
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

// Cleanup interval: every hour
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the cleanup interval
 */
export function startDeduplicationCleanup(intervalMs: number = 60 * 60 * 1000): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    cleanupExpiredEntries();
  }, intervalMs);
}

/**
 * Stop the cleanup interval
 */
export function stopDeduplicationCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Clean up expired entries from cache
 */
function cleanupExpiredEntries(ttlMs: number = DEFAULT_TTL_MS): number {
  const now = new Date();
  let removed = 0;

  for (const [key, entry] of articleCache) {
    if (now.getTime() - entry.timestamp.getTime() > ttlMs) {
      articleCache.delete(key);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`[Dedup] Cleaned up ${removed} expired entries`);
  }

  return removed;
}

/**
 * Check if an article is a duplicate
 *
 * @param articleId - Unique ID for this article
 * @param title - Article title
 * @param url - Article URL
 * @param content - Article content (optional, for content-based dedup)
 * @param ttlMs - Cache TTL in milliseconds
 * @returns Deduplication result
 */
export function checkDuplicate(
  articleId: string,
  title: string,
  url: string,
  content?: string,
  ttlMs: number = DEFAULT_TTL_MS
): DeduplicationResult {
  const now = new Date();

  // Generate hashes
  const urlHash = hashString(normalizeUrl(url));
  const titleHash = hashString(normalizeTitle(title));
  const contentFingerprint = content ? generateFingerprint(content) : '';

  // 1. Check exact URL match (highest confidence)
  const urlEntry = articleCache.get(`url:${urlHash}`);
  if (urlEntry && now.getTime() - urlEntry.timestamp.getTime() < ttlMs) {
    return {
      isDuplicate: true,
      originalId: urlEntry.id,
      similarity: 1.0,
      matchType: 'url',
    };
  }

  // 2. Check title similarity (high confidence)
  const titleEntry = articleCache.get(`title:${titleHash}`);
  if (titleEntry && now.getTime() - titleEntry.timestamp.getTime() < ttlMs) {
    return {
      isDuplicate: true,
      originalId: titleEntry.id,
      similarity: 0.95,
      matchType: 'title',
    };
  }

  // 3. Check content fingerprint if available (medium confidence)
  if (contentFingerprint) {
    for (const [key, entry] of articleCache) {
      if (!key.startsWith('url:') && !key.startsWith('title:')) continue;
      if (now.getTime() - entry.timestamp.getTime() > ttlMs) continue;

      if (entry.contentFingerprint && entry.contentFingerprint === contentFingerprint) {
        return {
          isDuplicate: true,
          originalId: entry.id,
          similarity: 0.9,
          matchType: 'content',
        };
      }
    }
  }

  // Not a duplicate - add to cache
  const entry: ArticleEntry = {
    id: articleId,
    timestamp: now,
    urlHash,
    titleHash,
    contentFingerprint,
  };

  articleCache.set(`url:${urlHash}`, entry);
  articleCache.set(`title:${titleHash}`, entry);

  return { isDuplicate: false };
}

/**
 * Check multiple articles at once
 */
export function checkDuplicateBatch(
  articles: Array<{ id: string; title: string; url: string; content?: string }>
): Map<string, DeduplicationResult> {
  const results = new Map<string, DeduplicationResult>();

  for (const article of articles) {
    results.set(
      article.id,
      checkDuplicate(article.id, article.title, article.url, article.content)
    );
  }

  return results;
}

/**
 * Add an article to the dedup cache without checking
 * Useful when importing existing articles
 */
export function addToCache(
  articleId: string,
  title: string,
  url: string,
  content?: string,
  timestamp?: Date
): void {
  const urlHash = hashString(normalizeUrl(url));
  const titleHash = hashString(normalizeTitle(title));
  const contentFingerprint = content ? generateFingerprint(content) : '';

  const entry: ArticleEntry = {
    id: articleId,
    timestamp: timestamp || new Date(),
    urlHash,
    titleHash,
    contentFingerprint,
  };

  articleCache.set(`url:${urlHash}`, entry);
  articleCache.set(`title:${titleHash}`, entry);
}

/**
 * Clear the deduplication cache
 */
export function clearCache(): void {
  articleCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  entries: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
} {
  let oldest: Date | null = null;
  let newest: Date | null = null;
  const uniqueIds = new Set<string>();

  for (const entry of articleCache.values()) {
    uniqueIds.add(entry.id);

    if (!oldest || entry.timestamp < oldest) {
      oldest = entry.timestamp;
    }
    if (!newest || entry.timestamp > newest) {
      newest = entry.timestamp;
    }
  }

  return {
    entries: uniqueIds.size,
    oldestEntry: oldest,
    newestEntry: newest,
  };
}

/**
 * Hash a string using MD5
 */
function hashString(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Normalize URL for comparison
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove tracking parameters
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'ref',
      'source',
      'fbclid',
      'gclid',
    ];
    trackingParams.forEach((param) => parsed.searchParams.delete(param));

    // Normalize hostname (remove www)
    const hostname = parsed.hostname.replace(/^www\./, '');

    // Return normalized URL
    return `${hostname}${parsed.pathname}${parsed.search}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Normalize title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
    .split(' ')
    .slice(0, 10) // Use first 10 words
    .join(' ');
}

/**
 * Generate a content fingerprint using simhash-style approach
 * This is a simplified version - production might use MinHash or SimHash
 */
function generateFingerprint(content: string): string {
  // Normalize content
  const normalized = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract significant words (skip very common words)
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'need',
    'dare',
    'ought',
    'used',
    'to',
    'of',
    'in',
    'for',
    'on',
    'with',
    'at',
    'by',
    'from',
    'as',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'between',
    'under',
    'again',
    'further',
    'then',
    'once',
    'here',
    'there',
    'when',
    'where',
    'why',
    'how',
    'all',
    'each',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'nor',
    'not',
    'only',
    'own',
    'same',
    'so',
    'than',
    'too',
    'very',
    'just',
    'and',
    'but',
    'if',
    'or',
    'because',
    'until',
    'while',
    'although',
    'this',
    'that',
    'these',
    'those',
    'it',
    'its',
    'he',
    'she',
    'they',
    'them',
    'his',
    'her',
    'their',
    'what',
    'which',
    'who',
    'whom',
    'said',
    'says',
  ]);

  const words = normalized
    .split(' ')
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .slice(0, 50); // Use first 50 significant words

  // Create a sorted set of word hashes
  const wordHashes = words
    .map((w) => hashString(w).slice(0, 8))
    .sort()
    .join('');

  // Hash the combined result
  return hashString(wordHashes);
}
