import { redis } from './redis';

interface CacheOptions {
  ttl?: number; // TTL in seconds
  prefix?: string; // Key prefix
  serialize?: boolean; // JSON serialize (default true)
}

const DEFAULT_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'cache:';

/**
 * Get from cache or fetch and cache
 */
export async function cacheGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = DEFAULT_TTL, prefix = CACHE_PREFIX, serialize = true } = options;
  const cacheKey = `${prefix}${key}`;

  // Try cache first
  const cached = await redis.get(cacheKey);

  if (cached !== null) {
    return serialize ? (JSON.parse(cached) as T) : (cached as T);
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache the result
  const value = serialize ? JSON.stringify(data) : (data as string);
  await redis.setex(cacheKey, ttl, value);

  return data;
}

/**
 * Invalidate cache by key or pattern
 */
export async function cacheInvalidate(pattern: string): Promise<number> {
  const keys = await redis.keys(`${CACHE_PREFIX}${pattern}`);

  if (keys.length === 0) return 0;

  return redis.del(...keys);
}

/**
 * Invalidate specific key
 */
export async function cacheDelete(key: string): Promise<void> {
  await redis.del(`${CACHE_PREFIX}${key}`);
}

/**
 * Set cache value directly
 */
export async function cacheSet<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
  const { ttl = DEFAULT_TTL, prefix = CACHE_PREFIX, serialize = true } = options;
  const cacheKey = `${prefix}${key}`;
  const data = serialize ? JSON.stringify(value) : (value as string);

  await redis.setex(cacheKey, ttl, data);
}

// Common cache key helpers
export const cacheKeys = {
  user: (id: string) => `user:${id}`,
  project: (id: string) => `project:${id}`,
  projectList: (userId: string) => `projects:${userId}`,
  assessment: (id: string) => `assessment:${id}`,
  factors: (assessmentId: string) => `factors:${assessmentId}`,
};
