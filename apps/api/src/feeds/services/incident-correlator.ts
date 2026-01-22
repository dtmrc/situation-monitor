/**
 * Incident Correlator Service
 *
 * Correlates raw incidents from multiple sources into unified infrastructure incidents.
 * Handles:
 * - Time-space clustering (1km, 1hr window)
 * - Facility matching (500m radius)
 * - Severity calculation with sector weighting
 * - Deduplication across sources
 */

import { eq, and, gte, lte, or, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { db } from '../../db';
import {
  infrastructureIncidents,
  type InfrastructureIncident as DBInfrastructureIncident,
  type NewInfrastructureIncident,
} from '../../db/schema/infrastructure';
import type {
  RawIncident,
  InfrastructureIncident,
  CorrelationResult,
  CISASector,
  IncidentSeverity,
  IncidentType,
  CriticalFacility,
} from '../types/critical-infrastructure.types';
import { SECTOR_CRITICALITY, SEVERITY_VALUES } from '../types/critical-infrastructure.types';

import { facilityDatabase, type NearbyFacility } from './facility-database';

// Correlation parameters
const SPATIAL_CLUSTER_RADIUS_KM = 1; // Cluster incidents within 1km
const TEMPORAL_CLUSTER_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const FACILITY_MATCH_RADIUS_KM = 0.5; // Match to facilities within 500m
const EXISTING_INCIDENT_MERGE_RADIUS_KM = 2; // Merge with existing incidents within 2km
const EXISTING_INCIDENT_MERGE_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Calculate distance between two points using Haversine formula (km)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
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
 * Infer sector from facility type
 */
function inferSectorFromFacilityType(facilityType: string): CISASector {
  const sectorMap: Record<string, CISASector> = {
    power_plant: 'energy',
    substation: 'energy',
    transmission_line: 'energy',
    oil_refinery: 'energy',
    gas_pipeline: 'energy',
    gas_storage: 'energy',
    solar_farm: 'energy',
    wind_farm: 'energy',
    nuclear_plant: 'nuclear',
    nuclear_research: 'nuclear',
    nuclear_waste: 'nuclear',
    water_treatment: 'water_wastewater',
    wastewater_treatment: 'water_wastewater',
    dam: 'dams',
    reservoir: 'water_wastewater',
    pumping_station: 'water_wastewater',
    airport: 'transportation',
    seaport: 'transportation',
    rail_yard: 'transportation',
    highway_interchange: 'transportation',
    bridge: 'transportation',
    tunnel: 'transportation',
    data_center: 'information_technology',
    cell_tower: 'communications',
    internet_exchange: 'communications',
    broadcast_facility: 'communications',
    hospital: 'healthcare',
    medical_research: 'healthcare',
    pharmaceutical: 'healthcare',
    fire_station: 'emergency_services',
    police_station: 'emergency_services',
    emergency_dispatch: 'emergency_services',
    chemical_plant: 'chemical',
    chemical_storage: 'chemical',
    financial_institution: 'financial_services',
    data_processing_center: 'financial_services',
    government_building: 'government_facilities',
    military_base: 'defense_industrial_base',
  };

  return sectorMap[facilityType] || 'commercial_facilities';
}

/**
 * Infer incident type from keywords in title/description
 */
function inferIncidentType(title: string, description?: string): IncidentType {
  const text = `${title} ${description || ''}`.toLowerCase();

  if (text.includes('fire') || text.includes('blaze') || text.includes('burning')) return 'fire';
  if (text.includes('explosion') || text.includes('blast')) return 'explosion';
  if (text.includes('outage') || text.includes('blackout') || text.includes('power loss'))
    return 'power_outage';
  if (text.includes('flood') || text.includes('flooding')) return 'flooding';
  if (text.includes('collapse') || text.includes('structural')) return 'structural_failure';
  if (text.includes('cyber') || text.includes('hack')) return 'cyber_attack';
  if (text.includes('attack') || text.includes('assault') || text.includes('shooting'))
    return 'physical_attack';
  if (
    text.includes('hazmat') ||
    text.includes('chemical') ||
    text.includes('leak') ||
    text.includes('spill')
  )
    return 'hazmat_release';
  if (text.includes('storm') || text.includes('tornado') || text.includes('hurricane'))
    return 'weather_damage';
  if (text.includes('earthquake') || text.includes('natural disaster')) return 'natural_disaster';
  if (text.includes('traffic') || text.includes('crash') || text.includes('accident'))
    return 'traffic_incident';
  if (text.includes('protest') || text.includes('riot') || text.includes('unrest'))
    return 'civil_disturbance';
  if (text.includes('suspicious') || text.includes('threat')) return 'suspicious_activity';
  if (text.includes('evacuation') || text.includes('evacuate')) return 'evacuation';
  if (text.includes('equipment') || text.includes('malfunction')) return 'equipment_failure';

  return 'unknown';
}

/**
 * Infer base severity from incident content
 */
function inferBaseSeverity(incident: RawIncident): IncidentSeverity {
  const text = `${incident.title} ${incident.description || ''}`.toLowerCase();

  // Check for catastrophic keywords
  if (
    text.includes('multiple fatalities') ||
    text.includes('mass casualty') ||
    text.includes('major explosion') ||
    text.includes('nuclear') ||
    text.includes('catastrophic')
  ) {
    return 'catastrophic';
  }

  // Check for severe keywords
  if (
    text.includes('fatality') ||
    text.includes('death') ||
    text.includes('critical') ||
    text.includes('major fire') ||
    text.includes('large scale')
  ) {
    return 'severe';
  }

  // Check for significant keywords
  if (
    text.includes('injury') ||
    text.includes('injuries') ||
    text.includes('evacuation') ||
    text.includes('widespread') ||
    text.includes('significant')
  ) {
    return 'significant';
  }

  // Check for moderate keywords
  if (
    text.includes('damage') ||
    text.includes('disruption') ||
    text.includes('outage') ||
    text.includes('moderate')
  ) {
    return 'moderate';
  }

  // Use reported severity if available
  if (incident.reportedSeverity) {
    return incident.reportedSeverity;
  }

  return 'minor';
}

/**
 * Calculate weighted severity score (1-5) based on base severity and sector criticality
 */
function calculateSeverityScore(severity: IncidentSeverity, sector: CISASector): number {
  const baseScore = SEVERITY_VALUES[severity];
  const sectorWeight = SECTOR_CRITICALITY[sector];

  // Apply sector weighting (more critical sectors have higher effective severity)
  // Formula: base + (base * sector_weight * 0.5) - capped at 5
  const weightedScore = baseScore + baseScore * sectorWeight * 0.5;
  return Math.min(5, Math.round(weightedScore * 10) / 10);
}

/**
 * Group raw incidents into clusters based on time-space proximity
 */
function clusterIncidents(incidents: RawIncident[]): RawIncident[][] {
  if (incidents.length === 0) return [];

  const clusters: RawIncident[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < incidents.length; i++) {
    if (used.has(i)) continue;

    const cluster: RawIncident[] = [incidents[i]];
    used.add(i);

    for (let j = i + 1; j < incidents.length; j++) {
      if (used.has(j)) continue;

      const incident1 = incidents[i];
      const incident2 = incidents[j];

      // Check spatial proximity
      const distance = calculateDistance(
        incident1.latitude,
        incident1.longitude,
        incident2.latitude,
        incident2.longitude
      );

      if (distance > SPATIAL_CLUSTER_RADIUS_KM) continue;

      // Check temporal proximity
      const timeDiff = Math.abs(incident1.timestamp.getTime() - incident2.timestamp.getTime());
      if (timeDiff > TEMPORAL_CLUSTER_WINDOW_MS) continue;

      // Add to cluster
      cluster.push(incident2);
      used.add(j);
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Find the best matching facility for an incident cluster
 */
async function findMatchingFacility(
  centerLat: number,
  centerLng: number,
  incidentType?: IncidentType
): Promise<NearbyFacility | undefined> {
  const nearby = await facilityDatabase.findNearbyFacilities(
    centerLat,
    centerLng,
    FACILITY_MATCH_RADIUS_KM,
    { limit: 10 }
  );

  if (nearby.length === 0) return undefined;

  // If we have incident type, prefer facilities that match
  if (incidentType === 'fire' || incidentType === 'explosion') {
    // Prefer industrial facilities
    const industrial = nearby.find((f) =>
      ['power_plant', 'oil_refinery', 'chemical_plant', 'nuclear_plant'].includes(f.facilityType)
    );
    if (industrial) return industrial;
  }

  if (incidentType === 'power_outage') {
    const energy = nearby.find((f) =>
      ['power_plant', 'substation', 'transmission_line'].includes(f.facilityType)
    );
    if (energy) return energy;
  }

  // Return closest facility
  return nearby[0];
}

/**
 * Find existing active incidents that might match new data
 */
async function findExistingIncident(
  lat: number,
  lng: number,
  timestamp: Date
): Promise<DBInfrastructureIncident | undefined> {
  // Calculate bounding box
  const latDelta = EXISTING_INCIDENT_MERGE_RADIUS_KM / 111.32;
  const lngDelta = EXISTING_INCIDENT_MERGE_RADIUS_KM / (111.32 * Math.cos((lat * Math.PI) / 180));

  const timeWindowStart = new Date(timestamp.getTime() - EXISTING_INCIDENT_MERGE_WINDOW_MS);

  const candidates = await db.query.infrastructureIncidents.findMany({
    where: and(
      or(
        eq(infrastructureIncidents.status, 'active'),
        eq(infrastructureIncidents.status, 'monitoring')
      ),
      gte(infrastructureIncidents.latitude, lat - latDelta),
      lte(infrastructureIncidents.latitude, lat + latDelta),
      gte(infrastructureIncidents.longitude, lng - lngDelta),
      lte(infrastructureIncidents.longitude, lng + lngDelta),
      gte(infrastructureIncidents.firstReportedAt, timeWindowStart)
    ),
    limit: 10,
  });

  // Find closest within radius
  let closest: DBInfrastructureIncident | undefined;
  let closestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = calculateDistance(lat, lng, candidate.latitude, candidate.longitude);
    if (distance < EXISTING_INCIDENT_MERGE_RADIUS_KM && distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }

  return closest;
}

/**
 * Merge a cluster of raw incidents into a single infrastructure incident
 */
async function mergeClusterToIncident(
  cluster: RawIncident[]
): Promise<{ incident: InfrastructureIncident; isNew: boolean } | null> {
  if (cluster.length === 0) return null;

  // Calculate cluster centroid
  const centerLat = cluster.reduce((sum, i) => sum + i.latitude, 0) / cluster.length;
  const centerLng = cluster.reduce((sum, i) => sum + i.longitude, 0) / cluster.length;

  // Get earliest and latest timestamps
  const timestamps = cluster.map((i) => i.timestamp.getTime());
  const firstReportedAt = new Date(Math.min(...timestamps));
  const lastReportedAt = new Date(Math.max(...timestamps));

  // Determine incident type from cluster
  const types = cluster.map((i) => i.incidentType || inferIncidentType(i.title, i.description));
  const incidentType = types[0] || 'unknown';

  // Find matching facility
  const matchedFacility = await findMatchingFacility(centerLat, centerLng, incidentType);

  // Determine sector
  const sector: CISASector = matchedFacility
    ? inferSectorFromFacilityType(matchedFacility.facilityType)
    : 'commercial_facilities';

  // Calculate severity
  const severities = cluster.map((i) => i.reportedSeverity || inferBaseSeverity(i));
  const maxSeverityIndex = Math.max(...severities.map((s) => SEVERITY_VALUES[s]));
  const severityKeys = Object.keys(SEVERITY_VALUES) as IncidentSeverity[];
  const severity = severityKeys.find((k) => SEVERITY_VALUES[k] === maxSeverityIndex) || 'minor';
  const severityScore = calculateSeverityScore(severity, sector);

  // Build title from highest confidence source
  const sortedByConfidence = [...cluster].sort((a, b) => b.confidence - a.confidence);
  const title = sortedByConfidence[0].title;
  const description = sortedByConfidence
    .filter((i) => i.description)
    .map((i) => i.description)
    .join(' | ');

  // Build sources array
  const sources = cluster.map((i) => ({
    source: i.source,
    sourceId: i.sourceId,
    confidence: i.confidence,
    timestamp: i.timestamp,
    metadata: i.metadata,
  }));

  // Check for existing incident to merge with
  const existingIncident = await findExistingIncident(centerLat, centerLng, firstReportedAt);

  if (existingIncident) {
    // Merge with existing incident
    const existingSources = (existingIncident.sources as typeof sources) || [];
    const newSourceIds = new Set(sources.map((s) => `${s.source}:${s.sourceId}`));
    const mergedSources = [
      ...existingSources.filter((s) => !newSourceIds.has(`${s.source}:${s.sourceId}`)),
      ...sources,
    ];

    // Update existing incident
    const updatedData = {
      sources: mergedSources,
      lastReportedAt,
      updatedAt: new Date(),
      // Upgrade severity if new data indicates higher severity
      ...(severityScore > existingIncident.severityScore && {
        severity,
        severityScore,
      }),
    };

    await db
      .update(infrastructureIncidents)
      .set(updatedData)
      .where(eq(infrastructureIncidents.id, existingIncident.id));

    const updated = await db.query.infrastructureIncidents.findFirst({
      where: eq(infrastructureIncidents.id, existingIncident.id),
    });

    if (!updated) return null;

    return {
      incident: {
        id: updated.id,
        sector: updated.sector as CISASector,
        incidentType: updated.incidentType as IncidentType,
        severity: updated.severity as IncidentSeverity,
        severityScore: updated.severityScore,
        latitude: updated.latitude,
        longitude: updated.longitude,
        address: updated.address || undefined,
        state: updated.state || undefined,
        facilityId: updated.facilityId || undefined,
        facilityName: updated.facilityName || undefined,
        facilityType: updated.facilityType as CriticalFacility['facilityType'] | undefined,
        title: updated.title,
        description: updated.description || undefined,
        sources: updated.sources as InfrastructureIncident['sources'],
        firstReportedAt: updated.firstReportedAt,
        lastReportedAt: updated.lastReportedAt,
        confirmedAt: updated.confirmedAt || undefined,
        resolvedAt: updated.resolvedAt || undefined,
        status: updated.status,
        verified: updated.verified,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
      isNew: false,
    };
  }

  // Create new incident
  const id = uuidv4();
  const now = new Date();

  const newIncident: NewInfrastructureIncident = {
    id,
    sector,
    incidentType,
    severity,
    severityScore,
    latitude: centerLat,
    longitude: centerLng,
    facilityId: matchedFacility?.id,
    facilityName: matchedFacility?.name,
    facilityType: matchedFacility?.facilityType,
    title,
    description: description || undefined,
    sources,
    firstReportedAt,
    lastReportedAt,
    status: 'active',
    verified: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(infrastructureIncidents).values(newIncident);

  return {
    incident: {
      ...newIncident,
      facilityId: newIncident.facilityId || undefined,
      facilityName: newIncident.facilityName || undefined,
      facilityType: newIncident.facilityType || undefined,
      address: undefined,
      state: undefined,
      confirmedAt: undefined,
      resolvedAt: undefined,
      sources: newIncident.sources as InfrastructureIncident['sources'],
    } as InfrastructureIncident,
    isNew: true,
  };
}

/**
 * Incident Correlator Service
 */
export class IncidentCorrelator {
  /**
   * Correlate raw incidents from multiple sources into unified infrastructure incidents
   */
  async correlateIncidents(rawIncidents: RawIncident[]): Promise<CorrelationResult> {
    const stats = {
      rawCount: rawIncidents.length,
      correlatedCount: 0,
      newIncidents: 0,
      updatedIncidents: 0,
      matchedToFacility: 0,
      duplicatesFiltered: 0,
    };

    if (rawIncidents.length === 0) {
      return {
        incidents: [],
        unprocessed: [],
        stats,
      };
    }

    // Filter out obviously invalid incidents
    const validIncidents = rawIncidents.filter(
      (i) =>
        i.latitude >= -90 &&
        i.latitude <= 90 &&
        i.longitude >= -180 &&
        i.longitude <= 180 &&
        i.confidence > 0
    );

    const unprocessed = rawIncidents.filter(
      (i) =>
        i.latitude < -90 ||
        i.latitude > 90 ||
        i.longitude < -180 ||
        i.longitude > 180 ||
        i.confidence <= 0
    );

    // Cluster incidents by time-space proximity
    const clusters = clusterIncidents(validIncidents);

    // Process each cluster
    const incidents: InfrastructureIncident[] = [];

    for (const cluster of clusters) {
      try {
        const result = await mergeClusterToIncident(cluster);
        if (result) {
          incidents.push(result.incident);
          stats.correlatedCount += cluster.length;

          if (result.isNew) {
            stats.newIncidents++;
          } else {
            stats.updatedIncidents++;
            stats.duplicatesFiltered += cluster.length - 1;
          }

          if (result.incident.facilityId) {
            stats.matchedToFacility++;
          }
        }
      } catch (error) {
        console.error('[IncidentCorrelator] Failed to process cluster:', error);
        unprocessed.push(...cluster);
      }
    }

    return {
      incidents,
      unprocessed,
      stats,
    };
  }

  /**
   * Get active incidents, optionally filtered
   */
  async getActiveIncidents(options?: {
    sectors?: CISASector[];
    minSeverity?: IncidentSeverity;
    limit?: number;
  }): Promise<InfrastructureIncident[]> {
    const conditions = [eq(infrastructureIncidents.status, 'active')];

    if (options?.sectors && options.sectors.length > 0) {
      conditions.push(inArray(infrastructureIncidents.sector, options.sectors));
    }

    if (options?.minSeverity) {
      const minScore = SEVERITY_VALUES[options.minSeverity];
      conditions.push(gte(infrastructureIncidents.severityScore, minScore));
    }

    const result = await db.query.infrastructureIncidents.findMany({
      where: and(...conditions),
      orderBy: (incidents, { desc }) => [
        desc(incidents.severityScore),
        desc(incidents.lastReportedAt),
      ],
      limit: options?.limit || 100,
    });

    return result.map((r) => ({
      id: r.id,
      sector: r.sector as CISASector,
      incidentType: r.incidentType as IncidentType,
      severity: r.severity as IncidentSeverity,
      severityScore: r.severityScore,
      latitude: r.latitude,
      longitude: r.longitude,
      address: r.address || undefined,
      state: r.state || undefined,
      facilityId: r.facilityId || undefined,
      facilityName: r.facilityName || undefined,
      facilityType: r.facilityType as CriticalFacility['facilityType'] | undefined,
      title: r.title,
      description: r.description || undefined,
      sources: r.sources as InfrastructureIncident['sources'],
      firstReportedAt: r.firstReportedAt,
      lastReportedAt: r.lastReportedAt,
      confirmedAt: r.confirmedAt || undefined,
      resolvedAt: r.resolvedAt || undefined,
      status: r.status,
      verified: r.verified,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Resolve an incident
   */
  async resolveIncident(id: string): Promise<void> {
    const now = new Date();
    await db
      .update(infrastructureIncidents)
      .set({
        status: 'resolved',
        resolvedAt: now,
        updatedAt: now,
      })
      .where(eq(infrastructureIncidents.id, id));
  }

  /**
   * Mark an incident as false alarm
   */
  async markFalseAlarm(id: string): Promise<void> {
    await db
      .update(infrastructureIncidents)
      .set({
        status: 'false_alarm',
        updatedAt: new Date(),
      })
      .where(eq(infrastructureIncidents.id, id));
  }

  /**
   * Verify an incident (confirmed by human or additional sources)
   */
  async verifyIncident(id: string): Promise<void> {
    const now = new Date();
    await db
      .update(infrastructureIncidents)
      .set({
        verified: true,
        confirmedAt: now,
        updatedAt: now,
      })
      .where(eq(infrastructureIncidents.id, id));
  }
}

// Export singleton instance
export const incidentCorrelator = new IncidentCorrelator();
