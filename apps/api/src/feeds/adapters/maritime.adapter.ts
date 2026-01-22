/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Maritime Tracking Feed Adapter
 *
 * Supports:
 * - AISStream (WebSocket-based AIS data)
 * - MarineTraffic API (future)
 *
 * Features:
 * - Ship type classification
 * - MMSI/IMO resolution
 * - AIS message parsing
 */

import {
  BaseFeedAdapter,
  type FeedConfig,
  type FeedFilterOptions,
  type FeedFetchResult,
  type NormalizedFeedItem,
  type FeedSeverity,
} from '../adapter.interface';

// AIS Ship Types
const SHIP_TYPES: Record<number, { name: string; category: string }> = {
  // Cargo
  70: { name: 'Cargo', category: 'cargo' },
  71: { name: 'Cargo - Hazardous A', category: 'cargo' },
  72: { name: 'Cargo - Hazardous B', category: 'cargo' },
  73: { name: 'Cargo - Hazardous C', category: 'cargo' },
  74: { name: 'Cargo - Hazardous D', category: 'cargo' },
  79: { name: 'Cargo - No additional info', category: 'cargo' },
  // Tankers
  80: { name: 'Tanker', category: 'tanker' },
  81: { name: 'Tanker - Hazardous A', category: 'tanker' },
  82: { name: 'Tanker - Hazardous B', category: 'tanker' },
  83: { name: 'Tanker - Hazardous C', category: 'tanker' },
  84: { name: 'Tanker - Hazardous D', category: 'tanker' },
  89: { name: 'Tanker - No additional info', category: 'tanker' },
  // Passenger
  60: { name: 'Passenger', category: 'passenger' },
  61: { name: 'Passenger - Hazardous A', category: 'passenger' },
  69: { name: 'Passenger - No additional info', category: 'passenger' },
  // Fishing
  30: { name: 'Fishing', category: 'fishing' },
  // Military
  35: { name: 'Military', category: 'military' },
  // Other
  50: { name: 'Pilot Vessel', category: 'service' },
  51: { name: 'Search and Rescue', category: 'service' },
  52: { name: 'Tug', category: 'service' },
  53: { name: 'Port Tender', category: 'service' },
  55: { name: 'Law Enforcement', category: 'service' },
};

// AISStream message types
interface AISPosition {
  MessageType: string;
  MMSI: number;
  MsgType: number;
  IMO?: number;
  Name?: string;
  ShipType?: number;
  Latitude: number;
  Longitude: number;
  COG?: number; // Course over ground
  SOG?: number; // Speed over ground (knots)
  Heading?: number;
  Destination?: string;
  ETA?: string;
  Draught?: number;
  CallSign?: string;
  Status?: number; // Navigation status
  TimeStamp?: string;
}

interface _AISStreamMessage {
  MessageType: string;
  MetaData: {
    MMSI: number;
    MMSI_String: string;
    ShipName?: string;
    latitude: number;
    longitude: number;
    time_utc: string;
  };
  Message: {
    PositionReport?: AISPosition;
    ShipStaticData?: {
      MMSI: number;
      IMO?: number;
      Name?: string;
      ShipType?: number;
      Destination?: string;
      ETA?: { Month: number; Day: number; Hour: number; Minute: number };
      CallSign?: string;
      Dimension?: { A: number; B: number; C: number; D: number };
    };
  };
}

// Navigation status codes
const NAV_STATUS: Record<number, string> = {
  0: 'Under way using engine',
  1: 'At anchor',
  2: 'Not under command',
  3: 'Restricted maneuverability',
  4: 'Constrained by draught',
  5: 'Moored',
  6: 'Aground',
  7: 'Engaged in fishing',
  8: 'Under way sailing',
  11: 'Power-driven vessel towing astern',
  12: 'Power-driven vessel pushing ahead',
  14: 'AIS-SART active',
  15: 'Undefined',
};

/**
 * Maritime Tracking Feed Adapter
 */
export class MaritimeAdapter extends BaseFeedAdapter {
  readonly type = 'maritime' as const;
  readonly name = 'Maritime Tracking';
  readonly description = 'AIS vessel tracking data';
  readonly requiredConfig = ['apiKey'];

  // Store for accumulated positions (for REST-based polling)
  private positionCache = new Map<number, AISPosition>();

  async fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    const options = config.options as Record<string, unknown>;
    const configFilters = config.filters as Record<string, unknown>;

    const apiKey = config.apiKeyEncrypted || options.apiKey;

    if (!apiKey) {
      return {
        items: [],
        failedCount: 0,
        errors: ['AISStream API key required'],
        hasMore: false,
      };
    }

    // Get bounds from filters or config
    const bounds = filters?.bounds || (configFilters?.bounds as FeedFilterOptions['bounds']);

    if (!bounds) {
      return {
        items: [],
        failedCount: 0,
        errors: ['Geographic bounds required for maritime tracking'],
        hasMore: false,
      };
    }

    // AISStream provides WebSocket, but we'll use HTTP endpoint for polling
    // In production, you might want to maintain a WebSocket connection
    return this.fetchByBounds(apiKey as string, bounds, filters, configFilters);
  }

  /**
   * Fetch vessels within bounding box via REST API
   * Note: AISStream is primarily WebSocket-based, this simulates REST polling
   */
  private async fetchByBounds(
    apiKey: string,
    bounds: NonNullable<FeedFilterOptions['bounds']>,
    filters?: FeedFilterOptions,
    configFilters?: Record<string, unknown>
  ): Promise<FeedFetchResult> {
    const { north, south, east, west } = bounds;

    try {
      // AISStream REST endpoint (if available) or alternative API
      // For demonstration, using a hypothetical REST endpoint
      const response = await fetch(
        `https://stream.aisstream.io/v0/vessels?bbox=${west},${south},${east},${north}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        // If REST API not available, return cached positions
        if (this.positionCache.size > 0) {
          return this.processPositions(
            Array.from(this.positionCache.values()),
            filters,
            bounds,
            configFilters
          );
        }

        return {
          items: [],
          failedCount: 0,
          errors: [`AISStream API error: ${response.status}`],
          hasMore: false,
        };
      }

      const data = (await response.json()) as { vessels?: AISPosition[] };
      const vessels = data.vessels || [];

      return this.processPositions(vessels, filters, bounds, configFilters);
    } catch (error) {
      // Return cached data on error
      if (this.positionCache.size > 0) {
        return this.processPositions(
          Array.from(this.positionCache.values()),
          filters,
          bounds,
          configFilters
        );
      }

      return {
        items: [],
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'Maritime fetch failed'],
        hasMore: false,
      };
    }
  }

  /**
   * Process AIS positions into normalized items
   */
  private processPositions(
    positions: AISPosition[],
    filters?: FeedFilterOptions,
    bounds?: NonNullable<FeedFilterOptions['bounds']>,
    configFilters?: Record<string, unknown>
  ): FeedFetchResult {
    const items: NormalizedFeedItem[] = [];
    let failedCount = 0;

    // Ship type filter from config
    const shipTypes = configFilters?.shipTypes as number[];
    const categories = filters?.categories || (configFilters?.categories as string[]);

    for (const pos of positions) {
      // Skip if missing required data
      if (pos.Latitude === undefined || pos.Longitude === undefined) {
        failedCount++;
        continue;
      }

      // Filter by bounds
      if (bounds && !this.isWithinBounds(pos.Latitude, pos.Longitude, bounds)) {
        continue;
      }

      // Filter by ship type
      if (shipTypes?.length && pos.ShipType !== undefined) {
        if (!shipTypes.includes(pos.ShipType)) continue;
      }

      // Filter by category
      if (categories?.length && pos.ShipType !== undefined) {
        const shipInfo = SHIP_TYPES[pos.ShipType];
        if (shipInfo && !categories.includes(shipInfo.category)) continue;
      }

      // Analyze vessel
      const { severity, title, alerts } = this.analyzeVessel(pos);

      // Apply severity filter
      if (filters?.minSeverity) {
        const severityOrder: FeedSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];
        const minIndex = severityOrder.indexOf(filters.minSeverity);
        const vesselIndex = severityOrder.indexOf(severity);
        if (vesselIndex < minIndex) continue;
      }

      const shipTypeInfo = pos.ShipType !== undefined ? SHIP_TYPES[pos.ShipType] : undefined;

      items.push({
        externalId: `ais:${pos.MMSI}:${Date.now()}`,
        type: 'maritime' as const,
        title,
        content: this.buildDescription(pos),
        timestamp: pos.TimeStamp ? new Date(pos.TimeStamp) : new Date(),
        location: {
          latitude: pos.Latitude,
          longitude: pos.Longitude,
          name: pos.Destination,
        },
        severity,
        metadata: {
          mmsi: pos.MMSI,
          imo: pos.IMO,
          name: pos.Name,
          callSign: pos.CallSign,
          shipType: pos.ShipType,
          shipTypeName: shipTypeInfo?.name,
          shipCategory: shipTypeInfo?.category,
          destination: pos.Destination,
          eta: pos.ETA,
          course: pos.COG,
          speed: pos.SOG,
          heading: pos.Heading,
          draught: pos.Draught,
          navStatus: pos.Status,
          navStatusName: pos.Status !== undefined ? NAV_STATUS[pos.Status] : undefined,
          alerts,
        },
        raw: pos,
      });

      // Update cache
      this.positionCache.set(pos.MMSI, pos);
    }

    // Apply limit
    const limited = filters?.limit ? items.slice(0, filters.limit) : items;

    return {
      items: limited,
      failedCount,
      errors: [],
      hasMore: false,
    };
  }

  /**
   * Analyze vessel for alerts and severity
   */
  private analyzeVessel(pos: AISPosition): {
    severity: FeedSeverity;
    title: string;
    alerts: string[];
  } {
    const alerts: string[] = [];
    let severity: FeedSeverity = 'info';

    // Check navigation status
    if (pos.Status !== undefined) {
      // Aground
      if (pos.Status === 6) {
        alerts.push('Vessel aground');
        severity = 'critical';
      }
      // Not under command
      if (pos.Status === 2) {
        alerts.push('Not under command');
        severity = 'high';
      }
      // AIS-SART active (distress)
      if (pos.Status === 14) {
        alerts.push('Distress signal active');
        severity = 'critical';
      }
    }

    // Check for drifting (moving without heading control)
    if (pos.SOG && pos.SOG > 0.5 && pos.Heading === undefined) {
      alerts.push('Potentially drifting');
      if (severity === 'info') severity = 'medium';
    }

    // Check ship type for high-interest categories
    const shipInfo = pos.ShipType !== undefined ? SHIP_TYPES[pos.ShipType] : undefined;
    if (shipInfo) {
      if (shipInfo.category === 'military') {
        alerts.push('Military vessel');
        if (severity === 'info') severity = 'low';
      }
      if (shipInfo.category === 'tanker' && (pos.ShipType === 81 || pos.ShipType === 82)) {
        alerts.push('Hazardous cargo tanker');
        if (severity === 'info') severity = 'low';
      }
    }

    // Build title
    const vesselName = pos.Name?.trim() || `MMSI ${pos.MMSI}`;
    let title = vesselName;

    if (alerts.length > 0) {
      title = `${vesselName} - ${alerts[0]}`;
    } else if (shipInfo) {
      title = `${vesselName} (${shipInfo.name})`;
    }

    return { severity, title, alerts };
  }

  /**
   * Build vessel description
   */
  private buildDescription(pos: AISPosition): string {
    const parts: string[] = [];

    if (pos.MMSI) parts.push(`MMSI: ${pos.MMSI}`);
    if (pos.IMO) parts.push(`IMO: ${pos.IMO}`);
    if (pos.CallSign) parts.push(`Call Sign: ${pos.CallSign}`);
    if (pos.ShipType !== undefined) {
      const typeInfo = SHIP_TYPES[pos.ShipType];
      parts.push(`Type: ${typeInfo?.name || pos.ShipType}`);
    }
    if (pos.Destination) parts.push(`Destination: ${pos.Destination}`);
    if (pos.ETA) parts.push(`ETA: ${pos.ETA}`);
    if (pos.SOG !== undefined) parts.push(`Speed: ${pos.SOG} kts`);
    if (pos.COG !== undefined) parts.push(`Course: ${pos.COG}°`);
    if (pos.Status !== undefined) {
      parts.push(`Status: ${NAV_STATUS[pos.Status] || pos.Status}`);
    }

    return parts.join(' | ');
  }

  /**
   * Clear position cache
   */
  clearCache(): void {
    this.positionCache.clear();
  }

  override getDefaultConfig(): Partial<FeedConfig> {
    return {
      ...super.getDefaultConfig(),
      pollInterval: 30000, // 30 seconds
    };
  }
}

// Export singleton instance
export const maritimeAdapter = new MaritimeAdapter();
