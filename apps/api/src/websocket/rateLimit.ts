/**
 * WebSocket Rate Limiting
 *
 * Implements rate limiting for WebSocket connections and messages.
 * Uses a sliding window approach with Redis for distributed state.
 */

import { redis } from '../lib/redis';

// Rate limit configuration
export interface RateLimitConfig {
  /** Maximum connections per IP */
  maxConnectionsPerIp: number;
  /** Maximum messages per second per connection */
  maxMessagesPerSecond: number;
  /** Maximum messages per minute per connection */
  maxMessagesPerMinute: number;
  /** Window size for connection tracking (ms) */
  connectionWindow: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxConnectionsPerIp: 5, // 5 connections per IP
  maxMessagesPerSecond: 10, // 10 messages per second
  maxMessagesPerMinute: 120, // 120 messages per minute
  connectionWindow: 60000, // 1 minute window
};

// In-memory fallback when Redis is unavailable
const localRateLimits = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if a new connection is allowed from this IP
 */
export async function checkConnectionLimit(
  ip: string,
  config: Partial<RateLimitConfig> = {}
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const { maxConnectionsPerIp, connectionWindow } = { ...DEFAULT_CONFIG, ...config };
  const key = `ws:conn:${ip}`;

  try {
    const now = Date.now();
    const windowStart = now - connectionWindow;

    // Use Redis sorted set for sliding window
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.pexpire(key, connectionWindow);

    const results = await pipeline.exec();
    const count = (results?.[2]?.[1] as number) || 0;

    return {
      allowed: count <= maxConnectionsPerIp,
      current: count,
      limit: maxConnectionsPerIp,
    };
  } catch {
    // Fallback to local rate limiting
    return checkLocalConnectionLimit(ip, maxConnectionsPerIp, connectionWindow);
  }
}

/**
 * Local fallback for connection rate limiting
 */
function checkLocalConnectionLimit(
  ip: string,
  limit: number,
  window: number
): { allowed: boolean; current: number; limit: number } {
  const key = `conn:${ip}`;
  const now = Date.now();
  const entry = localRateLimits.get(key);

  if (!entry || entry.resetAt < now) {
    localRateLimits.set(key, { count: 1, resetAt: now + window });
    return { allowed: true, current: 1, limit };
  }

  entry.count++;
  return {
    allowed: entry.count <= limit,
    current: entry.count,
    limit,
  };
}

/**
 * Remove a connection from tracking (on disconnect)
 */
export async function removeConnection(ip: string): Promise<void> {
  const key = `ws:conn:${ip}`;

  try {
    // Remove oldest entry
    await redis.zpopmin(key);
  } catch {
    // Ignore errors on cleanup
  }
}

/**
 * Per-connection message rate limiter
 */
export class MessageRateLimiter {
  private readonly connectionId: string;
  private readonly config: RateLimitConfig;
  private messagesThisSecond = 0;
  private messagesThisMinute = 0;
  private secondResetAt = 0;
  private minuteResetAt = 0;

  constructor(connectionId: string, config: Partial<RateLimitConfig> = {}) {
    this.connectionId = connectionId;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if a message is allowed
   */
  checkMessage(): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();

    // Reset second counter
    if (now >= this.secondResetAt) {
      this.messagesThisSecond = 0;
      this.secondResetAt = now + 1000;
    }

    // Reset minute counter
    if (now >= this.minuteResetAt) {
      this.messagesThisMinute = 0;
      this.minuteResetAt = now + 60000;
    }

    // Check per-second limit
    if (this.messagesThisSecond >= this.config.maxMessagesPerSecond) {
      return {
        allowed: false,
        retryAfter: Math.ceil((this.secondResetAt - now) / 1000),
      };
    }

    // Check per-minute limit
    if (this.messagesThisMinute >= this.config.maxMessagesPerMinute) {
      return {
        allowed: false,
        retryAfter: Math.ceil((this.minuteResetAt - now) / 1000),
      };
    }

    // Increment counters
    this.messagesThisSecond++;
    this.messagesThisMinute++;

    return { allowed: true };
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    messagesThisSecond: number;
    messagesThisMinute: number;
    limits: { perSecond: number; perMinute: number };
  } {
    return {
      messagesThisSecond: this.messagesThisSecond,
      messagesThisMinute: this.messagesThisMinute,
      limits: {
        perSecond: this.config.maxMessagesPerSecond,
        perMinute: this.config.maxMessagesPerMinute,
      },
    };
  }
}

/**
 * Clean up stale local rate limit entries
 */
export function cleanupLocalRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of localRateLimits.entries()) {
    if (entry.resetAt < now) {
      localRateLimits.delete(key);
    }
  }
}

// Periodic cleanup of local rate limits
setInterval(cleanupLocalRateLimits, 60000);
