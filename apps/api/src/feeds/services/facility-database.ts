/**
 * Facility Database Service
 *
 * Provides spatial queries and management for critical infrastructure facilities.
 * Supports HIFLD and OSM data imports.
 */

import { eq, and, inArray, gte, lte, count, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { db } from '../../db';
import {
  criticalFacilities,
  infrastructureIncidents,
  type CriticalFacility,
  type NewCriticalFacility,
} from '../../db/schema/infrastructure';
import type {
  CISASector,
  FacilityType,
  GeoBounds,
  FacilityFilterOptions,
  SectorStatus,
} from '../types/critical-infrastructure.types';
import { SECTOR_LABELS, SECTOR_CRITICALITY } from '../types/critical-infrastructure.types';

/**
 * Distance calculation using Haversine formula (in kilometers)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate bounding box for a radius query
 */
function getBoundingBox(lat: number, lng: number, radiusKm: number): GeoBounds {
  // Approximate degrees for the radius
  const latDelta = radiusKm / 111.32; // 1 degree latitude ≈ 111.32 km
  const lngDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));

  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lng + lngDelta,
    west: lng - lngDelta,
  };
}

export interface NearbyFacility extends CriticalFacility {
  distance: number; // km
}

export interface SectorStats {
  sector: CISASector;
  label: string;
  count: number;
  criticality: number;
}

/**
 * Facility Database Service
 */
export class FacilityDatabaseService {
  /**
   * Find facilities near a point within a radius
   */
  async findNearbyFacilities(
    lat: number,
    lng: number,
    radiusKm: number,
    options?: {
      sectors?: CISASector[];
      facilityTypes?: FacilityType[];
      limit?: number;
    }
  ): Promise<NearbyFacility[]> {
    // Get bounding box for initial filter
    const bounds = getBoundingBox(lat, lng, radiusKm);

    // Build query conditions
    const conditions = [
      gte(criticalFacilities.latitude, bounds.south),
      lte(criticalFacilities.latitude, bounds.north),
      gte(criticalFacilities.longitude, bounds.west),
      lte(criticalFacilities.longitude, bounds.east),
    ];

    if (options?.sectors && options.sectors.length > 0) {
      conditions.push(inArray(criticalFacilities.sector, options.sectors));
    }

    if (options?.facilityTypes && options.facilityTypes.length > 0) {
      conditions.push(inArray(criticalFacilities.facilityType, options.facilityTypes));
    }

    // Query with bounding box
    const facilities = await db.query.criticalFacilities.findMany({
      where: and(...conditions),
      limit: options?.limit ? options.limit * 2 : 1000, // Fetch extra for distance filtering
    });

    // Calculate exact distances and filter by radius
    const nearbyFacilities: NearbyFacility[] = [];

    for (const facility of facilities) {
      const distance = calculateDistance(lat, lng, facility.latitude, facility.longitude);
      if (distance <= radiusKm) {
        nearbyFacilities.push({
          ...facility,
          distance,
        });
      }
    }

    // Sort by distance
    nearbyFacilities.sort((a, b) => a.distance - b.distance);

    // Apply limit
    if (options?.limit) {
      return nearbyFacilities.slice(0, options.limit);
    }

    return nearbyFacilities;
  }

  /**
   * Find facilities within geographic bounds
   */
  async findFacilitiesInBounds(
    bounds: GeoBounds,
    options?: FacilityFilterOptions
  ): Promise<CriticalFacility[]> {
    const conditions = [
      gte(criticalFacilities.latitude, bounds.south),
      lte(criticalFacilities.latitude, bounds.north),
      gte(criticalFacilities.longitude, bounds.west),
      lte(criticalFacilities.longitude, bounds.east),
    ];

    if (options?.sectors && options.sectors.length > 0) {
      conditions.push(inArray(criticalFacilities.sector, options.sectors));
    }

    if (options?.facilityTypes && options.facilityTypes.length > 0) {
      conditions.push(inArray(criticalFacilities.facilityType, options.facilityTypes));
    }

    if (options?.status && options.status.length > 0) {
      conditions.push(inArray(criticalFacilities.status, options.status));
    }

    if (options?.state) {
      conditions.push(eq(criticalFacilities.state, options.state));
    }

    return db.query.criticalFacilities.findMany({
      where: and(...conditions),
      limit: 5000, // Reasonable limit for map display
    });
  }

  /**
   * Get facility by ID
   */
  async getFacilityById(id: string): Promise<CriticalFacility | undefined> {
    return db.query.criticalFacilities.findFirst({
      where: eq(criticalFacilities.id, id),
    });
  }

  /**
   * Get facilities by source ID (for deduplication during import)
   */
  async getFacilitiesBySourceId(
    source: string,
    sourceIds: string[]
  ): Promise<Map<string, CriticalFacility>> {
    const facilities = await db.query.criticalFacilities.findMany({
      where: and(
        eq(criticalFacilities.source, source),
        inArray(criticalFacilities.sourceId, sourceIds)
      ),
    });

    const map = new Map<string, CriticalFacility>();
    for (const facility of facilities) {
      if (facility.sourceId) {
        map.set(facility.sourceId, facility);
      }
    }
    return map;
  }

  /**
   * Get sector statistics
   */
  async getSectorStats(): Promise<SectorStats[]> {
    const result = await db
      .select({
        sector: criticalFacilities.sector,
        count: count(),
      })
      .from(criticalFacilities)
      .groupBy(criticalFacilities.sector);

    return result.map((row) => ({
      sector: row.sector as CISASector,
      label: SECTOR_LABELS[row.sector as CISASector],
      count: Number(row.count),
      criticality: SECTOR_CRITICALITY[row.sector as CISASector],
    }));
  }

  /**
   * Get comprehensive sector status with incident data
   */
  async getSectorStatus(): Promise<SectorStatus[]> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previous7d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get facility counts per sector
    const facilityCounts = await db
      .select({
        sector: criticalFacilities.sector,
        count: count(),
      })
      .from(criticalFacilities)
      .groupBy(criticalFacilities.sector);

    const facilityMap = new Map<string, number>();
    for (const row of facilityCounts) {
      facilityMap.set(row.sector, Number(row.count));
    }

    // Get active incidents per sector
    const activeIncidents = await db
      .select({
        sector: infrastructureIncidents.sector,
        count: count(),
      })
      .from(infrastructureIncidents)
      .where(eq(infrastructureIncidents.status, 'active'))
      .groupBy(infrastructureIncidents.sector);

    const activeMap = new Map<string, number>();
    for (const row of activeIncidents) {
      activeMap.set(row.sector, Number(row.count));
    }

    // Get incidents last 24h per sector
    const incidents24h = await db
      .select({
        sector: infrastructureIncidents.sector,
        count: count(),
      })
      .from(infrastructureIncidents)
      .where(gte(infrastructureIncidents.firstReportedAt, last24h))
      .groupBy(infrastructureIncidents.sector);

    const incidents24hMap = new Map<string, number>();
    for (const row of incidents24h) {
      incidents24hMap.set(row.sector, Number(row.count));
    }

    // Get incidents last 7d per sector
    const incidents7d = await db
      .select({
        sector: infrastructureIncidents.sector,
        count: count(),
      })
      .from(infrastructureIncidents)
      .where(gte(infrastructureIncidents.firstReportedAt, last7d))
      .groupBy(infrastructureIncidents.sector);

    const incidents7dMap = new Map<string, number>();
    for (const row of incidents7d) {
      incidents7dMap.set(row.sector, Number(row.count));
    }

    // Get previous 7d for trend
    const incidentsPrevious7d = await db
      .select({
        sector: infrastructureIncidents.sector,
        count: count(),
      })
      .from(infrastructureIncidents)
      .where(
        and(
          gte(infrastructureIncidents.firstReportedAt, previous7d),
          lte(infrastructureIncidents.firstReportedAt, last7d)
        )
      )
      .groupBy(infrastructureIncidents.sector);

    const incidentsPrev7dMap = new Map<string, number>();
    for (const row of incidentsPrevious7d) {
      incidentsPrev7dMap.set(row.sector, Number(row.count));
    }

    // Get severity breakdown
    const severityBreakdown = await db
      .select({
        sector: infrastructureIncidents.sector,
        severity: infrastructureIncidents.severity,
        count: count(),
      })
      .from(infrastructureIncidents)
      .where(eq(infrastructureIncidents.status, 'active'))
      .groupBy(infrastructureIncidents.sector, infrastructureIncidents.severity);

    const severityMap = new Map<string, Record<string, number>>();
    for (const row of severityBreakdown) {
      if (!severityMap.has(row.sector)) {
        severityMap.set(row.sector, {
          minor: 0,
          moderate: 0,
          significant: 0,
          severe: 0,
          catastrophic: 0,
        });
      }
      severityMap.get(row.sector)![row.severity] = Number(row.count);
    }

    // Build status for all sectors
    const sectors = Object.keys(SECTOR_LABELS) as CISASector[];

    return sectors.map((sector) => {
      const activeCount = activeMap.get(sector) || 0;
      const count7d = incidents7dMap.get(sector) || 0;
      const countPrev7d = incidentsPrev7dMap.get(sector) || 0;

      // Calculate trend
      let trend: 'improving' | 'stable' | 'degrading' = 'stable';
      let trendPercentage = 0;

      if (countPrev7d > 0) {
        trendPercentage = ((count7d - countPrev7d) / countPrev7d) * 100;
        if (trendPercentage > 20) trend = 'degrading';
        else if (trendPercentage < -20) trend = 'improving';
      } else if (count7d > 0) {
        trend = 'degrading';
        trendPercentage = 100;
      }

      // Calculate overall status
      const severity = severityMap.get(sector) || {
        minor: 0,
        moderate: 0,
        significant: 0,
        severe: 0,
        catastrophic: 0,
      };

      let status: 'normal' | 'elevated' | 'high' | 'critical' = 'normal';
      if (severity.catastrophic > 0) status = 'critical';
      else if (severity.severe > 0) status = 'high';
      else if (severity.significant > 0 || activeCount > 5) status = 'elevated';

      return {
        sector,
        label: SECTOR_LABELS[sector],
        facilityCount: facilityMap.get(sector) || 0,
        activeIncidents: activeCount,
        incidentsLast24h: incidents24hMap.get(sector) || 0,
        incidentsLast7d: count7d,
        severityBreakdown: severity,
        trend,
        trendPercentage: Math.round(trendPercentage),
        status,
      };
    });
  }

  /**
   * Import facilities from HIFLD (Homeland Infrastructure Foundation-Level Data)
   */
  async importHIFLD(
    data: Array<{
      name: string;
      sector: CISASector;
      facilityType: FacilityType;
      latitude: number;
      longitude: number;
      address?: string;
      city?: string;
      state?: string;
      operator?: string;
      capacity?: string;
      sourceId: string;
    }>
  ): Promise<{ created: number; updated: number; skipped: number }> {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Get existing facilities by source ID
    const sourceIds = data.map((d) => d.sourceId);
    const existing = await this.getFacilitiesBySourceId('hifld', sourceIds);

    const BATCH_SIZE = 100;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const toInsert: NewCriticalFacility[] = [];
      const toUpdate: Array<{ id: string; data: Partial<NewCriticalFacility> }> = [];

      for (const item of batch) {
        const existingFacility = existing.get(item.sourceId);

        if (existingFacility) {
          // Check if update needed
          const needsUpdate =
            existingFacility.name !== item.name ||
            existingFacility.latitude !== item.latitude ||
            existingFacility.longitude !== item.longitude;

          if (needsUpdate) {
            toUpdate.push({
              id: existingFacility.id,
              data: {
                name: item.name,
                latitude: item.latitude,
                longitude: item.longitude,
                address: item.address,
                city: item.city,
                state: item.state,
                operator: item.operator,
                capacity: item.capacity,
                updatedAt: new Date(),
              },
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          toInsert.push({
            id: uuidv4(),
            name: item.name,
            sector: item.sector,
            facilityType: item.facilityType,
            latitude: item.latitude,
            longitude: item.longitude,
            address: item.address,
            city: item.city,
            state: item.state,
            country: 'USA',
            operator: item.operator,
            capacity: item.capacity,
            status: 'operational',
            source: 'hifld',
            sourceId: item.sourceId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          created++;
        }
      }

      // Batch insert
      if (toInsert.length > 0) {
        await db.insert(criticalFacilities).values(toInsert);
      }

      // Batch update
      for (const update of toUpdate) {
        await db
          .update(criticalFacilities)
          .set(update.data)
          .where(eq(criticalFacilities.id, update.id));
      }
    }

    return { created, updated, skipped };
  }

  /**
   * Import facilities from OpenStreetMap
   */
  async importFromOSM(
    data: Array<{
      name: string;
      sector: CISASector;
      facilityType: FacilityType;
      latitude: number;
      longitude: number;
      osmId: string;
      tags?: Record<string, string>;
    }>
  ): Promise<{ created: number; updated: number; skipped: number }> {
    let created = 0;
    const updated = 0;
    let skipped = 0;

    const sourceIds = data.map((d) => d.osmId);
    const existing = await this.getFacilitiesBySourceId('osm', sourceIds);

    const BATCH_SIZE = 100;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const toInsert: NewCriticalFacility[] = [];

      for (const item of batch) {
        if (existing.has(item.osmId)) {
          skipped++;
          continue;
        }

        toInsert.push({
          id: uuidv4(),
          name: item.name,
          sector: item.sector,
          facilityType: item.facilityType,
          latitude: item.latitude,
          longitude: item.longitude,
          country: 'USA',
          status: 'operational',
          source: 'osm',
          sourceId: item.osmId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        created++;
      }

      if (toInsert.length > 0) {
        await db.insert(criticalFacilities).values(toInsert);
      }
    }

    return { created, updated, skipped };
  }

  /**
   * Get total facility count
   */
  async getTotalCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(criticalFacilities);
    return Number(result[0]?.count || 0);
  }

  /**
   * Get facilities with recent incidents
   */
  async getFacilitiesWithActiveIncidents(
    limit: number = 50
  ): Promise<Array<CriticalFacility & { incidentCount: number }>> {
    const result = await db
      .select({
        facility: criticalFacilities,
        incidentCount: count(infrastructureIncidents.id),
      })
      .from(criticalFacilities)
      .innerJoin(
        infrastructureIncidents,
        and(
          eq(infrastructureIncidents.facilityId, criticalFacilities.id),
          eq(infrastructureIncidents.status, 'active')
        )
      )
      .groupBy(criticalFacilities.id)
      .orderBy(desc(count(infrastructureIncidents.id)))
      .limit(limit);

    return result.map((row) => ({
      ...row.facility,
      incidentCount: Number(row.incidentCount),
    }));
  }
}

// Export singleton instance
export const facilityDatabase = new FacilityDatabaseService();
