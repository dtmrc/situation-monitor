import { relations } from 'drizzle-orm';
import {
  pgSchema,
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

import { projects } from './core';

export const feedsSchema = pgSchema('feeds');

// Flight tracking data (ADS-B)
export const flightData = feedsSchema.table(
  'flight_data',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    icao24: varchar('icao24', { length: 6 }).notNull(),
    callsign: varchar('callsign', { length: 8 }),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    altitude: integer('altitude'),
    velocity: real('velocity'),
    heading: real('heading'),
    verticalRate: real('vertical_rate'),
    onGround: boolean('on_ground').default(false),
    squawk: varchar('squawk', { length: 4 }),
    rawData: jsonb('raw_data'),
    timestamp: timestamp('timestamp').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index('flight_timestamp_idx').on(table.timestamp),
    icaoIdx: index('flight_icao_idx').on(table.icao24),
  })
);

// Maritime tracking data (AIS)
export const maritimeData = feedsSchema.table(
  'maritime_data',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mmsi: varchar('mmsi', { length: 9 }).notNull(),
    imo: varchar('imo', { length: 7 }),
    name: varchar('name', { length: 255 }),
    shipType: integer('ship_type'),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    course: real('course'),
    speed: real('speed'),
    heading: integer('heading'),
    destination: varchar('destination', { length: 255 }),
    eta: timestamp('eta'),
    rawData: jsonb('raw_data'),
    timestamp: timestamp('timestamp').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index('maritime_timestamp_idx').on(table.timestamp),
    mmsiIdx: index('maritime_mmsi_idx').on(table.mmsi),
  })
);

// News/events feed
export const newsData = feedsSchema.table(
  'news_data',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: varchar('source_id', { length: 100 }),
    title: text('title').notNull(),
    description: text('description'),
    content: text('content'),
    url: text('url').notNull(),
    imageUrl: text('image_url'),
    publishedAt: timestamp('published_at').notNull(),
    categories: text('categories'), // JSON array
    entities: text('entities'), // JSON array of extracted entities
    sentiment: real('sentiment'), // -1 to 1
    relevanceScore: real('relevance_score'),
    rawData: jsonb('raw_data'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    publishedAtIdx: index('news_published_at_idx').on(table.publishedAt),
    sourceIdx: index('news_source_idx').on(table.sourceId),
  })
);

// Feed type enum
export const feedTypeEnum = pgEnum('feed_type', [
  'news',
  'flight',
  'maritime',
  'civil_unrest',
  'fire',
  'telegram',
  'custom',
]);

// TypeScript type for feed type
export type FeedType = (typeof feedTypeEnum.enumValues)[number];

// Feed item severity enum
export const feedSeverityEnum = pgEnum('feed_severity', [
  'info',
  'low',
  'medium',
  'high',
  'critical',
]);

// Feed configuration - which feeds are enabled for which projects
export const feedConfigs = feedsSchema.table(
  'feed_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    type: feedTypeEnum('type').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    pollInterval: integer('poll_interval').default(60000).notNull(), // milliseconds
    apiKeyEncrypted: text('api_key_encrypted'),
    endpoint: text('endpoint'),
    options: jsonb('options').default({}).notNull(),
    filters: jsonb('filters').default({}).notNull(), // Geographic bounds, keywords, etc.
    lastFetchAt: timestamp('last_fetch_at'),
    lastError: text('last_error'),
    errorCount: integer('error_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    projectTypeIdx: index('feed_configs_project_type_idx').on(table.projectId, table.type),
    enabledIdx: index('feed_configs_enabled_idx').on(table.enabled),
  })
);

// Normalized feed items from all sources
export const feedItems = feedsSchema.table(
  'feed_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    feedConfigId: uuid('feed_config_id').references(() => feedConfigs.id, { onDelete: 'set null' }),
    type: feedTypeEnum('type').notNull(),
    externalId: varchar('external_id', { length: 255 }), // ID from source system
    title: text('title').notNull(),
    content: text('content'),
    url: text('url'),
    timestamp: timestamp('timestamp').notNull(),
    latitude: real('latitude'),
    longitude: real('longitude'),
    locationName: text('location_name'),
    severity: feedSeverityEnum('severity').default('info').notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    raw: jsonb('raw'),
    processedAt: timestamp('processed_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    projectTimestampIdx: index('feed_items_project_ts_idx').on(table.projectId, table.timestamp),
    typeIdx: index('feed_items_type_idx').on(table.type),
    externalIdIdx: index('feed_items_external_id_idx').on(table.feedConfigId, table.externalId),
    locationIdx: index('feed_items_location_idx').on(table.latitude, table.longitude),
  })
);

// Feed processing log - job execution tracking
export const feedProcessingLog = feedsSchema.table(
  'feed_processing_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    feedConfigId: uuid('feed_config_id')
      .references(() => feedConfigs.id, { onDelete: 'cascade' })
      .notNull(),
    jobId: varchar('job_id', { length: 100 }),
    status: varchar('status', { length: 20 }).notNull(), // pending, running, completed, failed
    itemsProcessed: integer('items_processed').default(0).notNull(),
    itemsCreated: integer('items_created').default(0).notNull(),
    errorMessage: text('error_message'),
    durationMs: integer('duration_ms'),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    feedConfigIdx: index('feed_processing_log_config_idx').on(table.feedConfigId),
    startedAtIdx: index('feed_processing_log_started_idx').on(table.startedAt),
  })
);

// Relations
export const feedConfigsRelations = relations(feedConfigs, ({ one, many }) => ({
  project: one(projects, {
    fields: [feedConfigs.projectId],
    references: [projects.id],
  }),
  items: many(feedItems),
  processingLogs: many(feedProcessingLog),
}));

export const feedItemsRelations = relations(feedItems, ({ one }) => ({
  project: one(projects, {
    fields: [feedItems.projectId],
    references: [projects.id],
  }),
  feedConfig: one(feedConfigs, {
    fields: [feedItems.feedConfigId],
    references: [feedConfigs.id],
  }),
}));

export const feedProcessingLogRelations = relations(feedProcessingLog, ({ one }) => ({
  feedConfig: one(feedConfigs, {
    fields: [feedProcessingLog.feedConfigId],
    references: [feedConfigs.id],
  }),
}));
