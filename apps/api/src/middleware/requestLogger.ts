import { createMiddleware } from 'hono/factory';

import { log } from '../lib/logger';

export const requestLoggerMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now();

  await next();

  const duration = Date.now() - start;
  const { method } = c.req;
  const path = c.req.path;
  const status = c.res.status;

  log.request(method, path, status, duration);
});
