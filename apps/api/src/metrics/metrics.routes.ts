/**
 * Metrics API Routes
 *
 * Exposes Prometheus-compatible metrics endpoint
 */

import { Hono } from 'hono';

import { getMetrics, getMetricsContentType } from './metrics';

export const metricsRoutes = new Hono();

/**
 * GET /metrics
 *
 * Returns Prometheus-formatted metrics.
 * Typically scraped by Prometheus at regular intervals.
 */
metricsRoutes.get('/', async (_c) => {
  const metrics = await getMetrics();
  return new Response(metrics, {
    headers: {
      'Content-Type': getMetricsContentType(),
    },
  });
});

/**
 * GET /metrics/json
 *
 * Returns metrics in JSON format for debugging/dashboards.
 */
metricsRoutes.get('/json', async (c) => {
  const metrics = await getMetrics();

  // Parse Prometheus format into JSON (simplified)
  const lines = metrics
    .split('\n')
    .filter((line) => line && !line.startsWith('#') && !line.startsWith(' '));

  const parsed: Record<string, number | string> = {};

  for (const line of lines) {
    const match = line.match(/^([^\s{]+)(?:\{([^}]+)\})?\s+(.+)$/);
    if (match) {
      const [, name, labels, value] = match;
      const key = labels ? `${name}{${labels}}` : name;
      parsed[key] = parseFloat(value) || value;
    }
  }

  return c.json({
    timestamp: new Date().toISOString(),
    metrics: parsed,
  });
});
