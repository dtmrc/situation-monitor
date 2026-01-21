import 'dotenv/config';
import { serve } from '@hono/node-server';

import { createApp } from './app';
import { closeDatabase } from './db';
import { shutdownRedis, redis } from './lib/redis';

const app = createApp();
const PORT = parseInt(process.env.PORT || '4000', 10);

let isShuttingDown = false;
let server: ReturnType<typeof serve>;

async function startServer() {
  // Connect to Redis
  try {
    await redis.connect();
  } catch (error) {
    console.warn('[Redis] Connection failed, continuing without Redis:', error);
  }

  // Start HTTP server
  server = serve({
    fetch: app.fetch,
    port: PORT,
  });

  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    console.log('[Shutdown] Already in progress...');
    return;
  }

  isShuttingDown = true;
  console.log(`\n[Shutdown] ${signal} received. Starting graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    console.error('[Shutdown] Timed out after 30s, forcing exit');
    process.exit(1);
  }, 30000);

  try {
    // 1. Stop accepting new connections
    console.log('[Shutdown] Closing HTTP server...');
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 2. Wait briefly for in-flight requests
    console.log('[Shutdown] Waiting for in-flight requests...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. Close database connections
    console.log('[Shutdown] Closing database connections...');
    await closeDatabase();

    // 4. Close Redis connections
    console.log('[Shutdown] Closing Redis connections...');
    await shutdownRedis();

    clearTimeout(shutdownTimeout);
    console.log('[Shutdown] Complete');
    process.exit(0);
  } catch (error) {
    console.error('[Shutdown] Error:', error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Error] Uncaught exception:', error);
  void gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('[Error] Unhandled rejection:', reason);
});

// Start the server
startServer().catch((error) => {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
});

export { app };
