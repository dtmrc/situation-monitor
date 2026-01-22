/**
 * Prometheus Metrics Configuration
 *
 * Exposes application metrics for monitoring:
 * - HTTP request metrics (latency, count, errors)
 * - WebSocket connection metrics
 * - Feed processing metrics
 * - Queue metrics
 * - Database/Redis health
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create a custom registry
export const metricsRegistry = new Registry();

// Add default Node.js metrics (CPU, memory, event loop)
collectDefaultMetrics({ register: metricsRegistry });

// ============================================================================
// HTTP Metrics
// ============================================================================

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'] as const,
  registers: [metricsRegistry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'path', 'status'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

export const httpRequestsInFlight = new Gauge({
  name: 'http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
  registers: [metricsRegistry],
});

// ============================================================================
// WebSocket Metrics
// ============================================================================

export const wsConnectionsActive = new Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  labelNames: ['project_id'] as const,
  registers: [metricsRegistry],
});

export const wsConnectionsTotal = new Counter({
  name: 'websocket_connections_total',
  help: 'Total WebSocket connections opened',
  labelNames: ['project_id'] as const,
  registers: [metricsRegistry],
});

export const wsMessagesTotal = new Counter({
  name: 'websocket_messages_total',
  help: 'Total WebSocket messages sent/received',
  labelNames: ['direction', 'type'] as const,
  registers: [metricsRegistry],
});

export const wsMessageSize = new Histogram({
  name: 'websocket_message_size_bytes',
  help: 'WebSocket message size in bytes',
  labelNames: ['direction'] as const,
  buckets: [100, 500, 1000, 5000, 10000, 50000],
  registers: [metricsRegistry],
});

// ============================================================================
// Feed Processing Metrics
// ============================================================================

export const feedItemsIngested = new Counter({
  name: 'feed_items_ingested_total',
  help: 'Total feed items ingested',
  labelNames: ['feed_type', 'project_id'] as const,
  registers: [metricsRegistry],
});

export const feedItemsProcessed = new Counter({
  name: 'feed_items_processed_total',
  help: 'Total feed items processed',
  labelNames: ['feed_type', 'status'] as const,
  registers: [metricsRegistry],
});

export const feedProcessingDuration = new Histogram({
  name: 'feed_processing_duration_seconds',
  help: 'Time to process a feed item',
  labelNames: ['feed_type'] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry],
});

export const feedFetchDuration = new Histogram({
  name: 'feed_fetch_duration_seconds',
  help: 'Time to fetch data from external feed source',
  labelNames: ['feed_type', 'adapter'] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [metricsRegistry],
});

export const feedErrors = new Counter({
  name: 'feed_errors_total',
  help: 'Total feed processing errors',
  labelNames: ['feed_type', 'error_type'] as const,
  registers: [metricsRegistry],
});

export const feedConfigsActive = new Gauge({
  name: 'feed_configs_active',
  help: 'Number of active feed configurations',
  labelNames: ['feed_type'] as const,
  registers: [metricsRegistry],
});

// ============================================================================
// Queue Metrics
// ============================================================================

export const queueJobsWaiting = new Gauge({
  name: 'queue_jobs_waiting',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue'] as const,
  registers: [metricsRegistry],
});

export const queueJobsActive = new Gauge({
  name: 'queue_jobs_active',
  help: 'Number of jobs currently being processed',
  labelNames: ['queue'] as const,
  registers: [metricsRegistry],
});

export const queueJobsCompleted = new Counter({
  name: 'queue_jobs_completed_total',
  help: 'Total jobs completed',
  labelNames: ['queue'] as const,
  registers: [metricsRegistry],
});

export const queueJobsFailed = new Counter({
  name: 'queue_jobs_failed_total',
  help: 'Total jobs failed',
  labelNames: ['queue'] as const,
  registers: [metricsRegistry],
});

export const queueJobDuration = new Histogram({
  name: 'queue_job_duration_seconds',
  help: 'Job processing duration',
  labelNames: ['queue'] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [metricsRegistry],
});

// ============================================================================
// Tripwire Metrics
// ============================================================================

export const tripwiresChecked = new Counter({
  name: 'tripwires_checked_total',
  help: 'Total tripwire checks performed',
  registers: [metricsRegistry],
});

export const tripwiresTriggered = new Counter({
  name: 'tripwires_triggered_total',
  help: 'Total tripwires triggered',
  labelNames: ['severity'] as const,
  registers: [metricsRegistry],
});

export const alertsCreated = new Counter({
  name: 'alerts_created_total',
  help: 'Total alerts created',
  labelNames: ['severity', 'feed_type'] as const,
  registers: [metricsRegistry],
});

// ============================================================================
// Database Metrics
// ============================================================================

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['operation'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [metricsRegistry],
});

export const dbConnectionPoolSize = new Gauge({
  name: 'db_connection_pool_size',
  help: 'Database connection pool size',
  labelNames: ['state'] as const,
  registers: [metricsRegistry],
});

// ============================================================================
// Redis Metrics
// ============================================================================

export const redisOperations = new Counter({
  name: 'redis_operations_total',
  help: 'Total Redis operations',
  labelNames: ['operation', 'status'] as const,
  registers: [metricsRegistry],
});

export const redisLatency = new Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Redis operation latency',
  labelNames: ['operation'] as const,
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
  registers: [metricsRegistry],
});

// ============================================================================
// Retention Metrics
// ============================================================================

export const retentionItemsDeleted = new Counter({
  name: 'retention_items_deleted_total',
  help: 'Total items deleted by retention policy',
  labelNames: ['feed_type'] as const,
  registers: [metricsRegistry],
});

export const retentionRunDuration = new Histogram({
  name: 'retention_run_duration_seconds',
  help: 'Duration of retention cleanup run',
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [metricsRegistry],
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return metricsRegistry.metrics();
}

/**
 * Get metrics content type header
 */
export function getMetricsContentType(): string {
  return metricsRegistry.contentType;
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  metricsRegistry.resetMetrics();
}
