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
import { eq } from 'drizzle-orm';
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
  geometry: unknown;
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
 * Check if a point is within a polygon (simplified check)
 * For production, use PostGIS ST_Contains
 */
function pointInPolygon(lat: number, lng: number, geometry: unknown): boolean {
  // If geometry is GeoJSON polygon
  if (typeof geometry === 'object' && geometry !== null) {
    const geo = geometry as { type?: string; coordinates?: number[][][] };

    if (geo.type === 'Polygon' && geo.coordinates) {
      return isPointInPolygon(lat, lng, geo.coordinates[0]);
    }

    // Simple bounding box check for other geometry types
    if ('bbox' in geo) {
      const bbox = (geo as { bbox: number[] }).bbox;
      return lat >= bbox[1] && lat <= bbox[3] && lng >= bbox[0] && lng <= bbox[2];
    }
  }

  return false;
}

/**
 * Ray casting algorithm for point in polygon check
 */
function isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
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

      // Find NAIs in this project with active tripwires
      const naisWithTripwires = (await db.query.nais.findMany({
        where: eq(nais.projectId, projectId),
        with: {
          tripwires: {
            where: eq(tripwires.isActive, true),
          },
        },
      })) as unknown as NAIWithTripwires[];

      let checkedCount = 0;
      let triggeredCount = 0;
      const alertsCreated: string[] = [];

      for (const nai of naisWithTripwires) {
        // Check if point is within NAI geometry
        if (!nai.geometry || !pointInPolygon(latitude, longitude, nai.geometry)) {
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
