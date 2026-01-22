/**
 * Infrastructure Processor Service
 *
 * Orchestrates the critical infrastructure monitoring pipeline:
 * 1. Fetches data from all infrastructure adapters
 * 2. Correlates raw incidents using IncidentCorrelator
 * 3. Stores correlated incidents
 * 4. Publishes updates via Redis pub/sub
 */

import { redisPub } from '../../lib/redis';
import type { FeedConfig, FeedFetchResult, FeedFilterOptions } from '../adapter.interface';
import { fetchFeedItems, storeItems } from '../normalizer.service';
import type {
  RawIncident,
  InfrastructureIncident,
  GeoBounds,
} from '../types/critical-infrastructure.types';

import { incidentCorrelator } from './incident-correlator';

// Redis channel for infrastructure incident broadcasts
const INFRASTRUCTURE_CHANNEL = 'infrastructure:incidents';

// Adapter types that produce infrastructure incidents
const INFRASTRUCTURE_ADAPTER_TYPES = [
  'satellite_fire',
  'infrastructure',
  'traffic_camera',
  'citizen_report',
] as const;

/**
 * Processing result
 */
export interface ProcessingResult {
  success: boolean;
  adapterType: string;
  itemsFetched: number;
  rawIncidents: number;
  correlatedIncidents: number;
  newIncidents: number;
  updatedIncidents: number;
  errors: string[];
  durationMs: number;
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
  success: boolean;
  results: ProcessingResult[];
  totalRawIncidents: number;
  totalCorrelatedIncidents: number;
  totalNewIncidents: number;
  totalUpdatedIncidents: number;
  errors: string[];
  durationMs: number;
}

/**
 * Extract raw incidents from fetch result metadata
 */
function extractRawIncidents(result: FeedFetchResult): RawIncident[] {
  const metadata = (result as FeedFetchResult & { metadata?: { rawIncidents?: RawIncident[] } })
    .metadata;
  return metadata?.rawIncidents || [];
}

/**
 * Infrastructure Processor Service
 */
export class InfrastructureProcessor {
  /**
   * Process a single infrastructure feed
   */
  async processFeed(config: FeedConfig, filters?: FeedFilterOptions): Promise<ProcessingResult> {
    const startTime = Date.now();
    const result: ProcessingResult = {
      success: false,
      adapterType: config.type,
      itemsFetched: 0,
      rawIncidents: 0,
      correlatedIncidents: 0,
      newIncidents: 0,
      updatedIncidents: 0,
      errors: [],
      durationMs: 0,
    };

    try {
      // Fetch items from adapter
      const fetchResult = await fetchFeedItems(config, filters);

      if (fetchResult.errors.length > 0) {
        result.errors.push(...fetchResult.errors);
      }

      result.itemsFetched = fetchResult.items.length;

      // Extract raw incidents from metadata
      const rawIncidents = extractRawIncidents(fetchResult);
      result.rawIncidents = rawIncidents.length;

      // Store feed items
      if (fetchResult.items.length > 0) {
        await storeItems(config.projectId, config.id, fetchResult.items);
      }

      // Correlate incidents if we have raw incidents
      if (rawIncidents.length > 0) {
        const correlationResult = await incidentCorrelator.correlateIncidents(rawIncidents);

        result.correlatedIncidents = correlationResult.incidents.length;
        result.newIncidents = correlationResult.stats.newIncidents;
        result.updatedIncidents = correlationResult.stats.updatedIncidents;

        // Publish new/updated incidents
        for (const incident of correlationResult.incidents) {
          await this.publishIncident(incident);
        }
      }

      result.success = true;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    result.durationMs = Date.now() - startTime;
    return result;
  }

  /**
   * Process all infrastructure feeds for a project
   */
  async processAllFeeds(
    configs: FeedConfig[],
    filters?: FeedFilterOptions
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const batchResult: BatchProcessingResult = {
      success: true,
      results: [],
      totalRawIncidents: 0,
      totalCorrelatedIncidents: 0,
      totalNewIncidents: 0,
      totalUpdatedIncidents: 0,
      errors: [],
      durationMs: 0,
    };

    // Filter to infrastructure-related configs
    const infrastructureConfigs = configs.filter((c) =>
      (INFRASTRUCTURE_ADAPTER_TYPES as readonly string[]).includes(c.type)
    );

    // Process each feed
    const results = await Promise.all(
      infrastructureConfigs.map((config) => this.processFeed(config, filters))
    );

    // Aggregate results
    for (const result of results) {
      batchResult.results.push(result);
      batchResult.totalRawIncidents += result.rawIncidents;
      batchResult.totalCorrelatedIncidents += result.correlatedIncidents;
      batchResult.totalNewIncidents += result.newIncidents;
      batchResult.totalUpdatedIncidents += result.updatedIncidents;

      if (!result.success) {
        batchResult.success = false;
        batchResult.errors.push(...result.errors);
      }
    }

    batchResult.durationMs = Date.now() - startTime;
    return batchResult;
  }

  /**
   * Process infrastructure feeds for a geographic area
   */
  async processArea(configs: FeedConfig[], bounds: GeoBounds): Promise<BatchProcessingResult> {
    return this.processAllFeeds(configs, { bounds });
  }

  /**
   * Manually trigger correlation of unprocessed incidents
   */
  correlateUnprocessedIncidents(): {
    processed: number;
    newIncidents: number;
    errors: string[];
  } {
    // This would query the database for unprocessed satellite_fires,
    // citizen_incidents, etc. and run them through the correlator
    // For now, this is a placeholder for manual triggering

    // TODO: Implement batch processing of historical data
    return {
      processed: 0,
      newIncidents: 0,
      errors: ['Not implemented - historical correlation pending'],
    };
  }

  /**
   * Publish an infrastructure incident to Redis
   */
  private async publishIncident(incident: InfrastructureIncident): Promise<void> {
    const message = JSON.stringify({
      type: 'infrastructure_incident',
      payload: {
        id: incident.id,
        sector: incident.sector,
        incidentType: incident.incidentType,
        severity: incident.severity,
        severityScore: incident.severityScore,
        title: incident.title,
        description: incident.description,
        location: {
          lat: incident.latitude,
          lng: incident.longitude,
          address: incident.address,
          state: incident.state,
        },
        facility: incident.facilityId
          ? {
              id: incident.facilityId,
              name: incident.facilityName,
              type: incident.facilityType,
            }
          : null,
        status: incident.status,
        verified: incident.verified,
        sourceCount: incident.sources.length,
        firstReportedAt: incident.firstReportedAt.toISOString(),
        lastReportedAt: incident.lastReportedAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

    try {
      await redisPub.publish(INFRASTRUCTURE_CHANNEL, message);
    } catch (error) {
      console.error('[InfrastructureProcessor] Failed to publish incident:', error);
    }
  }

  /**
   * Get the Redis channel name for subscribing to infrastructure incidents
   */
  static getChannel(): string {
    return INFRASTRUCTURE_CHANNEL;
  }
}

// Export singleton instance
export const infrastructureProcessor = new InfrastructureProcessor();

/**
 * Create a scheduled job for infrastructure processing
 */
export function createInfrastructureJob(
  configs: FeedConfig[],
  options?: {
    bounds?: GeoBounds;
    intervalMs?: number;
  }
): {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
} {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;

    try {
      const result = await infrastructureProcessor.processAllFeeds(
        configs,
        options?.bounds ? { bounds: options.bounds } : undefined
      );

      console.log(
        `[InfrastructureJob] Processed ${result.totalRawIncidents} raw incidents, ` +
          `created ${result.totalNewIncidents} new, updated ${result.totalUpdatedIncidents} ` +
          `in ${result.durationMs}ms`
      );

      if (result.errors.length > 0) {
        console.error('[InfrastructureJob] Errors:', result.errors);
      }
    } catch (error) {
      console.error('[InfrastructureJob] Failed:', error);
    } finally {
      running = false;
    }
  };

  return {
    start: () => {
      if (intervalId) return;
      console.log('[InfrastructureJob] Starting infrastructure processing job');
      void run(); // Run immediately
      intervalId = setInterval(() => void run(), options?.intervalMs || 300000); // 5 minutes default
    },
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('[InfrastructureJob] Stopped infrastructure processing job');
      }
    },
    isRunning: () => running,
  };
}
