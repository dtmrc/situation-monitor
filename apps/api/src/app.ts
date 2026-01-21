import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { compress } from 'hono/compress';

import { errorHandler } from './middleware/errorHandler';
import { correlationMiddleware } from './middleware/correlation';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import { apiRateLimiter } from './middleware/rateLimit';
import { routes, health } from './routes';
import type { AppEnv } from './types';

export function createApp() {
  const app = new Hono<AppEnv>();

  // Global middleware (order matters)
  // 1. Correlation ID for request tracing
  app.use('*', correlationMiddleware);

  // 2. Request logging
  app.use('*', requestLoggerMiddleware);

  // 3. Security headers
  app.use('*', secureHeaders());

  // 4. Response compression
  app.use('*', compress());

  // 5. CORS configuration
  app.use(
    '/api/*',
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
      exposeHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    })
  );

  // 6. Rate limiting for API routes
  app.use('/api/*', apiRateLimiter);

  // Error handling
  app.onError(errorHandler);

  // Health check routes (no auth, no rate limit)
  app.route('/api/health', health);

  // Simple health check (backwards compatibility)
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.0.1',
    });
  });

  // Mount API routes
  app.route('/api', routes);

  // 404 handler
  app.notFound((c) => {
    return c.json(
      {
        error: {
          message: 'Not found',
          code: 'NOT_FOUND',
        },
      },
      404
    );
  });

  return app;
}
