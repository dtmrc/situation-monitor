import { createMiddleware } from 'hono/factory';

import { UnauthorizedError } from '../lib/errors';
import { verifyAccessToken } from '../lib/jwt';
import type { AppEnv } from '../types';

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyAccessToken(token);
    c.set('user', payload);
    await next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
});

// Optional auth - sets user if token present, continues otherwise
export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = await verifyAccessToken(token);
      c.set('user', payload);
    } catch {
      // Token invalid, continue without user
    }
  }

  await next();
});
