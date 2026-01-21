import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { AppError } from '../lib/errors';

export function errorHandler(error: Error, c: Context) {
  console.error('Error:', error);

  if (error instanceof AppError) {
    return c.json(
      {
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      },
      error.statusCode as ContentfulStatusCode
    );
  }

  // JWT errors
  if (error.name === 'JwtTokenExpired') {
    return c.json(
      {
        error: {
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
        },
      },
      401
    );
  }

  if (error.name === 'JwtTokenInvalid' || error.name === 'JwtTokenSignatureMismatched') {
    return c.json(
      {
        error: {
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
        },
      },
      401
    );
  }

  // Unexpected error
  return c.json(
    {
      error: {
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
        code: 'INTERNAL_ERROR',
      },
    },
    500
  );
}
