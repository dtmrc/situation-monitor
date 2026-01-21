import { relations } from 'drizzle-orm';
import {
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  boolean,
  real,
} from 'drizzle-orm/pg-core';

import { intelSchema, pirs, nais, sourceReliabilityEnum, infoCredibilityEnum } from './intel';

export const indicatorStatusEnum = pgEnum('indicator_status', [
  'not_observed',
  'partially_observed',
  'fully_observed',
]);

export const alertSeverityEnum = pgEnum('alert_severity', ['info', 'warning', 'critical']);

// Indicators (linked to PIRs)
export const indicators = intelSchema.table('indicators', {
  id: uuid('id').primaryKey().defaultRandom(),
  pirId: uuid('pir_id')
    .references(() => pirs.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  observationCriteria: text('observation_criteria'),
  status: indicatorStatusEnum('status').default('not_observed').notNull(),
  threshold: integer('threshold').default(100), // percentage for partial observation
  currentValue: integer('current_value').default(0),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Observations (evidence for indicators)
export const observations = intelSchema.table('observations', {
  id: uuid('id').primaryKey().defaultRandom(),
  indicatorId: uuid('indicator_id')
    .references(() => indicators.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  sourceReliability: sourceReliabilityEnum('source_reliability').default('F'),
  infoCredibility: infoCredibilityEnum('info_credibility').default('6'),
  observedAt: timestamp('observed_at').defaultNow().notNull(),
  location: text('location'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  attachments: text('attachments'), // JSON array of attachment URLs
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tripwires (linked to NAIs)
export const tripwires = intelSchema.table('tripwires', {
  id: uuid('id').primaryKey().defaultRandom(),
  naiId: uuid('nai_id')
    .references(() => nais.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  condition: text('condition').notNull(), // What triggers the tripwire
  threshold: real('threshold'), // Numeric threshold if applicable
  currentValue: real('current_value'),
  isTriggered: boolean('is_triggered').default(false).notNull(),
  triggeredAt: timestamp('triggered_at'),
  alertSeverity: alertSeverityEnum('alert_severity').default('warning').notNull(),
  notifyUsers: text('notify_users'), // JSON array of user IDs
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Alerts (generated when tripwires trigger)
export const alerts = intelSchema.table('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripwireId: uuid('tripwire_id')
    .references(() => tripwires.id, { onDelete: 'cascade' })
    .notNull(),
  severity: alertSeverityEnum('severity').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: text('data'), // JSON payload
  acknowledgedAt: timestamp('acknowledged_at'),
  acknowledgedBy: uuid('acknowledged_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const indicatorsRelations = relations(indicators, ({ one, many }) => ({
  pir: one(pirs, {
    fields: [indicators.pirId],
    references: [pirs.id],
  }),
  observations: many(observations),
}));

export const observationsRelations = relations(observations, ({ one }) => ({
  indicator: one(indicators, {
    fields: [observations.indicatorId],
    references: [indicators.id],
  }),
}));

export const tripwiresRelations = relations(tripwires, ({ one, many }) => ({
  nai: one(nais, {
    fields: [tripwires.naiId],
    references: [nais.id],
  }),
  alerts: many(alerts),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  tripwire: one(tripwires, {
    fields: [alerts.tripwireId],
    references: [tripwires.id],
  }),
}));
