import type { Context } from 'hono';

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  role: string;
  orgId?: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

export interface AppEnv {
  Variables: {
    user: JWTPayload;
    requestId: string;
    validatedBody?: unknown;
    validatedQuery?: unknown;
    validatedParams?: unknown;
    csrfToken?: string;
  };
}

export type AppContext = Context<AppEnv>;

export type Role = 'owner' | 'admin' | 'analyst' | 'viewer';

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}
