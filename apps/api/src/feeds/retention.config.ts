/**
 * Feed Data Retention Configuration
 *
 * Defines how long feed items are retained before cleanup.
 * Different feed types have different retention periods based on:
 * - Data volume (high-frequency feeds have shorter retention)
 * - Analytical value (event data retained longer than real-time tracking)
 * - Storage costs
 */

import type { FeedType } from '../db/schema/feeds';

export interface RetentionPolicy {
  /** Retention period in days */
  days: number;
  /** Whether to keep items that have triggered alerts */
  keepAlerting: boolean;
  /** Optional: Keep high-severity items longer (multiplier) */
  highSeverityMultiplier?: number;
}

/**
 * Default retention policies by feed type
 */
export const retentionPolicies: Record<FeedType, RetentionPolicy> = {
  // High-frequency, real-time tracking data
  flight: {
    days: 7,
    keepAlerting: true,
    highSeverityMultiplier: 2, // Critical flights kept 14 days
  },

  maritime: {
    days: 7,
    keepAlerting: true,
    highSeverityMultiplier: 2,
  },

  // Event-based data with longer analytical value
  news: {
    days: 90,
    keepAlerting: true,
    highSeverityMultiplier: 1.5, // Critical news kept 135 days
  },

  telegram: {
    days: 90,
    keepAlerting: true,
    highSeverityMultiplier: 1.5,
  },

  // Important historical event data
  civil_unrest: {
    days: 365,
    keepAlerting: true,
    highSeverityMultiplier: 2, // Critical events kept 2 years
  },

  fire: {
    days: 365,
    keepAlerting: true,
    highSeverityMultiplier: 1.5,
  },

  // Custom feeds use default policy
  custom: {
    days: 30,
    keepAlerting: true,
  },
};

/**
 * Global retention settings
 */
export const retentionSettings = {
  /** Run retention cleanup at this hour (UTC) */
  scheduledHour: 3,

  /** Maximum items to delete per batch */
  batchSize: 1000,

  /** Delay between batches in ms (to avoid overwhelming DB) */
  batchDelayMs: 100,

  /** Whether retention cleanup is enabled */
  enabled: process.env.RETENTION_ENABLED !== 'false',

  /** Override retention days for all types (for testing) */
  globalOverrideDays: process.env.RETENTION_OVERRIDE_DAYS
    ? parseInt(process.env.RETENTION_OVERRIDE_DAYS, 10)
    : undefined,
};

/**
 * Get the retention date cutoff for a feed type
 */
export function getRetentionCutoff(
  feedType: FeedType,
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical'
): Date {
  const policy = retentionPolicies[feedType];
  let days = retentionSettings.globalOverrideDays ?? policy.days;

  // Apply high severity multiplier for critical/high items
  if (severity && ['critical', 'high'].includes(severity) && policy.highSeverityMultiplier) {
    days = Math.ceil(days * policy.highSeverityMultiplier);
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

/**
 * Check if an item should be retained based on policy
 */
export function shouldRetain(
  feedType: FeedType,
  createdAt: Date,
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical',
  hasTriggeredAlert?: boolean
): boolean {
  const policy = retentionPolicies[feedType];
  const cutoff = getRetentionCutoff(feedType, severity);

  // Item is newer than cutoff - keep it
  if (createdAt > cutoff) {
    return true;
  }

  // Item has triggered an alert and policy says keep alerting items
  if (hasTriggeredAlert && policy.keepAlerting) {
    return true;
  }

  // Item is older than cutoff and hasn't triggered alerts
  return false;
}
