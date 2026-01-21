import type { SQL } from 'drizzle-orm';
import { and, eq, isNull } from 'drizzle-orm';

/**
 * Creates a tenant filter condition for queries
 * Filters by organizationId and excludes soft-deleted records
 */
export function tenantFilter<T extends { organizationId: unknown; deletedAt?: unknown }>(
  table: T,
  organizationId: string
): SQL {
  const conditions = [eq(table.organizationId as never, organizationId)];

  if ('deletedAt' in table) {
    conditions.push(isNull(table.deletedAt as never));
  }

  return and(...conditions)!;
}

/**
 * Soft delete helper - sets deletedAt instead of hard delete
 */
export function softDeleteValues() {
  return {
    deletedAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Creates a filter for non-deleted records
 */
export function notDeleted<T extends { deletedAt?: unknown }>(table: T): SQL {
  return isNull(table.deletedAt as never);
}

/**
 * Creates a filter for active records in a project
 */
export function projectFilter<T extends { projectId: unknown; deletedAt?: unknown }>(
  table: T,
  projectId: string
): SQL {
  const conditions = [eq(table.projectId as never, projectId)];

  if ('deletedAt' in table) {
    conditions.push(isNull(table.deletedAt as never));
  }

  return and(...conditions)!;
}
