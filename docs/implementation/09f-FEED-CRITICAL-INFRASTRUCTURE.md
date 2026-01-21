# Phase 9f: Critical Infrastructure Monitoring Layer

Parent: [09-REALTIME-DATA-FEEDS.md](./09-REALTIME-DATA-FEEDS.md)

## Overview

This document covers monitoring and incident detection for US national critical infrastructure as defined by CISA's 16 critical infrastructure sectors. The system aggregates data from multiple sources—satellite imagery, government feeds, news/social media, and specialized databases—to detect, correlate, and alert on incidents affecting critical facilities.

**Tasks Covered:** 9.21, 9.22, 9.23

---

## CISA Critical Infrastructure Sectors

The system tracks incidents across all 16 CISA-defined sectors:

| Sector | Examples | Primary Data Sources |
|--------|----------|---------------------|
| **Chemical** | Chemical plants, hazmat facilities | EPA RMP, NRC, FIRMS |
| **Commercial Facilities** | Malls, stadiums, hotels | News, social media |
| **Communications** | Cell towers, data centers, ISPs | FCC outages, BGP monitoring |
| **Critical Manufacturing** | Steel, machinery, vehicles | News, supply chain data |
| **Dams** | Dams, levees, reservoirs | USACE, NWS, USGS |
| **Defense Industrial Base** | Defense contractors, military suppliers | News, SEC filings |
| **Emergency Services** | Police, fire, EMS, 911 centers | CAD feeds, scanner data |
| **Energy** | Power plants, grid, pipelines, refineries | EIA, FIRMS, pipeline data |
| **Financial Services** | Banks, exchanges, payment systems | SEC, news, status pages |
| **Food & Agriculture** | Farms, processing plants, distribution | USDA, FIRMS, news |
| **Government Facilities** | Federal buildings, courts, embassies | GSA, news |
| **Healthcare & Public Health** | Hospitals, labs, pharmaceutical | HHS, CDC, news |
| **Information Technology** | Software, hardware, cloud providers | Status pages, BGP, news |
| **Nuclear** | Nuclear plants, waste facilities | NRC, FIRMS |
| **Transportation** | Airports, ports, rail, highways | FAA, USCG, FRA, FHWA |
| **Water & Wastewater** | Treatment plants, distribution | EPA SDWIS, state data |

---

## Critical Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                 CRITICAL INFRASTRUCTURE MONITORING PIPELINE                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  DATA SOURCES                                                                    │
│  ────────────                                                                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │  Satellite │ │ Government │ │   News &   │ │  Outage    │ │  Facility  │   │
│  │   (FIRMS)  │ │   Feeds    │ │   Social   │ │  Monitors  │ │  Database  │   │
│  │            │ │ (NRC, EIA, │ │  (GDELT,   │ │ (Downdet,  │ │  (HIFLD,   │   │
│  │ VIIRS/MOD  │ │  EPA, FAA) │ │  Twitter)  │ │  BGP, FCC) │ │  OSM, EIA) │   │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘   │
│        │              │              │              │              │           │
│        └──────────────┴──────────────┴──────────────┴──────────────┘           │
│                                      │                                          │
│                                      ▼                                          │
│  INGESTION LAYER                                                                │
│  ───────────────                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐          │
│  │                     MULTI-SOURCE ADAPTER LAYER                    │          │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │          │
│  │  │   FIRMS     │ │  Gov Feed   │ │    News     │ │   Outage   │ │          │
│  │  │   Adapter   │ │  Adapters   │ │   Adapter   │ │  Adapter   │ │          │
│  │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬─────┘ │          │
│  │         │               │               │               │        │          │
│  │         └───────────────┴───────────────┴───────────────┘        │          │
│  │                                │                                  │          │
│  │                    ┌───────────▼───────────┐                     │          │
│  │                    │   Normalize to        │                     │          │
│  │                    │   InfraIncident       │                     │          │
│  │                    └───────────┬───────────┘                     │          │
│  └────────────────────────────────┼──────────────────────────────────┘          │
│                                   │                                             │
│                                   ▼                                             │
│  CORRELATION LAYER                                                              │
│  ─────────────────                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐          │
│  │               INFRASTRUCTURE INCIDENT CORRELATOR                  │          │
│  │                                                                   │          │
│  │  ┌─────────────────┐     ┌─────────────────┐                    │          │
│  │  │   Raw Incident  │────▶│  Spatial Match  │                    │          │
│  │  │     Stream      │     │  (facility DB)  │                    │          │
│  │  └─────────────────┘     └────────┬────────┘                    │          │
│  │                                   │                              │          │
│  │  ┌─────────────────┐     ┌────────▼────────┐                    │          │
│  │  │    HIFLD/OSM    │────▶│  Enrichment     │                    │          │
│  │  │ Facility Data   │     │  (sector, owner)│                    │          │
│  │  └─────────────────┘     └────────┬────────┘                    │          │
│  │                                   │                              │          │
│  │                          ┌────────▼────────┐                    │          │
│  │                          │    Severity &   │                    │          │
│  │                          │ Impact Scoring  │                    │          │
│  │                          └────────┬────────┘                    │          │
│  │                                   │                              │          │
│  │                          ┌────────▼────────┐                    │          │
│  │                          │   Deduplication │                    │          │
│  │                          │  & Clustering   │                    │          │
│  │                          └────────┬────────┘                    │          │
│  └───────────────────────────────────┼──────────────────────────────┘          │
│                                      │                                          │
│                                      ▼                                          │
│  OUTPUT LAYER                                                                   │
│  ────────────                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  PostgreSQL  │  │   WebSocket  │  │    Alert     │  │   Timeline   │       │
│  │   Storage    │  │   Broadcast  │  │   Dispatch   │  │   & Reports  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Source Details

### Satellite Fire Detection (NASA FIRMS)
| Source | Satellite | Resolution | Latency | Coverage |
|--------|-----------|------------|---------|----------|
| **VIIRS SNPP** | Suomi NPP | 375m | 3 hours | Global |
| **VIIRS NOAA-20** | NOAA-20 | 375m | 3 hours | Global |
| **MODIS** | Terra/Aqua | 1km | 3 hours | Global |

### Government Data Feeds
| Source | Agency | Data Type | Update Frequency |
|--------|--------|-----------|------------------|
| **NRC Events** | Nuclear Regulatory Commission | Nuclear incidents | Real-time |
| **EIA Status** | Energy Information Administration | Power plant status | Daily |
| **EPA ECHO** | Environmental Protection Agency | Compliance/violations | Weekly |
| **FAA NOTAM** | Federal Aviation Administration | Airport disruptions | Real-time |
| **USCG MSIB** | Coast Guard | Port security bulletins | As issued |
| **FCC Outages** | Federal Communications Commission | Telecom outages | Real-time |
| **USGS Hazards** | US Geological Survey | Dam/earthquake data | Real-time |

### Infrastructure Outage Monitoring
| Source | Coverage | Data Type |
|--------|----------|-----------|
| **Downdetector** | Major services | User-reported outages |
| **BGP Stream** | Internet routing | Network disruptions |
| **Status Pages** | Cloud/SaaS providers | Service status |
| **PowerOutage.us** | US utilities | Power outages by county |

### Facility Databases
| Source | Coverage | Facility Types |
|--------|----------|----------------|
| **HIFLD** | US | All 16 sectors (official) |
| **OpenStreetMap** | Global | Various infrastructure |
| **EIA** | US | Energy facilities |
| **EPA FRS** | US | Regulated facilities |

---

## Critical Infrastructure Schema

**File: `apps/api/src/feeds/types/critical-infrastructure.types.ts`**
```typescript
/**
 * CISA Critical Infrastructure Sectors
 * https://www.cisa.gov/topics/critical-infrastructure-security-and-resilience/critical-infrastructure-sectors
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
  | 'healthcare_public_health'
  | 'information_technology'
  | 'nuclear'
  | 'transportation'
  | 'water_wastewater';

/**
 * Specific facility types within each sector
 */
export type FacilityType =
  // Chemical
  | 'chemical_plant'
  | 'hazmat_facility'
  | 'fertilizer_plant'
  // Commercial Facilities
  | 'shopping_center'
  | 'stadium'
  | 'convention_center'
  | 'hotel'
  // Communications
  | 'cell_tower'
  | 'data_center'
  | 'telephone_exchange'
  | 'broadcast_station'
  | 'internet_exchange'
  // Critical Manufacturing
  | 'steel_mill'
  | 'automotive_plant'
  | 'aerospace_facility'
  | 'semiconductor_fab'
  // Dams
  | 'dam'
  | 'levee'
  | 'reservoir'
  // Defense Industrial Base
  | 'defense_contractor'
  | 'military_supplier'
  | 'arms_manufacturer'
  // Emergency Services
  | 'police_station'
  | 'fire_station'
  | 'ems_station'
  | 'psap_911_center'
  // Energy
  | 'power_plant'
  | 'substation'
  | 'refinery'
  | 'pipeline_station'
  | 'oil_terminal'
  | 'lng_terminal'
  | 'solar_farm'
  | 'wind_farm'
  // Financial Services
  | 'bank_hq'
  | 'stock_exchange'
  | 'data_processing_center'
  | 'federal_reserve'
  // Food & Agriculture
  | 'food_processing'
  | 'grain_elevator'
  | 'distribution_center'
  | 'cold_storage'
  | 'slaughterhouse'
  // Government Facilities
  | 'federal_building'
  | 'courthouse'
  | 'embassy'
  | 'military_base'
  // Healthcare
  | 'hospital'
  | 'research_lab'
  | 'pharmaceutical_plant'
  | 'blood_bank'
  | 'vaccine_facility'
  // IT
  | 'cloud_datacenter'
  | 'network_operations_center'
  | 'software_hq'
  // Nuclear
  | 'nuclear_plant'
  | 'nuclear_waste_facility'
  | 'research_reactor'
  // Transportation
  | 'airport'
  | 'seaport'
  | 'rail_yard'
  | 'rail_station'
  | 'highway_interchange'
  | 'bridge'
  | 'tunnel'
  | 'bus_terminal'
  // Water
  | 'water_treatment'
  | 'wastewater_treatment'
  | 'pumping_station'
  | 'reservoir_water';

/**
 * Types of incidents affecting infrastructure
 */
export type IncidentType =
  | 'fire'
  | 'explosion'
  | 'structural_damage'
  | 'flooding'
  | 'power_outage'
  | 'cyber_incident'
  | 'physical_security'
  | 'hazmat_release'
  | 'equipment_failure'
  | 'natural_disaster'
  | 'terrorism'
  | 'sabotage'
  | 'labor_action'
  | 'supply_disruption'
  | 'service_outage'
  | 'regulatory_action'
  | 'unknown';

export type IncidentSeverity = 'minor' | 'moderate' | 'major' | 'catastrophic';

export type IncidentStatus = 'detected' | 'confirmed' | 'ongoing' | 'contained' | 'resolved';

/**
 * Data source for incident detection
 */
export type IncidentSource =
  | 'firms_viirs'
  | 'firms_modis'
  | 'nrc'
  | 'eia'
  | 'epa'
  | 'faa'
  | 'uscg'
  | 'fcc'
  | 'usgs'
  | 'news'
  | 'social_media'
  | 'bgp_monitoring'
  | 'status_page'
  | 'power_outage'
  | 'scanner'
  | 'manual';

/**
 * Facility record from HIFLD or other sources
 */
export interface CriticalFacility {
  id: string;
  name: string;
  sector: CISASector;
  facilityType: FacilityType;
  location: {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    county?: string;
    fips?: string;
  };
  operator?: string;
  owner?: string;
  capacity?: string;
  employeeCount?: number;
  naicsCode?: string;
  source: 'hifld' | 'osm' | 'eia' | 'epa' | 'manual' | 'faa' | 'uscg';
  sourceId?: string;
  lastVerified?: Date;
  metadata?: Record<string, any>;
}

/**
 * Satellite fire detection from FIRMS
 */
export interface SatelliteFire {
  id: string;
  source: 'firms_viirs' | 'firms_modis';
  location: {
    lat: number;
    lng: number;
  };
  brightness: number;        // Kelvin
  brightT31?: number;        // Band 31 brightness (MODIS)
  frp: number;               // Fire Radiative Power (MW)
  confidence: 'low' | 'nominal' | 'high';
  scan: number;
  track: number;
  acqDate: Date;
  acqTime: string;           // HHMM format
  satellite: string;
  dayNight: 'D' | 'N';
  version: string;
}

/**
 * Raw incident from any source before correlation
 */
export interface RawIncident {
  id: string;
  source: IncidentSource;
  type: IncidentType;
  title: string;
  description?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
    region?: string;
  };
  timestamp: Date;
  confidence: number;         // 0-1
  sourceUrl?: string;
  sourceData?: Record<string, any>;
}

/**
 * Correlated infrastructure incident
 */
export interface InfrastructureIncident {
  id: string;

  // Classification
  type: IncidentType;
  sector: CISASector;
  severity: IncidentSeverity;
  status: IncidentStatus;

  // Affected facility (if matched)
  facility?: CriticalFacility;
  facilityMatch?: {
    distanceMeters: number;
    confidence: number;
  };

  // Location (may differ from facility)
  location: {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    state?: string;
  };

  // Source data
  sources: Array<{
    source: IncidentSource;
    rawIncidentId: string;
    timestamp: Date;
    confidence: number;
  }>;
  primarySource: IncidentSource;

  // Content
  title: string;
  description?: string;

  // Impact assessment
  impactAssessment?: {
    populationAffected?: number;
    economicImpact?: 'low' | 'medium' | 'high' | 'critical';
    cascadingRisk?: string[];
    estimatedDuration?: string;
  };

  // Related data
  newsArticles: string[];
  socialMediaPosts: string[];
  relatedIncidents: string[];

  // Satellite fire data (if applicable)
  satelliteFire?: SatelliteFire;

  // Timestamps
  detectedAt: Date;
  confirmedAt?: Date;
  resolvedAt?: Date;
  lastUpdated: Date;
}

/**
 * Aggregated sector status for dashboard
 */
export interface SectorStatus {
  sector: CISASector;
  activeIncidents: number;
  criticalIncidents: number;
  affectedFacilities: number;
  recentTrend: 'improving' | 'stable' | 'degrading';
  lastIncidentAt?: Date;
}
```

---

## NASA FIRMS Adapter

**File: `apps/api/src/feeds/adapters/infrastructure/firms.adapter.ts`**
```typescript
import { parse } from 'csv-parse/sync';
import { BaseFeedAdapter, type FeedConfig } from '../../adapter.interface';
import type { SatelliteFire, RawIncident, IncidentSource } from '../../types/critical-infrastructure.types';

type FIRMSSource = 'VIIRS_SNPP_NRT' | 'VIIRS_NOAA20_NRT' | 'MODIS_NRT';

interface FIRMSRow {
  latitude: string;
  longitude: string;
  brightness: string;
  scan: string;
  track: string;
  acq_date: string;
  acq_time: string;
  satellite: string;
  confidence: string;
  version: string;
  bright_t31?: string;
  frp: string;
  daynight: string;
}

export class NASAFIRMSAdapter extends BaseFeedAdapter {
  name = 'NASA FIRMS';
  type = 'satellite_fire';

  private mapKey!: string;
  private sources: FIRMSSource[] = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT'];
  private areaOfInterest: string = 'USA';  // Default to USA
  private dayRange: number = 1;

  async initialize(config: FeedConfig): Promise<void> {
    await super.initialize(config);
    this.mapKey = config.apiKey || process.env.NASA_FIRMS_MAP_KEY!;
    this.sources = (config.options?.sources as FIRMSSource[]) || this.sources;
    this.areaOfInterest = (config.options?.area as string) || 'USA';
    this.dayRange = (config.options?.dayRange as number) || 1;
  }

  async fetch(): Promise<SatelliteFire[]> {
    const allFires: SatelliteFire[] = [];

    for (const source of this.sources) {
      try {
        const fires = await this.fetchSource(source);
        allFires.push(...fires);
      } catch (error) {
        console.error(`[FIRMS] Failed to fetch ${source}:`, error);
      }
    }

    return this.deduplicateFires(allFires);
  }

  private async fetchSource(source: FIRMSSource): Promise<SatelliteFire[]> {
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${this.mapKey}/${source}/${this.areaOfInterest}/${this.dayRange}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`FIRMS API error: ${response.statusText}`);
    }

    const csv = await response.text();

    const rows: FIRMSRow[] = parse(csv, {
      columns: true,
      skip_empty_lines: true,
    });

    return rows.map(row => this.parseRow(row, source));
  }

  private parseRow(row: FIRMSRow, source: FIRMSSource): SatelliteFire {
    const sourceMap: Record<FIRMSSource, SatelliteFire['source']> = {
      'VIIRS_SNPP_NRT': 'firms_viirs',
      'VIIRS_NOAA20_NRT': 'firms_viirs',
      'MODIS_NRT': 'firms_modis',
    };

    return {
      id: `firms-${row.acq_date}-${row.acq_time}-${row.latitude}-${row.longitude}`,
      source: sourceMap[source],
      location: {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude),
      },
      brightness: parseFloat(row.brightness),
      brightT31: row.bright_t31 ? parseFloat(row.bright_t31) : undefined,
      frp: parseFloat(row.frp),
      confidence: this.mapConfidence(row.confidence),
      scan: parseFloat(row.scan),
      track: parseFloat(row.track),
      acqDate: new Date(row.acq_date),
      acqTime: row.acq_time,
      satellite: row.satellite,
      dayNight: row.daynight as 'D' | 'N',
      version: row.version,
    };
  }

  private mapConfidence(conf: string): 'low' | 'nominal' | 'high' {
    const val = conf.toLowerCase();
    if (val === 'h' || val === 'high' || parseInt(val) >= 80) return 'high';
    if (val === 'l' || val === 'low' || parseInt(val) < 50) return 'low';
    return 'nominal';
  }

  private deduplicateFires(fires: SatelliteFire[]): SatelliteFire[] {
    const DISTANCE_THRESHOLD = 1; // km
    const TIME_THRESHOLD = 60 * 60 * 1000; // 1 hour

    const dedupedFires: SatelliteFire[] = [];
    const used = new Set<string>();

    for (const fire of fires) {
      if (used.has(fire.id)) continue;

      const cluster = fires.filter(other => {
        if (used.has(other.id)) return false;

        const distance = haversineDistance(fire.location, other.location);
        const timeDiff = Math.abs(
          this.parseDateTime(fire.acqDate, fire.acqTime).getTime() -
          this.parseDateTime(other.acqDate, other.acqTime).getTime()
        );

        return distance <= DISTANCE_THRESHOLD && timeDiff <= TIME_THRESHOLD;
      });

      cluster.forEach(f => used.add(f.id));

      const best = cluster.reduce((a, b) => a.frp > b.frp ? a : b);
      dedupedFires.push(best);
    }

    return dedupedFires;
  }

  private parseDateTime(date: Date, time: string): Date {
    const hours = parseInt(time.substring(0, 2));
    const minutes = parseInt(time.substring(2, 4));
    const result = new Date(date);
    result.setUTCHours(hours, minutes);
    return result;
  }

  /**
   * Convert satellite fire to raw incident format
   */
  toRawIncident(fire: SatelliteFire): RawIncident {
    return {
      id: fire.id,
      source: fire.source as IncidentSource,
      type: 'fire',
      title: `Satellite fire detected (FRP: ${fire.frp.toFixed(1)} MW)`,
      location: fire.location,
      timestamp: this.parseDateTime(fire.acqDate, fire.acqTime),
      confidence: fire.confidence === 'high' ? 0.9 : fire.confidence === 'nominal' ? 0.7 : 0.5,
      sourceData: {
        brightness: fire.brightness,
        frp: fire.frp,
        satellite: fire.satellite,
        dayNight: fire.dayNight,
      },
    };
  }
}

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;

  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
```

---

## Government Feed Adapters

**File: `apps/api/src/feeds/adapters/infrastructure/nrc.adapter.ts`**
```typescript
import { BaseFeedAdapter, type FeedConfig } from '../../adapter.interface';
import type { RawIncident } from '../../types/critical-infrastructure.types';

interface NRCEvent {
  eventNumber: string;
  eventDate: string;
  eventTime: string;
  facilityName: string;
  region: string;
  state: string;
  unitName: string;
  eventType: string;
  description: string;
}

/**
 * NRC (Nuclear Regulatory Commission) event feed adapter
 * Data source: https://www.nrc.gov/reading-rm/doc-collections/event-status/event/
 */
export class NRCEventsAdapter extends BaseFeedAdapter {
  name = 'NRC Events';
  type = 'government_feed';

  async fetch(): Promise<RawIncident[]> {
    // NRC provides RSS feed and daily event reports
    const response = await fetch(
      'https://www.nrc.gov/reading-rm/doc-collections/event-status/event/event.xml'
    );

    if (!response.ok) {
      throw new Error(`NRC feed error: ${response.statusText}`);
    }

    const xml = await response.text();
    const events = this.parseNRCXML(xml);

    return events.map(event => this.toRawIncident(event));
  }

  private parseNRCXML(xml: string): NRCEvent[] {
    // XML parsing implementation
    // Returns structured NRC event data
    return []; // Placeholder - implement XML parsing
  }

  private toRawIncident(event: NRCEvent): RawIncident {
    return {
      id: `nrc-${event.eventNumber}`,
      source: 'nrc',
      type: this.mapEventType(event.eventType),
      title: `NRC Event: ${event.eventType} at ${event.facilityName}`,
      description: event.description,
      location: {
        region: `${event.state}, ${event.region}`,
      },
      timestamp: new Date(`${event.eventDate} ${event.eventTime}`),
      confidence: 1.0, // Official government source
      sourceUrl: `https://www.nrc.gov/reading-rm/doc-collections/event-status/event/${event.eventNumber}.html`,
      sourceData: event,
    };
  }

  private mapEventType(nrcType: string): RawIncident['type'] {
    const typeMap: Record<string, RawIncident['type']> = {
      'SCRAM': 'equipment_failure',
      'FIRE': 'fire',
      'SECURITY': 'physical_security',
      'RADIATION': 'hazmat_release',
    };
    return typeMap[nrcType] || 'unknown';
  }
}
```

**File: `apps/api/src/feeds/adapters/infrastructure/power-outage.adapter.ts`**
```typescript
import { BaseFeedAdapter, type FeedConfig } from '../../adapter.interface';
import type { RawIncident } from '../../types/critical-infrastructure.types';

interface PowerOutageData {
  state: string;
  county: string;
  fips: string;
  customersAffected: number;
  totalCustomers: number;
  percentOut: number;
  utilityName: string;
  timestamp: Date;
}

/**
 * Power outage data adapter
 * Aggregates from PowerOutage.us and utility APIs
 */
export class PowerOutageAdapter extends BaseFeedAdapter {
  name = 'Power Outage Monitor';
  type = 'outage_monitor';

  private significantThreshold = 1000; // Minimum customers affected

  async fetch(): Promise<RawIncident[]> {
    const outages = await this.fetchOutageData();

    return outages
      .filter(o => o.customersAffected >= this.significantThreshold)
      .map(o => this.toRawIncident(o));
  }

  private async fetchOutageData(): Promise<PowerOutageData[]> {
    // Fetch from PowerOutage.us API or scrape
    // Many utilities also provide direct APIs
    return []; // Placeholder
  }

  private toRawIncident(outage: PowerOutageData): RawIncident {
    const severity = this.calculateSeverity(outage);

    return {
      id: `power-${outage.fips}-${outage.timestamp.getTime()}`,
      source: 'power_outage',
      type: 'power_outage',
      title: `Power outage: ${outage.customersAffected.toLocaleString()} customers in ${outage.county}, ${outage.state}`,
      description: `${outage.percentOut.toFixed(1)}% of customers without power. Utility: ${outage.utilityName}`,
      location: {
        region: `${outage.county}, ${outage.state}`,
      },
      timestamp: outage.timestamp,
      confidence: 0.95,
      sourceData: outage,
    };
  }

  private calculateSeverity(outage: PowerOutageData): string {
    if (outage.customersAffected >= 100000) return 'catastrophic';
    if (outage.customersAffected >= 50000) return 'major';
    if (outage.customersAffected >= 10000) return 'moderate';
    return 'minor';
  }
}
```

---

## Facility Database Service

**File: `apps/api/src/feeds/services/facility-database.ts`**
```typescript
import { db } from '../../db';
import { criticalFacilities } from '../../db/schema';
import { sql } from 'drizzle-orm';
import type { CriticalFacility, CISASector, FacilityType } from '../types/critical-infrastructure.types';

interface FacilitySearchParams {
  sectors?: CISASector[];
  facilityTypes?: FacilityType[];
  states?: string[];
  minEmployees?: number;
}

export class FacilityDatabaseService {
  /**
   * Find facilities near a point
   */
  async findNearbyFacilities(
    point: { lat: number; lng: number },
    radiusKm: number,
    params?: FacilitySearchParams
  ): Promise<Array<CriticalFacility & { distanceKm: number }>> {
    let query = sql`
      SELECT
        *,
        ST_Distance(
          ST_MakePoint(${point.lng}, ${point.lat})::geography,
          ST_MakePoint(lng, lat)::geography
        ) / 1000 as distance_km
      FROM critical_facilities
      WHERE ST_DWithin(
        ST_MakePoint(${point.lng}, ${point.lat})::geography,
        ST_MakePoint(lng, lat)::geography,
        ${radiusKm * 1000}
      )
    `;

    if (params?.sectors?.length) {
      query = sql`${query} AND sector = ANY(${params.sectors})`;
    }
    if (params?.facilityTypes?.length) {
      query = sql`${query} AND facility_type = ANY(${params.facilityTypes})`;
    }
    if (params?.states?.length) {
      query = sql`${query} AND state = ANY(${params.states})`;
    }

    query = sql`${query} ORDER BY distance_km ASC`;

    const result = await db.execute(query);

    return result.rows.map(row => this.mapRowToFacility(row)) as any;
  }

  /**
   * Find facilities in a bounding box (for map view)
   */
  async findFacilitiesInBounds(
    bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
    params?: FacilitySearchParams
  ): Promise<CriticalFacility[]> {
    let query = sql`
      SELECT *
      FROM critical_facilities
      WHERE lat BETWEEN ${bounds.minLat} AND ${bounds.maxLat}
        AND lng BETWEEN ${bounds.minLng} AND ${bounds.maxLng}
    `;

    if (params?.sectors?.length) {
      query = sql`${query} AND sector = ANY(${params.sectors})`;
    }
    if (params?.facilityTypes?.length) {
      query = sql`${query} AND facility_type = ANY(${params.facilityTypes})`;
    }

    query = sql`${query} LIMIT 5000`; // Prevent excessive results

    const result = await db.execute(query);

    return result.rows.map(row => this.mapRowToFacility(row));
  }

  /**
   * Get sector statistics
   */
  async getSectorStats(): Promise<Array<{ sector: CISASector; count: number }>> {
    const result = await db.execute(sql`
      SELECT sector, COUNT(*) as count
      FROM critical_facilities
      GROUP BY sector
      ORDER BY count DESC
    `);

    return result.rows as any;
  }

  /**
   * Import HIFLD data
   * HIFLD = Homeland Infrastructure Foundation-Level Data
   */
  async importHIFLD(data: any[]): Promise<number> {
    const BATCH_SIZE = 1000;
    let imported = 0;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
        .map(item => this.mapHIFLDToFacility(item))
        .filter(Boolean);

      if (batch.length > 0) {
        await db.insert(criticalFacilities)
          .values(batch as any)
          .onConflictDoNothing();
        imported += batch.length;
      }
    }

    return imported;
  }

  /**
   * Import from OpenStreetMap
   */
  async importFromOSM(osmData: any[]): Promise<number> {
    const facilityRecords = osmData
      .filter(item => this.isRelevantOSMFacility(item))
      .map(item => this.mapOSMToFacility(item));

    const BATCH_SIZE = 1000;
    let imported = 0;

    for (let i = 0; i < facilityRecords.length; i += BATCH_SIZE) {
      const batch = facilityRecords.slice(i, i + BATCH_SIZE);
      await db.insert(criticalFacilities).values(batch as any).onConflictDoNothing();
      imported += batch.length;
    }

    return imported;
  }

  private mapRowToFacility(row: any): CriticalFacility {
    return {
      id: row.id,
      name: row.name,
      sector: row.sector,
      facilityType: row.facility_type,
      location: {
        lat: row.lat,
        lng: row.lng,
        address: row.address,
        city: row.city,
        state: row.state,
        zip: row.zip,
        county: row.county,
        fips: row.fips,
      },
      operator: row.operator,
      owner: row.owner,
      capacity: row.capacity,
      employeeCount: row.employee_count,
      naicsCode: row.naics_code,
      source: row.source,
      sourceId: row.source_id,
      lastVerified: row.last_verified,
      metadata: row.metadata,
    };
  }

  private mapHIFLDToFacility(item: any): Partial<CriticalFacility> | null {
    // Map HIFLD GeoJSON properties to our schema
    const props = item.properties || item;

    const sector = this.mapHIFLDSector(props);
    if (!sector) return null;

    return {
      id: `hifld-${props.OBJECTID || props.ID}`,
      name: props.NAME || props.FACNAME || 'Unknown',
      sector,
      facilityType: this.mapHIFLDType(props, sector),
      location: {
        lat: props.LATITUDE || item.geometry?.coordinates?.[1],
        lng: props.LONGITUDE || item.geometry?.coordinates?.[0],
        address: props.ADDRESS,
        city: props.CITY,
        state: props.STATE,
        zip: props.ZIP,
        county: props.COUNTY,
        fips: props.FIPS,
      },
      operator: props.OPERATOR,
      owner: props.OWNER,
      naicsCode: props.NAICS,
      source: 'hifld',
      sourceId: String(props.OBJECTID || props.ID),
    };
  }

  private mapHIFLDSector(props: any): CISASector | null {
    // HIFLD datasets are organized by sector
    // Mapping based on dataset type
    if (props.PRIMSOURCE?.includes('POWER') || props.TYPE?.includes('POWER')) return 'energy';
    if (props.PRIMSOURCE?.includes('HOSPITAL') || props.TYPE?.includes('HOSPITAL')) return 'healthcare_public_health';
    if (props.PRIMSOURCE?.includes('WATER')) return 'water_wastewater';
    if (props.PRIMSOURCE?.includes('AIRPORT') || props.TYPE?.includes('AIRPORT')) return 'transportation';
    if (props.PRIMSOURCE?.includes('PORT') || props.TYPE?.includes('PORT')) return 'transportation';
    // Add more mappings...
    return null;
  }

  private mapHIFLDType(props: any, sector: CISASector): FacilityType {
    // Map to specific facility type based on properties
    const typeMap: Partial<Record<CISASector, FacilityType>> = {
      'energy': 'power_plant',
      'healthcare_public_health': 'hospital',
      'water_wastewater': 'water_treatment',
      'transportation': 'airport',
    };
    return typeMap[sector] || 'power_plant';
  }

  private isRelevantOSMFacility(osmItem: any): boolean {
    const tags = osmItem.tags || {};

    // Power/Energy
    if (tags.power === 'plant' || tags.power === 'substation') return true;
    if (tags.industrial === 'refinery') return true;

    // Water
    if (tags.man_made === 'water_treatment' || tags.man_made === 'wastewater_plant') return true;

    // Healthcare
    if (tags.amenity === 'hospital') return true;

    // Transportation
    if (tags.aeroway === 'aerodrome' && tags.aerodrome !== 'private') return true;
    if (tags.landuse === 'port' || tags.industrial === 'port') return true;

    // Communications
    if (tags.telecom === 'data_center' || tags.building === 'data_center') return true;

    // Manufacturing
    if (tags.industrial === 'chemical') return true;
    if (tags.industrial === 'food' || tags.building === 'food_processing') return true;

    // Nuclear
    if (tags.power === 'nuclear') return true;

    return false;
  }

  private mapOSMToFacility(osmItem: any): Partial<CriticalFacility> {
    const tags = osmItem.tags || {};
    const { sector, facilityType } = this.mapOSMTags(tags);

    return {
      id: `osm-${osmItem.id}`,
      name: tags.name || `${facilityType.replace(/_/g, ' ')} Facility`,
      sector,
      facilityType,
      location: {
        lat: osmItem.lat,
        lng: osmItem.lon,
      },
      operator: tags.operator,
      source: 'osm',
      sourceId: String(osmItem.id),
    };
  }

  private mapOSMTags(tags: Record<string, string>): { sector: CISASector; facilityType: FacilityType } {
    if (tags.power === 'plant') return { sector: 'energy', facilityType: 'power_plant' };
    if (tags.power === 'substation') return { sector: 'energy', facilityType: 'substation' };
    if (tags.power === 'nuclear') return { sector: 'nuclear', facilityType: 'nuclear_plant' };
    if (tags.industrial === 'refinery') return { sector: 'energy', facilityType: 'refinery' };
    if (tags.man_made === 'water_treatment') return { sector: 'water_wastewater', facilityType: 'water_treatment' };
    if (tags.amenity === 'hospital') return { sector: 'healthcare_public_health', facilityType: 'hospital' };
    if (tags.aeroway === 'aerodrome') return { sector: 'transportation', facilityType: 'airport' };
    if (tags.telecom === 'data_center') return { sector: 'communications', facilityType: 'data_center' };
    if (tags.industrial === 'chemical') return { sector: 'chemical', facilityType: 'chemical_plant' };
    if (tags.industrial === 'food') return { sector: 'food_agriculture', facilityType: 'food_processing' };

    return { sector: 'critical_manufacturing', facilityType: 'steel_mill' };
  }
}
```

---

## Infrastructure Incident Correlator

**File: `apps/api/src/feeds/services/incident-correlator.ts`**
```typescript
import { FacilityDatabaseService } from './facility-database';
import type {
  RawIncident,
  InfrastructureIncident,
  CriticalFacility,
  CISASector,
  IncidentSeverity,
  SatelliteFire,
} from '../types/critical-infrastructure.types';

const MATCH_RADIUS_KM = 0.5; // 500 meters for facility matching
const CLUSTER_RADIUS_KM = 1.0; // 1km for incident clustering
const CLUSTER_TIME_MS = 60 * 60 * 1000; // 1 hour for time-based clustering

/**
 * Sector criticality weights for severity calculation
 */
const SECTOR_CRITICALITY: Record<CISASector, number> = {
  nuclear: 1.5,
  energy: 1.3,
  water_wastewater: 1.3,
  communications: 1.2,
  healthcare_public_health: 1.2,
  transportation: 1.1,
  emergency_services: 1.4,
  chemical: 1.3,
  dams: 1.4,
  food_agriculture: 1.1,
  financial_services: 1.0,
  defense_industrial_base: 1.2,
  critical_manufacturing: 1.0,
  government_facilities: 1.1,
  commercial_facilities: 0.9,
  information_technology: 1.1,
};

export class InfrastructureIncidentCorrelator {
  private facilityDb: FacilityDatabaseService;

  constructor() {
    this.facilityDb = new FacilityDatabaseService();
  }

  /**
   * Process raw incidents from multiple sources into correlated infrastructure incidents
   */
  async correlateIncidents(rawIncidents: RawIncident[]): Promise<InfrastructureIncident[]> {
    console.log(`[Correlator] Processing ${rawIncidents.length} raw incidents`);

    // 1. Cluster related incidents by location/time
    const clusters = this.clusterIncidents(rawIncidents);
    console.log(`[Correlator] Formed ${clusters.length} clusters`);

    // 2. Match each cluster to facilities
    const incidents: InfrastructureIncident[] = [];

    for (const cluster of clusters) {
      const incident = await this.processCluster(cluster);
      if (incident) {
        incidents.push(incident);
      }
    }

    // 3. Deduplicate by facility and time
    const deduplicated = this.deduplicateByFacility(incidents);

    console.log(`[Correlator] Produced ${deduplicated.length} infrastructure incidents`);

    return deduplicated;
  }

  /**
   * Cluster raw incidents by spatial and temporal proximity
   */
  private clusterIncidents(incidents: RawIncident[]): RawIncident[][] {
    const clusters: RawIncident[][] = [];
    const used = new Set<string>();

    for (const incident of incidents) {
      if (used.has(incident.id) || !incident.location) continue;

      const cluster = incidents.filter(other => {
        if (used.has(other.id) || !other.location) return false;
        if (incident.id === other.id) return true;

        const distance = haversineDistance(incident.location!, other.location!);
        const timeDiff = Math.abs(
          incident.timestamp.getTime() - other.timestamp.getTime()
        );

        return distance <= CLUSTER_RADIUS_KM && timeDiff <= CLUSTER_TIME_MS;
      });

      cluster.forEach(i => used.add(i.id));
      clusters.push(cluster);
    }

    // Also include incidents without location as individual clusters
    incidents
      .filter(i => !used.has(i.id))
      .forEach(i => clusters.push([i]));

    return clusters;
  }

  /**
   * Process a cluster of related incidents
   */
  private async processCluster(cluster: RawIncident[]): Promise<InfrastructureIncident | null> {
    // Determine representative location (centroid or highest-confidence incident)
    const primaryIncident = cluster.reduce((a, b) =>
      a.confidence > b.confidence ? a : b
    );

    // Try to match to a facility
    let facility: CriticalFacility | undefined;
    let facilityMatch: { distanceMeters: number; confidence: number } | undefined;

    if (primaryIncident.location) {
      const nearbyFacilities = await this.facilityDb.findNearbyFacilities(
        primaryIncident.location,
        MATCH_RADIUS_KM
      );

      if (nearbyFacilities.length > 0) {
        // Select best match based on incident type + facility type compatibility
        const bestMatch = this.selectBestFacilityMatch(nearbyFacilities, primaryIncident);
        if (bestMatch) {
          facility = bestMatch;
          facilityMatch = {
            distanceMeters: (bestMatch as any).distanceKm * 1000,
            confidence: this.calculateMatchConfidence(bestMatch, primaryIncident),
          };
        }
      }
    }

    // Determine sector (from facility or infer from incident type)
    const sector = facility?.sector || this.inferSector(primaryIncident);

    // Calculate severity
    const severity = this.calculateSeverity(cluster, facility, sector);

    // Determine incident type (consensus from cluster)
    const incidentType = this.determineIncidentType(cluster);

    return {
      id: `infra-${primaryIncident.id}`,
      type: incidentType,
      sector,
      severity,
      status: 'detected',

      facility,
      facilityMatch,

      location: primaryIncident.location || {
        lat: 0,
        lng: 0,
      },

      sources: cluster.map(inc => ({
        source: inc.source,
        rawIncidentId: inc.id,
        timestamp: inc.timestamp,
        confidence: inc.confidence,
      })),
      primarySource: primaryIncident.source,

      title: this.generateTitle(primaryIncident, facility),
      description: primaryIncident.description,

      impactAssessment: this.assessImpact(cluster, facility, sector),

      newsArticles: cluster
        .filter(i => i.source === 'news' && i.sourceUrl)
        .map(i => i.sourceUrl!),
      socialMediaPosts: cluster
        .filter(i => i.source === 'social_media' && i.sourceUrl)
        .map(i => i.sourceUrl!),
      relatedIncidents: [],

      satelliteFire: cluster.find(i =>
        i.source === 'firms_viirs' || i.source === 'firms_modis'
      )?.sourceData as SatelliteFire | undefined,

      detectedAt: new Date(),
      lastUpdated: new Date(),
    };
  }

  /**
   * Select the best facility match based on incident type compatibility
   */
  private selectBestFacilityMatch(
    facilities: Array<CriticalFacility & { distanceKm: number }>,
    incident: RawIncident
  ): (CriticalFacility & { distanceKm: number }) | null {
    // Score each facility based on distance and type compatibility
    const scored = facilities.map(f => ({
      facility: f,
      score: this.scoreFacilityMatch(f, incident),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.score > 0.3 ? scored[0].facility : null;
  }

  private scoreFacilityMatch(facility: CriticalFacility, incident: RawIncident): number {
    let score = 0;

    // Distance score (closer = better)
    const distanceKm = (facility as any).distanceKm;
    score += Math.max(0, 1 - distanceKm / MATCH_RADIUS_KM);

    // Type compatibility score
    const typeCompatibility = this.getTypeCompatibility(facility.sector, incident.type);
    score += typeCompatibility * 0.5;

    return score;
  }

  private getTypeCompatibility(sector: CISASector, incidentType: RawIncident['type']): number {
    const compatibilityMap: Partial<Record<CISASector, RawIncident['type'][]>> = {
      energy: ['fire', 'explosion', 'power_outage', 'equipment_failure'],
      nuclear: ['fire', 'hazmat_release', 'equipment_failure'],
      chemical: ['fire', 'explosion', 'hazmat_release'],
      water_wastewater: ['hazmat_release', 'equipment_failure', 'flooding'],
      transportation: ['fire', 'structural_damage', 'equipment_failure'],
      communications: ['cyber_incident', 'service_outage', 'equipment_failure'],
      healthcare_public_health: ['fire', 'power_outage', 'equipment_failure'],
    };

    const compatibleTypes = compatibilityMap[sector] || [];
    return compatibleTypes.includes(incidentType) ? 1.0 : 0.5;
  }

  private calculateMatchConfidence(facility: CriticalFacility, incident: RawIncident): number {
    const distanceKm = (facility as any).distanceKm;
    const distanceFactor = Math.max(0, 1 - distanceKm / MATCH_RADIUS_KM);
    const typeFactor = this.getTypeCompatibility(facility.sector, incident.type);

    return distanceFactor * 0.6 + typeFactor * 0.4;
  }

  private inferSector(incident: RawIncident): CISASector {
    const typeToSector: Partial<Record<RawIncident['type'], CISASector>> = {
      power_outage: 'energy',
      cyber_incident: 'information_technology',
      hazmat_release: 'chemical',
      service_outage: 'communications',
    };

    return typeToSector[incident.type] || 'critical_manufacturing';
  }

  private calculateSeverity(
    cluster: RawIncident[],
    facility: CriticalFacility | undefined,
    sector: CISASector
  ): IncidentSeverity {
    // Base severity from incident characteristics
    let baseSeverity = 1;

    // Check for satellite fire FRP
    const fireFrp = cluster
      .filter(i => i.source === 'firms_viirs' || i.source === 'firms_modis')
      .map(i => i.sourceData?.frp || 0)
      .reduce((a, b) => Math.max(a, b), 0);

    if (fireFrp >= 500) baseSeverity = 4;
    else if (fireFrp >= 200) baseSeverity = 3;
    else if (fireFrp >= 50) baseSeverity = 2;

    // Check for power outage scale
    const customersAffected = cluster
      .filter(i => i.source === 'power_outage')
      .map(i => i.sourceData?.customersAffected || 0)
      .reduce((a, b) => Math.max(a, b), 0);

    if (customersAffected >= 100000) baseSeverity = Math.max(baseSeverity, 4);
    else if (customersAffected >= 50000) baseSeverity = Math.max(baseSeverity, 3);
    else if (customersAffected >= 10000) baseSeverity = Math.max(baseSeverity, 2);

    // Multiple sources increase confidence/severity
    if (cluster.length >= 3) baseSeverity = Math.min(4, baseSeverity + 1);

    // Apply sector criticality multiplier
    const criticalityMultiplier = SECTOR_CRITICALITY[sector];
    const adjustedSeverity = Math.min(4, Math.round(baseSeverity * criticalityMultiplier));

    const severityMap: IncidentSeverity[] = ['minor', 'moderate', 'major', 'catastrophic'];
    return severityMap[Math.max(0, adjustedSeverity - 1)];
  }

  private determineIncidentType(cluster: RawIncident[]): RawIncident['type'] {
    // Count incident types
    const typeCounts = new Map<RawIncident['type'], number>();
    for (const incident of cluster) {
      typeCounts.set(incident.type, (typeCounts.get(incident.type) || 0) + 1);
    }

    // Return most common type
    let maxType: RawIncident['type'] = 'unknown';
    let maxCount = 0;
    for (const [type, count] of typeCounts) {
      if (count > maxCount) {
        maxType = type;
        maxCount = count;
      }
    }

    return maxType;
  }

  private generateTitle(incident: RawIncident, facility?: CriticalFacility): string {
    if (facility) {
      return `${this.formatIncidentType(incident.type)} at ${facility.name}`;
    }
    return incident.title;
  }

  private formatIncidentType(type: RawIncident['type']): string {
    const typeNames: Record<RawIncident['type'], string> = {
      fire: 'Fire',
      explosion: 'Explosion',
      structural_damage: 'Structural Damage',
      flooding: 'Flooding',
      power_outage: 'Power Outage',
      cyber_incident: 'Cyber Incident',
      physical_security: 'Security Incident',
      hazmat_release: 'Hazmat Release',
      equipment_failure: 'Equipment Failure',
      natural_disaster: 'Natural Disaster',
      terrorism: 'Terrorism',
      sabotage: 'Sabotage',
      labor_action: 'Labor Action',
      supply_disruption: 'Supply Disruption',
      service_outage: 'Service Outage',
      regulatory_action: 'Regulatory Action',
      unknown: 'Incident',
    };
    return typeNames[type];
  }

  private assessImpact(
    cluster: RawIncident[],
    facility: CriticalFacility | undefined,
    sector: CISASector
  ): InfrastructureIncident['impactAssessment'] {
    const cascadingRisks = this.identifyCascadingRisks(sector, facility);

    // Economic impact based on sector
    const economicImpact = this.estimateEconomicImpact(sector, facility, cluster);

    return {
      economicImpact,
      cascadingRisk: cascadingRisks,
    };
  }

  private identifyCascadingRisks(sector: CISASector, facility?: CriticalFacility): string[] {
    const risks: string[] = [];

    const cascadeMap: Record<CISASector, string[]> = {
      energy: ['Power outages', 'Heating/cooling disruption', 'Water treatment affected'],
      water_wastewater: ['Water supply disruption', 'Boil water advisories', 'Healthcare impact'],
      communications: ['Emergency services degraded', 'Financial system impact'],
      transportation: ['Supply chain disruption', 'Emergency response delays'],
      nuclear: ['Evacuation zones', 'Environmental contamination'],
      healthcare_public_health: ['Patient care disruption', 'Medical supply shortage'],
      chemical: ['Environmental contamination', 'Evacuation requirements'],
      dams: ['Downstream flooding', 'Water supply disruption'],
      food_agriculture: ['Food supply disruption', 'Price impacts'],
      emergency_services: ['Delayed emergency response', 'Public safety risk'],
      financial_services: ['Economic disruption', 'Payment system outages'],
      defense_industrial_base: ['National security impact'],
      critical_manufacturing: ['Supply chain disruption'],
      government_facilities: ['Public service disruption'],
      commercial_facilities: ['Economic disruption'],
      information_technology: ['Widespread service outages', 'Data loss'],
    };

    risks.push(...(cascadeMap[sector] || []));

    return risks.slice(0, 3); // Limit to top 3
  }

  private estimateEconomicImpact(
    sector: CISASector,
    facility: CriticalFacility | undefined,
    cluster: RawIncident[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    // High-impact sectors
    if (['energy', 'nuclear', 'financial_services'].includes(sector)) {
      return 'high';
    }

    // Large facility
    if (facility?.employeeCount && facility.employeeCount > 1000) {
      return 'high';
    }

    // Multiple corroborating sources
    if (cluster.length >= 3) {
      return 'medium';
    }

    return 'low';
  }

  private deduplicateByFacility(incidents: InfrastructureIncident[]): InfrastructureIncident[] {
    const groups = new Map<string, InfrastructureIncident[]>();

    for (const incident of incidents) {
      const dateKey = incident.detectedAt.toISOString().split('T')[0];
      const facilityKey = incident.facility?.id || `loc-${incident.location.lat}-${incident.location.lng}`;
      const key = `${facilityKey}-${dateKey}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(incident);
    }

    return Array.from(groups.values()).map(group => {
      const severityOrder: Record<IncidentSeverity, number> = {
        minor: 0, moderate: 1, major: 2, catastrophic: 3
      };

      return group.reduce((best, current) => {
        if (severityOrder[current.severity] > severityOrder[best.severity]) {
          return current;
        }
        if (current.sources.length > best.sources.length) {
          return current;
        }
        return best;
      });
    });
  }
}

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;

  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
```

---

## Critical Infrastructure Map Layer

**File: `apps/web/src/features/map/layers/CriticalInfrastructureLayer.tsx`**
```tsx
import { useMemo, useCallback } from 'react';
import { Layer, Source } from 'react-map-gl';
import { useQuery } from '@tanstack/react-query';
import { fetchInfrastructureIncidents, fetchCriticalFacilities } from '@/lib/api/feeds';
import type { CISASector, IncidentSeverity } from '@/types/critical-infrastructure';

interface CriticalInfrastructureLayerProps {
  projectId: string;
  visible: boolean;
  showFacilities?: boolean;
  showIncidents?: boolean;
  sectorFilter?: CISASector[];
  severityFilter?: IncidentSeverity[];
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  minor: '#fbbf24',
  moderate: '#f97316',
  major: '#dc2626',
  catastrophic: '#7f1d1d',
};

const SECTOR_COLORS: Record<CISASector, string> = {
  energy: '#f59e0b',
  nuclear: '#ef4444',
  water_wastewater: '#3b82f6',
  communications: '#8b5cf6',
  transportation: '#06b6d4',
  healthcare_public_health: '#ec4899',
  chemical: '#f97316',
  dams: '#0ea5e9',
  food_agriculture: '#84cc16',
  emergency_services: '#dc2626',
  financial_services: '#10b981',
  defense_industrial_base: '#6b7280',
  critical_manufacturing: '#78716c',
  government_facilities: '#1e3a8a',
  commercial_facilities: '#a855f7',
  information_technology: '#14b8a6',
};

export function CriticalInfrastructureLayer({
  projectId,
  visible,
  showFacilities = true,
  showIncidents = true,
  sectorFilter,
  severityFilter,
  bounds,
}: CriticalInfrastructureLayerProps) {
  // Fetch incidents
  const { data: incidentData } = useQuery({
    queryKey: ['infrastructure-incidents', projectId, sectorFilter],
    queryFn: () => fetchInfrastructureIncidents(projectId, { sectors: sectorFilter }),
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    enabled: visible && showIncidents,
  });

  // Fetch facilities (only when zoomed in)
  const { data: facilityData } = useQuery({
    queryKey: ['critical-facilities', bounds, sectorFilter],
    queryFn: () => fetchCriticalFacilities({ bounds, sectors: sectorFilter }),
    enabled: visible && showFacilities && !!bounds,
  });

  // Build incident GeoJSON
  const incidentGeojson = useMemo(() => {
    if (!incidentData?.incidents) return null;

    let incidents = incidentData.incidents;

    if (severityFilter?.length) {
      incidents = incidents.filter((i: any) => severityFilter.includes(i.severity));
    }

    return {
      type: 'FeatureCollection' as const,
      features: incidents.map((incident: any) => ({
        type: 'Feature' as const,
        id: incident.id,
        geometry: {
          type: 'Point' as const,
          coordinates: [incident.location.lng, incident.location.lat],
        },
        properties: {
          id: incident.id,
          type: incident.type,
          sector: incident.sector,
          severity: incident.severity,
          title: incident.title,
          facilityName: incident.facility?.name,
          detectedAt: incident.detectedAt,
        },
      })),
    };
  }, [incidentData?.incidents, severityFilter]);

  // Build facility GeoJSON
  const facilityGeojson = useMemo(() => {
    if (!facilityData?.facilities) return null;

    return {
      type: 'FeatureCollection' as const,
      features: facilityData.facilities.map((facility: any) => ({
        type: 'Feature' as const,
        id: facility.id,
        geometry: {
          type: 'Point' as const,
          coordinates: [facility.location.lng, facility.location.lat],
        },
        properties: {
          id: facility.id,
          name: facility.name,
          sector: facility.sector,
          facilityType: facility.facilityType,
        },
      })),
    };
  }, [facilityData?.facilities]);

  if (!visible) return null;

  return (
    <>
      {/* Facility layer (background) */}
      {showFacilities && facilityGeojson && (
        <Source id="critical-facilities" type="geojson" data={facilityGeojson}>
          <Layer
            id="critical-facilities-markers"
            type="circle"
            minzoom={8}
            paint={{
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                8, 3,
                12, 6,
                16, 10,
              ],
              'circle-color': [
                'match', ['get', 'sector'],
                'energy', SECTOR_COLORS.energy,
                'nuclear', SECTOR_COLORS.nuclear,
                'water_wastewater', SECTOR_COLORS.water_wastewater,
                'communications', SECTOR_COLORS.communications,
                'transportation', SECTOR_COLORS.transportation,
                'healthcare_public_health', SECTOR_COLORS.healthcare_public_health,
                '#6b7280', // default
              ],
              'circle-opacity': 0.6,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1,
            }}
          />

          <Layer
            id="critical-facilities-labels"
            type="symbol"
            minzoom={12}
            layout={{
              'text-field': ['get', 'name'],
              'text-size': 10,
              'text-offset': [0, 1.2],
              'text-anchor': 'top',
              'text-max-width': 8,
            }}
            paint={{
              'text-color': '#e5e5e5',
              'text-halo-color': '#000000',
              'text-halo-width': 1,
            }}
          />
        </Source>
      )}

      {/* Incident layer (foreground) */}
      {showIncidents && incidentGeojson && (
        <Source id="infrastructure-incidents" type="geojson" data={incidentGeojson}>
          {/* Pulsing outer ring */}
          <Layer
            id="infrastructure-incidents-pulse"
            type="circle"
            paint={{
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                5, 25,
                10, 40,
                15, 60,
              ],
              'circle-color': [
                'match', ['get', 'severity'],
                'catastrophic', 'rgba(127, 29, 29, 0.4)',
                'major', 'rgba(220, 38, 38, 0.35)',
                'moderate', 'rgba(249, 115, 22, 0.3)',
                'rgba(251, 191, 36, 0.25)',
              ],
              'circle-opacity': 0.7,
            }}
          />

          {/* Incident marker */}
          <Layer
            id="infrastructure-incidents-marker"
            type="circle"
            paint={{
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                5, 8,
                10, 12,
                15, 16,
              ],
              'circle-color': [
                'match', ['get', 'severity'],
                'catastrophic', SEVERITY_COLORS.catastrophic,
                'major', SEVERITY_COLORS.major,
                'moderate', SEVERITY_COLORS.moderate,
                SEVERITY_COLORS.minor,
              ],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
            }}
          />

          {/* Labels */}
          <Layer
            id="infrastructure-incidents-labels"
            type="symbol"
            minzoom={9}
            layout={{
              'text-field': ['coalesce', ['get', 'facilityName'], ['get', 'title']],
              'text-size': 11,
              'text-offset': [0, 1.8],
              'text-anchor': 'top',
              'text-max-width': 12,
            }}
            paint={{
              'text-color': '#ffffff',
              'text-halo-color': '#000000',
              'text-halo-width': 1,
            }}
          />
        </Source>
      )}
    </>
  );
}
```

---

## Sector Dashboard Component

**File: `apps/web/src/features/infrastructure/SectorDashboard.tsx`**
```tsx
import { useQuery } from '@tanstack/react-query';
import { fetchSectorStatus } from '@/lib/api/feeds';
import type { CISASector, SectorStatus } from '@/types/critical-infrastructure';

interface SectorDashboardProps {
  projectId: string;
}

const SECTOR_DISPLAY_NAMES: Record<CISASector, string> = {
  chemical: 'Chemical',
  commercial_facilities: 'Commercial',
  communications: 'Communications',
  critical_manufacturing: 'Manufacturing',
  dams: 'Dams',
  defense_industrial_base: 'Defense',
  emergency_services: 'Emergency Svc',
  energy: 'Energy',
  financial_services: 'Financial',
  food_agriculture: 'Food & Ag',
  government_facilities: 'Government',
  healthcare_public_health: 'Healthcare',
  information_technology: 'IT',
  nuclear: 'Nuclear',
  transportation: 'Transportation',
  water_wastewater: 'Water',
};

const SECTOR_ICONS: Record<CISASector, string> = {
  chemical: '⚗️',
  commercial_facilities: '🏬',
  communications: '📡',
  critical_manufacturing: '🏭',
  dams: '🌊',
  defense_industrial_base: '🛡️',
  emergency_services: '🚨',
  energy: '⚡',
  financial_services: '🏦',
  food_agriculture: '🌾',
  government_facilities: '🏛️',
  healthcare_public_health: '🏥',
  information_technology: '💻',
  nuclear: '☢️',
  transportation: '✈️',
  water_wastewater: '💧',
};

export function SectorDashboard({ projectId }: SectorDashboardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['sector-status', projectId],
    queryFn: () => fetchSectorStatus(projectId),
    refetchInterval: 60 * 1000, // 1 minute
  });

  if (isLoading) {
    return <div className="animate-pulse">Loading sector status...</div>;
  }

  const sectors = data?.sectors || [];

  // Sort by critical incidents, then active incidents
  const sortedSectors = [...sectors].sort((a, b) => {
    if (b.criticalIncidents !== a.criticalIncidents) {
      return b.criticalIncidents - a.criticalIncidents;
    }
    return b.activeIncidents - a.activeIncidents;
  });

  return (
    <div className="grid grid-cols-4 gap-2">
      {sortedSectors.map((sector) => (
        <SectorCard key={sector.sector} status={sector} />
      ))}
    </div>
  );
}

function SectorCard({ status }: { status: SectorStatus }) {
  const hasCritical = status.criticalIncidents > 0;
  const hasActive = status.activeIncidents > 0;

  const bgClass = hasCritical
    ? 'bg-red-900/50 border-red-500'
    : hasActive
    ? 'bg-amber-900/30 border-amber-500'
    : 'bg-neutral-800/50 border-neutral-600';

  return (
    <div
      className={`p-3 rounded border ${bgClass} transition-colors`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{SECTOR_ICONS[status.sector]}</span>
        <span className="text-sm font-medium text-neutral-200">
          {SECTOR_DISPLAY_NAMES[status.sector]}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="text-neutral-400">
          {status.activeIncidents} active
        </div>
        {status.criticalIncidents > 0 && (
          <div className="text-red-400 font-medium">
            {status.criticalIncidents} critical
          </div>
        )}
      </div>

      {status.recentTrend !== 'stable' && (
        <div className={`text-xs mt-1 ${
          status.recentTrend === 'improving' ? 'text-green-400' : 'text-red-400'
        }`}>
          {status.recentTrend === 'improving' ? '↓ Improving' : '↑ Degrading'}
        </div>
      )}
    </div>
  );
}
```

---

## Database Schema

**File: `apps/api/drizzle/schema/critical-infrastructure.ts`**
```typescript
import { pgTable, text, real, integer, timestamp, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';

export const cisaSectorEnum = pgEnum('cisa_sector', [
  'chemical',
  'commercial_facilities',
  'communications',
  'critical_manufacturing',
  'dams',
  'defense_industrial_base',
  'emergency_services',
  'energy',
  'financial_services',
  'food_agriculture',
  'government_facilities',
  'healthcare_public_health',
  'information_technology',
  'nuclear',
  'transportation',
  'water_wastewater',
]);

export const incidentSeverityEnum = pgEnum('incident_severity', [
  'minor',
  'moderate',
  'major',
  'catastrophic',
]);

export const incidentStatusEnum = pgEnum('incident_status', [
  'detected',
  'confirmed',
  'ongoing',
  'contained',
  'resolved',
]);

export const criticalFacilities = pgTable('critical_facilities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sector: cisaSectorEnum('sector').notNull(),
  facilityType: text('facility_type').notNull(),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  county: text('county'),
  fips: text('fips'),
  operator: text('operator'),
  owner: text('owner'),
  capacity: text('capacity'),
  employeeCount: integer('employee_count'),
  naicsCode: text('naics_code'),
  source: text('source').notNull(),
  sourceId: text('source_id'),
  lastVerified: timestamp('last_verified'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  sectorIdx: index('critical_facilities_sector_idx').on(table.sector),
  stateIdx: index('critical_facilities_state_idx').on(table.state),
  locationIdx: index('critical_facilities_location_idx').on(table.lat, table.lng),
}));

export const infrastructureIncidents = pgTable('infrastructure_incidents', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  sector: cisaSectorEnum('sector').notNull(),
  severity: incidentSeverityEnum('severity').notNull(),
  status: incidentStatusEnum('status').notNull().default('detected'),
  facilityId: text('facility_id').references(() => criticalFacilities.id),
  facilityMatchDistance: real('facility_match_distance'),
  facilityMatchConfidence: real('facility_match_confidence'),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  title: text('title').notNull(),
  description: text('description'),
  sources: jsonb('sources').notNull(),
  primarySource: text('primary_source').notNull(),
  impactAssessment: jsonb('impact_assessment'),
  newsArticles: jsonb('news_articles').default([]),
  socialMediaPosts: jsonb('social_media_posts').default([]),
  relatedIncidents: jsonb('related_incidents').default([]),
  satelliteFire: jsonb('satellite_fire'),
  detectedAt: timestamp('detected_at').notNull(),
  confirmedAt: timestamp('confirmed_at'),
  resolvedAt: timestamp('resolved_at'),
  lastUpdated: timestamp('last_updated').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  sectorIdx: index('infrastructure_incidents_sector_idx').on(table.sector),
  severityIdx: index('infrastructure_incidents_severity_idx').on(table.severity),
  statusIdx: index('infrastructure_incidents_status_idx').on(table.status),
  detectedAtIdx: index('infrastructure_incidents_detected_at_idx').on(table.detectedAt),
  locationIdx: index('infrastructure_incidents_location_idx').on(table.lat, table.lng),
}));
```

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/feeds/types/critical-infrastructure.types.ts` | Type definitions for CISA sectors, facilities, and incidents |
| `apps/api/src/feeds/adapters/infrastructure/firms.adapter.ts` | NASA FIRMS satellite fire adapter |
| `apps/api/src/feeds/adapters/infrastructure/nrc.adapter.ts` | NRC nuclear event feed adapter |
| `apps/api/src/feeds/adapters/infrastructure/power-outage.adapter.ts` | Power outage monitoring adapter |
| `apps/api/src/feeds/services/facility-database.ts` | Facility database service (HIFLD, OSM, EIA) |
| `apps/api/src/feeds/services/incident-correlator.ts` | Multi-source incident correlation engine |
| `apps/api/drizzle/schema/critical-infrastructure.ts` | Database schema for facilities and incidents |
| `apps/web/src/features/map/layers/CriticalInfrastructureLayer.tsx` | Map layer for facilities and incidents |
| `apps/web/src/features/infrastructure/SectorDashboard.tsx` | Sector status dashboard component |

---

## Acceptance Criteria

### Data Ingestion
- [ ] FIRMS adapter fetches VIIRS and MODIS fire data for USA
- [ ] NRC adapter ingests nuclear regulatory events
- [ ] Power outage adapter tracks significant outages (>1000 customers)
- [ ] All adapters normalize data to RawIncident format

### Facility Database
- [ ] HIFLD import supports all 16 CISA sectors
- [ ] OpenStreetMap import extracts relevant infrastructure
- [ ] Spatial queries efficiently find nearby facilities (PostGIS)
- [ ] Facility data includes sector, type, location, and operator

### Incident Correlation
- [ ] Raw incidents cluster by spatial/temporal proximity
- [ ] Incidents match to nearest compatible facility
- [ ] Severity calculation considers sector criticality
- [ ] Multiple sources increase incident confidence
- [ ] Impact assessment identifies cascading risks

### Map Visualization
- [ ] Facility layer shows infrastructure by sector
- [ ] Incident layer displays active incidents with severity colors
- [ ] Pulsing animation indicates severity level
- [ ] Labels appear at appropriate zoom levels
- [ ] Sector/severity filters work correctly

### Dashboard
- [ ] Sector dashboard shows all 16 CISA sectors
- [ ] Active and critical incident counts per sector
- [ ] Trend indicators (improving/degrading/stable)
- [ ] Real-time updates (1-minute refresh)

---

## Environment Variables

```bash
# NASA FIRMS API
NASA_FIRMS_MAP_KEY=your_map_key  # Free from https://firms.modaps.eosdis.nasa.gov/api/area/

# Optional: Additional data sources
EIA_API_KEY=your_eia_key        # Energy Information Administration
NRC_API_KEY=your_nrc_key        # Nuclear Regulatory Commission (if required)
```

---

## Data Source References

- **HIFLD**: https://hifld-geoplatform.opendata.arcgis.com/
- **NASA FIRMS**: https://firms.modaps.eosdis.nasa.gov/
- **NRC Events**: https://www.nrc.gov/reading-rm/doc-collections/event-status/
- **EIA**: https://www.eia.gov/opendata/
- **PowerOutage.us**: https://poweroutage.us/
- **CISA Sectors**: https://www.cisa.gov/topics/critical-infrastructure-security-and-resilience/critical-infrastructure-sectors
