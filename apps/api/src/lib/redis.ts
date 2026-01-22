import Redis, { type RedisOptions } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const baseOptions: RedisOptions = {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
  enableReadyCheck: true,
};

// Main connection for commands
export const redis = new Redis(REDIS_URL, {
  ...baseOptions,
  connectionName: 'main',
});

// Subscriber connection for pub/sub (pub/sub requires dedicated connection)
export const redisSub = new Redis(REDIS_URL, {
  ...baseOptions,
  connectionName: 'subscriber',
});

// Publisher connection for pub/sub
export const redisPub = new Redis(REDIS_URL, {
  ...baseOptions,
  connectionName: 'publisher',
});

// Track active connections for graceful shutdown
const connections: Redis[] = [redis, redisSub, redisPub];

// Factory for creating additional connections (e.g., for BullMQ)
export function createRedisConnection(name?: string): Redis {
  const conn = new Redis(REDIS_URL, {
    ...baseOptions,
    connectionName: name ?? `connection-${connections.length}`,
  });
  connections.push(conn);
  return conn;
}

// Connection logging for main connection
redis.on('connect', () => {
  console.log('[Redis:main] Connected');
});

redis.on('error', (err) => {
  console.error('[Redis:main] Error:', err.message);
});

redis.on('close', () => {
  console.log('[Redis:main] Connection closed');
});

// Connection logging for subscriber
redisSub.on('connect', () => {
  console.log('[Redis:subscriber] Connected');
});

redisSub.on('error', (err) => {
  console.error('[Redis:subscriber] Error:', err.message);
});

// Connection logging for publisher
redisPub.on('connect', () => {
  console.log('[Redis:publisher] Connected');
});

redisPub.on('error', (err) => {
  console.error('[Redis:publisher] Error:', err.message);
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
  console.log(`[Redis] Closing ${connections.length} connections...`);

  // Gracefully close all connections
  await Promise.all(
    connections.map(async (conn) => {
      try {
        await conn.quit();
      } catch (err) {
        // Force disconnect if quit fails
        conn.disconnect();
      }
    })
  );

  console.log('[Redis] All connections closed');
}
