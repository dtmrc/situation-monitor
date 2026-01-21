# Phase 1: Data Layer

## Overview

**Purpose:** Establish the PostgreSQL database schema, pgvector extension for RAG, and Drizzle ORM configuration for type-safe database access.

**Dependencies:** Phase 0 (Infrastructure Setup)

**Deliverables:**
- Complete database schema with all domain tables
- pgvector extension for embedding storage
- Drizzle ORM configuration and migrations
- Seed data for development
- Database utilities and helpers

---

## Sub-Documents

| Document | Scope | Tasks |
|----------|-------|-------|
| [01a-SEED-DATA.md](./01a-SEED-DATA.md) | Development seed data, sample data for testing | 1.11 |

---

## Architecture

### Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CORE DOMAIN                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────┐      ┌──────────────┐      ┌──────────────┐                       │
│  │  User    │──────│   Project    │──────│  Assessment  │                       │
│  └──────────┘      └──────────────┘      └──────────────┘                       │
│       │                   │                     │                                │
│       │                   │              ┌──────┴──────┐                        │
│       │                   │              │             │                        │
│       │            ┌──────┴──────┐  ┌────▼────┐  ┌─────▼─────┐                 │
│       │            │             │  │ Factor  │  │  Threat   │                 │
│       │            │             │  │(PMESII) │  │Assessment │                 │
│       │            │             │  └─────────┘  └───────────┘                 │
│       │     ┌──────▼──────┐   ┌──▼───────┐                                     │
│       │     │    PIR      │   │   NAI    │                                     │
│       │     └──────┬──────┘   └────┬─────┘                                     │
│       │            │               │                                            │
│       │     ┌──────▼──────┐   ┌────▼─────┐                                     │
│       │     │  Indicator  │   │ Tripwire │                                     │
│       │     └──────┬──────┘   └──────────┘                                     │
│       │            │                                                            │
│       │     ┌──────▼──────┐                                                    │
│       │     │ Observation │                                                    │
│       │     └─────────────┘                                                    │
│       │                                                                         │
│  ┌────▼────┐    ┌──────────┐    ┌────────────┐                                 │
│  │ Source  │────│Collection│────│  Document  │                                 │
│  └─────────┘    │   Task   │    │ (embeddings│                                 │
│                 └──────────┘    └────────────┘                                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Database Schema Namespaces

| Schema | Purpose |
|--------|---------|
| `app` | Core application tables |
| `intel` | Intelligence collection tables |
| `rag` | RAG/embedding tables |
| `audit` | Audit logging tables |

---

## Implementation Tasks

| ID | Task | Agent | Priority | Dependencies | Sub-Doc |
|----|------|-------|----------|--------------|---------|
| 1.1 | Configure Drizzle ORM with PostgreSQL | `node-developer` | Critical | Phase 0 | — |
| 1.2 | Create core schema (users, projects, assessments) | `node-developer` | Critical | 1.1 | — |
| 1.3 | Create PMESII-PT schema (factors, domains) | `node-developer` | Critical | 1.2 | — |
| 1.4 | Create threat assessment schema | `node-developer` | Critical | 1.2 | — |
| 1.5 | Create CoG analysis schema | `node-developer` | High | 1.2 | — |
| 1.6 | Create intelligence collection schema (PIR, NAI) | `node-developer` | Critical | 1.2 | — |
| 1.7 | Create indicator/tripwire schema | `node-developer` | Critical | 1.6 | — |
| 1.8 | Set up pgvector and embedding tables | `rag-pipeline-expert` | High | 1.1 | — |
| 1.9 | Create audit logging schema | `node-developer` | Medium | 1.1 | — |
| 1.10 | Implement database migrations | `node-developer` | Critical | 1.2-1.9 | — |
| 1.11 | Create seed data for development | `node-developer` | Medium | 1.10 | [01a](./01a-SEED-DATA.md) |
| 1.12 | Domain model validation review | `intelligence-analysis-expert` | High | 1.2-1.7 | — |

---

## Detailed Specifications

### 1.1 Drizzle ORM Configuration

**File: `apps/api/drizzle.config.ts`**
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

**File: `apps/api/src/db/index.ts`**
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// For query purposes
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

// For migrations (separate connection)
export const migrationClient = postgres(connectionString, { max: 1 });
```

### 1.2 Core Schema

**File: `apps/api/src/db/schema/core.ts`**
```typescript
import { relations } from 'drizzle-orm';
import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const appSchema = pgSchema('app');

// Enums
export const statusEnum = pgEnum('status', ['draft', 'active', 'archived']);
export const roleEnum = pgEnum('role', ['owner', 'admin', 'analyst', 'viewer']);

// Users
export const users = appSchema.table('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Projects
export const projects = appSchema.table('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: statusEnum('status').default('draft').notNull(),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  settings: text('settings'), // JSON stored as text
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Project Members (junction)
export const projectMembers = appSchema.table('project_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: roleEnum('role').default('viewer').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Assessments (container for analysis)
export const assessments = appSchema.table('assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: statusEnum('status').default('draft').notNull(),
  assessmentDate: timestamp('assessment_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedProjects: many(projects),
  memberships: many(projectMembers),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  members: many(projectMembers),
  assessments: many(assessments),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  project: one(projects, {
    fields: [assessments.projectId],
    references: [projects.id],
  }),
}));
```

### 1.3 PMESII-PT Schema

**File: `apps/api/src/db/schema/pmesii.ts`**
```typescript
import { relations } from 'drizzle-orm';
import {
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';

import { appSchema, assessments } from './core';

// PMESII-PT Domain Enum
export const pmesiiDomainEnum = pgEnum('pmesii_domain', [
  'political',
  'military',
  'economic',
  'social',
  'information',
  'infrastructure',
  'physical',
  'time',
]);

export const impactLevelEnum = pgEnum('impact_level', [
  'negligible',
  'minor',
  'moderate',
  'significant',
  'critical',
]);

export const trendEnum = pgEnum('trend', ['improving', 'stable', 'declining']);

// PMESII-PT Factors
export const factors = appSchema.table('factors', {
  id: uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id').references(() => assessments.id, { onDelete: 'cascade' }).notNull(),
  domain: pmesiiDomainEnum('domain').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  analysis: text('analysis'),
  impact: impactLevelEnum('impact').default('moderate').notNull(),
  trend: trendEnum('trend').default('stable').notNull(),
  confidence: integer('confidence').default(50).notNull(), // 0-100
  sources: text('sources'), // JSON array of source references
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Factor Evidence (supporting data)
export const factorEvidence = appSchema.table('factor_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  factorId: uuid('factor_id').references(() => factors.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  sourceUrl: text('source_url'),
  sourceType: varchar('source_type', { length: 50 }),
  observedAt: timestamp('observed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const factorsRelations = relations(factors, ({ one, many }) => ({
  assessment: one(assessments, {
    fields: [factors.assessmentId],
    references: [assessments.id],
  }),
  evidence: many(factorEvidence),
}));

export const factorEvidenceRelations = relations(factorEvidence, ({ one }) => ({
  factor: one(factors, {
    fields: [factorEvidence.factorId],
    references: [factors.id],
  }),
}));
```

### 1.4 Threat Assessment Schema

**File: `apps/api/src/db/schema/threat.ts`**
```typescript
import { relations } from 'drizzle-orm';
import {
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  real,
} from 'drizzle-orm/pg-core';

import { appSchema, assessments } from './core';

export const threatCategoryEnum = pgEnum('threat_category', [
  'state_actor',
  'non_state_actor',
  'natural',
  'technological',
  'economic',
  'social',
  'cyber',
  'other',
]);

export const probabilityEnum = pgEnum('probability', [
  'rare',       // 1: < 10%
  'unlikely',   // 2: 10-30%
  'possible',   // 3: 30-50%
  'likely',     // 4: 50-80%
  'certain',    // 5: > 80%
]);

// Threat Actors
export const threatActors = appSchema.table('threat_actors', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: threatCategoryEnum('category').notNull(),
  description: text('description'),
  capabilities: text('capabilities'),
  intentions: text('intentions'),
  history: text('history'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Threat Assessments (probability x impact matrix entries)
export const threatAssessments = appSchema.table('threat_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id').references(() => assessments.id, { onDelete: 'cascade' }).notNull(),
  threatActorId: uuid('threat_actor_id').references(() => threatActors.id).notNull(),
  threatScenario: text('threat_scenario').notNull(),
  probability: probabilityEnum('probability').notNull(),
  probabilityScore: integer('probability_score').notNull(), // 1-5
  impactScore: integer('impact_score').notNull(), // 1-5 for each category
  // Impact breakdown (stored as separate columns for query efficiency)
  impactCasualties: integer('impact_casualties').default(1),
  impactEconomic: integer('impact_economic').default(1),
  impactInfrastructure: integer('impact_infrastructure').default(1),
  impactReputation: integer('impact_reputation').default(1),
  // Calculated risk score (probability × impact)
  riskScore: real('risk_score').notNull(),
  mitigations: text('mitigations'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const threatActorsRelations = relations(threatActors, ({ many }) => ({
  assessments: many(threatAssessments),
}));

export const threatAssessmentsRelations = relations(threatAssessments, ({ one }) => ({
  assessment: one(assessments, {
    fields: [threatAssessments.assessmentId],
    references: [assessments.id],
  }),
  threatActor: one(threatActors, {
    fields: [threatAssessments.threatActorId],
    references: [threatActors.id],
  }),
}));
```

### 1.5 Center of Gravity Schema

**File: `apps/api/src/db/schema/cog.ts`**
```typescript
import { relations } from 'drizzle-orm';
import {
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';

import { appSchema, assessments } from './core';

export const cogTypeEnum = pgEnum('cog_type', ['friendly', 'adversary', 'neutral']);
export const cogElementTypeEnum = pgEnum('cog_element_type', [
  'critical_capability',   // CC: What can the CoG do?
  'critical_requirement',  // CR: What does the CoG need?
  'critical_vulnerability', // CV: What can be exploited?
]);

// Center of Gravity entities
export const centersOfGravity = appSchema.table('centers_of_gravity', {
  id: uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id').references(() => assessments.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: cogTypeEnum('type').notNull(),
  description: text('description'),
  rationale: text('rationale'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// CoG Elements (CC, CR, CV)
export const cogElements = appSchema.table('cog_elements', {
  id: uuid('id').primaryKey().defaultRandom(),
  cogId: uuid('cog_id').references(() => centersOfGravity.id, { onDelete: 'cascade' }).notNull(),
  type: cogElementTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  priority: integer('priority').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// CoG Element Links (relationships between elements)
export const cogElementLinks = appSchema.table('cog_element_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id').references(() => cogElements.id, { onDelete: 'cascade' }).notNull(),
  targetId: uuid('target_id').references(() => cogElements.id, { onDelete: 'cascade' }).notNull(),
  relationship: varchar('relationship', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const centersOfGravityRelations = relations(centersOfGravity, ({ one, many }) => ({
  assessment: one(assessments, {
    fields: [centersOfGravity.assessmentId],
    references: [assessments.id],
  }),
  elements: many(cogElements),
}));

export const cogElementsRelations = relations(cogElements, ({ one, many }) => ({
  cog: one(centersOfGravity, {
    fields: [cogElements.cogId],
    references: [centersOfGravity.id],
  }),
  outgoingLinks: many(cogElementLinks, { relationName: 'sourceLinks' }),
  incomingLinks: many(cogElementLinks, { relationName: 'targetLinks' }),
}));
```

### 1.6 Intelligence Collection Schema

**File: `apps/api/src/db/schema/intel.ts`**
```typescript
import { relations } from 'drizzle-orm';
import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  boolean,
  real,
} from 'drizzle-orm/pg-core';

import { projects } from './core';

export const intelSchema = pgSchema('intel');

export const pirStatusEnum = pgEnum('pir_status', [
  'draft',
  'active',
  'answered',
  'obsolete',
]);

export const pirPriorityEnum = pgEnum('pir_priority', [
  'routine',
  'priority',
  'immediate',
  'flash',
]);

export const sourceReliabilityEnum = pgEnum('source_reliability', [
  'A', // Completely reliable
  'B', // Usually reliable
  'C', // Fairly reliable
  'D', // Not usually reliable
  'E', // Unreliable
  'F', // Cannot be judged
]);

export const infoCredibilityEnum = pgEnum('info_credibility', [
  '1', // Confirmed
  '2', // Probably true
  '3', // Possibly true
  '4', // Doubtfully true
  '5', // Improbable
  '6', // Cannot be judged
]);

// Priority Intelligence Requirements
export const pirs = intelSchema.table('pirs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  question: text('question').notNull(),
  context: text('context'),
  status: pirStatusEnum('status').default('draft').notNull(),
  priority: pirPriorityEnum('priority').default('routine').notNull(),
  dueDate: timestamp('due_date'),
  answeredAt: timestamp('answered_at'),
  answer: text('answer'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Named Areas of Interest
export const nais = intelSchema.table('nais', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  // Geospatial data
  latitude: real('latitude'),
  longitude: real('longitude'),
  radius: real('radius'), // meters
  polygon: text('polygon'), // GeoJSON
  // Metadata
  isActive: boolean('is_active').default(true).notNull(),
  color: varchar('color', { length: 7 }).default('#00ff88'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sources
export const sources = intelSchema.table('sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(), // HUMINT, OSINT, SIGINT, etc.
  description: text('description'),
  reliability: sourceReliabilityEnum('reliability').default('F'),
  contactInfo: text('contact_info'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Collection Tasks
export const collectionTasks = intelSchema.table('collection_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  pirId: uuid('pir_id').references(() => pirs.id, { onDelete: 'cascade' }).notNull(),
  sourceId: uuid('source_id').references(() => sources.id),
  naiId: uuid('nai_id').references(() => nais.id),
  description: text('description').notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  assignedTo: uuid('assigned_to'),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  result: text('result'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const pirsRelations = relations(pirs, ({ one, many }) => ({
  project: one(projects, {
    fields: [pirs.projectId],
    references: [projects.id],
  }),
  collectionTasks: many(collectionTasks),
}));

export const naisRelations = relations(nais, ({ one, many }) => ({
  project: one(projects, {
    fields: [nais.projectId],
    references: [projects.id],
  }),
  collectionTasks: many(collectionTasks),
}));

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  project: one(projects, {
    fields: [sources.projectId],
    references: [projects.id],
  }),
  collectionTasks: many(collectionTasks),
}));
```

### 1.7 Indicator/Tripwire Schema

**File: `apps/api/src/db/schema/indicators.ts`**
```typescript
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

export const alertSeverityEnum = pgEnum('alert_severity', [
  'info',
  'warning',
  'critical',
]);

// Indicators (linked to PIRs)
export const indicators = intelSchema.table('indicators', {
  id: uuid('id').primaryKey().defaultRandom(),
  pirId: uuid('pir_id').references(() => pirs.id, { onDelete: 'cascade' }).notNull(),
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
  indicatorId: uuid('indicator_id').references(() => indicators.id, { onDelete: 'cascade' }).notNull(),
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
  naiId: uuid('nai_id').references(() => nais.id, { onDelete: 'cascade' }).notNull(),
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
  tripwireId: uuid('tripwire_id').references(() => tripwires.id, { onDelete: 'cascade' }).notNull(),
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
```

### 1.8 pgvector and Embedding Schema

**File: `apps/api/src/db/schema/rag.ts`**
```typescript
import { relations } from 'drizzle-orm';
import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  index,
  vector,
} from 'drizzle-orm/pg-core';

import { projects } from './core';

export const ragSchema = pgSchema('rag');

// Embedding dimensions for different models
const EMBEDDING_DIMENSIONS = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'claude': 1024, // Hypothetical
} as const;

// Documents (source content for RAG)
export const documents = ragSchema.table('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  sourceUrl: text('source_url'),
  sourceType: varchar('source_type', { length: 50 }), // report, article, assessment, etc.
  metadata: text('metadata'), // JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Document Chunks (for embedding)
export const documentChunks = ragSchema.table('document_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
  embedding: vector('embedding', { dimensions: 1536 }), // OpenAI text-embedding-3-small
  metadata: text('metadata'), // JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  embeddingIndex: index('chunk_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
}));

// Chat/Query History (for context)
export const queryHistory = ragSchema.table('query_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').notNull(),
  query: text('query').notNull(),
  queryEmbedding: vector('query_embedding', { dimensions: 1536 }),
  response: text('response'),
  relevantChunkIds: text('relevant_chunk_ids'), // JSON array
  model: varchar('model', { length: 50 }),
  tokensUsed: integer('tokens_used'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  queryEmbeddingIndex: index('query_embedding_idx').using('hnsw', table.queryEmbedding.op('vector_cosine_ops')),
}));

// Relations
export const documentsRelations = relations(documents, ({ one, many }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  chunks: many(documentChunks),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}));
```

### 1.9 Audit Schema

**File: `apps/api/src/db/schema/audit.ts`**
```typescript
import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  inet,
} from 'drizzle-orm/pg-core';

export const auditSchema = pgSchema('audit');

export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'read',
  'update',
  'delete',
  'login',
  'logout',
  'export',
  'share',
]);

// Audit Logs
export const auditLogs = auditSchema.table('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  action: auditActionEnum('action').notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: uuid('entity_id'),
  oldValue: text('old_value'), // JSON
  newValue: text('new_value'), // JSON
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 1.10 Schema Index Export

**File: `apps/api/src/db/schema/index.ts`**
```typescript
// Core
export * from './core';

// PMESII-PT
export * from './pmesii';

// Threat Assessment
export * from './threat';

// Center of Gravity
export * from './cog';

// Intelligence Collection
export * from './intel';

// Indicators & Tripwires
export * from './indicators';

// RAG / Embeddings
export * from './rag';

// Audit
export * from './audit';
```

### 1.11 Seed Data

**File: `apps/api/src/db/seed.ts`**
```typescript
import { db } from './index';
import { users, projects, assessments, factors } from './schema';

async function seed() {
  console.log('Seeding database...');

  // Create demo user
  const [demoUser] = await db.insert(users).values({
    email: 'demo@situation-monitor.dev',
    name: 'Demo User',
  }).returning();

  console.log('Created demo user:', demoUser.id);

  // Create demo project
  const [demoProject] = await db.insert(projects).values({
    name: 'Eastern Europe Situation Assessment',
    description: 'Comprehensive analysis of the strategic environment in Eastern Europe',
    status: 'active',
    ownerId: demoUser.id,
  }).returning();

  console.log('Created demo project:', demoProject.id);

  // Create demo assessment
  const [demoAssessment] = await db.insert(assessments).values({
    projectId: demoProject.id,
    name: 'Q1 2025 Assessment',
    description: 'Quarterly strategic assessment',
    status: 'active',
  }).returning();

  console.log('Created demo assessment:', demoAssessment.id);

  // Create demo PMESII-PT factors
  const pmesiiFactors = [
    { domain: 'political' as const, title: 'Government Stability', impact: 'moderate' as const },
    { domain: 'military' as const, title: 'Force Posture', impact: 'significant' as const },
    { domain: 'economic' as const, title: 'Trade Dependencies', impact: 'moderate' as const },
    { domain: 'social' as const, title: 'Public Sentiment', impact: 'minor' as const },
    { domain: 'information' as const, title: 'Media Landscape', impact: 'moderate' as const },
    { domain: 'infrastructure' as const, title: 'Critical Infrastructure', impact: 'significant' as const },
    { domain: 'physical' as const, title: 'Geographic Factors', impact: 'minor' as const },
    { domain: 'time' as const, title: 'Election Cycle', impact: 'moderate' as const },
  ];

  for (const factor of pmesiiFactors) {
    await db.insert(factors).values({
      assessmentId: demoAssessment.id,
      domain: factor.domain,
      title: factor.title,
      description: `Analysis of ${factor.title.toLowerCase()} factors`,
      impact: factor.impact,
      trend: 'stable',
      confidence: 70,
    });
  }

  console.log('Created PMESII-PT factors');
  console.log('Seeding complete!');
}

seed().catch(console.error);
```

---

## Migration Strategy

### Initial Migration Commands

```bash
# Generate migration from schema
pnpm --filter @situation-monitor/api db:generate

# Apply migrations
pnpm --filter @situation-monitor/api db:migrate

# Open Drizzle Studio for visual inspection
pnpm --filter @situation-monitor/api db:studio
```

### Migration File Structure

```
apps/api/drizzle/
├── 0000_initial_schema.sql
├── 0001_add_rag_schema.sql
├── meta/
│   └── _journal.json
└── snapshot.json
```

---

## Acceptance Criteria

- [ ] All schemas compile without TypeScript errors
- [ ] Migrations run successfully on fresh database
- [ ] pgvector extension enabled and working
- [ ] All relations properly defined
- [ ] Seed data loads without errors
- [ ] Drizzle Studio can browse all tables
- [ ] HNSW index created for embedding columns
- [ ] Foreign key constraints enforced

---

## Files to Create/Modify

| Path | Description |
|------|-------------|
| `apps/api/drizzle.config.ts` | Drizzle Kit configuration |
| `apps/api/src/db/index.ts` | Database connection |
| `apps/api/src/db/schema/core.ts` | Users, projects, assessments |
| `apps/api/src/db/schema/pmesii.ts` | PMESII-PT factors |
| `apps/api/src/db/schema/threat.ts` | Threat assessments |
| `apps/api/src/db/schema/cog.ts` | Center of Gravity |
| `apps/api/src/db/schema/intel.ts` | PIR, NAI, Sources |
| `apps/api/src/db/schema/indicators.ts` | Indicators, Tripwires, Alerts |
| `apps/api/src/db/schema/rag.ts` | Documents, Chunks, Embeddings |
| `apps/api/src/db/schema/audit.ts` | Audit logging |
| `apps/api/src/db/schema/index.ts` | Schema exports |
| `apps/api/src/db/seed.ts` | Development seed data |

---

## Domain Model Notes

### PMESII-PT Domains

| Domain | Focus Areas |
|--------|-------------|
| Political | Governance, policy, regulations, political stability |
| Military | Armed forces, security apparatus, defense posture |
| Economic | Markets, trade, financial systems, resources |
| Social | Demographics, culture, public opinion, civil society |
| Information | Media, narratives, cyber, information operations |
| Infrastructure | Transportation, utilities, communications, critical systems |
| Physical | Geography, climate, terrain, natural resources |
| Time | Deadlines, cycles, windows of opportunity, tempo |

### Source Reliability Scale (NATO Standard)

| Code | Meaning |
|------|---------|
| A | Completely reliable |
| B | Usually reliable |
| C | Fairly reliable |
| D | Not usually reliable |
| E | Unreliable |
| F | Reliability cannot be judged |

### Information Credibility Scale

| Code | Meaning |
|------|---------|
| 1 | Confirmed by other sources |
| 2 | Probably true |
| 3 | Possibly true |
| 4 | Doubtful |
| 5 | Improbable |
| 6 | Truth cannot be judged |

---

## Multi-Tenancy: Organizations Schema

Row-level multi-tenancy is implemented via `organization_id` foreign keys on all tenant-scoped tables.

### Organization Tables

**File: `apps/api/src/db/schema/organizations.ts`**
```typescript
import { relations } from 'drizzle-orm';
import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core';

import { users } from './core';

export const appSchema = pgSchema('app');

// Organization status
export const orgStatusEnum = pgEnum('org_status', ['active', 'suspended', 'deleted']);
export const orgRoleEnum = pgEnum('org_role', ['owner', 'admin', 'member', 'viewer']);

// Organizations
export const organizations = appSchema.table('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  status: orgStatusEnum('status').default('active').notNull(),
  settings: text('settings'), // JSON for org-level settings
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
});

// Organization Memberships
export const organizationMembers = appSchema.table('organization_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  role: orgRoleEnum('role').default('member').notNull(),
  invitedBy: uuid('invited_by').references(() => users.id),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  // Unique constraint: one membership per user per org
});

// Organization Invitations
export const organizationInvitations = appSchema.table('organization_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  role: orgRoleEnum('role').default('member').notNull(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  invitedBy: uuid('invited_by').references(() => users.id).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  invitations: many(organizationInvitations),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));
```

### Updated Core Schema with Organization FK

Add `organizationId` to the `projects` table in `core.ts`:

```typescript
// Projects (add organizationId)
export const projects = appSchema.table('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: statusEnum('status').default('draft').notNull(),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  settings: text('settings'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
});
```

### Row-Level Security Helper

**File: `apps/api/src/db/helpers/tenant.ts`**
```typescript
import { and, eq, isNull, SQL } from 'drizzle-orm';

/**
 * Creates a tenant filter condition for queries
 * Filters by organizationId and excludes soft-deleted records
 */
export function tenantFilter<T extends { organizationId: any; deletedAt?: any }>(
  table: T,
  organizationId: string
): SQL {
  const conditions = [eq(table.organizationId, organizationId)];

  if ('deletedAt' in table) {
    conditions.push(isNull(table.deletedAt));
  }

  return and(...conditions)!;
}

/**
 * Soft delete helper - sets deletedAt instead of hard delete
 */
export function softDeleteValues() {
  return {
    deletedAt: new Date(),
    updatedAt: new Date(),
  };
}
```

---

## Soft Delete Pattern

Tables supporting soft delete include a `deletedAt` timestamp column. Queries should filter `WHERE deleted_at IS NULL`.

### Tables with Soft Delete

| Table | Soft Delete |
|-------|-------------|
| `organizations` | Yes |
| `projects` | Yes |
| `assessments` | Yes |
| `threat_actors` | Yes |
| `documents` | Yes |
| `pirs` | Yes |
| `nais` | Yes |
| `sources` | Yes |

### Soft Delete Query Pattern

```typescript
// Query with soft delete filter
const activeProjects = await db.query.projects.findMany({
  where: and(
    eq(projects.organizationId, orgId),
    isNull(projects.deletedAt)
  ),
});

// Soft delete operation
await db.update(projects)
  .set(softDeleteValues())
  .where(eq(projects.id, projectId));

// Hard delete (for permanent removal, use sparingly)
await db.delete(projects)
  .where(eq(projects.id, projectId));
```

---

## Data Retention Schema

For feed data with rolling 7-day retention window.

### Feed Data Tables

**File: `apps/api/src/db/schema/feeds.ts`**
```typescript
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
} from 'drizzle-orm/pg-core';

export const feedsSchema = pgSchema('feeds');

// Flight tracking data (ADS-B)
export const flightData = feedsSchema.table('flight_data', {
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
}, (table) => ({
  timestampIdx: index('flight_timestamp_idx').on(table.timestamp),
  icaoIdx: index('flight_icao_idx').on(table.icao24),
}));

// Maritime tracking data (AIS)
export const maritimeData = feedsSchema.table('maritime_data', {
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
}, (table) => ({
  timestampIdx: index('maritime_timestamp_idx').on(table.timestamp),
  mmsiIdx: index('maritime_mmsi_idx').on(table.mmsi),
}));

// News/events feed
export const newsData = feedsSchema.table('news_data', {
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
}, (table) => ({
  publishedAtIdx: index('news_published_at_idx').on(table.publishedAt),
  sourceIdx: index('news_source_idx').on(table.sourceId),
}));
```

### Data Retention Job

**File: `apps/api/src/jobs/data-retention.job.ts`**
```typescript
import { sql } from 'drizzle-orm';
import { db } from '../db';

const RETENTION_DAYS = parseInt(process.env.FEED_RETENTION_DAYS || '7', 10);

/**
 * Purge feed data older than retention window
 * Run this as a scheduled job (e.g., daily via BullMQ)
 */
export async function purgeOldFeedData() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  console.log(`Purging feed data older than ${cutoffDate.toISOString()}`);

  // Delete old flight data
  const flightResult = await db.execute(sql`
    DELETE FROM feeds.flight_data
    WHERE timestamp < ${cutoffDate}
  `);
  console.log(`Deleted ${flightResult.rowCount} flight records`);

  // Delete old maritime data
  const maritimeResult = await db.execute(sql`
    DELETE FROM feeds.maritime_data
    WHERE timestamp < ${cutoffDate}
  `);
  console.log(`Deleted ${maritimeResult.rowCount} maritime records`);

  // Delete old news data
  const newsResult = await db.execute(sql`
    DELETE FROM feeds.news_data
    WHERE published_at < ${cutoffDate}
  `);
  console.log(`Deleted ${newsResult.rowCount} news records`);

  return {
    flightDeleted: flightResult.rowCount,
    maritimeDeleted: maritimeResult.rowCount,
    newsDeleted: newsResult.rowCount,
    cutoffDate,
  };
}
```

### Retention Job Queue

**File: `apps/api/src/jobs/retention.queue.ts`**
```typescript
import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../lib/redis';
import { purgeOldFeedData } from './data-retention.job';

export const retentionQueue = new Queue('retention', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

// Schedule daily cleanup at 2 AM UTC
export async function scheduleRetentionJob() {
  await retentionQueue.add(
    'purge-feed-data',
    {},
    {
      repeat: {
        pattern: '0 2 * * *', // Cron: 2 AM daily
      },
    }
  );
}

// Worker to process retention jobs
export const retentionWorker = new Worker(
  'retention',
  async (job) => {
    if (job.name === 'purge-feed-data') {
      return purgeOldFeedData();
    }
  },
  { connection: redisConnection }
);

retentionWorker.on('completed', (job, result) => {
  console.log(`Retention job ${job.id} completed:`, result);
});

retentionWorker.on('failed', (job, error) => {
  console.error(`Retention job ${job?.id} failed:`, error);
});
```

---

## Database Indexes

### Recommended Indexes for Common Queries

```sql
-- Organizations
CREATE INDEX idx_org_members_user ON app.organization_members(user_id);
CREATE INDEX idx_org_members_org ON app.organization_members(organization_id);

-- Projects
CREATE INDEX idx_projects_org ON app.projects(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_owner ON app.projects(owner_id);

-- Assessments
CREATE INDEX idx_assessments_project ON app.assessments(project_id) WHERE deleted_at IS NULL;

-- Factors (PMESII-PT)
CREATE INDEX idx_factors_assessment ON app.factors(assessment_id);
CREATE INDEX idx_factors_domain ON app.factors(domain);

-- PIRs
CREATE INDEX idx_pirs_project ON intel.pirs(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pirs_status ON intel.pirs(status);

-- NAIs
CREATE INDEX idx_nais_project ON intel.nais(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_nais_active ON intel.nais(is_active);

-- Indicators
CREATE INDEX idx_indicators_pir ON intel.indicators(pir_id);
CREATE INDEX idx_indicators_status ON intel.indicators(status);

-- Tripwires
CREATE INDEX idx_tripwires_nai ON intel.tripwires(nai_id);
CREATE INDEX idx_tripwires_triggered ON intel.tripwires(is_triggered);

-- Alerts
CREATE INDEX idx_alerts_tripwire ON intel.alerts(tripwire_id);
CREATE INDEX idx_alerts_unack ON intel.alerts(acknowledged_at) WHERE acknowledged_at IS NULL;

-- Documents (RAG)
CREATE INDEX idx_documents_project ON rag.documents(project_id) WHERE deleted_at IS NULL;

-- Feed data (time-series)
CREATE INDEX idx_flight_geo ON feeds.flight_data USING GIST (
  point(longitude, latitude)
);
CREATE INDEX idx_maritime_geo ON feeds.maritime_data USING GIST (
  point(longitude, latitude)
);
```

---

## Files to Create (Additional)

| Path | Description |
|------|-------------|
| `apps/api/src/db/schema/organizations.ts` | Organizations and memberships |
| `apps/api/src/db/schema/feeds.ts` | Feed data tables |
| `apps/api/src/db/helpers/tenant.ts` | Multi-tenancy query helpers |
| `apps/api/src/jobs/data-retention.job.ts` | Data retention job |
| `apps/api/src/jobs/retention.queue.ts` | BullMQ queue for retention |
