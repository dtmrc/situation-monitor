/**
 * Infrastructure Monitoring Routes
 *
 * API endpoints for critical infrastructure monitoring:
 * - Facilities management
 * - Incident tracking
 * - Sector status
 * - DOT cameras
 * - Citizen incidents
 */

import { eq, and, desc, gte, lte, inArray, count } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../db';
import {
  criticalFacilities,
  infrastructureIncidents,
  dotCameras,
  citizenIncidents,
} from '../db/schema/infrastructure';
import { facilityDatabase } from '../feeds/services';
import { NotFoundError } from '../lib/errors';
import { offsetPaginationSchema, offsetPaginatedResponse } from '../lib/pagination';
import { authMiddleware } from '../middleware/auth';
import { validateQuery, validateBody } from '../middleware/validation';
import type { AppEnv } from '../types';

// CISA sectors
const cisaSectors = [
  'chemical',
  'commercial_facilities',
  'communications',
  'critical_manufacturing',
  'dams',
  'defense_industrial_base',
  'emergency_services',
  'energy',
  'financial_services',
  'food_agriculture',
  'government_facilities',
  'healthcare',
  'information_technology',
  'nuclear',
  'transportation',
  'water_wastewater',
] as const;

// Incident severities
const incidentSeverities = ['minor', 'moderate', 'significant', 'severe', 'catastrophic'] as const;

// Incident statuses
const incidentStatuses = ['active', 'monitoring', 'resolved', 'false_alarm'] as const;

// Bounds schema
const boundsSchema = z.object({
  north: z.coerce.number().min(-90).max(90),
  south: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
  west: z.coerce.number().min(-180).max(180),
});

// Query schemas
const incidentsQuerySchema = offsetPaginationSchema.extend({
  projectId: z.string().uuid().optional(),
  sectors: z
    .string()
    .transform((s) => s.split(',').filter(Boolean))
    .pipe(z.array(z.enum(cisaSectors)))
    .optional(),
  severity: z.enum(incidentSeverities).optional(),
  minSeverity: z.enum(incidentSeverities).optional(),
  status: z
    .string()
    .transform((s) => s.split(',').filter(Boolean))
    .pipe(z.array(z.enum(incidentStatuses)))
    .optional(),
  verified: z.coerce.boolean().optional(),
  state: z.string().max(2).optional(),
  since: z.string().datetime().optional(),
  bounds: z
    .string()
    .optional()
    .transform((s) => {
      if (!s) return undefined;
      try {
        return boundsSchema.parse(JSON.parse(s));
      } catch {
        return undefined;
      }
    }),
});

const facilitiesQuerySchema = offsetPaginationSchema.extend({
  sectors: z
    .string()
    .transform((s) => s.split(',').filter(Boolean))
    .pipe(z.array(z.enum(cisaSectors)))
    .optional(),
  state: z.string().max(2).optional(),
  bounds: z
    .string()
    .optional()
    .transform((s) => {
      if (!s) return undefined;
      try {
        return boundsSchema.parse(JSON.parse(s));
      } catch {
        return undefined;
      }
    }),
});

const camerasQuerySchema = offsetPaginationSchema.extend({
  states: z
    .string()
    .transform((s) => s.split(',').filter(Boolean))
    .optional(),
  bounds: z
    .string()
    .optional()
    .transform((s) => {
      if (!s) return undefined;
      try {
        return boundsSchema.parse(JSON.parse(s));
      } catch {
        return undefined;
      }
    }),
});

const citizenIncidentsQuerySchema = offsetPaginationSchema.extend({
  city: z.string().optional(),
  category: z.string().optional(),
  since: z.string().datetime().optional(),
  bounds: z
    .string()
    .optional()
    .transform((s) => {
      if (!s) return undefined;
      try {
        return boundsSchema.parse(JSON.parse(s));
      } catch {
        return undefined;
      }
    }),
});

// Update incident schema
const updateIncidentSchema = z.object({
  status: z.enum(incidentStatuses).optional(),
  verified: z.boolean().optional(),
});

// Infrastructure routes
export const infrastructureRoutes = new Hono<AppEnv>();

// Apply auth to all routes
infrastructureRoutes.use('*', authMiddleware);

/**
 * GET /infrastructure/incidents
 * List infrastructure incidents with filters
 */
infrastructureRoutes.get('/incidents', validateQuery(incidentsQuerySchema), async (c) => {
  const query = c.get('validatedQuery') as z.infer<typeof incidentsQuerySchema>;

  // Build conditions
  const conditions = [];

  if (query.sectors && query.sectors.length > 0) {
    conditions.push(inArray(infrastructureIncidents.sector, query.sectors));
  }

  if (query.severity) {
    conditions.push(eq(infrastructureIncidents.severity, query.severity));
  }

  if (query.minSeverity) {
    // Map severity to score
    const severityScores: Record<string, number> = {
      minor: 1,
      moderate: 2,
      significant: 3,
      severe: 4,
      catastrophic: 5,
    };
    const minScore = severityScores[query.minSeverity];
    conditions.push(gte(infrastructureIncidents.severityScore, minScore));
  }

  if (query.status && query.status.length > 0) {
    conditions.push(inArray(infrastructureIncidents.status, query.status));
  }

  if (query.verified !== undefined) {
    conditions.push(eq(infrastructureIncidents.verified, query.verified));
  }

  if (query.state) {
    conditions.push(eq(infrastructureIncidents.state, query.state));
  }

  if (query.since) {
    conditions.push(gte(infrastructureIncidents.firstReportedAt, new Date(query.since)));
  }

  if (query.bounds) {
    conditions.push(
      gte(infrastructureIncidents.latitude, query.bounds.south),
      lte(infrastructureIncidents.latitude, query.bounds.north),
      gte(infrastructureIncidents.longitude, query.bounds.west),
      lte(infrastructureIncidents.longitude, query.bounds.east)
    );
  }

  // Count total
  const countResult = await db
    .select({ count: count() })
    .from(infrastructureIncidents)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const total = Number(countResult[0]?.count || 0);

  // Get paginated incidents
  const incidents = await db.query.infrastructureIncidents.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [
      desc(infrastructureIncidents.severityScore),
      desc(infrastructureIncidents.lastReportedAt),
    ],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    with: {
      facility: true,
    },
  });

  return c.json(offsetPaginatedResponse(incidents, total, query.page, query.limit));
});

/**
 * GET /infrastructure/incidents/:id
 * Get a single incident by ID
 */
infrastructureRoutes.get('/incidents/:id', async (c) => {
  const id = c.req.param('id');

  const incident = await db.query.infrastructureIncidents.findFirst({
    where: eq(infrastructureIncidents.id, id),
    with: {
      facility: true,
      satelliteFires: true,
      citizenIncidents: true,
    },
  });

  if (!incident) {
    throw new NotFoundError('Infrastructure incident');
  }

  return c.json({ incident });
});

/**
 * PATCH /infrastructure/incidents/:id
 * Update incident status
 */
infrastructureRoutes.patch('/incidents/:id', validateBody(updateIncidentSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.get('validatedBody') as z.infer<typeof updateIncidentSchema>;

  const incident = await db.query.infrastructureIncidents.findFirst({
    where: eq(infrastructureIncidents.id, id),
  });

  if (!incident) {
    throw new NotFoundError('Infrastructure incident');
  }

  // Update incident
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === 'resolved') {
      updates.resolvedAt = new Date();
    }
  }

  if (body.verified !== undefined) {
    updates.verified = body.verified;
    if (body.verified) {
      updates.confirmedAt = new Date();
    }
  }

  await db.update(infrastructureIncidents).set(updates).where(eq(infrastructureIncidents.id, id));

  const updated = await db.query.infrastructureIncidents.findFirst({
    where: eq(infrastructureIncidents.id, id),
  });

  return c.json({ incident: updated });
});

/**
 * GET /infrastructure/facilities
 * List facilities in a geographic area
 */
infrastructureRoutes.get('/facilities', validateQuery(facilitiesQuerySchema), async (c) => {
  const query = c.get('validatedQuery') as z.infer<typeof facilitiesQuerySchema>;

  if (!query.bounds) {
    return c.json({ error: { message: 'Bounds required', code: 'BOUNDS_REQUIRED' } }, 400);
  }

  const facilities = await facilityDatabase.findFacilitiesInBounds(query.bounds, {
    sectors: query.sectors,
    state: query.state,
  });

  return c.json({
    facilities,
    count: facilities.length,
  });
});

/**
 * GET /infrastructure/facilities/:id
 * Get a single facility by ID
 */
infrastructureRoutes.get('/facilities/:id', async (c) => {
  const id = c.req.param('id');

  const facility = await facilityDatabase.getFacilityById(id);

  if (!facility) {
    throw new NotFoundError('Critical facility');
  }

  // Get active incidents for this facility
  const activeIncidents = await db.query.infrastructureIncidents.findMany({
    where: and(
      eq(infrastructureIncidents.facilityId, id),
      eq(infrastructureIncidents.status, 'active')
    ),
    orderBy: [desc(infrastructureIncidents.severityScore)],
    limit: 10,
  });

  return c.json({
    facility,
    activeIncidents,
  });
});

/**
 * GET /infrastructure/sectors/status
 * Get status summary for all CISA sectors
 */
infrastructureRoutes.get('/sectors/status', async (c) => {
  const status = await facilityDatabase.getSectorStatus();

  return c.json({ sectors: status });
});

/**
 * GET /infrastructure/cameras
 * List DOT cameras with filters
 */
infrastructureRoutes.get('/cameras', validateQuery(camerasQuerySchema), async (c) => {
  const query = c.get('validatedQuery') as z.infer<typeof camerasQuerySchema>;

  // Build conditions
  const conditions = [];

  if (query.states && query.states.length > 0) {
    conditions.push(inArray(dotCameras.state, query.states));
  }

  if (query.bounds) {
    conditions.push(
      gte(dotCameras.latitude, query.bounds.south),
      lte(dotCameras.latitude, query.bounds.north),
      gte(dotCameras.longitude, query.bounds.west),
      lte(dotCameras.longitude, query.bounds.east)
    );
  }

  // Count total
  const countResult = await db
    .select({ count: count() })
    .from(dotCameras)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const total = Number(countResult[0]?.count || 0);

  // Get paginated cameras
  const cameras = await db.query.dotCameras.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(dotCameras.updatedAt)],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });

  return c.json(offsetPaginatedResponse(cameras, total, query.page, query.limit));
});

/**
 * GET /infrastructure/citizen-incidents
 * List Citizen app incidents
 */
infrastructureRoutes.get(
  '/citizen-incidents',
  validateQuery(citizenIncidentsQuerySchema),
  async (c) => {
    const query = c.get('validatedQuery') as z.infer<typeof citizenIncidentsQuerySchema>;

    // Build conditions
    const conditions = [];

    if (query.city) {
      conditions.push(eq(citizenIncidents.city, query.city));
    }

    if (query.category) {
      conditions.push(eq(citizenIncidents.category, query.category));
    }

    if (query.since) {
      conditions.push(gte(citizenIncidents.reportedAt, new Date(query.since)));
    }

    if (query.bounds) {
      conditions.push(
        gte(citizenIncidents.latitude, query.bounds.south),
        lte(citizenIncidents.latitude, query.bounds.north),
        gte(citizenIncidents.longitude, query.bounds.west),
        lte(citizenIncidents.longitude, query.bounds.east)
      );
    }

    // Count total
    const countResult = await db
      .select({ count: count() })
      .from(citizenIncidents)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = Number(countResult[0]?.count || 0);

    // Get paginated incidents
    const incidents = await db.query.citizenIncidents.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(citizenIncidents.reportedAt)],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    return c.json(offsetPaginatedResponse(incidents, total, query.page, query.limit));
  }
);

/**
 * GET /infrastructure/stats
 * Get overall infrastructure statistics
 */
infrastructureRoutes.get('/stats', async (c) => {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Active incidents count
  const activeIncidentsResult = await db
    .select({ count: count() })
    .from(infrastructureIncidents)
    .where(eq(infrastructureIncidents.status, 'active'));

  const activeIncidents = Number(activeIncidentsResult[0]?.count || 0);

  // Incidents in last 24h
  const incidents24hResult = await db
    .select({ count: count() })
    .from(infrastructureIncidents)
    .where(gte(infrastructureIncidents.firstReportedAt, last24h));

  const incidents24h = Number(incidents24hResult[0]?.count || 0);

  // Total facilities
  const facilitiesResult = await db.select({ count: count() }).from(criticalFacilities);

  const totalFacilities = Number(facilitiesResult[0]?.count || 0);

  // Active cameras
  const camerasResult = await db
    .select({ count: count() })
    .from(dotCameras)
    .where(eq(dotCameras.status, 'active'));

  const activeCameras = Number(camerasResult[0]?.count || 0);

  // Severity breakdown of active incidents
  const severityResult = await db
    .select({
      severity: infrastructureIncidents.severity,
      count: count(),
    })
    .from(infrastructureIncidents)
    .where(eq(infrastructureIncidents.status, 'active'))
    .groupBy(infrastructureIncidents.severity);

  const severityBreakdown: Record<string, number> = {
    minor: 0,
    moderate: 0,
    significant: 0,
    severe: 0,
    catastrophic: 0,
  };
  for (const row of severityResult) {
    severityBreakdown[row.severity] = Number(row.count);
  }

  return c.json({
    stats: {
      activeIncidents,
      incidents24h,
      totalFacilities,
      activeCameras,
      severityBreakdown,
    },
  });
});
