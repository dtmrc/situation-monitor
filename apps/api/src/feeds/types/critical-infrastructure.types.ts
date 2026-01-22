/**
 * Critical Infrastructure Types
 *
 * Type definitions for CISA 16 sectors critical infrastructure monitoring.
 * Supports facility tracking, incident correlation, and multi-source data aggregation.
 */

/**
 * CISA's 16 Critical Infrastructure Sectors
 * @see https://www.cisa.gov/topics/critical-infrastructure-security-and-resilience/critical-infrastructure-sectors
 */
export type CISASector =
  | 'chemical'
  | 'commercial_facilities'
  | 'communications'
  | 'critical_manufacturing'
  | 'dams'
  | 'defense_industrial_base'
  | 'emergency_services'
  | 'energy'
  | 'financial_services'
  | 'food_agriculture'
  | 'government_facilities'
  | 'healthcare'
  | 'information_technology'
  | 'nuclear'
  | 'transportation'
  | 'water_wastewater';

/**
 * Sector display names for UI
 */
export const SECTOR_LABELS: Record<CISASector, string> = {
  chemical: 'Chemical',
  commercial_facilities: 'Commercial Facilities',
  communications: 'Communications',
  critical_manufacturing: 'Critical Manufacturing',
  dams: 'Dams',
  defense_industrial_base: 'Defense Industrial Base',
  emergency_services: 'Emergency Services',
  energy: 'Energy',
  financial_services: 'Financial Services',
  food_agriculture: 'Food & Agriculture',
  government_facilities: 'Government Facilities',
  healthcare: 'Healthcare & Public Health',
  information_technology: 'Information Technology',
  nuclear: 'Nuclear Reactors, Materials & Waste',
  transportation: 'Transportation Systems',
  water_wastewater: 'Water & Wastewater Systems',
};

/**
 * Sector criticality weighting for incident severity calculations
 * Higher values = more critical to national security
 */
export const SECTOR_CRITICALITY: Record<CISASector, number> = {
  nuclear: 1.0,
  energy: 0.95,
  water_wastewater: 0.9,
  communications: 0.85,
  emergency_services: 0.85,
  transportation: 0.8,
  healthcare: 0.8,
  dams: 0.75,
  defense_industrial_base: 0.75,
  financial_services: 0.7,
  government_facilities: 0.7,
  food_agriculture: 0.65,
  chemical: 0.6,
  critical_manufacturing: 0.55,
  information_technology: 0.5,
  commercial_facilities: 0.4,
};

/**
 * Types of critical facilities within sectors
 */
export type FacilityType =
  // Energy
  | 'power_plant'
  | 'substation'
  | 'transmission_line'
  | 'oil_refinery'
  | 'gas_pipeline'
  | 'gas_storage'
  | 'solar_farm'
  | 'wind_farm'
  // Nuclear
  | 'nuclear_plant'
  | 'nuclear_research'
  | 'nuclear_waste'
  // Water
  | 'water_treatment'
  | 'wastewater_treatment'
  | 'dam'
  | 'reservoir'
  | 'pumping_station'
  // Transportation
  | 'airport'
  | 'seaport'
  | 'rail_yard'
  | 'highway_interchange'
  | 'bridge'
  | 'tunnel'
  // Communications
  | 'data_center'
  | 'cell_tower'
  | 'internet_exchange'
  | 'broadcast_facility'
  // Healthcare
  | 'hospital'
  | 'medical_research'
  | 'pharmaceutical'
  // Emergency
  | 'fire_station'
  | 'police_station'
  | 'emergency_dispatch'
  // Chemical
  | 'chemical_plant'
  | 'chemical_storage'
  // Financial
  | 'financial_institution'
  | 'data_processing_center'
  // Government
  | 'government_building'
  | 'military_base'
  // Other
  | 'other';

/**
 * Types of incidents affecting infrastructure
 */
export type IncidentType =
  | 'fire'
  | 'explosion'
  | 'structural_failure'
  | 'power_outage'
  | 'equipment_failure'
  | 'cyber_attack'
  | 'physical_attack'
  | 'natural_disaster'
  | 'hazmat_release'
  | 'flooding'
  | 'weather_damage'
  | 'traffic_incident'
  | 'civil_disturbance'
  | 'suspicious_activity'
  | 'evacuation'
  | 'unknown';

/**
 * Incident severity levels
 */
export type IncidentSeverity = 'minor' | 'moderate' | 'significant' | 'severe' | 'catastrophic';

/**
 * Severity numeric values for calculations
 */
export const SEVERITY_VALUES: Record<IncidentSeverity, number> = {
  minor: 1,
  moderate: 2,
  significant: 3,
  severe: 4,
  catastrophic: 5,
};

/**
 * Source types for incident data
 */
export type IncidentSource =
  | 'satellite_fire' // NASA FIRMS
  | 'nrc_report' // Nuclear Regulatory Commission
  | 'power_outage' // PowerOutage.us
  | 'dot_camera' // DOT traffic cameras
  | 'citizen_report' // Citizen app
  | 'manual' // Manual entry
  | 'api'; // External API

/**
 * A critical infrastructure facility
 */
export interface CriticalFacility {
  id: string;
  name: string;
  sector: CISASector;
  facilityType: FacilityType;

  // Location
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  country: string;

  // Metadata
  operator?: string;
  capacity?: string;
  status: 'operational' | 'maintenance' | 'offline' | 'unknown';

  // Data source
  source: 'hifld' | 'osm' | 'manual' | 'api';
  sourceId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Raw satellite fire detection (NASA FIRMS)
 */
export interface SatelliteFire {
  id: string;

  // Location
  latitude: number;
  longitude: number;

  // FIRMS properties
  brightness: number;
  frp: number; // Fire Radiative Power (MW)
  confidence: 'low' | 'nominal' | 'high';
  satellite: string;
  instrument: string;
  dayNight: 'day' | 'night';

  // Timing
  acquisitionTime: Date;

  // Processing
  processed: boolean;
  matchedFacilityId?: string;
  matchedIncidentId?: string;

  createdAt: Date;
}

/**
 * DOT traffic camera
 */
export interface DOTCamera {
  id: string;
  name: string;
  state: string;
  route?: string;

  // Location
  latitude: number;
  longitude: number;

  // Status
  status: DOTCameraStatus;
  imageUrl?: string;
  videoUrl?: string;
  lastImageTime?: Date;

  // Metadata
  sourceAgency: string;
  sourceId: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * DOT camera status
 */
export type DOTCameraStatus = 'active' | 'inactive' | 'unknown' | 'incident_detected';

/**
 * Citizen app incident report
 */
export interface CitizenIncident {
  id: string;
  externalId: string;
  city: string;

  // Event details
  title: string;
  description?: string;
  category: string;
  subcategory?: string;

  // Location
  latitude: number;
  longitude: number;
  address?: string;

  // Engagement metrics (for severity calculation)
  viewCount?: number;
  commentCount?: number;
  updateCount?: number;

  // Timing
  reportedAt: Date;
  lastUpdatedAt?: Date;

  // Processing
  processed: boolean;
  matchedFacilityId?: string;
  matchedIncidentId?: string;

  createdAt: Date;
}

/**
 * Raw incident from any source before correlation
 */
export interface RawIncident {
  /** Unique ID within source */
  sourceId: string;
  /** Source type */
  source: IncidentSource;

  // Location
  latitude: number;
  longitude: number;

  // Event details
  title: string;
  description?: string;
  incidentType?: IncidentType;
  reportedSeverity?: IncidentSeverity;

  // Timing
  timestamp: Date;

  // Confidence in this report (0-1)
  confidence: number;

  // Source-specific data
  metadata: Record<string, unknown>;
}

/**
 * Correlated infrastructure incident
 */
export interface InfrastructureIncident {
  id: string;

  // Classification
  sector: CISASector;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  severityScore: number; // 1-5 with sector weighting

  // Location
  latitude: number;
  longitude: number;
  address?: string;
  state?: string;

  // Matched facility (if any)
  facilityId?: string;
  facilityName?: string;
  facilityType?: FacilityType;

  // Event details
  title: string;
  description?: string;

  // Source aggregation
  sources: {
    source: IncidentSource;
    sourceId: string;
    confidence: number;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }[];

  // Timing
  firstReportedAt: Date;
  lastReportedAt: Date;
  confirmedAt?: Date;
  resolvedAt?: Date;

  // Status
  status: 'active' | 'monitoring' | 'resolved' | 'false_alarm';
  verified: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sector status aggregation for dashboard
 */
export interface SectorStatus {
  sector: CISASector;
  label: string;
  facilityCount: number;

  // Incident counts
  activeIncidents: number;
  incidentsLast24h: number;
  incidentsLast7d: number;

  // Severity breakdown
  severityBreakdown: Record<IncidentSeverity, number>;

  // Trend
  trend: 'improving' | 'stable' | 'degrading';
  trendPercentage: number; // Change from previous period

  // Overall status
  status: 'normal' | 'elevated' | 'high' | 'critical';
}

/**
 * Geographic bounds for spatial queries
 */
export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Infrastructure incident filter options
 */
export interface InfrastructureFilterOptions {
  sectors?: CISASector[];
  incidentTypes?: IncidentType[];
  minSeverity?: IncidentSeverity;
  status?: InfrastructureIncident['status'][];
  verified?: boolean;
  bounds?: GeoBounds;
  startDate?: Date;
  endDate?: Date;
  facilityId?: string;
  state?: string;
}

/**
 * Facility filter options
 */
export interface FacilityFilterOptions {
  sectors?: CISASector[];
  facilityTypes?: FacilityType[];
  status?: CriticalFacility['status'][];
  bounds?: GeoBounds;
  state?: string;
  hasActiveIncident?: boolean;
}

/**
 * Correlation result from IncidentCorrelator
 */
export interface CorrelationResult {
  /** New or updated incidents */
  incidents: InfrastructureIncident[];
  /** Raw incidents that couldn't be processed */
  unprocessed: RawIncident[];
  /** Statistics */
  stats: {
    rawCount: number;
    correlatedCount: number;
    newIncidents: number;
    updatedIncidents: number;
    matchedToFacility: number;
    duplicatesFiltered: number;
  };
}

/**
 * Supported states for DOT camera integration
 */
export const DOT_SUPPORTED_STATES = [
  'CA', // California
  'NY', // New York
  'TX', // Texas
  'FL', // Florida
  'PA', // Pennsylvania
  'IL', // Illinois
] as const;

export type DOTSupportedState = (typeof DOT_SUPPORTED_STATES)[number];

/**
 * Supported cities for Citizen app
 */
export const CITIZEN_SUPPORTED_CITIES = [
  'new_york',
  'los_angeles',
  'chicago',
  'houston',
  'phoenix',
  'philadelphia',
  'san_antonio',
  'san_diego',
  'dallas',
  'san_jose',
  'austin',
  'jacksonville',
  'fort_worth',
  'columbus',
  'indianapolis',
  'charlotte',
  'san_francisco',
  'seattle',
  'denver',
  'washington_dc',
] as const;

export type CitizenCity = (typeof CITIZEN_SUPPORTED_CITIES)[number];

/**
 * City coordinates for Citizen API
 */
export const CITIZEN_CITY_COORDS: Record<CitizenCity, { lat: number; lng: number }> = {
  new_york: { lat: 40.7128, lng: -74.006 },
  los_angeles: { lat: 34.0522, lng: -118.2437 },
  chicago: { lat: 41.8781, lng: -87.6298 },
  houston: { lat: 29.7604, lng: -95.3698 },
  phoenix: { lat: 33.4484, lng: -112.074 },
  philadelphia: { lat: 39.9526, lng: -75.1652 },
  san_antonio: { lat: 29.4241, lng: -98.4936 },
  san_diego: { lat: 32.7157, lng: -117.1611 },
  dallas: { lat: 32.7767, lng: -96.797 },
  san_jose: { lat: 37.3382, lng: -121.8863 },
  austin: { lat: 30.2672, lng: -97.7431 },
  jacksonville: { lat: 30.3322, lng: -81.6557 },
  fort_worth: { lat: 32.7555, lng: -97.3308 },
  columbus: { lat: 39.9612, lng: -82.9988 },
  indianapolis: { lat: 39.7684, lng: -86.158 },
  charlotte: { lat: 35.2271, lng: -80.8431 },
  san_francisco: { lat: 37.7749, lng: -122.4194 },
  seattle: { lat: 47.6062, lng: -122.3321 },
  denver: { lat: 39.7392, lng: -104.9903 },
  washington_dc: { lat: 38.9072, lng: -77.0369 },
};
