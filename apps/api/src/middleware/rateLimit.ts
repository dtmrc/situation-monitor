import { createMiddleware } from 'hono/factory';

import { redis } from '../lib/redis';
import type { AppEnv } from '../types';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyPrefix: 'rl:',
};

// Per-route rate limit configurations
export const rateLimitConfigs = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 min
  register: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 per hour
  api: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 per minute
  ai: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 AI calls per minute
} as const;

// In-memory fallback for when Redis is unavailable
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const { windowMs, maxRequests, keyPrefix } = { ...defaultConfig, ...config };

  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user');
    const clientId =
      user?.sub || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'anonymous';

    const key = `${keyPrefix}${clientId}`;
    const now = Date.now();

    let requestCount = 0;

    try {
      // Try Redis-backed rate limiting (sliding window using sorted set)
      const windowStart = now - windowMs;

      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      pipeline.zcard(key);
      pipeline.pexpire(key, windowMs);

      const results = await pipeline.exec();
      requestCount = (results?.[2]?.[1] as number) || 0;
    } catch {
      // Fallback to in-memory rate limiting
      const record = memoryStore.get(key);

      if (!record || now > record.resetAt) {
        memoryStore.set(key, { count: 1, resetAt: now + windowMs });
        requestCount = 1;
      } else {
        record.count++;
        requestCount = record.count;
      }
    }

    // Set rate limit headers
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, maxRequests - requestCount).toString());
    c.header('X-RateLimit-Reset', (now + windowMs).toString());

    if (requestCount > maxRequests) {
      c.header('Retry-After', Math.ceil(windowMs / 1000).toString());
      return c.json({ error: { message: 'Too many requests', code: 'RATE_LIMITED' } }, 429);
    }

    return next();
  });
}

// Convenience middleware for common routes
export const authRateLimiter = createRateLimiter(rateLimitConfigs.auth);
export const registerRateLimiter = createRateLimiter(rateLimitConfigs.register);
export const apiRateLimiter = createRateLimiter(rateLimitConfigs.api);
export const aiRateLimiter = createRateLimiter(rateLimitConfigs.ai);
