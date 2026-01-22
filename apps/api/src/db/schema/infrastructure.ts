/**
 * Critical Infrastructure Database Schema
 *
 * Tables for tracking critical facilities, incidents, and multi-source data correlation.
 * Supports CISA 16 sectors infrastructure monitoring.
 */

import { relations } from 'drizzle-orm';
import {
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  real,
  integer,
  index,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';

import { feedsSchema } from './feeds';

// CISA Sector enum
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
  'healthcare',
  'information_technology',
  'nuclear',
  'transportation',
  'water_wastewater',
]);

// Facility type enum
export const facilityTypeEnum = pgEnum('facility_type', [
  // Energy
  'power_plant',
  'substation',
  'transmission_line',
  'oil_refinery',
  'gas_pipeline',
  'gas_storage',
  'solar_farm',
  'wind_farm',
  // Nuclear
  'nuclear_plant',
  'nuclear_research',
  'nuclear_waste',
  // Water
  'water_treatment',
  'wastewater_treatment',
  'dam',
  'reservoir',
  'pumping_station',
  // Transportation
  'airport',
  'seaport',
  'rail_yard',
  'highway_interchange',
  'bridge',
  'tunnel',
  // Communications
  'data_center',
  'cell_tower',
  'internet_exchange',
  'broadcast_facility',
  // Healthcare
  'hospital',
  'medical_research',
  'pharmaceutical',
  // Emergency
  'fire_station',
  'police_station',
  'emergency_dispatch',
  // Chemical
  'chemical_plant',
  'chemical_storage',
  // Financial
  'financial_institution',
  'data_processing_center',
  // Government
  'government_building',
  'military_base',
  // Other
  'other',
]);

// Incident type enum
export const incidentTypeEnum = pgEnum('incident_type', [
  'fire',
  'explosion',
  'structural_failure',
  'power_outage',
  'equipment_failure',
  'cyber_attack',
  'physical_attack',
  'natural_disaster',
  'hazmat_release',
  'flooding',
  'weather_damage',
  'traffic_incident',
  'civil_disturbance',
  'suspicious_activity',
  'evacuation',
  'unknown',
]);

// Incident severity enum
export const incidentSeverityEnum = pgEnum('incident_severity', [
  'minor',
  'moderate',
  'significant',
  'severe',
  'catastrophic',
]);

// Incident source enum
export const incidentSourceEnum = pgEnum('incident_source', [
  'satellite_fire',
  'nrc_report',
  'power_outage',
  'dot_camera',
  'citizen_report',
  'manual',
  'api',
]);

// Facility status enum
export const facilityStatusEnum = pgEnum('facility_status', [
  'operational',
  'maintenance',
  'offline',
  'unknown',
]);

// Incident status enum
export const incidentStatusEnum = pgEnum('infrastructure_incident_status', [
  'active',
  'monitoring',
  'resolved',
  'false_alarm',
]);

// DOT camera status enum
export const dotCameraStatusEnum = pgEnum('dot_camera_status', [
  'active',
  'inactive',
  'unknown',
  'incident_detected',
]);

/**
 * Critical Facilities Table
 * Stores critical infrastructure facilities across CISA's 16 sectors
 */
export const criticalFacilities = feedsSchema.table(
  'critical_facilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    sector: cisaSectorEnum('sector').notNull(),
    facilityType: facilityTypeEnum('facility_type').notNull(),

    // Location
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 50 }),
    country: varchar('country', { length: 100 }).default('USA').notNull(),

    // Metadata
    operator: varchar('operator', { length: 255 }),
    capacity: varchar('capacity', { length: 100 }),
    status: facilityStatusEnum('status').default('operational').notNull(),

    // Data source
    source: varchar('source', { length: 50 }).notNull(), // hifld, osm, manual, api
    sourceId: varchar('source_id', { length: 255 }),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    sectorIdx: index('critical_facilities_sector_idx').on(table.sector),
    locationIdx: index('critical_facilities_location_idx').on(table.latitude, table.longitude),
    stateIdx: index('critical_facilities_state_idx').on(table.state),
    sourceIdIdx: index('critical_facilities_source_id_idx').on(table.source, table.sourceId),
  })
);

/**
 * Infrastructure Incidents Table
 * Stores correlated incidents affecting critical infrastructure
 */
export const infrastructureIncidents = feedsSchema.table(
  'infrastructure_incidents',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Classification
    sector: cisaSectorEnum('sector').notNull(),
    incidentType: incidentTypeEnum('incident_type').notNull(),
    severity: incidentSeverityEnum('severity').notNull(),
    severityScore: real('severity_score').notNull(), // 1-5 with sector weighting

    // Location
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    address: text('address'),
    state: varchar('state', { length: 50 }),

    // Matched facility (if any)
    facilityId: uuid('facility_id').references(() => criticalFacilities.id, {
      onDelete: 'set null',
    }),
    facilityName: varchar('facility_name', { length: 255 }),
    facilityType: facilityTypeEnum('facility_type_ref'),

    // Event details
    title: text('title').notNull(),
    description: text('description'),

    // Source aggregation - stored as JSONB array
    sources: jsonb('sources').default([]).notNull(),

    // Timing
    firstReportedAt: timestamp('first_reported_at').notNull(),
    lastReportedAt: timestamp('last_reported_at').notNull(),
    confirmedAt: timestamp('confirmed_at'),
    resolvedAt: timestamp('resolved_at'),

    // Status
    status: incidentStatusEnum('status').default('active').notNull(),
    verified: boolean('verified').default(false).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    sectorIdx: index('infrastructure_incidents_sector_idx').on(table.sector),
    severityIdx: index('infrastructure_incidents_severity_idx').on(table.severity),
    statusIdx: index('infrastructure_incidents_status_idx').on(table.status),
    locationIdx: index('infrastructure_incidents_location_idx').on(table.latitude, table.longitude),
    facilityIdx: index('infrastructure_incidents_facility_idx').on(table.facilityId),
    firstReportedIdx: index('infrastructure_incidents_first_reported_idx').on(
      table.firstReportedAt
    ),
    stateIdx: index('infrastructure_incidents_state_idx').on(table.state),
  })
);

/**
 * Satellite Fires Table
 * Raw FIRMS satellite fire detections for correlation
 */
export const satelliteFires = feedsSchema.table(
  'satellite_fires',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Location
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),

    // FIRMS properties
    brightness: real('brightness'),
    frp: real('frp').notNull(), // Fire Radiative Power (MW)
    confidence: varchar('confidence', { length: 20 }).notNull(), // low, nominal, high
    satellite: varchar('satellite', { length: 50 }).notNull(),
    instrument: varchar('instrument', { length: 50 }),
    dayNight: varchar('day_night', { length: 10 }), // day, night

    // Timing
    acquisitionTime: timestamp('acquisition_time').notNull(),

    // Processing
    processed: boolean('processed').default(false).notNull(),
    matchedFacilityId: uuid('matched_facility_id').references(() => criticalFacilities.id, {
      onDelete: 'set null',
    }),
    matchedIncidentId: uuid('matched_incident_id').references(() => infrastructureIncidents.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    locationIdx: index('satellite_fires_location_idx').on(table.latitude, table.longitude),
    acquisitionIdx: index('satellite_fires_acquisition_idx').on(table.acquisitionTime),
    processedIdx: index('satellite_fires_processed_idx').on(table.processed),
  })
);

/**
 * DOT Cameras Table
 * Traffic cameras from state DOT agencies
 */
export const dotCameras = feedsSchema.table(
  'dot_cameras',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    state: varchar('state', { length: 2 }).notNull(),
    route: varchar('route', { length: 50 }),

    // Location
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),

    // Status
    status: dotCameraStatusEnum('status').default('unknown').notNull(),
    imageUrl: text('image_url'),
    videoUrl: text('video_url'),
    lastImageTime: timestamp('last_image_time'),

    // Metadata
    sourceAgency: varchar('source_agency', { length: 100 }).notNull(),
    sourceId: varchar('source_id', { length: 255 }).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    stateIdx: index('dot_cameras_state_idx').on(table.state),
    locationIdx: index('dot_cameras_location_idx').on(table.latitude, table.longitude),
    sourceIdIdx: index('dot_cameras_source_id_idx').on(table.sourceAgency, table.sourceId),
    statusIdx: index('dot_cameras_status_idx').on(table.status),
  })
);

/**
 * Citizen Incidents Table
 * Raw incidents from Citizen app for correlation
 */
export const citizenIncidents = feedsSchema.table(
  'citizen_incidents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),

    // Event details
    title: text('title').notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }).notNull(),
    subcategory: varchar('subcategory', { length: 100 }),

    // Location
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    address: text('address'),

    // Engagement metrics
    viewCount: integer('view_count'),
    commentCount: integer('comment_count'),
    updateCount: integer('update_count'),

    // Timing
    reportedAt: timestamp('reported_at').notNull(),
    lastUpdatedAt: timestamp('last_updated_at'),

    // Processing
    processed: boolean('processed').default(false).notNull(),
    matchedFacilityId: uuid('matched_facility_id').references(() => criticalFacilities.id, {
      onDelete: 'set null',
    }),
    matchedIncidentId: uuid('matched_incident_id').references(() => infrastructureIncidents.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    cityIdx: index('citizen_incidents_city_idx').on(table.city),
    externalIdIdx: index('citizen_incidents_external_id_idx').on(table.externalId),
    locationIdx: index('citizen_incidents_location_idx').on(table.latitude, table.longitude),
    reportedAtIdx: index('citizen_incidents_reported_at_idx').on(table.reportedAt),
    processedIdx: index('citizen_incidents_processed_idx').on(table.processed),
    categoryIdx: index('citizen_incidents_category_idx').on(table.category),
  })
);

/**
 * Power Outages Table
 * Stores power outage reports from PowerOutage.us
 */
export const powerOutages = feedsSchema.table(
  'power_outages',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Location
    county: varchar('county', { length: 100 }).notNull(),
    state: varchar('state', { length: 2 }).notNull(),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),

    // Outage data
    utilityName: varchar('utility_name', { length: 255 }).notNull(),
    customersAffected: integer('customers_affected').notNull(),
    customersServed: integer('customers_served'),
    percentageOut: real('percentage_out'),

    // Timing
    reportedAt: timestamp('reported_at').notNull(),
    estimatedRestoration: timestamp('estimated_restoration'),

    // Processing
    processed: boolean('processed').default(false).notNull(),
    matchedIncidentId: uuid('matched_incident_id').references(() => infrastructureIncidents.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    stateIdx: index('power_outages_state_idx').on(table.state),
    countyIdx: index('power_outages_county_idx').on(table.county),
    reportedAtIdx: index('power_outages_reported_at_idx').on(table.reportedAt),
    customersIdx: index('power_outages_customers_idx').on(table.customersAffected),
    processedIdx: index('power_outages_processed_idx').on(table.processed),
  })
);

/**
 * NRC Events Table
 * Nuclear Regulatory Commission event reports
 */
export const nrcEvents = feedsSchema.table(
  'nrc_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventNumber: varchar('event_number', { length: 50 }).notNull(),

    // Facility
    facilityName: varchar('facility_name', { length: 255 }).notNull(),
    region: varchar('region', { length: 10 }),
    state: varchar('state', { length: 2 }),
    latitude: real('latitude'),
    longitude: real('longitude'),

    // Event details
    title: text('title').notNull(),
    description: text('description'),
    eventType: varchar('event_type', { length: 100 }),
    significance: varchar('significance', { length: 50 }),

    // Timing
    eventDate: timestamp('event_date').notNull(),
    reportDate: timestamp('report_date'),

    // Processing
    processed: boolean('processed').default(false).notNull(),
    matchedFacilityId: uuid('matched_facility_id').references(() => criticalFacilities.id, {
      onDelete: 'set null',
    }),
    matchedIncidentId: uuid('matched_incident_id').references(() => infrastructureIncidents.id, {
      onDelete: 'set null',
    }),

    // Raw data
    rawData: jsonb('raw_data'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    eventNumberIdx: index('nrc_events_event_number_idx').on(table.eventNumber),
    eventDateIdx: index('nrc_events_event_date_idx').on(table.eventDate),
    facilityIdx: index('nrc_events_facility_idx').on(table.facilityName),
    processedIdx: index('nrc_events_processed_idx').on(table.processed),
    stateIdx: index('nrc_events_state_idx').on(table.state),
  })
);

// Relations
export const criticalFacilitiesRelations = relations(criticalFacilities, ({ many }) => ({
  incidents: many(infrastructureIncidents),
  fires: many(satelliteFires),
  citizenIncidents: many(citizenIncidents),
  nrcEvents: many(nrcEvents),
}));

export const infrastructureIncidentsRelations = relations(
  infrastructureIncidents,
  ({ one, many }) => ({
    facility: one(criticalFacilities, {
      fields: [infrastructureIncidents.facilityId],
      references: [criticalFacilities.id],
    }),
    satelliteFires: many(satelliteFires),
    citizenIncidents: many(citizenIncidents),
    powerOutages: many(powerOutages),
    nrcEvents: many(nrcEvents),
  })
);

export const satelliteFiresRelations = relations(satelliteFires, ({ one }) => ({
  facility: one(criticalFacilities, {
    fields: [satelliteFires.matchedFacilityId],
    references: [criticalFacilities.id],
  }),
  incident: one(infrastructureIncidents, {
    fields: [satelliteFires.matchedIncidentId],
    references: [infrastructureIncidents.id],
  }),
}));

export const dotCamerasRelations = relations(dotCameras, () => ({}));

export const citizenIncidentsRelations = relations(citizenIncidents, ({ one }) => ({
  facility: one(criticalFacilities, {
    fields: [citizenIncidents.matchedFacilityId],
    references: [criticalFacilities.id],
  }),
  incident: one(infrastructureIncidents, {
    fields: [citizenIncidents.matchedIncidentId],
    references: [infrastructureIncidents.id],
  }),
}));

export const powerOutagesRelations = relations(powerOutages, ({ one }) => ({
  incident: one(infrastructureIncidents, {
    fields: [powerOutages.matchedIncidentId],
    references: [infrastructureIncidents.id],
  }),
}));

export const nrcEventsRelations = relations(nrcEvents, ({ one }) => ({
  facility: one(criticalFacilities, {
    fields: [nrcEvents.matchedFacilityId],
    references: [criticalFacilities.id],
  }),
  incident: one(infrastructureIncidents, {
    fields: [nrcEvents.matchedIncidentId],
    references: [infrastructureIncidents.id],
  }),
}));

// Type exports
export type CriticalFacility = typeof criticalFacilities.$inferSelect;
export type NewCriticalFacility = typeof criticalFacilities.$inferInsert;
export type InfrastructureIncident = typeof infrastructureIncidents.$inferSelect;
export type NewInfrastructureIncident = typeof infrastructureIncidents.$inferInsert;
export type SatelliteFire = typeof satelliteFires.$inferSelect;
export type NewSatelliteFire = typeof satelliteFires.$inferInsert;
export type DOTCamera = typeof dotCameras.$inferSelect;
export type NewDOTCamera = typeof dotCameras.$inferInsert;
export type CitizenIncidentDB = typeof citizenIncidents.$inferSelect;
export type NewCitizenIncident = typeof citizenIncidents.$inferInsert;
export type PowerOutage = typeof powerOutages.$inferSelect;
export type NewPowerOutage = typeof powerOutages.$inferInsert;
export type NRCEvent = typeof nrcEvents.$inferSelect;
export type NewNRCEvent = typeof nrcEvents.$inferInsert;
