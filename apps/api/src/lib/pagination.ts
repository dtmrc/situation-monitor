import { gt, lt, type SQL } from 'drizzle-orm';
import { z } from 'zod';

import type { PaginatedResult } from '../types';

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

export type CursorPagination = z.infer<typeof cursorPaginationSchema>;

interface CursorData {
  id: string;
  createdAt: string;
}

/**
 * Decode cursor from base64
 */
export function decodeCursor(cursor: string): CursorData {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64').toString());
    const data = parsed as CursorData;
    if (!data.id || !data.createdAt) {
      throw new Error('Invalid cursor data');
    }
    return data;
  } catch {
    throw new Error('Invalid cursor format');
  }
}

/**
 * Encode cursor to base64
 */
export function encodeCursor<T extends { id: string; createdAt: Date }>(item: T): string {
  return Buffer.from(
    JSON.stringify({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
    })
  ).toString('base64');
}

/**
 * Create cursor condition for query
 * Assumes cursor is the ID field (UUID, sorted by createdAt desc)
 */
export function cursorCondition<T extends { id: unknown; createdAt: unknown }>(
  table: T,
  cursor: string | undefined,
  direction: 'forward' | 'backward'
): SQL | undefined {
  if (!cursor) return undefined;

  const decoded = decodeCursor(cursor);
  const cursorDate = new Date(decoded.createdAt);

  if (direction === 'forward') {
    return lt(table.createdAt as SQL, cursorDate);
  } else {
    return gt(table.createdAt as SQL, cursorDate);
  }
}

/**
 * Build paginated response
 */
export function paginatedResponse<T extends { id: string; createdAt: Date }>(
  items: T[],
  limit: number
): PaginatedResult<T> {
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;

  const firstItem = resultItems[0];
  const lastItem = resultItems[resultItems.length - 1];

  return {
    items: resultItems,
    nextCursor: lastItem ? encodeCursor(lastItem) : null,
    prevCursor: firstItem ? encodeCursor(firstItem) : null,
    hasMore,
  };
}

/**
 * Offset-based pagination schema (simpler alternative)
 */
export const offsetPaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type OffsetPagination = z.infer<typeof offsetPaginationSchema>;

/**
 * Build offset-paginated response
 */
export function offsetPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
} {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
}
