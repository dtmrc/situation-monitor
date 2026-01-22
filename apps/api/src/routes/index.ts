import { Hono } from 'hono';

import { assessmentRoutes } from './assessments';
import { auth } from './auth';
import { feedRoutes } from './feeds';
import { health } from './health';
import { orgRoutes } from './organizations';
import { pmesiiRoutes } from './pmesii';
import { projectRoutes } from './projects';

// Version 1 API routes
const v1 = new Hono();

// Auth routes (some public)
v1.route('/auth', auth);

// Protected routes
v1.route('/projects', projectRoutes);
v1.route('/', assessmentRoutes); // Nested under projects for list, flat for single
v1.route('/', pmesiiRoutes); // Factor routes
v1.route('/organizations', orgRoutes);
v1.route('/feeds', feedRoutes); // Feed management routes

// Main router with versioning
const routes = new Hono();

// Versioned routes
routes.route('/v1', v1);

// Legacy routes (deprecated, redirect to v1)
routes.use('/*', async (c, next) => {
  // Set deprecation warning header for non-versioned API calls
  const path = c.req.path;
  if (!path.startsWith('/api/v') && !path.includes('/health')) {
    c.header('Deprecation', 'true');
    c.header('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString());
    c.header('Link', '</api/v1>; rel="successor-version"');
  }
  await next();
});

// Mount v1 as default for backwards compatibility
routes.route('/', v1);

// Health routes (separate from versioning)
export { routes, health };
