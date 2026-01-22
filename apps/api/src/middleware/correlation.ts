import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

import { createMiddleware } from 'hono/factory';

// AsyncLocalStorage for request context
export const requestContext = new AsyncLocalStorage<{
  requestId: string;
  userId?: string;
  startTime: number;
}>();

const REQUEST_ID_HEADER = 'x-request-id';

export const correlationMiddleware = createMiddleware(async (c, next) => {
  // Use existing request ID or generate new one
  const requestId = c.req.header(REQUEST_ID_HEADER) || randomUUID();
  const startTime = Date.now();

  // Set in response header
  c.header(REQUEST_ID_HEADER, requestId);

  // Run in async context
  await requestContext.run({ requestId, startTime }, async () => {
    c.set('requestId', requestId);
    await next();
  });
});

// Helper to get current request context
export function getRequestContext() {
  return requestContext.getStore();
}

// Helper to get request ID for logging
export function getRequestId(): string {
  return requestContext.getStore()?.requestId || 'unknown';
}
