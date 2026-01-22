import { createMiddleware } from 'hono/factory';
import type { ZodType, ZodTypeDef } from 'zod';
import { ZodError } from 'zod';

import { ValidationError } from '../lib/errors';

export function validateBody<Output, Def extends ZodTypeDef, Input>(
  schema: ZodType<Output, Def, Input>
) {
  return createMiddleware(async (c, next) => {
    try {
      const body: unknown = await c.req.json();
      const validated = schema.parse(body);
      c.set('validatedBody' as never, validated as never);
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid request body', error.errors);
      }
      throw error;
    }
  });
}

export function validateQuery<Output, Def extends ZodTypeDef, Input>(
  schema: ZodType<Output, Def, Input>
) {
  return createMiddleware(async (c, next) => {
    try {
      const query: unknown = c.req.query();
      const validated = schema.parse(query);
      c.set('validatedQuery' as never, validated as never);
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid query parameters', error.errors);
      }
      throw error;
    }
  });
}

export function validateParams<Output, Def extends ZodTypeDef, Input>(
  schema: ZodType<Output, Def, Input>
) {
  return createMiddleware(async (c, next) => {
    try {
      const params: unknown = c.req.param();
      const validated = schema.parse(params);
      c.set('validatedParams' as never, validated as never);
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid path parameters', error.errors);
      }
      throw error;
    }
  });
}
