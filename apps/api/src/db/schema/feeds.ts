import {
  pgSchema,
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
