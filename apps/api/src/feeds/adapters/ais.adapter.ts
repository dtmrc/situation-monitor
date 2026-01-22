/**
 * AIS (Automatic Identification System) Maritime Adapter
 *
 * Real-time vessel tracking via AISStream WebSocket API.
 * Supports:
 * - WebSocket-based streaming for real-time updates
 * - REST polling fallback
 * - Bounding box filtering
 * - Ship type classification
 * - Navigation status monitoring
 */

import {
  BaseFeedAdapter,
  type FeedConfig,
  type FeedFilterOptions,
  type FeedFetchResult,
  type NormalizedFeedItem,
  type FeedSeverity,
  type GeoBounds,
} from '../adapter.interface';

/**
 * AIS message as stored internally
 */
export interface AISMessage {
  mmsi: string;
  name: string;
  imo?: string;
  callsign?: string;
  ship_type: number;
  latitude: number;
  longitude: number;
  course: number;
  speed: number;
  heading: number;
  nav_status: number;
  destination?: string;
  eta?: string;
  draught?: number;
  timestamp: number;
}

/**
 * AISStream WebSocket message format
 */
interface AISStreamMessage {
  MessageType: string;
  MetaData: {
    MMSI: number;
    ShipName: string;
    latitude: number;
    longitude: number;
    time_utc: string;
  };
  Message: {
    PositionReport?: {
      Cog: number;
      Sog: number;
      TrueHeading: number;
      NavigationalStatus: number;
    };
    ShipStaticData?: {
      ImoNumber: number;
      CallSign: string;
      Type: number;
      Destination: string;
      Eta: { Month: number; Day: number; Hour: number; Minute: number };
      MaximumStaticDraught: number;
    };
  };
}

/**
 * Bounding box for geographic filtering
 */
export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Ship type classifications with categories
 */
export const SHIP_TYPES: Record<number, { name: string; category: string }> = {
  30: { name: 'Fishing', category: 'fishing' },
  31: { name: 'Towing', category: 'service' },
  32: { name: 'Towing (large)', category: 'service' },
  33: { name: 'Dredging', category: 'service' },
  34: { name: 'Diving', category: 'service' },
  35: { name: 'Military', category: 'military' },
  36: { name: 'Sailing', category: 'pleasure' },
  37: { name: 'Pleasure Craft', category: 'pleasure' },
  40: { name: 'High-Speed Craft', category: 'high_speed' },
  50: { name: 'Pilot Vessel', category: 'service' },
  51: { name: 'Search and Rescue', category: 'service' },
  52: { name: 'Tug', category: 'service' },
  53: { name: 'Port Tender', category: 'service' },
  55: { name: 'Law Enforcement', category: 'service' },
  60: { name: 'Passenger', category: 'passenger' },
  70: { name: 'Cargo', category: 'cargo' },
  80: { name: 'Tanker', category: 'tanker' },
  90: { name: 'Other', category: 'other' },
};

/**
 * Navigation status codes
 */
export const NAV_STATUS: Record<number, string> = {
  0: 'Under way using engine',
  1: 'At anchor',
  2: 'Not under command',
  3: 'Restricted maneuverability',
  4: 'Constrained by draught',
  5: 'Moored',
  6: 'Aground',
  7: 'Engaged in fishing',
  8: 'Under way sailing',
  15: 'Undefined',
};

/**
 * Ship type color mapping for UI
 */
export const SHIP_TYPE_COLORS: Record<number, string> = {
  30: '#22c55e', // Fishing - Green
  35: '#7c3aed', // Military - Purple
  60: '#3b82f6', // Passenger - Blue
  70: '#f97316', // Cargo - Orange
  80: '#ef4444', // Tanker - Red
  0: '#6b7280', // Unknown - Gray
};

/**
 * AIS Maritime Tracking Adapter
 *
 * Provides real-time vessel tracking through AISStream.io WebSocket API.
 */
export class AisAdapter extends BaseFeedAdapter {
  readonly type = 'maritime' as const;
  readonly name = 'AIS Maritime Tracker';
  readonly description = 'Real-time AIS vessel tracking via WebSocket';
  readonly requiredConfig = ['apiKey'];

  private wsUrl = 'wss://stream.aisstream.io/v0/stream';
  private vesselStates = new Map<string, AISMessage>();
  private ws?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private isStreaming = false;

  /**
   * Fetch vessels within the configured bounding box
   * Returns current vessel states from the internal cache
   */
  fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    const options = config.options as Record<string, unknown>;
    const configFilters = config.filters as Record<string, unknown>;
    const apiKey = config.apiKeyEncrypted || options.apiKey;

    if (!apiKey) {
      return Promise.resolve({
        items: [],
        failedCount: 0,
        errors: ['AISStream API key required'],
        hasMore: false,
      });
    }

    // Get bounds from filters or config
    const bounds = filters?.bounds || (configFilters?.bounds as GeoBounds);

    // Return cached vessel states, filtered by bounds
    let vessels = Array.from(this.vesselStates.values());

    if (bounds) {
      vessels = vessels.filter(
        (v) =>
          v.latitude >= bounds.south &&
          v.latitude <= bounds.north &&
          v.longitude >= bounds.west &&
          v.longitude <= bounds.east
      );
    }

    // Apply ship type filter
    const shipTypes = (configFilters?.shipTypes as number[]) || (options.shipTypes as number[]);
    if (shipTypes?.length) {
      vessels = vessels.filter((v) => {
        const typeCategory = Math.floor(v.ship_type / 10) * 10;
        return shipTypes.includes(typeCategory) || shipTypes.includes(v.ship_type);
      });
    }

    // Apply category filter
    const categories = filters?.categories || (configFilters?.categories as string[]);
    if (categories?.length) {
      vessels = vessels.filter((v) => {
        const shipInfo = SHIP_TYPES[Math.floor(v.ship_type / 10) * 10];
        return shipInfo && categories.includes(shipInfo.category);
      });
    }

    // Normalize and return
    const items = vessels.map((vessel) => this.normalizeVessel(vessel));

    // Apply severity filter
    let filteredItems = items;
    if (filters?.minSeverity) {
      const severityOrder: FeedSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];
      const minIndex = severityOrder.indexOf(filters.minSeverity);
      filteredItems = items.filter((item) => severityOrder.indexOf(item.severity) >= minIndex);
    }

    // Apply limit
    const limited = filters?.limit ? filteredItems.slice(0, filters.limit) : filteredItems;

    return Promise.resolve({
      items: limited,
      failedCount: 0,
      errors: [],
      hasMore: false,
    });
  }

  /**
   * Start WebSocket connection for real-time AIS data
   */
  startStream(
    apiKey: string,
    boundingBox?: BoundingBox,
    onMessage?: (vessel: AISMessage) => void
  ): void {
    if (this.isStreaming) {
      return;
    }

    this.isStreaming = true;
    this.connectWebSocket(apiKey, boundingBox, onMessage);
  }

  /**
   * Stop the WebSocket stream
   */
  stopStream(): void {
    this.isStreaming = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  private connectWebSocket(
    apiKey: string,
    boundingBox?: BoundingBox,
    onMessage?: (vessel: AISMessage) => void
  ): void {
    if (!this.isStreaming) return;

    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      console.log('[AIS] WebSocket connected');

      // Subscribe to AIS stream with optional bounding box filter
      const subscriptionMessage: Record<string, unknown> = {
        APIKey: apiKey,
      };

      if (boundingBox) {
        subscriptionMessage.BoundingBoxes = [
          [
            [boundingBox.minLng, boundingBox.minLat],
            [boundingBox.maxLng, boundingBox.maxLat],
          ],
        ];
      }

      this.ws!.send(JSON.stringify(subscriptionMessage));
    };

    this.ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(String(event.data)) as AISStreamMessage;
        const vessel = this.parseAISMessage(data);

        if (vessel) {
          this.vesselStates.set(vessel.mmsi, vessel);
          onMessage?.(vessel);
        }
      } catch (error) {
        console.error('[AIS] Failed to parse message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[AIS] WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('[AIS] WebSocket closed');
      if (this.isStreaming) {
        console.log('[AIS] Reconnecting in 5s...');
        this.reconnectTimer = setTimeout(() => {
          this.connectWebSocket(apiKey, boundingBox, onMessage);
        }, 5000);
      }
    };
  }

  /**
   * Parse AISStream message into internal format
   */
  private parseAISMessage(data: AISStreamMessage): AISMessage | null {
    const meta = data.MetaData;
    const posReport = data.Message.PositionReport;
    const staticData = data.Message.ShipStaticData;

    if (!meta.latitude || !meta.longitude) return null;

    return {
      mmsi: String(meta.MMSI),
      name: meta.ShipName || `MMSI ${meta.MMSI}`,
      imo: staticData?.ImoNumber ? String(staticData.ImoNumber) : undefined,
      callsign: staticData?.CallSign,
      ship_type: staticData?.Type || 0,
      latitude: meta.latitude,
      longitude: meta.longitude,
      course: posReport?.Cog || 0,
      speed: posReport?.Sog || 0,
      heading: posReport?.TrueHeading || 0,
      nav_status: posReport?.NavigationalStatus ?? 15,
      destination: staticData?.Destination,
      draught: staticData?.MaximumStaticDraught,
      timestamp: new Date(meta.time_utc).getTime(),
    };
  }

  /**
   * Normalize a vessel into a feed item
   */
  private normalizeVessel(vessel: AISMessage): NormalizedFeedItem {
    const shipTypeKey = Math.floor(vessel.ship_type / 10) * 10;
    const shipTypeInfo = SHIP_TYPES[shipTypeKey] || SHIP_TYPES[vessel.ship_type];
    const shipTypeLabel = shipTypeInfo?.name || 'Unknown';
    const navStatusLabel = NAV_STATUS[vessel.nav_status] || 'Unknown';

    const { severity, alerts } = this.analyzeVessel(vessel);

    return {
      externalId: `vessel-${vessel.mmsi}-${vessel.timestamp}`,
      type: 'maritime',
      title: vessel.name,
      content: `${vessel.name} (${shipTypeLabel}) - ${navStatusLabel}`,
      timestamp: new Date(vessel.timestamp),
      location: {
        latitude: vessel.latitude,
        longitude: vessel.longitude,
        name: vessel.destination,
      },
      severity,
      metadata: {
        mmsi: vessel.mmsi,
        imo: vessel.imo,
        callsign: vessel.callsign,
        shipType: vessel.ship_type,
        shipTypeLabel,
        shipCategory: shipTypeInfo?.category,
        course: vessel.course,
        speed: vessel.speed,
        heading: vessel.heading,
        navStatus: vessel.nav_status,
        navStatusLabel,
        destination: vessel.destination,
        draught: vessel.draught,
        isMoving: vessel.speed > 0.5,
        alerts,
      },
      raw: vessel,
    };
  }

  /**
   * Analyze vessel for alerts and severity level
   */
  private analyzeVessel(vessel: AISMessage): { severity: FeedSeverity; alerts: string[] } {
    const alerts: string[] = [];
    let severity: FeedSeverity = 'info';

    // Check navigation status for critical conditions
    if (vessel.nav_status === 6) {
      alerts.push('Vessel aground');
      severity = 'critical';
    } else if (vessel.nav_status === 2) {
      alerts.push('Not under command');
      severity = 'high';
    } else if (vessel.nav_status === 14) {
      alerts.push('Distress signal active');
      severity = 'critical';
    }

    // Check for drifting (moving without heading control)
    if (vessel.speed > 0.5 && vessel.heading === 511) {
      // 511 = not available
      alerts.push('Potentially drifting');
      if (severity === 'info') severity = 'medium';
    }

    // Military vessels are noteworthy
    const shipTypeKey = Math.floor(vessel.ship_type / 10) * 10;
    const shipInfo = SHIP_TYPES[shipTypeKey];
    if (shipInfo?.category === 'military') {
      alerts.push('Military vessel');
      if (severity === 'info') severity = 'low';
    }

    // Hazardous cargo tankers
    if (shipInfo?.category === 'tanker' && (vessel.ship_type === 81 || vessel.ship_type === 82)) {
      alerts.push('Hazardous cargo tanker');
      if (severity === 'info') severity = 'low';
    }

    return { severity, alerts };
  }

  /**
   * Get a single vessel by MMSI
   */
  getVessel(mmsi: string): AISMessage | undefined {
    return this.vesselStates.get(mmsi);
  }

  /**
   * Get all tracked vessels
   */
  getAllVessels(): AISMessage[] {
    return Array.from(this.vesselStates.values());
  }

  /**
   * Clear all cached vessel states
   */
  clearCache(): void {
    this.vesselStates.clear();
  }

  override getDefaultConfig(): Partial<FeedConfig> {
    return {
      ...super.getDefaultConfig(),
      pollInterval: 60000, // 60 seconds for REST polling
    };
  }
}

// Export singleton instance
export const aisAdapter = new AisAdapter();
