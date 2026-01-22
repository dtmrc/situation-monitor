/**
 * Civil Unrest Types
 *
 * Type definitions for ACLED and GDELT civil unrest data integration.
 * Supports protest, conflict, and political violence monitoring.
 */

export type UnrestEventType =
  | 'protest'
  | 'riot'
  | 'strike'
  | 'political_violence'
  | 'armed_clash'
  | 'mob_violence'
  | 'remote_violence' // Explosions, airstrikes
  | 'abduction'
  | 'sexual_violence'
  | 'civilian_targeting';

export type ActorType =
  | 'government'
  | 'military'
  | 'police'
  | 'rebel_group'
  | 'political_militia'
  | 'identity_militia'
  | 'protesters'
  | 'rioters'
  | 'civilians'
  | 'external_force'
  | 'unknown';

export interface UnrestEvent {
  id: string;
  source: 'acled' | 'gdelt';
  sourceId: string;

  // Event classification
  eventType: UnrestEventType;
  subEventType?: string;

  // Location
  location: {
    lat: number;
    lng: number;
    precision: 'exact' | 'approximate' | 'region';
  };
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  locationDescription?: string;

  // Actors
  actor1?: {
    name: string;
    type: ActorType;
    affiliation?: string;
  };
  actor2?: {
    name: string;
    type: ActorType;
    affiliation?: string;
  };

  // Impact
  fatalities?: number;
  injuries?: number;
  participants?: number;

  // Context
  date: Date;
  notes?: string;
  sources?: string[];

  // Processing metadata
  severity: 'low' | 'medium' | 'high' | 'critical';
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnrestHotspot {
  id: string;
  center: { lat: number; lng: number };
  radius: number; // km
  eventCount: number;
  fatalityCount: number;
  dominantType: UnrestEventType;
  countries: string[];
  recentEvents: UnrestEvent[];
  trendDirection: 'increasing' | 'stable' | 'decreasing';
}

export interface AggregatedUnrestData {
  events: UnrestEvent[];
  hotspots: UnrestHotspot[];
  statistics: {
    total: number;
    last24h: number;
    last7d: number;
    byType: Record<string, number>;
    byCountry: Record<string, number>;
    totalFatalities: number;
  };
}

export interface UnrestFilterOptions {
  eventTypes?: UnrestEventType[];
  countries?: string[];
  minSeverity?: UnrestEvent['severity'];
  startDate?: Date;
  endDate?: Date;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}
