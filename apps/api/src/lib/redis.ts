import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

redis.on('error', (err) => {
  console.error('[Redis] Error:', err.message);
});

redis.on('close', () => {
  console.log('[Redis] Connection closed');
});

export async function checkRedisHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
}> {
  const start = Date.now();
  try {
    await redis.ping();
    return {
      status: 'healthy',
      latencyMs: Date.now() - start,
    };
  } catch {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
    };
  }
}

export async function shutdownRedis(): Promise<void> {
  await redis.quit();
  console.log('[Redis] Disconnected');
}
