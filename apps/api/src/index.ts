import 'dotenv/config';
import type { Server } from 'http';

import { serve } from '@hono/node-server';

import { createApp } from './app';
import { closeDatabase } from './db';
import { registerAllAdapters } from './feeds/adapters';
import { syncFeedSchedules, stopAllFeeds } from './feeds/scheduler';
import { startWorkers, shutdownWorkers } from './jobs/shutdown';
import { shutdownRedis, redis } from './lib/redis';
import { createWebSocketRoutes, shutdownWebSockets } from './websocket';

const app = createApp();
const PORT = parseInt(process.env.PORT || '4000', 10);
const ENABLE_WORKERS = process.env.ENABLE_WORKERS !== 'false';

let isShuttingDown = false;
let server: ReturnType<typeof serve>;

async function startServer() {
  // Connect to Redis
  try {
    await redis.connect();
  } catch (error) {
    console.warn('[Redis] Connection failed, continuing without Redis:', error);
  }

  // Create WebSocket routes
  const { wsApp, injectWebSocket } = createWebSocketRoutes();

  // Mount WebSocket routes
  app.route('/api/ws', wsApp);

  // Start HTTP server with WebSocket support
  server = serve(
    {
      fetch: app.fetch,
      port: PORT,
    },
    () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
    }
  );

  // Inject WebSocket handling into the server
  // Note: server is the HTTP server returned by serve()
  injectWebSocket(server as unknown as Server);

  console.log(`[Server] WebSocket available at ws://localhost:${PORT}/api/ws/map/:projectId`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);

  // Register all feed adapters
  registerAllAdapters();

  // Start workers if enabled
  if (ENABLE_WORKERS) {
    console.log('[Server] Starting background workers...');
    await startWorkers();

    // Sync feed schedules with database
    console.log('[Server] Syncing feed schedules...');
    await syncFeedSchedules();
  } else {
    console.log('[Server] Workers disabled (ENABLE_WORKERS=false)');
  }
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
    // 1. Stop feed schedulers (no new jobs)
    console.log('[Shutdown] Stopping feed schedulers...');
    await stopAllFeeds();

    // 2. Stop accepting new HTTP connections
    console.log('[Shutdown] Closing HTTP server...');
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 3. Shutdown WebSocket connections
    console.log('[Shutdown] Closing WebSocket connections...');
    await shutdownWebSockets();

    // 4. Shutdown workers
    if (ENABLE_WORKERS) {
      console.log('[Shutdown] Stopping workers...');
      await shutdownWorkers();
    }

    // 5. Wait briefly for in-flight requests
    console.log('[Shutdown] Waiting for in-flight requests...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 6. Close database connections
    console.log('[Shutdown] Closing database connections...');
    await closeDatabase();

    // 7. Close Redis connections
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
