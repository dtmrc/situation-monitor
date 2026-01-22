/**
 * Feed Adapter Interface
 *
 * Defines the contract for all feed adapters. Each adapter is responsible for:
 * 1. Fetching raw data from an external source
 * 2. Transforming raw data into normalized feed items
 * 3. Handling authentication and rate limiting for the source
 */

import type { feedConfigs } from '../db/schema/feeds';

// Feed type literals
export type FeedType =
  | 'news'
  | 'flight'
  | 'maritime'
  | 'civil_unrest'
  | 'fire'
  | 'telegram'
  | 'custom'
  // Critical infrastructure types
  | 'infrastructure'
  | 'satellite_fire'
  | 'traffic_camera'
  | 'citizen_report';

// Severity levels for feed items
export type FeedSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Geographic bounds for filtering
 */
export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Common filter options across all feed types
 */
export interface FeedFilterOptions {
  /** Geographic bounding box */
  bounds?: GeoBounds;
  /** Keywords to match */
  keywords?: string[];
  /** Categories/types to include */
  categories?: string[];
  /** Minimum severity level */
  minSeverity?: FeedSeverity;
  /** Maximum age of items in milliseconds */
  maxAge?: number;
  /** Maximum number of items to fetch */
  limit?: number;
}

/**
 * Feed configuration as stored in database
 */
export type FeedConfig = typeof feedConfigs.$inferSelect;

/**
 * Normalized feed item ready for storage
 */
export interface NormalizedFeedItem {
  /** External ID from source system */
  externalId?: string;
  /** Feed type */
  type: FeedType;
  /** Item title/headline */
  title: string;
  /** Full content or description */
  content?: string;
  /** Source URL */
  url?: string;
  /** Event/publication timestamp */
  timestamp: Date;
  /** Location coordinates */
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  /** Severity level */
  severity: FeedSeverity;
  /** Type-specific metadata */
  metadata: Record<string, unknown>;
  /** Raw data from source */
  raw?: unknown;
}

/**
 * Result from a feed fetch operation
 */
export interface FeedFetchResult {
  /** Successfully parsed items */
  items: NormalizedFeedItem[];
  /** Number of items that failed to parse */
  failedCount: number;
  /** Error messages for failed items */
  errors: string[];
  /** Cursor/token for pagination */
  nextCursor?: string;
  /** Whether there are more items to fetch */
  hasMore: boolean;
}

/**
 * Feed adapter health status
 */
export interface FeedAdapterHealth {
  /** Whether the adapter is operational */
  healthy: boolean;
  /** Time of last successful fetch */
  lastSuccess?: Date;
  /** Time of last error */
  lastError?: Date;
  /** Last error message */
  errorMessage?: string;
  /** Response latency in ms */
  latencyMs?: number;
  /** Rate limit status */
  rateLimit?: {
    remaining: number;
    resetAt: Date;
  };
}

/**
 * Base interface for all feed adapters
 */
export interface FeedAdapter {
  /** Feed type this adapter handles */
  readonly type: FeedType;

  /** Human-readable name */
  readonly name: string;

  /** Description of the data source */
  readonly description: string;

  /** Required configuration fields */
  readonly requiredConfig: string[];

  /**
   * Fetch items from the data source
   * @param config Feed configuration from database
   * @param filters Optional filter options
   * @returns Normalized feed items
   */
  fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult>;

  /**
   * Validate the configuration before saving
   * @param config Configuration to validate
   * @returns Validation result with any errors
   */
  validateConfig(config: Partial<FeedConfig>): { valid: boolean; errors: string[] };

  /**
   * Test connectivity to the data source
   * @param config Configuration to test
   * @returns Health status
   */
  testConnection(config: FeedConfig): Promise<FeedAdapterHealth>;

  /**
   * Get default configuration values
   */
  getDefaultConfig(): Partial<FeedConfig>;
}

/**
 * Abstract base class with common adapter functionality
 */
export abstract class BaseFeedAdapter implements FeedAdapter {
  abstract readonly type: FeedType;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly requiredConfig: string[];

  abstract fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult>;

  validateConfig(config: Partial<FeedConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    for (const field of this.requiredConfig) {
      const value = this.getConfigValue(config, field);
      if (value === undefined || value === null || value === '') {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate poll interval
    if (config.pollInterval && config.pollInterval < 5000) {
      errors.push('Poll interval must be at least 5000ms (5 seconds)');
    }

    return { valid: errors.length === 0, errors };
  }

  async testConnection(config: FeedConfig): Promise<FeedAdapterHealth> {
    const start = Date.now();
    try {
      // Try to fetch with minimal filters
      await this.fetch(config, { limit: 1 });
      return {
        healthy: true,
        lastSuccess: new Date(),
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        healthy: false,
        lastError: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - start,
      };
    }
  }

  getDefaultConfig(): Partial<FeedConfig> {
    return {
      enabled: true,
      pollInterval: 60000, // 1 minute default
      options: {},
      filters: {},
    };
  }

  /**
   * Helper to safely get a config value from options or filters
   */
  protected getConfigValue(config: Partial<FeedConfig>, key: string): unknown {
    // Check direct properties first
    if (key in config) {
      return config[key as keyof typeof config];
    }

    // Check options
    const options = config.options as Record<string, unknown> | undefined;
    if (options && key in options) {
      return options[key];
    }

    // Check filters
    const filters = config.filters as Record<string, unknown> | undefined;
    if (filters && key in filters) {
      return filters[key];
    }

    return undefined;
  }

  /**
   * Helper to determine severity based on keywords or conditions
   */
  protected determineSeverity(text: string, _metadata?: Record<string, unknown>): FeedSeverity {
    const lowerText = text.toLowerCase();

    // Critical keywords
    const criticalKeywords = [
      'explosion',
      'attack',
      'bomb',
      'terrorism',
      'casualt',
      'death',
      'hostage',
      'shooting',
      'killed',
      'emergency',
      'evacuate',
    ];
    if (criticalKeywords.some((kw) => lowerText.includes(kw))) {
      return 'critical';
    }

    // High severity keywords
    const highKeywords = [
      'violence',
      'riot',
      'protest',
      'clash',
      'arrest',
      'injured',
      'threat',
      'warning',
      'danger',
      'hazard',
      'armed',
    ];
    if (highKeywords.some((kw) => lowerText.includes(kw))) {
      return 'high';
    }

    // Medium severity keywords
    const mediumKeywords = [
      'incident',
      'disruption',
      'delay',
      'closure',
      'alert',
      'concern',
      'investigation',
      'suspect',
    ];
    if (mediumKeywords.some((kw) => lowerText.includes(kw))) {
      return 'medium';
    }

    // Low severity - minor events
    const lowKeywords = ['minor', 'traffic', 'weather', 'update', 'announce'];
    if (lowKeywords.some((kw) => lowerText.includes(kw))) {
      return 'low';
    }

    return 'info';
  }

  /**
   * Check if coordinates fall within geographic bounds
   */
  protected isWithinBounds(lat: number, lng: number, bounds: GeoBounds): boolean {
    return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
  }

  /**
   * Filter items by text content
   */
  protected matchesKeywords(text: string, keywords: string[]): boolean {
    if (!keywords || keywords.length === 0) return true;
    const lowerText = text.toLowerCase();
    return keywords.some((kw) => lowerText.includes(kw.toLowerCase()));
  }
}

/**
 * Adapter registry type
 */
export type AdapterRegistry = Map<FeedType, FeedAdapter>;
