import { createMiddleware } from 'hono/factory';

import { ForbiddenError } from '../lib/errors';
import type { AppEnv, Role } from '../types';

const roleHierarchy: Record<Role, number> = {
  owner: 4,
  admin: 3,
  analyst: 2,
  viewer: 1,
};

export function requireRole(...allowedRoles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user');

    if (!user) {
      throw new ForbiddenError('Authentication required');
    }

    const userRole = user.role as Role;
    const userLevel = roleHierarchy[userRole] || 0;

    const hasPermission = allowedRoles.some((role) => userLevel >= roleHierarchy[role]);

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions');
    }

    await next();
  });
}

// Shorthand middleware for common role requirements
export const requireOwner = requireRole('owner');
export const requireAdmin = requireRole('admin', 'owner');
export const requireAnalyst = requireRole('analyst', 'admin', 'owner');
export const requireViewer = requireRole('viewer', 'analyst', 'admin', 'owner');
