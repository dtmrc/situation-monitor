import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Connection pool configuration
const poolConfig = {
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idle_timeout: 30, // Close idle connections after 30s
  connect_timeout: 5, // Fail if can't connect in 5s
};

// For query purposes (pooled)
const queryClient = postgres(connectionString, poolConfig);
export const db = drizzle(queryClient, { schema });

// For migrations (single connection)
export const migrationClient = postgres(connectionString, { max: 1 });

// Health check function
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
}> {
  const start = Date.now();

  try {
    await queryClient`SELECT 1`;
    const latencyMs = Date.now() - start;

    return {
      status: latencyMs < 100 ? 'healthy' : 'degraded',
      latencyMs,
    };
  } catch (error) {
    console.error('[DB] Health check failed:', error);
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
    };
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  try {
    await queryClient.end();
    console.log('[DB] Connection pool closed');
  } catch (error) {
    console.error('[DB] Error closing connection pool:', error);
  }
}
