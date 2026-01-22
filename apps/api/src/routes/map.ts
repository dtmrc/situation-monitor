import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth';
import type { AppEnv } from '../types';

const mapRoutes = new Hono<AppEnv>();

// All routes require auth
mapRoutes.use('*', authMiddleware);

/** ═══════════════════════════════════════════════════════════════════════════
 *  SCHEMAS
 *  ═══════════════════════════════════════════════════════════════════════════ */

const viewportQuerySchema = z.object({
  projectId: z.string().uuid(),
  west: z.coerce.number().min(-180).max(180),
  south: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
  north: z.coerce.number().min(-90).max(90),
  zoom: z.coerce.number().min(0).max(22),
});

/** ═══════════════════════════════════════════════════════════════════════════
 *  ZOOM-BASED LIMITS
 *  ═══════════════════════════════════════════════════════════════════════════ */

interface ZoomLimits {
  maxItems: number;
  severityFilter: ('critical' | 'high' | 'medium' | 'low' | 'info')[] | null;
}

function getZoomLimits(zoom: number): ZoomLimits {
  if (zoom <= 5) {
    // Very zoomed out: limited items, critical/high only
    return { maxItems: 100, severityFilter: ['critical', 'high'] };
  } else if (zoom <= 10) {
    // Medium zoom: moderate items, no severity filter
    return { maxItems: 500, severityFilter: null };
  } else {
    // Zoomed in: full data
    return { maxItems: 2000, severityFilter: null };
  }
}

/** ═══════════════════════════════════════════════════════════════════════════
 *  VIEWPORT ENDPOINT
 *  ═══════════════════════════════════════════════════════════════════════════ */

// GET /api/v1/map/viewport - Fetch map data for current viewport
mapRoutes.get('/viewport', (c) => {
  // Parse and validate query params
  const query = c.req.query();
  const parsed = viewportQuerySchema.safeParse(query);

  if (!parsed.success) {
    return c.json(
      {
        error: 'Invalid query parameters',
        details: parsed.error.flatten(),
      },
      400
    );
  }

  // Note: projectId will be used when database queries are implemented
  const { west, south, east, north, zoom } = parsed.data;
  const { maxItems, severityFilter } = getZoomLimits(zoom);

  // For now, return mock data that would be filtered by viewport bounds
  // In production, this would query the database with PostGIS ST_Within or similar
  const markers = generateMockMarkers(west, south, east, north, maxItems, severityFilter);
  const tracks = generateMockTracks(west, south, east, north, Math.floor(maxItems / 2));
  const alerts = generateMockAlerts(
    west,
    south,
    east,
    north,
    Math.floor(maxItems / 4),
    severityFilter
  );

  const totalItems = markers.length + tracks.length + alerts.length;
  const truncated = totalItems >= maxItems;

  return c.json({
    markers,
    tracks,
    alerts,
    meta: {
      total: totalItems,
      truncated,
      bbox: { west, south, east, north },
      zoom,
      fetchedAt: new Date().toISOString(),
    },
  });
});

/** ═══════════════════════════════════════════════════════════════════════════
 *  MOCK DATA GENERATORS (Replace with real DB queries)
 *  ═══════════════════════════════════════════════════════════════════════════ */

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
type MarkerType =
  | 'nai'
  | 'threat'
  | 'asset'
  | 'event'
  | 'infrastructure'
  | 'maritime'
  | 'flight'
  | 'alert';

function randomInBounds(
  west: number,
  south: number,
  east: number,
  north: number
): [number, number] {
  const lng = west + Math.random() * (east - west);
  const lat = south + Math.random() * (north - south);
  return [lng, lat];
}

function randomSeverity(filter: SeverityLevel[] | null): SeverityLevel {
  const severities: SeverityLevel[] = filter || ['critical', 'high', 'medium', 'low', 'info'];
  return severities[Math.floor(Math.random() * severities.length)];
}

function generateMockMarkers(
  west: number,
  south: number,
  east: number,
  north: number,
  maxItems: number,
  severityFilter: SeverityLevel[] | null
) {
  const count = Math.min(Math.floor(Math.random() * 20) + 5, maxItems);
  const types: MarkerType[] = ['nai', 'threat', 'asset', 'event', 'infrastructure'];
  const markers = [];

  for (let i = 0; i < count; i++) {
    const [lng, lat] = randomInBounds(west, south, east, north);
    markers.push({
      id: `marker-${Date.now()}-${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      coordinates: [lng, lat],
      name: `Marker ${i + 1}`,
      severity: randomSeverity(severityFilter),
      status: Math.random() > 0.2 ? 'active' : 'inactive',
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    });
  }

  return markers;
}

function generateMockTracks(
  west: number,
  south: number,
  east: number,
  north: number,
  maxItems: number
) {
  const count = Math.min(Math.floor(Math.random() * 10) + 2, maxItems);
  const tracks = [];

  for (let i = 0; i < count; i++) {
    const [lng, lat] = randomInBounds(west, south, east, north);
    const type = Math.random() > 0.5 ? 'maritime' : 'flight';
    tracks.push({
      id: `track-${Date.now()}-${i}`,
      type,
      callsign:
        type === 'flight'
          ? `FL${Math.floor(Math.random() * 9000) + 1000}`
          : `SHIP-${Math.floor(Math.random() * 999)}`,
      coordinates: [lng, lat],
      heading: Math.floor(Math.random() * 360),
      speed:
        type === 'flight'
          ? Math.floor(Math.random() * 500) + 200
          : Math.floor(Math.random() * 30) + 5,
      altitude: type === 'flight' ? Math.floor(Math.random() * 40000) + 10000 : undefined,
      status: Math.random() > 0.1 ? 'active' : 'lost',
      lastUpdate: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    });
  }

  return tracks;
}

function generateMockAlerts(
  west: number,
  south: number,
  east: number,
  north: number,
  maxItems: number,
  severityFilter: SeverityLevel[] | null
) {
  const count = Math.min(Math.floor(Math.random() * 5) + 1, maxItems);
  const alertTypes = ['tripwire', 'threshold', 'manual', 'system'] as const;
  const alerts = [];

  for (let i = 0; i < count; i++) {
    const [lng, lat] = randomInBounds(west, south, east, north);
    const severity = randomSeverity(severityFilter);
    alerts.push({
      id: `alert-${Date.now()}-${i}`,
      type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
      severity,
      title: `${severity.toUpperCase()} Alert ${i + 1}`,
      message: `Alert triggered in monitored area`,
      coordinates: [lng, lat],
      timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString(),
      acknowledged: Math.random() > 0.7,
    });
  }

  return alerts;
}

export { mapRoutes };
