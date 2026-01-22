import { randomBytes, timingSafeEqual } from 'crypto';

import { getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';

import { ForbiddenError } from '../lib/errors';
import type { AppEnv } from '../types';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const TOKEN_LENGTH = 32;

export const csrfProtection = createMiddleware<AppEnv>(async (c, next) => {
  // Skip for safe methods
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(c.req.method);

  // Generate or retrieve CSRF token
  let token = getCookie(c, CSRF_COOKIE);

  if (!token) {
    token = randomBytes(TOKEN_LENGTH).toString('hex');
    setCookie(c, CSRF_COOKIE, token, {
      httpOnly: false, // JS needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
  }

  // For unsafe methods, verify token
  if (!safeMethod) {
    const headerToken = c.req.header(CSRF_HEADER);

    if (!headerToken) {
      throw new ForbiddenError('CSRF token missing');
    }

    // Timing-safe comparison to prevent timing attacks
    const tokenBuffer = Buffer.from(token);
    const headerBuffer = Buffer.from(headerToken);

    if (tokenBuffer.length !== headerBuffer.length || !timingSafeEqual(tokenBuffer, headerBuffer)) {
      throw new ForbiddenError('CSRF token invalid');
    }
  }

  // Make token available for response
  c.set('csrfToken', token);

  await next();
});

// Endpoint to get CSRF token for SPA
export function csrfTokenHandler(c: {
  get: (key: string) => string;
  json: (data: unknown) => Response;
}) {
  const token = c.get('csrfToken');
  return c.json({ csrfToken: token });
}
