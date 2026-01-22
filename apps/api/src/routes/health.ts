import { Hono } from 'hono';

import { checkDatabaseHealth } from '../db';
import { circuitBreakers } from '../lib/circuitBreaker';
import { checkRedisHealth } from '../lib/redis';

const health = new Hono();

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: string;
      latencyMs: number;
      poolSize?: number;
      idleCount?: number;
    };
    redis: {
      status: string;
      latencyMs: number;
    };
    external: Record<
      string,
      {
        status: string;
        circuit: string;
        failures: number;
      }
    >;
  };
}

// Simple liveness probe
health.get('/live', (c) => {
  return c.json({ status: 'ok' });
});

// Readiness probe (can accept traffic)
health.get('/ready', async (c) => {
  try {
    // Quick DB check
    const dbHealth = await checkDatabaseHealth();

    if (dbHealth.status === 'unhealthy') {
      return c.json({ status: 'not ready', reason: 'database' }, 503);
    }

    return c.json({ status: 'ready' });
  } catch {
    return c.json({ status: 'not ready' }, 503);
  }
});

// Detailed health check
health.get('/', async (c) => {
  // Check database
  const dbHealth = await checkDatabaseHealth();

  // Check Redis
  const redisHealth = await checkRedisHealth();

  // Check circuit breakers
  const externalHealth: Record<string, { status: string; circuit: string; failures: number }> = {};
  for (const [name, breaker] of Object.entries(circuitBreakers)) {
    const stats = breaker.getStats();
    externalHealth[name] = {
      status: stats.state === 'closed' ? 'healthy' : stats.state,
      circuit: stats.state,
      failures: stats.failures,
    };
  }

  // Determine overall status
  const isDbHealthy = dbHealth.status !== 'unhealthy';
  const isRedisHealthy = redisHealth.status === 'healthy';
  const hasOpenCircuits = Object.values(circuitBreakers).some((b) => b.getStats().state === 'open');

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (!isDbHealthy) {
    overallStatus = 'unhealthy';
  } else if (!isRedisHealthy || hasOpenCircuits) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.0.1',
    uptime: process.uptime(),
    checks: {
      database: {
        status: dbHealth.status,
        latencyMs: dbHealth.latencyMs,
      },
      redis: redisHealth,
      external: externalHealth,
    },
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
  return c.json(result, statusCode);
});

export { health };
