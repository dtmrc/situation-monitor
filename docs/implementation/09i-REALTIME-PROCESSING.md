# Phase 9i: Real-Time Processing Services

Parent: [09-REALTIME-DATA-FEEDS.md](./09-REALTIME-DATA-FEEDS.md)

## Overview

This document covers the core data processing pipeline components that transform raw feed data into actionable intelligence:

- **Data Normalizer Service** - Converts all feed types (news, flight, maritime, weather, events) into a common schema for consistent storage and display
- **Tripwire Checking Worker** - Evaluates incoming feed items against user-configured tripwires and triggers alerts when conditions are met
- **Alert Dispatch Service** - Routes alerts to WebSocket connections, email, and push notifications based on user preferences
- **Live Feed Panel** - Real-time feed display component with WebSocket integration for instant updates
- **Timeline Scrubber** - Playback controls for historical feed data visualization
- **Feed Configuration UI** - Management interface for feed sources and polling settings
- **Notification Preferences** - User settings for alert routing and severity thresholds

**Tasks Covered:** 9.9, 9.10, 9.11, 9.14, 9.15, 9.16, 9.17

---

## Processing Pipeline Architecture

```
                    REAL-TIME PROCESSING PIPELINE

  INCOMING DATA (from adapters)
  +----------+ +----------+ +----------+ +----------+ +----------+
  |   News   | |  Flight  | | Maritime | | Weather  | |  Events  |
  |   Item   | |   Track  | |   Track  | |   Data   | |   Item   |
  +----+-----+ +----+-----+ +----+-----+ +----+-----+ +----+-----+
       |            |            |            |            |
       +------------+------------+------------+------------+
                                 |
                                 v
  NORMALIZATION LAYER
  +----------------------------------------------------------+
  |                   NORMALIZER SERVICE                       |
  |  +-------------+  +-------------+  +-------------+        |
  |  |   Schema    |  |   Type      |  |   Field     |        |
  |  |  Validator  |  |   Mapper    |  |  Enricher   |        |
  |  +------+------+  +------+------+  +------+------+        |
  |         +----------------+----------------+                |
  |                          |                                 |
  |                          v                                 |
  |              +-------------------+                         |
  |              | NormalizedFeedItem|                         |
  |              | - id              |                         |
  |              | - type            |                         |
  |              | - title           |                         |
  |              | - timestamp       |                         |
  |              | - location        |                         |
  |              | - metadata        |                         |
  |              +--------+----------+                         |
  +---------------------------+--------------------------------+
                              |
                              v
  TRIPWIRE CHECKING LAYER
  +----------------------------------------------------------+
  |                   TRIPWIRE WORKER                          |
  |  +-------------+  +-------------+  +-------------+        |
  |  |  Condition  |  |   Spatial   |  |  Threshold  |        |
  |  |  Evaluator  |  |   Matcher   |  |   Checker   |        |
  |  +------+------+  +------+------+  +------+------+        |
  |         |                |                |                |
  |         v                v                v                |
  |  +---------------------------------------------------+    |
  |  |              TRIPWIRE EVALUATION                   |    |
  |  |  - Keyword matching                                |    |
  |  |  - Geofence intersection                          |    |
  |  |  - Threshold comparison                           |    |
  |  |  - Temporal windows                               |    |
  |  +---------------------------------------------------+    |
  +---------------------------+--------------------------------+
                              |
                              v (on trigger)
  ALERT DISPATCH LAYER
  +----------------------------------------------------------+
  |                   ALERT SERVICE                            |
  |  +-------------+  +-------------+  +-------------+        |
  |  | WebSocket   |  |    Email    |  |    Push     |        |
  |  | Broadcast   |  |   Sender    |  | Notification|        |
  |  +------+------+  +------+------+  +------+------+        |
  +----------------------------------------------------------+
                              |
                              v
  CLIENT LAYER
  +----------------------------------------------------------+
  |  +-----------------+  +-----------------+                  |
  |  |  Live Feed     |  |  Notification   |                  |
  |  |  Panel         |  |  Toast/Badge    |                  |
  |  +-----------------+  +-----------------+                  |
  +----------------------------------------------------------+
```

---

## 9.9 Data Normalizer Service

The normalizer service transforms raw data from various feed adapters into a unified `NormalizedFeedItem` schema that can be consistently stored, searched, and displayed.

**File: `apps/api/src/feeds/normalizer.service.ts`**
```typescript
import { v4 as uuidv4 } from 'uuid';
import type { NormalizedFeedItem } from '../jobs/queues';
import type { FeedAdapter } from './adapter.interface';

// Import all adapters
import { NewsApiAdapter } from './adapters/news/newsapi.adapter';
import { RSSFeedAdapter } from './adapters/news/rss.adapter';
import { GdeltAdapter } from './adapters/news/gdelt.adapter';
import { ADSBAdapter } from './adapters/flight/adsb.adapter';
import { AISAdapter } from './adapters/maritime/ais.adapter';
import { WeatherAdapter } from './adapters/weather/openweather.adapter';
import { ACLEDAdapter } from './adapters/events/acled.adapter';
import { FIRMSAdapter } from './adapters/events/firms.adapter';
import { TelegramAdapter } from './adapters/social/telegram.adapter';

// Adapter registry
const adapterRegistry: Record<string, new () => FeedAdapter> = {
  'newsapi': NewsApiAdapter,
  'rss': RSSFeedAdapter,
  'gdelt': GdeltAdapter,
  'adsb': ADSBAdapter,
  'ais': AISAdapter,
  'weather': WeatherAdapter,
  'acled': ACLEDAdapter,
  'firms': FIRMSAdapter,
  'telegram': TelegramAdapter,
};

// Adapter instance cache
const adapterInstances = new Map<string, FeedAdapter>();

/**
 * Get or create an adapter instance for the given source type
 */
export function getAdapter(sourceType: string): FeedAdapter {
  const existing = adapterInstances.get(sourceType);
  if (existing) return existing;

  const AdapterClass = adapterRegistry[sourceType];
  if (!AdapterClass) {
    throw new Error(`Unknown feed source type: ${sourceType}`);
  }

  const instance = new AdapterClass();
  adapterInstances.set(sourceType, instance);
  return instance;
}

/**
 * Register a custom adapter
 */
export function registerAdapter(sourceType: string, adapter: new () => FeedAdapter): void {
  adapterRegistry[sourceType] = adapter;
}

/**
 * Get all registered adapter types
 */
export function getRegisteredAdapterTypes(): string[] {
  return Object.keys(adapterRegistry);
}

/**
 * Common schema for all normalized feed items
 */
export interface NormalizationResult {
  item: NormalizedFeedItem;
  warnings: string[];
  enrichments: string[];
}

/**
 * Normalize raw data from any feed type to common schema
 */
export function normalizeItem(
  sourceType: string,
  rawData: unknown,
  options?: NormalizationOptions
): NormalizationResult {
  const warnings: string[] = [];
  const enrichments: string[] = [];

  const adapter = getAdapter(sourceType);
  const baseItem = adapter.normalize(rawData);

  // Validate required fields
  if (!baseItem.id) {
    baseItem.id = generateItemId(sourceType, rawData);
    warnings.push('Generated ID from content hash');
  }

  if (!baseItem.timestamp) {
    baseItem.timestamp = new Date();
    warnings.push('Used current time as timestamp');
  }

  if (!baseItem.title && baseItem.content) {
    baseItem.title = truncateText(baseItem.content, 100);
    enrichments.push('Generated title from content');
  }

  // Apply location enrichment if coordinates available but no name
  if (baseItem.location?.lat && baseItem.location?.lng && !baseItem.location.name) {
    if (options?.geocodeLocations) {
      // Would integrate with geocoding service
      enrichments.push('Geocoding pending');
    }
  }

  // Ensure metadata is an object
  if (!baseItem.metadata || typeof baseItem.metadata !== 'object') {
    baseItem.metadata = {};
  }

  // Add source tracking metadata
  baseItem.metadata = {
    ...baseItem.metadata,
    _sourceType: sourceType,
    _normalizedAt: new Date().toISOString(),
    _version: '1.0',
  };

  return {
    item: baseItem,
    warnings,
    enrichments,
  };
}

/**
 * Batch normalize multiple items
 */
export async function normalizeBatch(
  sourceType: string,
  rawItems: unknown[],
  options?: NormalizationOptions
): Promise<NormalizationResult[]> {
  return rawItems.map((rawItem) => normalizeItem(sourceType, rawItem, options));
}

/**
 * Generate a deterministic ID from content
 */
function generateItemId(sourceType: string, rawData: unknown): string {
  const content = JSON.stringify(rawData);
  const hash = Buffer.from(content).toString('base64').slice(0, 16);
  return `${sourceType}-${hash}-${Date.now()}`;
}

/**
 * Truncate text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export interface NormalizationOptions {
  geocodeLocations?: boolean;
  extractEntities?: boolean;
  generateEmbeddings?: boolean;
}

/**
 * Validate a normalized feed item
 */
export function validateNormalizedItem(item: NormalizedFeedItem): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!item.id) errors.push('Missing required field: id');
  if (!item.type) errors.push('Missing required field: type');
  if (!item.title) errors.push('Missing required field: title');
  if (!item.timestamp) errors.push('Missing required field: timestamp');

  if (item.location) {
    if (typeof item.location.lat !== 'number' || item.location.lat < -90 || item.location.lat > 90) {
      errors.push('Invalid latitude');
    }
    if (typeof item.location.lng !== 'number' || item.location.lng < -180 || item.location.lng > 180) {
      errors.push('Invalid longitude');
    }
  }

  const validTypes = ['news', 'flight', 'maritime', 'weather', 'event', 'observation', 'social'];
  if (!validTypes.includes(item.type)) {
    errors.push(`Invalid type: ${item.type}. Must be one of: ${validTypes.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert feed item to GeoJSON feature for map display
 */
export function toGeoJSONFeature(item: NormalizedFeedItem): GeoJSON.Feature | null {
  if (!item.location?.lat || !item.location?.lng) {
    return null;
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [item.location.lng, item.location.lat],
    },
    properties: {
      id: item.id,
      type: item.type,
      title: item.title,
      timestamp: item.timestamp.toISOString(),
      locationName: item.location.name,
      ...item.metadata,
    },
  };
}

/**
 * Convert multiple feed items to GeoJSON FeatureCollection
 */
export function toGeoJSONCollection(items: NormalizedFeedItem[]): GeoJSON.FeatureCollection {
  const features = items
    .map(toGeoJSONFeature)
    .filter((f): f is GeoJSON.Feature => f !== null);

  return {
    type: 'FeatureCollection',
    features,
  };
}
```

### Type Mapper Configuration

**File: `apps/api/src/feeds/type-mapper.ts`**
```typescript
/**
 * Maps source-specific types to normalized types
 */
export const typeMapping: Record<string, Record<string, string>> = {
  news: {
    article: 'news',
    breaking: 'news',
    analysis: 'news',
    opinion: 'news',
  },
  adsb: {
    aircraft: 'flight',
    helicopter: 'flight',
    drone: 'flight',
  },
  ais: {
    vessel: 'maritime',
    tanker: 'maritime',
    cargo: 'maritime',
    passenger: 'maritime',
    fishing: 'maritime',
    military: 'maritime',
  },
  weather: {
    current: 'weather',
    forecast: 'weather',
    alert: 'weather',
    severe: 'weather',
  },
  acled: {
    battle: 'event',
    protest: 'event',
    riot: 'event',
    violence_against_civilians: 'event',
    explosion: 'event',
    strategic_development: 'event',
  },
  firms: {
    fire: 'event',
    hotspot: 'event',
  },
  telegram: {
    message: 'social',
    media: 'social',
    forward: 'social',
  },
};

/**
 * Get the normalized type for a source-specific type
 */
export function getNormalizedType(sourceType: string, rawType: string): string {
  const mapping = typeMapping[sourceType];
  if (!mapping) return 'observation';

  return mapping[rawType.toLowerCase()] || 'observation';
}

/**
 * Severity levels for different event types
 */
export const severityMapping: Record<string, number> = {
  // News severity based on topic
  'news:conflict': 4,
  'news:terrorism': 5,
  'news:disaster': 4,
  'news:political': 2,
  'news:economic': 2,

  // Event severity based on type
  'event:battle': 5,
  'event:explosion': 5,
  'event:violence_against_civilians': 5,
  'event:riot': 4,
  'event:protest': 3,
  'event:fire': 3,

  // Weather severity
  'weather:severe': 4,
  'weather:alert': 3,
  'weather:current': 1,

  // Default
  default: 1,
};

/**
 * Get severity level for a feed item
 */
export function getSeverity(type: string, subType?: string): number {
  const key = subType ? `${type}:${subType}` : type;
  return severityMapping[key] || severityMapping.default;
}
```

---

## 9.10 Tripwire Checking Worker

The tripwire worker evaluates incoming feed items against user-configured conditions and generates alerts when triggers are met.

**File: `apps/api/src/jobs/workers/tripwire.worker.ts`**
```typescript
import { Worker, Job } from 'bullmq';
import { redis } from '../../lib/redis';
import { db } from '../../db';
import { tripwires, tripwireConditions, alerts } from '../../db/schema';
import { alertQueue, type ProcessJobData, type AlertJobData } from '../queues';
import { eq, and, inArray } from 'drizzle-orm';
import type { NormalizedFeedItem } from '../queues';
import * as turf from '@turf/turf';

// Condition types supported by tripwires
type ConditionType =
  | 'keyword'
  | 'geofence'
  | 'type_match'
  | 'threshold'
  | 'entity_match'
  | 'temporal';

interface TripwireCondition {
  id: string;
  tripwireId: string;
  type: ConditionType;
  operator: 'contains' | 'equals' | 'gt' | 'gte' | 'lt' | 'lte' | 'within' | 'intersects';
  field: string;
  value: string | number | object;
  caseSensitive?: boolean;
}

interface Tripwire {
  id: string;
  projectId: string;
  name: string;
  enabled: boolean;
  severity: 'info' | 'warning' | 'critical';
  conditions: TripwireCondition[];
  conditionLogic: 'AND' | 'OR';
  cooldownMinutes: number;
  notifyUsers: string[];
  lastTriggeredAt?: Date;
}

interface TripwireEvaluation {
  tripwire: Tripwire;
  triggered: boolean;
  matchedConditions: string[];
  score: number;
}

// Cache tripwires by project for performance
const tripwireCache = new Map<string, { tripwires: Tripwire[]; expiresAt: number }>();
const CACHE_TTL_MS = 60000; // 1 minute

export const tripwireWorker = new Worker<ProcessJobData>(
  'tripwire-check',
  async (job: Job<ProcessJobData>) => {
    const { feedItemId, projectId, normalizedData } = job.data;

    console.log(`[Tripwire] Checking item ${feedItemId} against project ${projectId} tripwires`);

    // Get active tripwires for this project
    const tripwires = await getProjectTripwires(projectId);

    if (tripwires.length === 0) {
      return { checked: true, triggeredCount: 0 };
    }

    const evaluations: TripwireEvaluation[] = [];
    const triggeredAlerts: AlertJobData[] = [];

    for (const tripwire of tripwires) {
      // Skip if in cooldown
      if (isInCooldown(tripwire)) {
        continue;
      }

      const evaluation = evaluateTripwire(tripwire, normalizedData);
      evaluations.push(evaluation);

      if (evaluation.triggered) {
        // Create alert
        const alertData: AlertJobData = {
          alertId: `alert-${feedItemId}-${tripwire.id}`,
          projectId,
          tripwireId: tripwire.id,
          severity: tripwire.severity,
          message: generateAlertMessage(tripwire, normalizedData, evaluation),
          data: {
            feedItem: normalizedData,
            matchedConditions: evaluation.matchedConditions,
            score: evaluation.score,
          },
          notifyUsers: tripwire.notifyUsers,
        };

        triggeredAlerts.push(alertData);

        // Queue alert for dispatch
        await alertQueue.add('dispatch', alertData, {
          priority: tripwire.severity === 'critical' ? 1 : tripwire.severity === 'warning' ? 2 : 3,
        });

        // Update last triggered time
        await updateTripwireLastTriggered(tripwire.id);
      }
    }

    return {
      checked: true,
      tripwiresEvaluated: tripwires.length,
      triggeredCount: triggeredAlerts.length,
      alerts: triggeredAlerts.map((a) => a.alertId),
    };
  },
  {
    connection: redis,
    concurrency: 10,
  }
);

/**
 * Get tripwires for a project (with caching)
 */
async function getProjectTripwires(projectId: string): Promise<Tripwire[]> {
  const now = Date.now();
  const cached = tripwireCache.get(projectId);

  if (cached && cached.expiresAt > now) {
    return cached.tripwires;
  }

  // Fetch from database
  const results = await db
    .select()
    .from(tripwires)
    .leftJoin(tripwireConditions, eq(tripwires.id, tripwireConditions.tripwireId))
    .where(and(eq(tripwires.projectId, projectId), eq(tripwires.enabled, true)));

  // Group conditions by tripwire
  const tripwireMap = new Map<string, Tripwire>();

  for (const row of results) {
    if (!tripwireMap.has(row.tripwires.id)) {
      tripwireMap.set(row.tripwires.id, {
        id: row.tripwires.id,
        projectId: row.tripwires.projectId,
        name: row.tripwires.name,
        enabled: row.tripwires.enabled,
        severity: row.tripwires.severity as 'info' | 'warning' | 'critical',
        conditions: [],
        conditionLogic: row.tripwires.conditionLogic as 'AND' | 'OR',
        cooldownMinutes: row.tripwires.cooldownMinutes,
        notifyUsers: row.tripwires.notifyUsers as string[],
        lastTriggeredAt: row.tripwires.lastTriggeredAt,
      });
    }

    if (row.tripwire_conditions) {
      tripwireMap.get(row.tripwires.id)!.conditions.push({
        id: row.tripwire_conditions.id,
        tripwireId: row.tripwire_conditions.tripwireId,
        type: row.tripwire_conditions.type as ConditionType,
        operator: row.tripwire_conditions.operator as any,
        field: row.tripwire_conditions.field,
        value: row.tripwire_conditions.value,
        caseSensitive: row.tripwire_conditions.caseSensitive,
      });
    }
  }

  const tripwireList = Array.from(tripwireMap.values());

  // Cache results
  tripwireCache.set(projectId, {
    tripwires: tripwireList,
    expiresAt: now + CACHE_TTL_MS,
  });

  return tripwireList;
}

/**
 * Check if tripwire is in cooldown period
 */
function isInCooldown(tripwire: Tripwire): boolean {
  if (!tripwire.lastTriggeredAt || tripwire.cooldownMinutes === 0) {
    return false;
  }

  const cooldownMs = tripwire.cooldownMinutes * 60 * 1000;
  const timeSinceLastTrigger = Date.now() - tripwire.lastTriggeredAt.getTime();

  return timeSinceLastTrigger < cooldownMs;
}

/**
 * Evaluate all conditions of a tripwire against a feed item
 */
function evaluateTripwire(tripwire: Tripwire, item: NormalizedFeedItem): TripwireEvaluation {
  const matchedConditions: string[] = [];
  let totalScore = 0;

  for (const condition of tripwire.conditions) {
    const { matches, score } = evaluateCondition(condition, item);

    if (matches) {
      matchedConditions.push(condition.id);
      totalScore += score;
    }
  }

  // Determine if tripwire triggered based on logic
  let triggered = false;

  if (tripwire.conditionLogic === 'AND') {
    triggered = matchedConditions.length === tripwire.conditions.length;
  } else {
    triggered = matchedConditions.length > 0;
  }

  return {
    tripwire,
    triggered,
    matchedConditions,
    score: totalScore,
  };
}

/**
 * Evaluate a single condition against a feed item
 */
function evaluateCondition(
  condition: TripwireCondition,
  item: NormalizedFeedItem
): { matches: boolean; score: number } {
  switch (condition.type) {
    case 'keyword':
      return evaluateKeywordCondition(condition, item);
    case 'geofence':
      return evaluateGeofenceCondition(condition, item);
    case 'type_match':
      return evaluateTypeCondition(condition, item);
    case 'threshold':
      return evaluateThresholdCondition(condition, item);
    case 'entity_match':
      return evaluateEntityCondition(condition, item);
    case 'temporal':
      return evaluateTemporalCondition(condition, item);
    default:
      return { matches: false, score: 0 };
  }
}

/**
 * Keyword matching (title, content, or specific field)
 */
function evaluateKeywordCondition(
  condition: TripwireCondition,
  item: NormalizedFeedItem
): { matches: boolean; score: number } {
  const keywords = Array.isArray(condition.value)
    ? condition.value
    : [condition.value as string];

  let textToSearch: string;

  if (condition.field === '*' || condition.field === 'all') {
    textToSearch = `${item.title} ${item.content || ''} ${JSON.stringify(item.metadata)}`;
  } else {
    textToSearch = getFieldValue(item, condition.field)?.toString() || '';
  }

  if (!condition.caseSensitive) {
    textToSearch = textToSearch.toLowerCase();
  }

  let matchCount = 0;

  for (const keyword of keywords) {
    const searchKeyword = condition.caseSensitive ? keyword : keyword.toLowerCase();

    if (condition.operator === 'contains') {
      if (textToSearch.includes(searchKeyword)) {
        matchCount++;
      }
    } else if (condition.operator === 'equals') {
      if (textToSearch === searchKeyword) {
        matchCount++;
      }
    }
  }

  return {
    matches: matchCount > 0,
    score: matchCount / keywords.length,
  };
}

/**
 * Geofence intersection check
 */
function evaluateGeofenceCondition(
  condition: TripwireCondition,
  item: NormalizedFeedItem
): { matches: boolean; score: number } {
  if (!item.location?.lat || !item.location?.lng) {
    return { matches: false, score: 0 };
  }

  const geofence = condition.value as {
    type: 'circle' | 'polygon';
    coordinates: number[] | number[][];
    radiusKm?: number;
  };

  const point = turf.point([item.location.lng, item.location.lat]);

  if (geofence.type === 'circle') {
    const center = turf.point(geofence.coordinates as number[]);
    const distance = turf.distance(point, center, { units: 'kilometers' });
    const withinRadius = distance <= (geofence.radiusKm || 50);

    return {
      matches: condition.operator === 'within' ? withinRadius : !withinRadius,
      score: withinRadius ? 1 - distance / (geofence.radiusKm || 50) : 0,
    };
  } else if (geofence.type === 'polygon') {
    const polygon = turf.polygon([geofence.coordinates as number[][]]);
    const within = turf.booleanPointInPolygon(point, polygon);

    return {
      matches: condition.operator === 'within' ? within : !within,
      score: within ? 1 : 0,
    };
  }

  return { matches: false, score: 0 };
}

/**
 * Type matching
 */
function evaluateTypeCondition(
  condition: TripwireCondition,
  item: NormalizedFeedItem
): { matches: boolean; score: number } {
  const targetTypes = Array.isArray(condition.value)
    ? condition.value
    : [condition.value as string];

  const matches = targetTypes.includes(item.type);

  return { matches, score: matches ? 1 : 0 };
}

/**
 * Threshold comparison (for numeric metadata fields)
 */
function evaluateThresholdCondition(
  condition: TripwireCondition,
  item: NormalizedFeedItem
): { matches: boolean; score: number } {
  const fieldValue = getFieldValue(item, condition.field);

  if (typeof fieldValue !== 'number') {
    return { matches: false, score: 0 };
  }

  const threshold = condition.value as number;
  let matches = false;

  switch (condition.operator) {
    case 'gt':
      matches = fieldValue > threshold;
      break;
    case 'gte':
      matches = fieldValue >= threshold;
      break;
    case 'lt':
      matches = fieldValue < threshold;
      break;
    case 'lte':
      matches = fieldValue <= threshold;
      break;
    case 'equals':
      matches = fieldValue === threshold;
      break;
  }

  // Score based on how much it exceeds/meets threshold
  const score = matches ? Math.min(1, Math.abs(fieldValue - threshold) / threshold + 0.5) : 0;

  return { matches, score };
}

/**
 * Entity matching (people, organizations, locations in metadata)
 */
function evaluateEntityCondition(
  condition: TripwireCondition,
  item: NormalizedFeedItem
): { matches: boolean; score: number } {
  const entities = item.metadata?.entities as {
    people?: string[];
    organizations?: string[];
    locations?: Array<{ name: string }>;
  };

  if (!entities) {
    return { matches: false, score: 0 };
  }

  const targetEntities = Array.isArray(condition.value)
    ? condition.value
    : [condition.value as string];

  const allEntities = [
    ...(entities.people || []),
    ...(entities.organizations || []),
    ...(entities.locations?.map((l) => l.name) || []),
  ].map((e) => e.toLowerCase());

  let matchCount = 0;

  for (const target of targetEntities) {
    if (allEntities.some((e) => e.includes(target.toLowerCase()))) {
      matchCount++;
    }
  }

  return {
    matches: matchCount > 0,
    score: matchCount / targetEntities.length,
  };
}

/**
 * Temporal condition (time-based rules)
 */
function evaluateTemporalCondition(
  condition: TripwireCondition,
  item: NormalizedFeedItem
): { matches: boolean; score: number } {
  const config = condition.value as {
    hoursOfDay?: number[];
    daysOfWeek?: number[];
    maxAgeMinutes?: number;
  };

  const itemTime = new Date(item.timestamp);
  const now = new Date();

  // Check age
  if (config.maxAgeMinutes) {
    const ageMinutes = (now.getTime() - itemTime.getTime()) / 60000;
    if (ageMinutes > config.maxAgeMinutes) {
      return { matches: false, score: 0 };
    }
  }

  // Check hours of day
  if (config.hoursOfDay && config.hoursOfDay.length > 0) {
    if (!config.hoursOfDay.includes(itemTime.getHours())) {
      return { matches: false, score: 0 };
    }
  }

  // Check days of week (0 = Sunday)
  if (config.daysOfWeek && config.daysOfWeek.length > 0) {
    if (!config.daysOfWeek.includes(itemTime.getDay())) {
      return { matches: false, score: 0 };
    }
  }

  return { matches: true, score: 1 };
}

/**
 * Get nested field value from an object
 */
function getFieldValue(obj: any, path: string): unknown {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }

  return current;
}

/**
 * Generate human-readable alert message
 */
function generateAlertMessage(
  tripwire: Tripwire,
  item: NormalizedFeedItem,
  evaluation: TripwireEvaluation
): string {
  const matchCount = evaluation.matchedConditions.length;
  const totalConditions = tripwire.conditions.length;

  let message = `Tripwire "${tripwire.name}" triggered`;

  if (tripwire.conditionLogic === 'AND') {
    message += ` (all ${totalConditions} conditions matched)`;
  } else {
    message += ` (${matchCount}/${totalConditions} conditions matched)`;
  }

  message += `: "${item.title}"`;

  if (item.location?.name) {
    message += ` at ${item.location.name}`;
  }

  return message;
}

/**
 * Update tripwire last triggered timestamp
 */
async function updateTripwireLastTriggered(tripwireId: string): Promise<void> {
  await db
    .update(tripwires)
    .set({ lastTriggeredAt: new Date() })
    .where(eq(tripwires.id, tripwireId));

  // Invalidate cache
  for (const [projectId, cached] of tripwireCache) {
    if (cached.tripwires.some((t) => t.id === tripwireId)) {
      tripwireCache.delete(projectId);
      break;
    }
  }
}

/**
 * Clear tripwire cache (call after tripwire updates)
 */
export function clearTripwireCache(projectId?: string): void {
  if (projectId) {
    tripwireCache.delete(projectId);
  } else {
    tripwireCache.clear();
  }
}

// Worker event handlers
tripwireWorker.on('completed', (job, result) => {
  console.log(`[Tripwire] Job ${job.id} completed: ${result.triggeredCount} alerts`);
});

tripwireWorker.on('failed', (job, error) => {
  console.error(`[Tripwire] Job ${job?.id} failed:`, error);
});
```

---

## 9.11 Alert Dispatch Service

The alert dispatch service routes triggered alerts to appropriate channels based on user preferences.

**File: `apps/api/src/feeds/services/alert-dispatch.service.ts`**
```typescript
import { Worker, Job } from 'bullmq';
import { redis } from '../../lib/redis';
import { db } from '../../db';
import { alerts, userNotificationPreferences, users } from '../../db/schema';
import { publishUpdate } from '../../websocket/server';
import type { AlertJobData } from '../../jobs/queues';
import { eq, inArray } from 'drizzle-orm';

// Email service (placeholder - integrate with actual email provider)
interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

// Push notification service (placeholder)
interface PushService {
  send(userId: string, title: string, body: string, data?: object): Promise<void>;
}

let emailService: EmailService | null = null;
let pushService: PushService | null = null;

export function setEmailService(service: EmailService): void {
  emailService = service;
}

export function setPushService(service: PushService): void {
  pushService = service;
}

export const alertDispatchWorker = new Worker<AlertJobData>(
  'alerts',
  async (job: Job<AlertJobData>) => {
    const { alertId, projectId, tripwireId, severity, message, data, notifyUsers } = job.data;

    console.log(`[Alert] Dispatching alert ${alertId} (${severity})`);

    // Store alert in database
    const [storedAlert] = await db
      .insert(alerts)
      .values({
        id: alertId,
        projectId,
        tripwireId,
        severity,
        message,
        data: JSON.stringify(data),
        status: 'pending',
        createdAt: new Date(),
      })
      .returning();

    // Get notification preferences for all users to notify
    const preferences = await db
      .select()
      .from(userNotificationPreferences)
      .where(inArray(userNotificationPreferences.userId, notifyUsers));

    // Get user emails
    const userList = await db
      .select()
      .from(users)
      .where(inArray(users.id, notifyUsers));

    const userMap = new Map(userList.map((u) => [u.id, u]));

    const results = {
      websocket: 0,
      email: 0,
      push: 0,
      errors: [] as string[],
    };

    // Always broadcast to WebSocket for real-time UI updates
    try {
      await publishUpdate(projectId, {
        type: 'alert',
        payload: {
          id: alertId,
          tripwireId,
          severity,
          message,
          data: data.feedItem,
          timestamp: new Date().toISOString(),
        },
      });
      results.websocket++;
    } catch (error) {
      results.errors.push(`WebSocket broadcast failed: ${error}`);
    }

    // Process each user's preferences
    for (const userId of notifyUsers) {
      const prefs = preferences.find((p) => p.userId === userId);
      const user = userMap.get(userId);

      if (!user) continue;

      // Check severity threshold
      const severityLevel = getSeverityLevel(severity);
      const minSeverityLevel = prefs?.minSeverity ? getSeverityLevel(prefs.minSeverity) : 1;

      if (severityLevel < minSeverityLevel) {
        continue;
      }

      // Email notification
      if (prefs?.emailEnabled !== false && user.email && emailService) {
        try {
          await emailService.send(
            user.email,
            `[${severity.toUpperCase()}] ${formatAlertSubject(message)}`,
            formatAlertEmail(message, data, severity)
          );
          results.email++;
        } catch (error) {
          results.errors.push(`Email to ${user.email} failed: ${error}`);
        }
      }

      // Push notification
      if (prefs?.pushEnabled && pushService) {
        try {
          await pushService.send(
            userId,
            `${severity.toUpperCase()} Alert`,
            message,
            { alertId, projectId }
          );
          results.push++;
        } catch (error) {
          results.errors.push(`Push to ${userId} failed: ${error}`);
        }
      }
    }

    // Update alert status
    await db
      .update(alerts)
      .set({
        status: results.errors.length === 0 ? 'dispatched' : 'partial',
        dispatchedAt: new Date(),
        dispatchResults: JSON.stringify(results),
      })
      .where(eq(alerts.id, alertId));

    return results;
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

function getSeverityLevel(severity: string): number {
  switch (severity) {
    case 'critical':
      return 3;
    case 'warning':
      return 2;
    case 'info':
    default:
      return 1;
  }
}

function formatAlertSubject(message: string): string {
  // Truncate for email subject
  if (message.length <= 50) return message;
  return message.slice(0, 47) + '...';
}

function formatAlertEmail(message: string, data: any, severity: string): string {
  const feedItem = data.feedItem;

  return `
Alert Details
=============
Severity: ${severity.toUpperCase()}

Message: ${message}

Feed Item Details
-----------------
Title: ${feedItem?.title || 'N/A'}
Type: ${feedItem?.type || 'N/A'}
Time: ${feedItem?.timestamp || 'N/A'}
${feedItem?.location?.name ? `Location: ${feedItem.location.name}` : ''}
${feedItem?.location?.lat ? `Coordinates: ${feedItem.location.lat}, ${feedItem.location.lng}` : ''}

Matched Conditions: ${data.matchedConditions?.join(', ') || 'N/A'}
Match Score: ${data.score ? (data.score * 100).toFixed(1) + '%' : 'N/A'}

---
This alert was generated by Situation Monitor.
To manage your notification preferences, visit your account settings.
  `.trim();
}

// Worker event handlers
alertDispatchWorker.on('completed', (job, result) => {
  console.log(
    `[Alert] Job ${job.id} completed: WS=${result.websocket}, Email=${result.email}, Push=${result.push}`
  );
});

alertDispatchWorker.on('failed', (job, error) => {
  console.error(`[Alert] Job ${job?.id} failed:`, error);
});
```

### Email Integration Example

**File: `apps/api/src/lib/email.ts`**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const emailService = {
  async send(to: string, subject: string, body: string): Promise<void> {
    await resend.emails.send({
      from: 'alerts@situationmonitor.app',
      to,
      subject,
      text: body,
    });
  },
};
```

---

## 9.14 Live Feed Panel Component

Real-time feed display with WebSocket integration for instant updates.

**File: `apps/web/src/features/feeds/LiveFeedPanel.tsx`**
```typescript
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useProjectId } from '@/hooks/useProjectId';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Newspaper,
  Plane,
  Ship,
  Cloud,
  AlertTriangle,
  Flame,
  MessageSquare,
  Filter,
  Search,
  RefreshCw,
  MapPin,
  Bell,
  ChevronDown,
  ExternalLink,
  Pause,
  Play,
} from 'lucide-react';

// Feed item types
export type FeedItemType =
  | 'news'
  | 'flight'
  | 'maritime'
  | 'weather'
  | 'event'
  | 'observation'
  | 'social';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  content?: string;
  timestamp: string;
  location?: {
    lat: number;
    lng: number;
    name?: string;
  };
  metadata: Record<string, unknown>;
  severity?: 'info' | 'warning' | 'critical';
}

interface LiveFeedPanelProps {
  className?: string;
  maxItems?: number;
  onItemClick?: (item: FeedItem) => void;
  onItemHover?: (item: FeedItem | null) => void;
  initialFilters?: FeedFilters;
}

interface FeedFilters {
  types: FeedItemType[];
  searchQuery: string;
  severity?: 'all' | 'info' | 'warning' | 'critical';
  location?: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
}

// Type icon mapping
const typeIcons: Record<FeedItemType, typeof Newspaper> = {
  news: Newspaper,
  flight: Plane,
  maritime: Ship,
  weather: Cloud,
  event: AlertTriangle,
  observation: MapPin,
  social: MessageSquare,
};

// Type colors
const typeColors: Record<FeedItemType, string> = {
  news: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  flight: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  maritime: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  weather: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  event: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  observation: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  social: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

// Severity colors
const severityColors: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-500/5',
  warning: 'border-l-amber-500 bg-amber-500/5',
  info: 'border-l-blue-500',
};

export function LiveFeedPanel({
  className,
  maxItems = 100,
  onItemClick,
  onItemHover,
  initialFilters,
}: LiveFeedPanelProps) {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [newItemCount, setNewItemCount] = useState(0);

  // Feed items state
  const [items, setItems] = useState<FeedItem[]>([]);

  // Filters state
  const [filters, setFilters] = useState<FeedFilters>(
    initialFilters || {
      types: ['news', 'flight', 'maritime', 'weather', 'event', 'observation', 'social'],
      searchQuery: '',
      severity: 'all',
    }
  );

  // WebSocket connection
  const { isConnected, lastMessage, subscribe } = useWebSocket(projectId);

  // Initial data fetch
  const { data: initialItems, isLoading } = useQuery({
    queryKey: ['feed-items', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/feeds/items?limit=${maxItems}`);
      if (!response.ok) throw new Error('Failed to fetch feed items');
      return response.json() as Promise<FeedItem[]>;
    },
    staleTime: 30000,
  });

  // Set initial items
  useEffect(() => {
    if (initialItems) {
      setItems(initialItems);
    }
  }, [initialItems]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'feed_item') {
      const newItem = lastMessage.payload as FeedItem;

      if (isPaused) {
        setNewItemCount((prev) => prev + 1);
        return;
      }

      setItems((prev) => {
        // Add to beginning, remove oldest if over limit
        const updated = [newItem, ...prev];
        if (updated.length > maxItems) {
          updated.pop();
        }
        return updated;
      });
    }
  }, [lastMessage, isPaused, maxItems]);

  // Subscribe to feed updates
  useEffect(() => {
    subscribe(['feed_item', 'alert']);
  }, [subscribe]);

  // Resume and catch up on missed items
  const handleResume = useCallback(() => {
    setIsPaused(false);
    setNewItemCount(0);
    // Refetch to get any missed items
    queryClient.invalidateQueries({ queryKey: ['feed-items', projectId] });
  }, [queryClient, projectId]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Type filter
      if (!filters.types.includes(item.type)) return false;

      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(query) ||
          item.content?.toLowerCase().includes(query) ||
          item.location?.name?.toLowerCase().includes(query);
        if (!matches) return false;
      }

      // Severity filter
      if (filters.severity && filters.severity !== 'all') {
        if (item.severity !== filters.severity) return false;
      }

      // Location filter
      if (filters.location && item.location) {
        const distance = calculateDistance(
          filters.location.lat,
          filters.location.lng,
          item.location.lat,
          item.location.lng
        );
        if (distance > filters.location.radiusKm) return false;
      }

      return true;
    });
  }, [items, filters]);

  // Toggle type filter
  const toggleType = useCallback((type: FeedItemType) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  }, []);

  return (
    <div className={cn('flex flex-col h-full bg-background/95 border border-border/50', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-sm font-medium text-foreground">LIVE FEED</h3>
          {isConnected ? (
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse" />
              LIVE
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
              DISCONNECTED
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Pause/Resume button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (isPaused ? handleResume() : setIsPaused(true))}
            className={cn(isPaused && 'text-amber-400')}
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4 mr-1" />
                Resume
                {newItemCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {newItemCount}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </>
            )}
          </Button>

          {/* Refresh button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['feed-items', projectId] })}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b border-border/50 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search feed items..."
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            className="pl-9 h-9 bg-background/50"
          />
        </div>

        {/* Type filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Types
                <Badge variant="secondary" className="ml-1.5">
                  {filters.types.length}
                </Badge>
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Feed Types</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(typeIcons) as FeedItemType[]).map((type) => {
                const Icon = typeIcons[type];
                return (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={filters.types.includes(type)}
                    onCheckedChange={() => toggleType(type)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Severity filter */}
          <Select
            value={filters.severity || 'all'}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                severity: value as 'all' | 'info' | 'warning' | 'critical',
              }))
            }
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>

          {/* Active filter count */}
          <span className="text-xs text-muted-foreground">
            {filteredItems.length} items
          </span>
        </div>
      </div>

      {/* Feed items list */}
      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Loading feed...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No feed items match your filters</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <FeedItemCard
                key={item.id}
                item={item}
                onClick={() => onItemClick?.(item)}
                onMouseEnter={() => onItemHover?.(item)}
                onMouseLeave={() => onItemHover?.(null)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Individual feed item card
interface FeedItemCardProps {
  item: FeedItem;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function FeedItemCard({ item, onClick, onMouseEnter, onMouseLeave }: FeedItemCardProps) {
  const Icon = typeIcons[item.type] || MapPin;
  const severityClass = item.severity ? severityColors[item.severity] : '';

  return (
    <div
      className={cn(
        'p-3 rounded-md border border-border/30 cursor-pointer transition-colors',
        'hover:bg-accent/50 hover:border-border/50',
        'border-l-2',
        severityClass || 'border-l-transparent'
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className={cn('p-2 rounded border', typeColors[item.type])}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn('text-xs', typeColors[item.type])}>
              {item.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </span>
          </div>

          {/* Title */}
          <h4 className="font-medium text-sm text-foreground line-clamp-2">{item.title}</h4>

          {/* Location */}
          {item.location?.name && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {item.location.name}
            </div>
          )}

          {/* Metadata preview */}
          {item.metadata?.source && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              {item.metadata.source as string}
            </div>
          )}
        </div>

        {/* Severity indicator */}
        {item.severity === 'critical' && (
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
        )}
        {item.severity === 'warning' && (
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

// Haversine distance calculation
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
```

### WebSocket Hook

**File: `apps/web/src/hooks/useWebSocket.ts`**
```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

interface WebSocketMessage {
  type: string;
  payload: unknown;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  send: (message: WebSocketMessage) => void;
  subscribe: (types: string[]) => void;
}

export function useWebSocket(projectId: string): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<string[]>([]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = localStorage.getItem('auth_token');
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8080'}/ws/map/${projectId}?token=${token}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);

      // Re-subscribe to previous subscriptions
      if (subscriptionsRef.current.length > 0) {
        ws.send(JSON.stringify({ type: 'subscribe', payload: subscriptionsRef.current }));
      }

      // Start ping interval
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);

      ws.addEventListener('close', () => clearInterval(pingInterval));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type !== 'pong') {
          setLastMessage(message);
        }
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('[WebSocket] Disconnected:', event.code, event.reason);
      setIsConnected(false);

      // Reconnect after delay (unless intentionally closed)
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WebSocket] Attempting reconnect...');
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    wsRef.current = ws;
  }, [projectId]);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect]);

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((types: string[]) => {
    subscriptionsRef.current = types;
    send({ type: 'subscribe', payload: types });
  }, [send]);

  return { isConnected, lastMessage, send, subscribe };
}
```

---

## 9.15 Timeline Scrubber Component

Playback controls for historical feed data visualization.

**File: `apps/web/src/features/feeds/TimelineScrubber.tsx`**
```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { format, addMinutes, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Clock,
  Calendar,
} from 'lucide-react';

interface TimelineScrubberProps {
  className?: string;
  startTime: Date;
  endTime: Date;
  currentTime: Date;
  onTimeChange: (time: Date) => void;
  onPlaybackChange?: (isPlaying: boolean) => void;
  playbackSpeed?: number;
  onSpeedChange?: (speed: number) => void;
}

const PLAYBACK_SPEEDS = [0.5, 1, 2, 5, 10, 30, 60];

export function TimelineScrubber({
  className,
  startTime,
  endTime,
  currentTime,
  onTimeChange,
  onPlaybackChange,
  playbackSpeed = 1,
  onSpeedChange,
}: TimelineScrubberProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [localSpeed, setLocalSpeed] = useState(playbackSpeed);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate position as percentage
  const totalMinutes = differenceInMinutes(endTime, startTime);
  const currentMinutes = differenceInMinutes(currentTime, startTime);
  const position = (currentMinutes / totalMinutes) * 100;

  // Handle playback
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const newTime = addMinutes(currentTime, localSpeed);
        if (newTime >= endTime) {
          setIsPlaying(false);
          onTimeChange(endTime);
        } else {
          onTimeChange(newTime);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentTime, localSpeed, endTime, onTimeChange]);

  // Notify parent of playback state changes
  useEffect(() => {
    onPlaybackChange?.(isPlaying);
  }, [isPlaying, onPlaybackChange]);

  const handleSliderChange = useCallback(
    (value: number[]) => {
      const minutes = (value[0] / 100) * totalMinutes;
      const newTime = addMinutes(startTime, minutes);
      onTimeChange(newTime);
    },
    [startTime, totalMinutes, onTimeChange]
  );

  const handleSpeedChange = useCallback(() => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(localSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const newSpeed = PLAYBACK_SPEEDS[nextIndex];
    setLocalSpeed(newSpeed);
    onSpeedChange?.(newSpeed);
  }, [localSpeed, onSpeedChange]);

  const skipForward = useCallback(() => {
    const newTime = addMinutes(currentTime, 5);
    onTimeChange(newTime > endTime ? endTime : newTime);
  }, [currentTime, endTime, onTimeChange]);

  const skipBackward = useCallback(() => {
    const newTime = addMinutes(currentTime, -5);
    onTimeChange(newTime < startTime ? startTime : newTime);
  }, [currentTime, startTime, onTimeChange]);

  const goToStart = useCallback(() => {
    onTimeChange(startTime);
  }, [startTime, onTimeChange]);

  const goToEnd = useCallback(() => {
    onTimeChange(endTime);
    setIsPlaying(false);
  }, [endTime, onTimeChange]);

  const goToLive = useCallback(() => {
    onTimeChange(new Date());
    setIsPlaying(false);
  }, [onTimeChange]);

  return (
    <div className={cn('bg-background/95 border border-border/50 p-3', className)}>
      {/* Timeline slider */}
      <div className="mb-3">
        <Slider
          value={[position]}
          min={0}
          max={100}
          step={0.1}
          onValueChange={handleSliderChange}
          className="cursor-pointer"
        />
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-xs text-muted-foreground mb-3 font-mono">
        <span>{format(startTime, 'HH:mm')}</span>
        <span className="text-foreground font-medium">
          {format(currentTime, 'yyyy-MM-dd HH:mm:ss')}
        </span>
        <span>{format(endTime, 'HH:mm')}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Left controls */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToStart}>
                  <SkipBack className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Go to start</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipBackward}>
                  <Rewind className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back 5 minutes</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Center controls */}
        <div className="flex items-center gap-2">
          <Button
            variant={isPlaying ? 'secondary' : 'default'}
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="min-w-[80px]"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Play
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSpeedChange}
            className="min-w-[60px] font-mono"
          >
            {localSpeed}x
          </Button>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipForward}>
                  <FastForward className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Forward 5 minutes</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToEnd}>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Go to end</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToLive}
                  className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  LIVE
                </Button>
              </TooltipTrigger>
              <TooltipContent>Jump to live</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
```

---

## 9.16 Feed Configuration Panel

Management interface for feed sources and polling settings.

**File: `apps/web/src/features/feeds/FeedConfigPanel.tsx`**
```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useProjectId } from '@/hooks/useProjectId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Newspaper,
  Plane,
  Ship,
  Cloud,
  AlertTriangle,
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

// Feed configuration types
interface FeedConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  pollInterval: number;
  apiKey?: string;
  endpoint?: string;
  options?: Record<string, unknown>;
  status: 'active' | 'paused' | 'error';
  lastFetchAt?: string;
  lastError?: string;
  itemCount: number;
}

interface FeedConfigPanelProps {
  className?: string;
}

const feedTypeOptions = [
  { value: 'newsapi', label: 'NewsAPI', icon: Newspaper },
  { value: 'rss', label: 'RSS Feeds', icon: Newspaper },
  { value: 'gdelt', label: 'GDELT', icon: Newspaper },
  { value: 'adsb', label: 'ADS-B Flight Tracking', icon: Plane },
  { value: 'ais', label: 'AIS Maritime Tracking', icon: Ship },
  { value: 'weather', label: 'Weather', icon: Cloud },
  { value: 'acled', label: 'ACLED Events', icon: AlertTriangle },
  { value: 'firms', label: 'NASA FIRMS', icon: AlertTriangle },
  { value: 'telegram', label: 'Telegram', icon: MessageSquare },
];

const pollIntervalOptions = [
  { value: 30000, label: '30 seconds' },
  { value: 60000, label: '1 minute' },
  { value: 300000, label: '5 minutes' },
  { value: 900000, label: '15 minutes' },
  { value: 3600000, label: '1 hour' },
];

export function FeedConfigPanel({ className }: FeedConfigPanelProps) {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<FeedConfig | null>(null);

  // Fetch feeds
  const { data: feeds = [], isLoading } = useQuery({
    queryKey: ['feed-configs', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/feeds`);
      if (!response.ok) throw new Error('Failed to fetch feeds');
      return response.json() as Promise<FeedConfig[]>;
    },
  });

  // Toggle feed enabled
  const toggleFeedMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await fetch(`/api/projects/${projectId}/feeds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error('Failed to update feed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-configs', projectId] });
    },
  });

  // Delete feed
  const deleteFeedMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/projects/${projectId}/feeds/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete feed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-configs', projectId] });
    },
  });

  // Create/Update feed
  const saveFeedMutation = useMutation({
    mutationFn: async (feed: Partial<FeedConfig>) => {
      const method = feed.id ? 'PUT' : 'POST';
      const url = feed.id
        ? `/api/projects/${projectId}/feeds/${feed.id}`
        : `/api/projects/${projectId}/feeds`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feed),
      });
      if (!response.ok) throw new Error('Failed to save feed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-configs', projectId] });
      setIsAddDialogOpen(false);
      setEditingFeed(null);
    },
  });

  const getStatusBadge = (feed: FeedConfig) => {
    if (feed.status === 'active') {
      return (
        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    }
    if (feed.status === 'error') {
      return (
        <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
        <Clock className="h-3 w-3 mr-1" />
        Paused
      </Badge>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Feed Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Manage data sources and polling settings
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Feed
            </Button>
          </DialogTrigger>
          <FeedDialog
            feed={editingFeed}
            onSave={(feed) => saveFeedMutation.mutate(feed)}
            onCancel={() => {
              setIsAddDialogOpen(false);
              setEditingFeed(null);
            }}
            isLoading={saveFeedMutation.isPending}
          />
        </Dialog>
      </div>

      {/* Feed list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin mr-2 text-muted-foreground" />
          <span className="text-muted-foreground">Loading feeds...</span>
        </div>
      ) : feeds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Settings className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              No feeds configured yet.
              <br />
              Add a feed to start receiving real-time data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feeds.map((feed) => {
            const FeedIcon =
              feedTypeOptions.find((t) => t.value === feed.type)?.icon || Newspaper;

            return (
              <Card key={feed.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    {/* Left side - Feed info */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded bg-accent/50">
                        <FeedIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{feed.name}</h3>
                          {getStatusBadge(feed)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {feedTypeOptions.find((t) => t.value === feed.type)?.label || feed.type}
                          {' - '}
                          {pollIntervalOptions.find((p) => p.value === feed.pollInterval)?.label ||
                            `${feed.pollInterval / 1000}s`}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{feed.itemCount.toLocaleString()} items</span>
                          {feed.lastFetchAt && (
                            <span>
                              Last fetch:{' '}
                              {new Date(feed.lastFetchAt).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                        {feed.lastError && (
                          <p className="text-xs text-red-400 mt-1">{feed.lastError}</p>
                        )}
                      </div>
                    </div>

                    {/* Right side - Controls */}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={feed.enabled}
                        onCheckedChange={(enabled) =>
                          toggleFeedMutation.mutate({ id: feed.id, enabled })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingFeed(feed);
                          setIsAddDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Feed</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{feed.name}"? This action cannot
                              be undone. All collected data will be retained.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteFeedMutation.mutate(feed.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Feed edit/create dialog
interface FeedDialogProps {
  feed: FeedConfig | null;
  onSave: (feed: Partial<FeedConfig>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function FeedDialog({ feed, onSave, onCancel, isLoading }: FeedDialogProps) {
  const [formData, setFormData] = useState<Partial<FeedConfig>>(
    feed || {
      name: '',
      type: 'rss',
      enabled: true,
      pollInterval: 300000,
      options: {},
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <DialogContent className="max-w-md">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>{feed ? 'Edit Feed' : 'Add Feed'}</DialogTitle>
          <DialogDescription>
            Configure a data source for real-time ingestion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My News Feed"
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Feed Type</Label>
            <Select
              value={formData.type}
              onValueChange={(type) => setFormData({ ...formData, type })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {feedTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Poll Interval */}
          <div className="space-y-2">
            <Label htmlFor="pollInterval">Poll Interval</Label>
            <Select
              value={String(formData.pollInterval)}
              onValueChange={(val) => setFormData({ ...formData, pollInterval: Number(val) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pollIntervalOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key (if applicable) */}
          {['newsapi', 'adsb', 'ais', 'telegram'].includes(formData.type || '') && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey || ''}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="Enter API key"
              />
            </div>
          )}

          {/* Endpoint (for RSS/custom) */}
          {['rss', 'weather'].includes(formData.type || '') && (
            <div className="space-y-2">
              <Label htmlFor="endpoint">Endpoint URL</Label>
              <Input
                id="endpoint"
                value={formData.endpoint || ''}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                placeholder="https://example.com/feed.xml"
              />
            </div>
          )}

          {/* Enabled */}
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">Enabled</Label>
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
```

---

## 9.17 Notification Preferences

User settings for alert routing and severity thresholds.

**File: `apps/web/src/features/feeds/NotificationPreferences.tsx`**
```typescript
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, Smartphone, Volume2, VolumeX, RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  soundEnabled: boolean;
  minSeverity: 'info' | 'warning' | 'critical';
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm format
  quietHoursEnd: string;
  emailDigest: 'realtime' | 'hourly' | 'daily' | 'none';
  subscribedTripwires: string[];
}

interface NotificationPreferencesProps {
  className?: string;
}

export function NotificationPreferences({ className }: NotificationPreferencesProps) {
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences | null>(null);

  // Fetch preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const response = await fetch('/api/user/notification-preferences');
      if (!response.ok) throw new Error('Failed to fetch preferences');
      return response.json() as Promise<NotificationPreferences>;
    },
  });

  // Set local state when data loads
  useEffect(() => {
    if (preferences && !localPrefs) {
      setLocalPrefs(preferences);
    }
  }, [preferences, localPrefs]);

  // Update preferences mutation
  const updateMutation = useMutation({
    mutationFn: async (prefs: NotificationPreferences) => {
      const response = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (!response.ok) throw new Error('Failed to update preferences');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      setHasChanges(false);
      toast.success('Preferences saved');
    },
    onError: (error) => {
      toast.error('Failed to save preferences');
    },
  });

  const updatePref = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    if (!localPrefs) return;
    setLocalPrefs({ ...localPrefs, [key]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (localPrefs) {
      updateMutation.mutate(localPrefs);
    }
  };

  if (isLoading || !localPrefs) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <RefreshCw className="h-5 w-5 animate-spin mr-2 text-muted-foreground" />
        <span className="text-muted-foreground">Loading preferences...</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Notification Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Configure how you receive alerts and updates
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : hasChanges ? (
            'Save Changes'
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Saved
            </>
          )}
        </Button>
      </div>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Channels</CardTitle>
          <CardDescription>Choose how to receive alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Browser Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-accent/50">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <Label className="text-sm font-medium">Browser Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive push notifications in your browser
                </p>
              </div>
            </div>
            <Switch
              checked={localPrefs.pushEnabled}
              onCheckedChange={(checked) => updatePref('pushEnabled', checked)}
            />
          </div>

          <Separator />

          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-accent/50">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <Label className="text-sm font-medium">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive alerts via email
                </p>
              </div>
            </div>
            <Switch
              checked={localPrefs.emailEnabled}
              onCheckedChange={(checked) => updatePref('emailEnabled', checked)}
            />
          </div>

          {localPrefs.emailEnabled && (
            <div className="ml-12 space-y-2">
              <Label className="text-xs text-muted-foreground">Email Frequency</Label>
              <Select
                value={localPrefs.emailDigest}
                onValueChange={(value) =>
                  updatePref('emailDigest', value as NotificationPreferences['emailDigest'])
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time</SelectItem>
                  <SelectItem value="hourly">Hourly digest</SelectItem>
                  <SelectItem value="daily">Daily digest</SelectItem>
                  <SelectItem value="none">Critical only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {/* Sound */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-accent/50">
                {localPrefs.soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </div>
              <div>
                <Label className="text-sm font-medium">Sound Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Play sound when alerts arrive
                </p>
              </div>
            </div>
            <Switch
              checked={localPrefs.soundEnabled}
              onCheckedChange={(checked) => updatePref('soundEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Severity Threshold */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Severity Threshold</CardTitle>
          <CardDescription>Minimum severity level for notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select
              value={localPrefs.minSeverity}
              onValueChange={(value) =>
                updatePref('minSeverity', value as NotificationPreferences['minSeverity'])
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-blue-500/20 text-blue-400 border-blue-500/30"
                    >
                      Info
                    </Badge>
                    All alerts
                  </div>
                </SelectItem>
                <SelectItem value="warning">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-amber-500/20 text-amber-400 border-amber-500/30"
                    >
                      Warning
                    </Badge>
                    and above
                  </div>
                </SelectItem>
                <SelectItem value="critical">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-red-500/20 text-red-400 border-red-500/30"
                    >
                      Critical
                    </Badge>
                    only
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              You will only receive notifications for alerts at or above this level
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Quiet Hours</CardTitle>
              <CardDescription>
                Suppress non-critical notifications during these hours
              </CardDescription>
            </div>
            <Switch
              checked={localPrefs.quietHoursEnabled}
              onCheckedChange={(checked) => updatePref('quietHoursEnabled', checked)}
            />
          </div>
        </CardHeader>
        {localPrefs.quietHoursEnabled && (
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Start Time</Label>
                <input
                  type="time"
                  value={localPrefs.quietHoursStart}
                  onChange={(e) => updatePref('quietHoursStart', e.target.value)}
                  className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                />
              </div>
              <span className="text-muted-foreground">to</span>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">End Time</Label>
                <input
                  type="time"
                  value={localPrefs.quietHoursEnd}
                  onChange={(e) => updatePref('quietHoursEnd', e.target.value)}
                  className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Critical alerts will still be delivered during quiet hours
            </p>
          </CardContent>
        )}
      </Card>

      {/* Test Notification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test Notifications</CardTitle>
          <CardDescription>Send a test notification to verify your settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              // Trigger test notification
              if (localPrefs.pushEnabled && 'Notification' in window) {
                Notification.requestPermission().then((permission) => {
                  if (permission === 'granted') {
                    new Notification('Test Alert', {
                      body: 'This is a test notification from Situation Monitor',
                      icon: '/icon.png',
                    });
                    toast.success('Test notification sent');
                  }
                });
              } else {
                toast.info('Enable browser notifications to test');
              }
            }}
          >
            <Bell className="h-4 w-4 mr-2" />
            Send Test Notification
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/feeds/normalizer.service.ts` | Data normalization service with adapter registry |
| `apps/api/src/feeds/type-mapper.ts` | Type mapping configuration |
| `apps/api/src/jobs/workers/tripwire.worker.ts` | Tripwire checking BullMQ worker |
| `apps/api/src/feeds/services/alert-dispatch.service.ts` | Alert dispatch service |
| `apps/api/src/lib/email.ts` | Email service integration |
| `apps/web/src/features/feeds/LiveFeedPanel.tsx` | Real-time feed display component |
| `apps/web/src/hooks/useWebSocket.ts` | WebSocket connection hook |
| `apps/web/src/features/feeds/TimelineScrubber.tsx` | Timeline playback controls |
| `apps/web/src/features/feeds/FeedConfigPanel.tsx` | Feed configuration UI |
| `apps/web/src/features/feeds/NotificationPreferences.tsx` | User notification settings |

---

## Acceptance Criteria

### Data Normalizer (9.9)
- [ ] Normalizer converts all feed types to common `NormalizedFeedItem` schema
- [ ] Adapter registry allows dynamic registration of new adapters
- [ ] Validation catches missing required fields
- [ ] Location data converted to consistent format
- [ ] GeoJSON conversion works for map display
- [ ] Batch normalization processes arrays efficiently

### Tripwire Worker (9.10)
- [ ] Tripwire worker checks incoming items against configured tripwires
- [ ] Keyword conditions match in title, content, and metadata
- [ ] Geofence conditions use proper distance/polygon calculations
- [ ] Threshold conditions support all comparison operators
- [ ] Entity conditions match people, organizations, locations
- [ ] AND/OR logic combines conditions correctly
- [ ] Cooldown periods prevent alert flooding
- [ ] Cache invalidates when tripwires are updated

### Alert Dispatch (9.11)
- [ ] Alerts always broadcast to WebSocket for real-time UI
- [ ] Email notifications respect user preferences
- [ ] Push notifications sent when enabled
- [ ] Severity filtering works correctly
- [ ] Alert status tracked in database
- [ ] Dispatch errors logged and handled gracefully

### Live Feed Panel (9.14)
- [ ] Live feed panel shows real-time updates via WebSocket
- [ ] Feed items can be filtered by type
- [ ] Feed items can be filtered by location (radius)
- [ ] Search filters by title, content, and location name
- [ ] Severity filter works correctly
- [ ] Pause/resume functionality works
- [ ] Reconnection handles network interruptions
- [ ] Connection status displayed accurately

### Timeline Scrubber (9.15)
- [ ] Timeline shows correct time range
- [ ] Playback controls work (play/pause/skip)
- [ ] Speed adjustment works across multiple speeds
- [ ] Slider updates time position accurately
- [ ] Jump to live works correctly

### Feed Configuration (9.16)
- [ ] Feed list displays all configured feeds
- [ ] Enable/disable toggle works immediately
- [ ] Add new feed dialog collects required info
- [ ] Edit existing feed preserves current settings
- [ ] Delete confirmation prevents accidents
- [ ] Status indicators show active/paused/error

### Notification Preferences (9.17)
- [ ] Email notification toggle persists
- [ ] Push notification toggle requests permission
- [ ] Sound toggle works
- [ ] Severity threshold filters correctly
- [ ] Quiet hours suppress non-critical alerts
- [ ] Test notification sends successfully
- [ ] Changes saved to database

---

## Dependencies

```bash
# API
cd apps/api
pnpm add @turf/turf resend uuid
pnpm add -D @types/uuid

# Web
cd apps/web
pnpm add date-fns sonner
```

---

## Environment Variables

```bash
# Alert dispatch
RESEND_API_KEY=your_resend_api_key
ALERT_FROM_EMAIL=alerts@situationmonitor.app

# WebSocket
VITE_WS_URL=ws://localhost:8080
```

---

## Database Schema Additions

```sql
-- Tripwires table
CREATE TABLE tripwires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  name VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  severity VARCHAR(20) DEFAULT 'warning',
  condition_logic VARCHAR(10) DEFAULT 'AND',
  cooldown_minutes INTEGER DEFAULT 5,
  notify_users JSONB DEFAULT '[]',
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tripwire conditions table
CREATE TABLE tripwire_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tripwire_id UUID NOT NULL REFERENCES tripwires(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  operator VARCHAR(20) NOT NULL,
  field VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  case_sensitive BOOLEAN DEFAULT false
);

-- Alerts table
CREATE TABLE alerts (
  id VARCHAR(100) PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  tripwire_id UUID REFERENCES tripwires(id),
  severity VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  dispatched_at TIMESTAMP,
  dispatch_results JSONB
);

-- User notification preferences
CREATE TABLE user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT false,
  sound_enabled BOOLEAN DEFAULT true,
  min_severity VARCHAR(20) DEFAULT 'info',
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  email_digest VARCHAR(20) DEFAULT 'realtime',
  subscribed_tripwires JSONB DEFAULT '[]'
);

-- Indexes
CREATE INDEX idx_tripwires_project ON tripwires(project_id);
CREATE INDEX idx_tripwire_conditions_tripwire ON tripwire_conditions(tripwire_id);
CREATE INDEX idx_alerts_project ON alerts(project_id);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
```
