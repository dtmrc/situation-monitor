/**
 * Civil Unrest Aggregator Service
 *
 * Aggregates civil unrest data from ACLED and GDELT sources:
 * - Deduplicates events (ACLED preferred as it's human-verified)
 * - Identifies geographic hotspots using spatial clustering
 * - Calculates statistics and trends
 */

import type {
  UnrestEvent,
  UnrestHotspot,
  UnrestEventType,
  AggregatedUnrestData,
} from '../types/civil-unrest.types';

export class CivilUnrestAggregator {
  /**
   * Aggregate events from multiple sources and identify hotspots
   */
  aggregateEvents(events: UnrestEvent[]): AggregatedUnrestData {
    // Deduplicate events
    const deduped = this.deduplicateEvents(events);

    // Identify hotspots using DBSCAN-like clustering
    const hotspots = this.identifyHotspots(deduped);

    // Calculate statistics
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const statistics = {
      total: deduped.length,
      last24h: deduped.filter((e) => e.date >= oneDayAgo).length,
      last7d: deduped.filter((e) => e.date >= sevenDaysAgo).length,
      byType: this.countByField(deduped, 'eventType'),
      byCountry: this.countByField(deduped, 'country'),
      totalFatalities: deduped.reduce((sum, e) => sum + (e.fatalities || 0), 0),
    };

    return { events: deduped, hotspots, statistics };
  }

  /**
   * Deduplicate events from ACLED and GDELT
   * Prefer ACLED (verified) over GDELT (automated)
   */
  private deduplicateEvents(events: UnrestEvent[]): UnrestEvent[] {
    const eventMap = new Map<string, UnrestEvent>();

    // Sort by source (ACLED first) then by date
    const sorted = [...events].sort((a, b) => {
      if (a.source !== b.source) return a.source === 'acled' ? -1 : 1;
      return b.date.getTime() - a.date.getTime();
    });

    for (const event of sorted) {
      // Create deduplication key based on location + date + type
      const dateKey = event.date.toISOString().split('T')[0];
      const locationKey = `${event.location.lat.toFixed(2)}_${event.location.lng.toFixed(2)}`;
      const key = `${dateKey}_${locationKey}_${event.eventType}`;

      // Keep first occurrence (ACLED preferred)
      if (!eventMap.has(key)) {
        eventMap.set(key, event);
      }
    }

    return Array.from(eventMap.values());
  }

  /**
   * Identify geographic hotspots using spatial clustering
   */
  private identifyHotspots(events: UnrestEvent[]): UnrestHotspot[] {
    const CLUSTER_RADIUS_KM = 50;
    const MIN_EVENTS_FOR_HOTSPOT = 3;

    const hotspots: UnrestHotspot[] = [];
    const used = new Set<string>();

    for (const event of events) {
      if (used.has(event.id)) continue;

      // Find all events within radius
      const cluster = events.filter((other) => {
        if (used.has(other.id)) return false;
        const distance = this.haversineDistance(event.location, other.location);
        return distance <= CLUSTER_RADIUS_KM;
      });

      if (cluster.length >= MIN_EVENTS_FOR_HOTSPOT) {
        // Mark all as used
        cluster.forEach((e) => used.add(e.id));

        // Calculate cluster center
        const center = this.calculateCenter(cluster);

        // Determine dominant event type
        const typeCounts = this.countByField(cluster, 'eventType');
        const dominantType = Object.entries(typeCounts).sort(
          (a, b) => b[1] - a[1]
        )[0][0] as UnrestEventType;

        // Get unique countries
        const countries = [...new Set(cluster.map((e) => e.country))];

        // Calculate trend direction based on recent vs older events
        const trendDirection = this.calculateTrend(cluster);

        hotspots.push({
          id: `hotspot-${center.lat.toFixed(4)}-${center.lng.toFixed(4)}`,
          center,
          radius: CLUSTER_RADIUS_KM,
          eventCount: cluster.length,
          fatalityCount: cluster.reduce((sum, e) => sum + (e.fatalities || 0), 0),
          dominantType,
          countries,
          recentEvents: cluster.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5),
          trendDirection,
        });
      }
    }

    return hotspots.sort((a, b) => b.eventCount - a.eventCount);
  }

  /**
   * Calculate the center point of a cluster of events
   */
  private calculateCenter(events: UnrestEvent[]): { lat: number; lng: number } {
    const sum = events.reduce(
      (acc, e) => ({
        lat: acc.lat + e.location.lat,
        lng: acc.lng + e.location.lng,
      }),
      { lat: 0, lng: 0 }
    );

    return {
      lat: sum.lat / events.length,
      lng: sum.lng / events.length,
    };
  }

  /**
   * Calculate trend direction based on event timing
   */
  private calculateTrend(events: UnrestEvent[]): 'increasing' | 'stable' | 'decreasing' {
    if (events.length < 3) return 'stable';

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentCount = events.filter((e) => e.date >= threeDaysAgo).length;
    const olderCount = events.filter((e) => e.date >= sevenDaysAgo && e.date < threeDaysAgo).length;

    // Normalize by time period
    const recentRate = recentCount / 3; // events per day
    const olderRate = olderCount / 4; // events per day

    if (recentRate > olderRate * 1.5) return 'increasing';
    if (recentRate < olderRate * 0.5) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate haversine distance between two points in km
   */
  private haversineDistance(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;

    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  /**
   * Count events by a specific field
   */
  private countByField<T extends Record<string, unknown>>(
    items: T[],
    field: keyof T
  ): Record<string, number> {
    return items.reduce(
      (acc, item) => {
        const value = String(item[field]);
        acc[value] = (acc[value] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }
}

// Export singleton instance
export const civilUnrestAggregator = new CivilUnrestAggregator();
