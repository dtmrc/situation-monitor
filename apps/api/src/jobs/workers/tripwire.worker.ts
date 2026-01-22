/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Tripwire Check Worker
 *
 * Evaluates feed items against tripwire conditions.
 * Processes jobs from the tripwire-check queue and:
 * 1. Checks if location falls within any active NAI
 * 2. Evaluates tripwire conditions
 * 3. Creates alerts when triggered
 * 4. Publishes alerts for real-time delivery
 */

import { Worker, type Job } from 'bullmq';
import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { db } from '../../db';
import { tripwires, alerts } from '../../db/schema/indicators';
import { nais } from '../../db/schema/intel';
import { redisPub } from '../../lib/redis';
import { createWorkerConnection, type TripwireCheckJobData } from '../queues';

// Worker configuration
const WORKER_CONCURRENCY = 3;
const _WORKER_NAME = 'tripwire-check'; // Used for logging/metrics

// Redis channel for alerts
const ALERT_CHANNEL_PREFIX = 'alerts:';

interface NAIWithTripwires {
  id: string;
  name: string;
  polygon: string | null; // GeoJSON string
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
  projectId: string;
  tripwires: {
    id: string;
    name: string;
    condition: string;
    threshold: number | null;
    currentValue: number | null;
    isTriggered: boolean;
    alertSeverity: string;
    notifyUsers: string | null;
    isActive: boolean;
  }[];
}

/**
 * Check if a point is within a NAI area
 * Supports polygon (GeoJSON string) or circular area (lat/lng + radius)
 */
function isPointInNAI(lat: number, lng: number, nai: NAIWithTripwires): boolean {
  // Check polygon if available
  if (nai.polygon) {
    try {
      const geometry = JSON.parse(nai.polygon) as { type?: string; coordinates?: number[][][] };

      if (geometry.type === 'Polygon' && geometry.coordinates) {
        const ring = geometry.coordinates[0];
        if (ring) {
          return isPointInPolygon(lat, lng, ring);
        }
      }
    } catch {
      // Invalid polygon JSON, fall through to radius check
    }
  }

  // Check circular area if lat/lng/radius are available
  if (nai.latitude !== null && nai.longitude !== null && nai.radius !== null) {
    return isPointInRadius(lat, lng, nai.latitude, nai.longitude, nai.radius);
  }

  return false;
}

/**
 * Check if a point is within a radius (in meters)
 */
function isPointInRadius(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): boolean {
  // Haversine distance calculation
  const R = 6371000; // Earth's radius in meters
  const dLat = ((centerLat - lat) * Math.PI) / 180;
  const dLng = ((centerLng - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat * Math.PI) / 180) *
      Math.cos((centerLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= radiusMeters;
}

/**
 * Ray casting algorithm for point in polygon check
 */
function isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    if (!pi || !pj) continue;

    const [xi, yi] = pi;
    const [xj, yj] = pj;

    if (
      xi !== undefined &&
      yi !== undefined &&
      xj !== undefined &&
      yj !== undefined &&
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Evaluate a tripwire condition against feed item metadata
 */
function evaluateTripwireCondition(
  condition: string,
  metadata: Record<string, unknown>
): { triggered: boolean; reason?: string } {
  try {
    // Parse condition - support simple keyword matching and threshold checks
    const conditionLower = condition.toLowerCase();

    // Keyword matching: "contains:keyword1,keyword2"
    if (conditionLower.startsWith('contains:')) {
      const keywords = condition
        .slice(9)
        .split(',')
        .map((k) => k.trim().toLowerCase());
      const text = `${metadata.title || ''} ${metadata.content || ''}`.toLowerCase();

      const matched = keywords.find((kw) => text.includes(kw));
      if (matched) {
        return { triggered: true, reason: `Matched keyword: ${matched}` };
      }
      return { triggered: false };
    }

    // Severity threshold: "severity:high" or "severity:>=high"
    if (conditionLower.startsWith('severity:')) {
      const severityLevels = ['info', 'low', 'medium', 'high', 'critical'];
      const targetSeverity = condition.slice(9).toLowerCase().replace('>=', '');
      const itemSeverity = ((metadata.severity as string) || 'info').toLowerCase();

      const targetIndex = severityLevels.indexOf(targetSeverity);
      const itemIndex = severityLevels.indexOf(itemSeverity);

      if (itemIndex >= targetIndex) {
        return {
          triggered: true,
          reason: `Severity ${itemSeverity} meets threshold ${targetSeverity}`,
        };
      }
      return { triggered: false };
    }

    // Feed type: "type:flight,maritime"
    if (conditionLower.startsWith('type:')) {
      const types = condition
        .slice(5)
        .split(',')
        .map((t) => t.trim().toLowerCase());
      const feedType = ((metadata.feedType as string) || '').toLowerCase();

      if (types.includes(feedType)) {
        return { triggered: true, reason: `Feed type ${feedType} matched` };
      }
      return { triggered: false };
    }

    // Any event (always triggers when in NAI)
    if (conditionLower === 'any' || conditionLower === '*') {
      return { triggered: true, reason: 'Any event in NAI' };
    }

    // Default: treat as keyword search
    const keywords = condition.split(',').map((k) => k.trim().toLowerCase());
    const text = `${metadata.title || ''} ${metadata.content || ''}`.toLowerCase();

    const matched = keywords.find((kw) => text.includes(kw));
    if (matched) {
      return { triggered: true, reason: `Matched: ${matched}` };
    }

    return { triggered: false };
  } catch (error) {
    console.error('[Tripwire] Error evaluating condition:', error);
    return { triggered: false };
  }
}

/**
 * Create the tripwire check worker
 */
export function createTripwireWorker(): Worker<TripwireCheckJobData> {
  const worker = new Worker<TripwireCheckJobData>(
    'tripwire-check',
    async (job: Job<TripwireCheckJobData>) => {
      const { feedItemId, projectId, feedType, latitude, longitude, metadata } = job.data;

      if (!latitude || !longitude) {
        return { checked: 0, triggered: 0 };
      }

      console.log(`[Tripwire] Checking item ${feedItemId} at ${latitude},${longitude}`);

      // Find NAIs in this project
      const projectNais = await db.query.nais.findMany({
        where: eq(nais.projectId, projectId),
      });

      // Get active tripwires for these NAIs
      const naiIds = projectNais.map((n) => n.id);
      const activeTripwires =
        naiIds.length > 0
          ? await db
              .select()
              .from(tripwires)
              .where(and(inArray(tripwires.naiId, naiIds), eq(tripwires.isActive, true)))
          : [];

      // Group tripwires by NAI
      const tripwiresByNai = new Map<string, typeof activeTripwires>();
      for (const tw of activeTripwires) {
        const existing = tripwiresByNai.get(tw.naiId) || [];
        existing.push(tw);
        tripwiresByNai.set(tw.naiId, existing);
      }

      // Build NAIs with tripwires
      const naisWithTripwires: NAIWithTripwires[] = projectNais.map((n) => ({
        id: n.id,
        name: n.name,
        polygon: n.polygon,
        latitude: n.latitude,
        longitude: n.longitude,
        radius: n.radius,
        projectId: n.projectId,
        tripwires: (tripwiresByNai.get(n.id) || []).map((tw) => ({
          id: tw.id,
          name: tw.name,
          condition: tw.condition,
          threshold: tw.threshold,
          currentValue: tw.currentValue,
          isTriggered: tw.isTriggered,
          alertSeverity: tw.alertSeverity,
          notifyUsers: tw.notifyUsers,
          isActive: tw.isActive,
        })),
      }));

      let checkedCount = 0;
      let triggeredCount = 0;
      const alertsCreated: string[] = [];

      for (const nai of naisWithTripwires) {
        // Check if point is within NAI area
        if (!isPointInNAI(latitude, longitude, nai)) {
          continue;
        }

        console.log(`[Tripwire] Item is within NAI: ${nai.name}`);

        // Evaluate each tripwire
        for (const tripwire of nai.tripwires) {
          checkedCount++;

          const result = evaluateTripwireCondition(tripwire.condition, {
            ...metadata,
            feedType,
          });

          if (result.triggered) {
            triggeredCount++;

            // Create alert
            const alertId = uuidv4();
            const severity = tripwire.alertSeverity as 'info' | 'warning' | 'critical';
            const title = `Tripwire "${tripwire.name}" triggered`;
            const message = `${result.reason}\n\nItem: ${metadata.title || feedItemId}\nNAI: ${nai.name}`;

            await db.insert(alerts).values({
              id: alertId,
              tripwireId: tripwire.id,
              severity,
              title,
              message,
              data: JSON.stringify({
                feedItemId,
                feedType,
                latitude,
                longitude,
                metadata,
                triggerReason: result.reason,
              }),
            });

            // Update tripwire state
            await db
              .update(tripwires)
              .set({
                isTriggered: true,
                triggeredAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(tripwires.id, tripwire.id));

            // Publish alert for real-time delivery
            await publishAlert(projectId, {
              id: alertId,
              tripwireId: tripwire.id,
              tripwireName: tripwire.name,
              naiName: nai.name,
              severity,
              title,
              message,
              latitude,
              longitude,
              feedType,
              timestamp: new Date().toISOString(),
            });

            alertsCreated.push(alertId);
            console.log(`[Tripwire] Created alert ${alertId} for tripwire ${tripwire.name}`);
          }
        }
      }

      return {
        checked: checkedCount,
        triggered: triggeredCount,
        alerts: alertsCreated,
      };
    },
    {
      connection: createWorkerConnection(),
      concurrency: WORKER_CONCURRENCY,
    }
  );

  // Event handlers
  worker.on('completed', (job, result) => {
    if (result?.triggered > 0) {
      console.log(`[Tripwire] Job ${job.id} completed: ${result.triggered} alerts`);
    }
  });

  worker.on('failed', (job, error) => {
    console.error(`[Tripwire] Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('[Tripwire] Worker error:', error);
  });

  console.log(`[Tripwire] Worker started with concurrency ${WORKER_CONCURRENCY}`);

  return worker;
}

/**
 * Publish an alert to Redis for real-time delivery
 */
async function publishAlert(projectId: string, alert: Record<string, unknown>): Promise<void> {
  const channel = `${ALERT_CHANNEL_PREFIX}${projectId}`;
  const message = JSON.stringify({
    type: 'alert',
    payload: alert,
    timestamp: new Date().toISOString(),
  });

  try {
    await redisPub.publish(channel, message);
  } catch (error) {
    console.error('[Tripwire] Failed to publish alert:', error);
  }
}

let workerInstance: Worker<TripwireCheckJobData> | null = null;

/**
 * Start the tripwire worker
 */
export function startTripwireWorker(): Worker<TripwireCheckJobData> {
  if (workerInstance) {
    console.warn('[Tripwire] Worker already running');
    return workerInstance;
  }

  workerInstance = createTripwireWorker();
  return workerInstance;
}

/**
 * Stop the tripwire worker gracefully
 */
export async function stopTripwireWorker(): Promise<void> {
  if (!workerInstance) {
    return;
  }

  console.log('[Tripwire] Stopping worker...');
  await workerInstance.close();
  workerInstance = null;
  console.log('[Tripwire] Worker stopped');
}

/**
 * Get worker status
 */
export function getTripwireWorkerStatus(): {
  running: boolean;
  isPaused: boolean;
} {
  if (!workerInstance) {
    return { running: false, isPaused: false };
  }

  return {
    running: workerInstance.isRunning(),
    isPaused: workerInstance.isPaused(),
  };
}
