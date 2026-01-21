# Phase 1a: Seed Data

## Overview

**Parent Document:** [01-DATA-LAYER.md](./01-DATA-LAYER.md)

This document provides comprehensive seed data for development and testing environments. Seed data enables developers to work with realistic data scenarios without manual entry and ensures consistent testing baselines.

**Tasks Covered:** 1.11 (Create seed data for development)

---

## Implementation Tasks

| Task ID | Task | Priority | Estimated Hours |
|---------|------|----------|-----------------|
| 1.11.1 | Create base seed infrastructure | High | 2 |
| 1.11.2 | Implement user and organization seeds | High | 2 |
| 1.11.3 | Implement project and situation seeds | High | 3 |
| 1.11.4 | Implement PMESII-PT factor seeds | Medium | 4 |
| 1.11.5 | Implement threat actor and assessment seeds | Medium | 3 |
| 1.11.6 | Implement PIR/NAI collection seeds | Medium | 2 |
| 1.11.7 | Implement indicator and tripwire seeds | Medium | 2 |
| 1.11.8 | Add environment-specific seed configurations | Low | 1 |

---

## 1. Seed Data Infrastructure

### 1.1 Base Seed File

**File:** `apps/api/src/db/seed.ts`

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from 'dotenv';
import * as schema from './schema';
import { seedUsers } from './seeds/users';
import { seedOrganizations } from './seeds/organizations';
import { seedProjects } from './seeds/projects';
import { seedPmesiiPtFactors } from './seeds/pmesii-pt';
import { seedThreatActors } from './seeds/threat-actors';
import { seedAssessments } from './seeds/assessments';
import { seedCollectionPlan } from './seeds/collection';
import { seedIndicators } from './seeds/indicators';

// Load environment variables
config({ path: '.env.local' });

interface SeedContext {
  db: ReturnType<typeof drizzle>;
  userIds: Record<string, string>;
  orgIds: Record<string, string>;
  projectIds: Record<string, string>;
  situationIds: Record<string, string>;
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool, { schema });

  console.log('🌱 Starting seed process...\n');

  const context: SeedContext = {
    db,
    userIds: {},
    orgIds: {},
    projectIds: {},
    situationIds: {},
  };

  try {
    // Seed in dependency order
    console.log('📦 Seeding users...');
    context.userIds = await seedUsers(db);
    console.log(`   ✓ Created ${Object.keys(context.userIds).length} users\n`);

    console.log('🏢 Seeding organizations...');
    context.orgIds = await seedOrganizations(db, context.userIds);
    console.log(`   ✓ Created ${Object.keys(context.orgIds).length} organizations\n`);

    console.log('📁 Seeding projects...');
    context.projectIds = await seedProjects(db, context);
    console.log(`   ✓ Created ${Object.keys(context.projectIds).length} projects\n`);

    console.log('🔍 Seeding PMESII-PT factors...');
    const factorCount = await seedPmesiiPtFactors(db, context);
    console.log(`   ✓ Created ${factorCount} PMESII-PT factors\n`);

    console.log('⚠️  Seeding threat actors...');
    const threatCount = await seedThreatActors(db, context);
    console.log(`   ✓ Created ${threatCount} threat actors\n`);

    console.log('📊 Seeding assessments...');
    const assessmentCount = await seedAssessments(db, context);
    console.log(`   ✓ Created ${assessmentCount} assessments\n`);

    console.log('🎯 Seeding collection plans (PIRs/NAIs)...');
    const collectionCount = await seedCollectionPlan(db, context);
    console.log(`   ✓ Created ${collectionCount} collection items\n`);

    console.log('🚨 Seeding indicators and tripwires...');
    const indicatorCount = await seedIndicators(db, context);
    console.log(`   ✓ Created ${indicatorCount} indicators\n`);

    console.log('✅ Seed process completed successfully!');
  } catch (error) {
    console.error('❌ Seed process failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

### 1.2 Seed Utilities

**File:** `apps/api/src/db/seeds/utils.ts`

```typescript
import { randomUUID } from 'crypto';

/**
 * Generate a deterministic UUID based on a seed string.
 * Useful for creating consistent IDs across seed runs.
 */
export function deterministicUUID(seed: string): string {
  // In production seeds, use actual UUIDs
  // This is just for demo purposes to have predictable IDs
  return randomUUID();
}

/**
 * Get a random item from an array
 */
export function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Get random items from an array
 */
export function randomItems<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Generate a date within a range
 */
export function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

/**
 * Generate a date relative to now
 */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Generate a future date
 */
export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
```

---

## 2. User and Organization Seeds

### 2.1 Demo Users

**File:** `apps/api/src/db/seeds/users.ts`

```typescript
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users } from '../schema';
import * as schema from '../schema';
import { hashPassword } from '../../lib/auth';

type DB = NodePgDatabase<typeof schema>;

export interface DemoUser {
  key: string;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'viewer';
  password: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    key: 'admin',
    email: 'admin@situation-monitor.dev',
    name: 'Sarah Chen',
    role: 'admin',
    password: 'admin123!',
  },
  {
    key: 'lead_analyst',
    email: 'analyst.lead@situation-monitor.dev',
    name: 'Marcus Rodriguez',
    role: 'analyst',
    password: 'analyst123!',
  },
  {
    key: 'analyst_1',
    email: 'analyst1@situation-monitor.dev',
    name: 'Emily Watson',
    role: 'analyst',
    password: 'analyst123!',
  },
  {
    key: 'analyst_2',
    email: 'analyst2@situation-monitor.dev',
    name: 'James Park',
    role: 'analyst',
    password: 'analyst123!',
  },
  {
    key: 'analyst_3',
    email: 'analyst3@situation-monitor.dev',
    name: 'Aisha Patel',
    role: 'analyst',
    password: 'analyst123!',
  },
  {
    key: 'viewer_1',
    email: 'viewer1@situation-monitor.dev',
    name: 'Robert Thompson',
    role: 'viewer',
    password: 'viewer123!',
  },
  {
    key: 'viewer_2',
    email: 'viewer2@situation-monitor.dev',
    name: 'Lisa Martinez',
    role: 'viewer',
    password: 'viewer123!',
  },
  {
    key: 'client_exec',
    email: 'executive@client-corp.example',
    name: 'Michael Brooks',
    role: 'viewer',
    password: 'client123!',
  },
];

export async function seedUsers(db: DB): Promise<Record<string, string>> {
  const userIds: Record<string, string> = {};

  for (const user of DEMO_USERS) {
    const hashedPassword = await hashPassword(user.password);

    const [created] = await db
      .insert(users)
      .values({
        email: user.email,
        name: user.name,
        passwordHash: hashedPassword,
        role: user.role,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: users.id });

    if (created) {
      userIds[user.key] = created.id;
    }
  }

  return userIds;
}
```

### 2.2 Demo Organizations

**File:** `apps/api/src/db/seeds/organizations.ts`

```typescript
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { organizations, organizationMembers } from '../schema';
import * as schema from '../schema';

type DB = NodePgDatabase<typeof schema>;

interface DemoOrganization {
  key: string;
  name: string;
  slug: string;
  description: string;
  tier: 'free' | 'professional' | 'enterprise';
  members: { userKey: string; role: 'owner' | 'admin' | 'member' }[];
}

const DEMO_ORGANIZATIONS: DemoOrganization[] = [
  {
    key: 'acme_intel',
    name: 'Acme Intelligence Group',
    slug: 'acme-intel',
    description: 'Strategic intelligence and risk consulting firm',
    tier: 'enterprise',
    members: [
      { userKey: 'admin', role: 'owner' },
      { userKey: 'lead_analyst', role: 'admin' },
      { userKey: 'analyst_1', role: 'member' },
      { userKey: 'analyst_2', role: 'member' },
      { userKey: 'analyst_3', role: 'member' },
      { userKey: 'viewer_1', role: 'member' },
    ],
  },
  {
    key: 'global_ventures',
    name: 'Global Ventures Capital',
    slug: 'global-ventures',
    description: 'VC firm specializing in emerging markets',
    tier: 'professional',
    members: [
      { userKey: 'viewer_2', role: 'owner' },
      { userKey: 'client_exec', role: 'admin' },
    ],
  },
  {
    key: 'personal_workspace',
    name: 'Personal Workspace',
    slug: 'personal',
    description: 'Individual analyst workspace',
    tier: 'free',
    members: [{ userKey: 'analyst_1', role: 'owner' }],
  },
];

export async function seedOrganizations(
  db: DB,
  userIds: Record<string, string>
): Promise<Record<string, string>> {
  const orgIds: Record<string, string> = {};

  for (const org of DEMO_ORGANIZATIONS) {
    const [created] = await db
      .insert(organizations)
      .values({
        name: org.name,
        slug: org.slug,
        description: org.description,
        tier: org.tier,
        settings: {
          maxProjects: org.tier === 'enterprise' ? -1 : org.tier === 'professional' ? 25 : 3,
          maxMembers: org.tier === 'enterprise' ? -1 : org.tier === 'professional' ? 10 : 1,
          features: {
            aiAssist: org.tier !== 'free',
            advancedExports: org.tier === 'enterprise',
            apiAccess: org.tier !== 'free',
            customBranding: org.tier === 'enterprise',
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: organizations.id });

    if (created) {
      orgIds[org.key] = created.id;

      // Add organization members
      for (const member of org.members) {
        const userId = userIds[member.userKey];
        if (userId) {
          await db
            .insert(organizationMembers)
            .values({
              organizationId: created.id,
              userId,
              role: member.role,
              joinedAt: new Date(),
            })
            .onConflictDoNothing();
        }
      }
    }
  }

  return orgIds;
}
```

---

## 3. Project and Situation Seeds

### 3.1 Demo Projects

**File:** `apps/api/src/db/seeds/projects.ts`

```typescript
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { projects, situations } from '../schema';
import * as schema from '../schema';
import { daysAgo, daysFromNow } from './utils';

type DB = NodePgDatabase<typeof schema>;

interface SeedContext {
  userIds: Record<string, string>;
  orgIds: Record<string, string>;
  projectIds: Record<string, string>;
  situationIds: Record<string, string>;
}

interface DemoProject {
  key: string;
  orgKey: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'draft';
  classification: 'unclassified' | 'internal' | 'confidential' | 'restricted';
  ownerKey: string;
  situations: DemoSituation[];
}

interface DemoSituation {
  key: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'monitoring' | 'closed';
  classification: string;
  startDate: Date;
  endDate?: Date;
}

const DEMO_PROJECTS: DemoProject[] = [
  {
    key: 'apac_expansion',
    orgKey: 'acme_intel',
    name: 'APAC Market Expansion Assessment',
    description: 'Comprehensive market entry analysis for Southeast Asian expansion',
    status: 'active',
    classification: 'confidential',
    ownerKey: 'lead_analyst',
    situations: [
      {
        key: 'vietnam_entry',
        name: 'Vietnam Market Entry',
        description: 'Assessment of Vietnam market conditions for Q2 2025 entry',
        status: 'active',
        classification: 'confidential',
        startDate: daysAgo(30),
        endDate: daysFromNow(90),
      },
      {
        key: 'thailand_entry',
        name: 'Thailand Market Assessment',
        description: 'Preliminary analysis of Thailand regulatory and competitive landscape',
        status: 'planning',
        classification: 'internal',
        startDate: daysFromNow(30),
        endDate: daysFromNow(180),
      },
      {
        key: 'indonesia_monitor',
        name: 'Indonesia Political Monitoring',
        description: 'Ongoing monitoring of Indonesian political developments affecting FDI',
        status: 'monitoring',
        classification: 'internal',
        startDate: daysAgo(180),
      },
    ],
  },
  {
    key: 'supply_chain_risk',
    orgKey: 'acme_intel',
    name: 'Global Supply Chain Risk Assessment',
    description: 'Analysis of supply chain vulnerabilities and contingency planning',
    status: 'active',
    classification: 'confidential',
    ownerKey: 'analyst_1',
    situations: [
      {
        key: 'semiconductor_shortage',
        name: 'Semiconductor Supply Analysis',
        description: 'Assessment of global semiconductor supply constraints and alternatives',
        status: 'active',
        classification: 'confidential',
        startDate: daysAgo(60),
        endDate: daysFromNow(30),
      },
      {
        key: 'shipping_disruption',
        name: 'Maritime Shipping Disruption',
        description: 'Analysis of Red Sea shipping route alternatives and cost impacts',
        status: 'active',
        classification: 'internal',
        startDate: daysAgo(45),
        endDate: daysFromNow(60),
      },
    ],
  },
  {
    key: 'competitor_intel',
    orgKey: 'acme_intel',
    name: 'Competitor Intelligence Program',
    description: 'Systematic competitive intelligence collection and analysis',
    status: 'active',
    classification: 'restricted',
    ownerKey: 'analyst_2',
    situations: [
      {
        key: 'competitor_a_watch',
        name: 'Competitor A Strategic Watch',
        description: 'Ongoing monitoring of Competitor A market moves and capabilities',
        status: 'monitoring',
        classification: 'restricted',
        startDate: daysAgo(365),
      },
      {
        key: 'market_consolidation',
        name: 'Market Consolidation Analysis',
        description: 'Assessment of potential M&A activity in the sector',
        status: 'active',
        classification: 'confidential',
        startDate: daysAgo(20),
        endDate: daysFromNow(40),
      },
    ],
  },
  {
    key: 'hnwi_security',
    orgKey: 'acme_intel',
    name: 'HNWI Personal Security Assessment',
    description: 'Personal security and travel risk assessment for high-net-worth client',
    status: 'active',
    classification: 'restricted',
    ownerKey: 'analyst_3',
    situations: [
      {
        key: 'travel_latam',
        name: 'Latin America Travel Assessment',
        description: 'Security assessment for planned travel to Brazil and Argentina',
        status: 'active',
        classification: 'restricted',
        startDate: daysAgo(14),
        endDate: daysFromNow(21),
      },
      {
        key: 'residence_security',
        name: 'Primary Residence Security Review',
        description: 'Comprehensive security assessment of primary residence',
        status: 'closed',
        classification: 'restricted',
        startDate: daysAgo(90),
        endDate: daysAgo(60),
      },
    ],
  },
  {
    key: 'portfolio_dd',
    orgKey: 'global_ventures',
    name: 'Portfolio Company Due Diligence',
    description: 'Due diligence assessments for potential portfolio investments',
    status: 'active',
    classification: 'confidential',
    ownerKey: 'client_exec',
    situations: [
      {
        key: 'fintech_dd',
        name: 'FinTech Startup DD - Series B',
        description: 'Due diligence for potential Series B investment in payment platform',
        status: 'active',
        classification: 'confidential',
        startDate: daysAgo(21),
        endDate: daysFromNow(14),
      },
      {
        key: 'healthtech_dd',
        name: 'HealthTech Platform Assessment',
        description: 'Market and regulatory assessment for healthcare AI startup',
        status: 'planning',
        classification: 'internal',
        startDate: daysFromNow(7),
        endDate: daysFromNow(45),
      },
    ],
  },
  {
    key: 'archived_project',
    orgKey: 'acme_intel',
    name: 'Q3 2024 Election Monitoring',
    description: 'Completed monitoring of Q3 2024 election cycles and impacts',
    status: 'archived',
    classification: 'internal',
    ownerKey: 'lead_analyst',
    situations: [
      {
        key: 'us_election_2024',
        name: 'US Presidential Election Analysis',
        description: 'Analysis of US election outcomes and policy implications',
        status: 'closed',
        classification: 'internal',
        startDate: daysAgo(180),
        endDate: daysAgo(60),
      },
    ],
  },
];

export async function seedProjects(
  db: DB,
  context: SeedContext
): Promise<Record<string, string>> {
  const projectIds: Record<string, string> = {};
  const situationIds: Record<string, string> = {};

  for (const project of DEMO_PROJECTS) {
    const orgId = context.orgIds[project.orgKey];
    const ownerId = context.userIds[project.ownerKey];

    if (!orgId || !ownerId) continue;

    const [createdProject] = await db
      .insert(projects)
      .values({
        organizationId: orgId,
        name: project.name,
        description: project.description,
        status: project.status,
        classification: project.classification,
        ownerId,
        settings: {
          defaultView: 'dashboard',
          notifications: true,
          autoArchiveDays: 90,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: projects.id });

    if (createdProject) {
      projectIds[project.key] = createdProject.id;

      // Create situations for this project
      for (const situation of project.situations) {
        const [createdSituation] = await db
          .insert(situations)
          .values({
            projectId: createdProject.id,
            name: situation.name,
            description: situation.description,
            status: situation.status,
            classification: situation.classification,
            startDate: situation.startDate,
            endDate: situation.endDate,
            createdById: ownerId,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoNothing()
          .returning({ id: situations.id });

        if (createdSituation) {
          situationIds[situation.key] = createdSituation.id;
        }
      }
    }
  }

  // Update context with situation IDs
  context.situationIds = situationIds;

  return projectIds;
}
```

---

## 4. PMESII-PT Factor Seeds

### 4.1 Domain-Specific Factors

**File:** `apps/api/src/db/seeds/pmesii-pt.ts`

```typescript
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { pmesiiPtFactors } from '../schema';
import * as schema from '../schema';
import { daysAgo } from './utils';

type DB = NodePgDatabase<typeof schema>;

interface SeedContext {
  userIds: Record<string, string>;
  situationIds: Record<string, string>;
}

type PmesiiDomain =
  | 'political'
  | 'military'
  | 'economic'
  | 'social'
  | 'information'
  | 'infrastructure'
  | 'physical_environment'
  | 'time';

interface DemoFactor {
  situationKey: string;
  domain: PmesiiDomain;
  title: string;
  description: string;
  assessment: string;
  impact: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
  tags: string[];
}

const VIETNAM_FACTORS: DemoFactor[] = [
  // Political factors
  {
    situationKey: 'vietnam_entry',
    domain: 'political',
    title: 'Government FDI Policy',
    description: 'Vietnamese government actively encouraging foreign direct investment with incentive packages',
    assessment: 'Strong policy support for foreign investment, especially in technology and manufacturing sectors. Recent reforms have streamlined business registration processes.',
    impact: 'positive',
    confidence: 'high',
    sources: ['Ministry of Planning and Investment', 'World Bank Vietnam Report 2024'],
    tags: ['fdi', 'policy', 'incentives'],
  },
  {
    situationKey: 'vietnam_entry',
    domain: 'political',
    title: 'Regulatory Complexity',
    description: 'Complex regulatory environment with multiple approval layers',
    assessment: 'While improving, regulatory processes remain bureaucratic. Average business license approval takes 45-60 days. Local partnerships strongly recommended.',
    impact: 'negative',
    confidence: 'medium',
    sources: ['AmCham Vietnam', 'Local legal counsel interviews'],
    tags: ['regulation', 'compliance', 'bureaucracy'],
  },
  {
    situationKey: 'vietnam_entry',
    domain: 'political',
    title: 'US-Vietnam Relations',
    description: 'Upgraded bilateral relationship creating favorable conditions',
    assessment: 'Elevation to Comprehensive Strategic Partnership in 2023 signals strong bilateral ties. Creates favorable environment for US-linked investments.',
    impact: 'positive',
    confidence: 'high',
    sources: ['State Department', 'Embassy Hanoi briefings'],
    tags: ['bilateral', 'diplomatic', 'partnership'],
  },

  // Economic factors
  {
    situationKey: 'vietnam_entry',
    domain: 'economic',
    title: 'GDP Growth Trajectory',
    description: 'Sustained high GDP growth rate above regional average',
    assessment: 'Vietnam maintaining 6-7% annual GDP growth. Consumer spending rising with growing middle class. Currency relatively stable.',
    impact: 'positive',
    confidence: 'high',
    sources: ['IMF Economic Outlook', 'General Statistics Office Vietnam'],
    tags: ['gdp', 'growth', 'macro'],
  },
  {
    situationKey: 'vietnam_entry',
    domain: 'economic',
    title: 'Labor Cost Competitiveness',
    description: 'Competitive labor costs compared to China and Thailand',
    assessment: 'Average manufacturing wages 30-40% lower than coastal China. Skilled workforce availability improving but gaps remain in technical roles.',
    impact: 'positive',
    confidence: 'medium',
    sources: ['JETRO Survey', 'Industry HR consultants'],
    tags: ['labor', 'costs', 'workforce'],
  },
  {
    situationKey: 'vietnam_entry',
    domain: 'economic',
    title: 'Currency Risk',
    description: 'VND management and exchange rate considerations',
    assessment: 'Central bank maintains managed float. Recent depreciation pressure but reserves adequate. Recommend hedging strategy for significant VND exposure.',
    impact: 'mixed',
    confidence: 'medium',
    sources: ['State Bank of Vietnam', 'Financial analyst reports'],
    tags: ['currency', 'forex', 'risk'],
  },

  // Social factors
  {
    situationKey: 'vietnam_entry',
    domain: 'social',
    title: 'Demographic Dividend',
    description: 'Young, educated population entering workforce',
    assessment: 'Median age 31. Strong emphasis on education. English proficiency improving in urban areas. High smartphone penetration (>70%).',
    impact: 'positive',
    confidence: 'high',
    sources: ['UN Population Division', 'Vietnam Education Report'],
    tags: ['demographics', 'workforce', 'education'],
  },
  {
    situationKey: 'vietnam_entry',
    domain: 'social',
    title: 'Consumer Behavior Shift',
    description: 'Rising middle class changing consumption patterns',
    assessment: 'Growing appetite for premium products and services. E-commerce adoption accelerating. Brand consciousness increasing among urban consumers.',
    impact: 'positive',
    confidence: 'medium',
    sources: ['Nielsen Vietnam', 'McKinsey Consumer Report'],
    tags: ['consumer', 'middle-class', 'retail'],
  },

  // Information factors
  {
    situationKey: 'vietnam_entry',
    domain: 'information',
    title: 'Digital Ecosystem',
    description: 'Rapidly developing digital infrastructure and adoption',
    assessment: 'High mobile internet penetration. Active social media landscape (Facebook, Zalo dominant). Digital payment adoption accelerating.',
    impact: 'positive',
    confidence: 'high',
    sources: ['Google-Temasek-Bain e-Conomy Report', 'We Are Social Digital Report'],
    tags: ['digital', 'mobile', 'social-media'],
  },
  {
    situationKey: 'vietnam_entry',
    domain: 'information',
    title: 'Media Environment',
    description: 'State-controlled media with active social media discourse',
    assessment: 'Traditional media state-controlled. Social media relatively open but subject to content regulations. Reputation management requires local expertise.',
    impact: 'neutral',
    confidence: 'medium',
    sources: ['Freedom House', 'Local media analysis'],
    tags: ['media', 'censorship', 'social-media'],
  },

  // Infrastructure factors
  {
    situationKey: 'vietnam_entry',
    domain: 'infrastructure',
    title: 'Industrial Park Availability',
    description: 'Expanding industrial zone capacity with modern facilities',
    assessment: 'Major industrial parks in Binh Duong, Long An, Hai Phong expanding. Occupancy rates high in prime locations. Early engagement recommended.',
    impact: 'positive',
    confidence: 'high',
    sources: ['CBRE Vietnam Industrial Report', 'Site visits'],
    tags: ['industrial', 'real-estate', 'manufacturing'],
  },
  {
    situationKey: 'vietnam_entry',
    domain: 'infrastructure',
    title: 'Logistics Challenges',
    description: 'Transportation infrastructure improving but gaps remain',
    assessment: 'Port capacity expanding (Cai Mep, Hai Phong). Road network improving. Logistics costs remain higher than regional competitors.',
    impact: 'mixed',
    confidence: 'medium',
    sources: ['World Bank Logistics Performance Index', 'Industry interviews'],
    tags: ['logistics', 'transport', 'ports'],
  },
  {
    situationKey: 'vietnam_entry',
    domain: 'infrastructure',
    title: 'Power Supply Reliability',
    description: 'Energy infrastructure under pressure from demand growth',
    assessment: 'Occasional power shortages in industrial zones during peak demand. Backup power systems recommended. Renewable energy push underway.',
    impact: 'negative',
    confidence: 'medium',
    sources: ['EVN reports', 'Industry feedback'],
    tags: ['energy', 'power', 'utilities'],
  },

  // Physical Environment
  {
    situationKey: 'vietnam_entry',
    domain: 'physical_environment',
    title: 'Climate Risk',
    description: 'Typhoon and flooding exposure in key regions',
    assessment: 'Central and northern regions face typhoon risk (Jun-Nov). Mekong Delta flooding concerns. Climate adaptation planning required for facilities.',
    impact: 'negative',
    confidence: 'high',
    sources: ['Vietnam Disaster Management Authority', 'Climate risk assessments'],
    tags: ['climate', 'disaster', 'risk'],
  },

  // Time factors
  {
    situationKey: 'vietnam_entry',
    domain: 'time',
    title: 'Market Entry Window',
    description: 'Optimal timing considerations for market entry',
    assessment: 'Current window favorable with FDI incentives and competitor positioning. Q2 entry aligns with fiscal year and avoids Tet disruption. 6-month establishment timeline realistic.',
    impact: 'positive',
    confidence: 'medium',
    sources: ['Internal analysis', 'Market timing models'],
    tags: ['timing', 'entry', 'planning'],
  },
];

const SEMICONDUCTOR_FACTORS: DemoFactor[] = [
  {
    situationKey: 'semiconductor_shortage',
    domain: 'economic',
    title: 'Global Chip Demand Dynamics',
    description: 'AI boom driving unprecedented demand for advanced semiconductors',
    assessment: 'AI-related chip demand surging 40% YoY. Automotive and IoT demand stabilizing. Mature node capacity additions coming online 2025.',
    impact: 'mixed',
    confidence: 'high',
    sources: ['Gartner Semiconductor Forecast', 'SEMI World Fab Report'],
    tags: ['chips', 'demand', 'ai'],
  },
  {
    situationKey: 'semiconductor_shortage',
    domain: 'political',
    title: 'Export Control Impacts',
    description: 'US-China technology restrictions reshaping supply chains',
    assessment: 'Export controls limiting advanced chip access for certain markets. Supply chain restructuring underway. Dual supply chain costs increasing.',
    impact: 'negative',
    confidence: 'high',
    sources: ['BIS regulations', 'Industry analysis'],
    tags: ['export-controls', 'geopolitics', 'china'],
  },
  {
    situationKey: 'semiconductor_shortage',
    domain: 'infrastructure',
    title: 'Fab Capacity Expansion',
    description: 'New fabrication facilities under construction globally',
    assessment: 'TSMC Arizona, Samsung Taylor, Intel Ohio all progressing. First production 2025-2026. Will ease trailing-edge constraints.',
    impact: 'positive',
    confidence: 'medium',
    sources: ['Company announcements', 'SEMI reports'],
    tags: ['manufacturing', 'capacity', 'expansion'],
  },
];

const SHIPPING_FACTORS: DemoFactor[] = [
  {
    situationKey: 'shipping_disruption',
    domain: 'military',
    title: 'Red Sea Security Situation',
    description: 'Houthi attacks disrupting major shipping lane',
    assessment: 'Attacks continuing despite military response. Major carriers rerouting via Cape of Good Hope. 10-14 day transit time addition.',
    impact: 'negative',
    confidence: 'high',
    sources: ['CENTCOM reports', 'Shipping industry alerts'],
    tags: ['security', 'shipping', 'conflict'],
  },
  {
    situationKey: 'shipping_disruption',
    domain: 'economic',
    title: 'Freight Cost Impact',
    description: 'Container shipping rates elevated due to diversions',
    assessment: 'Asia-Europe rates up 200-300% from baseline. Insurance premiums for Red Sea transit prohibitive. Long-term contracts being renegotiated.',
    impact: 'negative',
    confidence: 'high',
    sources: ['Freightos Baltic Index', 'Industry interviews'],
    tags: ['costs', 'freight', 'rates'],
  },
  {
    situationKey: 'shipping_disruption',
    domain: 'time',
    title: 'Disruption Timeline',
    description: 'Expected duration of shipping route disruptions',
    assessment: 'No near-term resolution expected. Planning assumption: disruption through Q3 2025 minimum. Contingency planning for extended scenario advised.',
    impact: 'negative',
    confidence: 'low',
    sources: ['Intelligence assessments', 'Industry forecasts'],
    tags: ['timeline', 'forecast', 'planning'],
  },
];

const ALL_FACTORS = [...VIETNAM_FACTORS, ...SEMICONDUCTOR_FACTORS, ...SHIPPING_FACTORS];

export async function seedPmesiiPtFactors(
  db: DB,
  context: SeedContext
): Promise<number> {
  let count = 0;

  for (const factor of ALL_FACTORS) {
    const situationId = context.situationIds[factor.situationKey];
    const createdById = context.userIds['lead_analyst'] || context.userIds['analyst_1'];

    if (!situationId || !createdById) continue;

    await db
      .insert(pmesiiPtFactors)
      .values({
        situationId,
        domain: factor.domain,
        title: factor.title,
        description: factor.description,
        assessment: factor.assessment,
        impact: factor.impact,
        confidence: factor.confidence,
        sources: factor.sources,
        tags: factor.tags,
        createdById,
        lastReviewedAt: daysAgo(Math.floor(Math.random() * 14)),
        createdAt: daysAgo(Math.floor(Math.random() * 30) + 7),
        updatedAt: daysAgo(Math.floor(Math.random() * 7)),
      })
      .onConflictDoNothing();

    count++;
  }

  return count;
}
```

---

## 5. Threat Actor and Assessment Seeds

### 5.1 Threat Actors

**File:** `apps/api/src/db/seeds/threat-actors.ts`

```typescript
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { threatActors } from '../schema';
import * as schema from '../schema';
import { daysAgo } from './utils';

type DB = NodePgDatabase<typeof schema>;

interface SeedContext {
  userIds: Record<string, string>;
  orgIds: Record<string, string>;
}

interface DemoThreatActor {
  orgKey: string;
  name: string;
  type: 'state' | 'non_state' | 'criminal' | 'insider' | 'competitor' | 'other';
  description: string;
  capabilities: string[];
  intentions: string[];
  indicators: string[];
  status: 'active' | 'dormant' | 'unknown';
  tags: string[];
}

const DEMO_THREAT_ACTORS: DemoThreatActor[] = [
  {
    orgKey: 'acme_intel',
    name: 'APT-PHANTOM',
    type: 'state',
    description: 'State-sponsored threat actor targeting technology and defense sectors',
    capabilities: [
      'Advanced persistent access tools',
      'Zero-day exploitation capability',
      'Supply chain compromise',
      'Social engineering operations',
    ],
    intentions: [
      'Intellectual property theft',
      'Strategic intelligence collection',
      'Technology transfer',
    ],
    indicators: [
      'Use of specific C2 infrastructure patterns',
      'Characteristic lateral movement techniques',
      'Targeting of specific executive roles',
    ],
    status: 'active',
    tags: ['apt', 'state-sponsored', 'cyber', 'ip-theft'],
  },
  {
    orgKey: 'acme_intel',
    name: 'Competitor Alpha',
    type: 'competitor',
    description: 'Primary market competitor with aggressive intelligence collection posture',
    capabilities: [
      'Competitive intelligence program',
      'Recruiting from target companies',
      'Trade show intelligence collection',
      'Patent monitoring and filing',
    ],
    intentions: [
      'Market share capture',
      'Product roadmap intelligence',
      'Key personnel recruitment',
      'Price undercutting strategies',
    ],
    indicators: [
      'Increased patent filings in overlapping areas',
      'Recruitment targeting specific teams',
      'Presence at key industry events',
      'Unusual vendor inquiries',
    ],
    status: 'active',
    tags: ['competitor', 'market', 'intelligence'],
  },
  {
    orgKey: 'acme_intel',
    name: 'Regional Criminal Network',
    type: 'criminal',
    description: 'Organized criminal group operating in Southeast Asian region',
    capabilities: [
      'Corruption of local officials',
      'Physical security compromise',
      'Cyber fraud and scams',
      'Supply chain theft',
    ],
    intentions: [
      'Financial gain through theft',
      'Extortion and protection rackets',
      'Counterfeit goods distribution',
    ],
    indicators: [
      'Unusual approaches from "facilitators"',
      'Increased petty theft incidents',
      'Reports of counterfeits in market',
    ],
    status: 'active',
    tags: ['criminal', 'regional', 'fraud'],
  },
  {
    orgKey: 'acme_intel',
    name: 'Disgruntled Insider Profile',
    type: 'insider',
    description: 'Generic profile of insider threat indicators and behaviors',
    capabilities: [
      'Authorized access to sensitive systems',
      'Knowledge of security procedures',
      'Trusted position for data exfiltration',
      'Physical access to facilities',
    ],
    intentions: [
      'Financial gain from data sale',
      'Revenge for perceived grievances',
      'Ideological motivations',
      'Coercion by external actors',
    ],
    indicators: [
      'Unusual after-hours access patterns',
      'Large data transfers or downloads',
      'Expressed dissatisfaction with management',
      'Financial difficulties',
      'Contact with competitors',
    ],
    status: 'active',
    tags: ['insider', 'profile', 'behavioral'],
  },
  {
    orgKey: 'global_ventures',
    name: 'Due Diligence Fraud Actor',
    type: 'other',
    description: 'Companies presenting fraudulent information during investment due diligence',
    capabilities: [
      'Sophisticated financial statement manipulation',
      'Fake customer references',
      'Inflated metrics and KPIs',
      'Hidden related party transactions',
    ],
    intentions: [
      'Secure investment at inflated valuation',
      'Hide operational problems',
      'Obscure founder misconduct',
    ],
    indicators: [
      'Reluctance to provide primary source verification',
      'Inconsistencies between data sources',
      'Unusual auditor changes',
      'Key employee departures',
    ],
    status: 'active',
    tags: ['fraud', 'due-diligence', 'investment'],
  },
];

export async function seedThreatActors(
  db: DB,
  context: SeedContext
): Promise<number> {
  let count = 0;

  for (const actor of DEMO_THREAT_ACTORS) {
    const orgId = context.orgIds[actor.orgKey];
    const createdById = context.userIds['analyst_2'] || context.userIds['lead_analyst'];

    if (!orgId || !createdById) continue;

    await db
      .insert(threatActors)
      .values({
        organizationId: orgId,
        name: actor.name,
        type: actor.type,
        description: actor.description,
        capabilities: actor.capabilities,
        intentions: actor.intentions,
        indicators: actor.indicators,
        status: actor.status,
        tags: actor.tags,
        createdById,
        lastAssessedAt: daysAgo(Math.floor(Math.random() * 30)),
        createdAt: daysAgo(Math.floor(Math.random() * 180) + 30),
        updatedAt: daysAgo(Math.floor(Math.random() * 14)),
      })
      .onConflictDoNothing();

    count++;
  }

  return count;
}
```

### 5.2 Threat Assessments

**File:** `apps/api/src/db/seeds/assessments.ts`

```typescript
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { threatAssessments, threatAssessmentItems } from '../schema';
import * as schema from '../schema';
import { daysAgo } from './utils';

type DB = NodePgDatabase<typeof schema>;

interface SeedContext {
  userIds: Record<string, string>;
  situationIds: Record<string, string>;
}

interface DemoAssessmentItem {
  threat: string;
  description: string;
  probability: number; // 1-5
  impact: number; // 1-5
  category: string;
  mitigations: string[];
}

interface DemoAssessment {
  situationKey: string;
  name: string;
  description: string;
  methodology: string;
  items: DemoAssessmentItem[];
}

const DEMO_ASSESSMENTS: DemoAssessment[] = [
  {
    situationKey: 'vietnam_entry',
    name: 'Vietnam Market Entry Risk Matrix',
    description: 'Comprehensive risk assessment for Vietnam market entry initiative',
    methodology: 'probability_impact_5x5',
    items: [
      {
        threat: 'Regulatory Approval Delay',
        description: 'Business license or investment certificate approval exceeds planned timeline',
        probability: 4,
        impact: 3,
        category: 'regulatory',
        mitigations: [
          'Engage experienced local legal counsel',
          'Pre-consultation with investment authorities',
          'Build 90-day buffer into timeline',
        ],
      },
      {
        threat: 'IP Protection Weakness',
        description: 'Intellectual property theft or inadequate legal protection',
        probability: 3,
        impact: 4,
        category: 'legal',
        mitigations: [
          'Register IP proactively in Vietnam',
          'Implement technical protection measures',
          'Careful partner selection and NDAs',
        ],
      },
      {
        threat: 'Key Personnel Retention',
        description: 'Difficulty retaining trained local staff in competitive market',
        probability: 4,
        impact: 3,
        category: 'operational',
        mitigations: [
          'Competitive compensation packages',
          'Career development programs',
          'Cross-training to reduce key person risk',
        ],
      },
      {
        threat: 'Currency Depreciation',
        description: 'Significant VND depreciation affecting profitability',
        probability: 2,
        impact: 3,
        category: 'financial',
        mitigations: [
          'Natural hedge through local revenue',
          'Currency hedging instruments',
          'USD-denominated contracts where possible',
        ],
      },
      {
        threat: 'Infrastructure Failure',
        description: 'Power outages or logistics disruptions affecting operations',
        probability: 3,
        impact: 3,
        category: 'operational',
        mitigations: [
          'Backup power generation',
          'Multiple logistics providers',
          'Business continuity planning',
        ],
      },
      {
        threat: 'Corruption/Bribery Exposure',
        description: 'Exposure to corrupt practices damaging reputation or legal standing',
        probability: 3,
        impact: 5,
        category: 'compliance',
        mitigations: [
          'Robust FCPA/anti-bribery training',
          'Third-party due diligence program',
          'Clear escalation procedures',
        ],
      },
    ],
  },
  {
    situationKey: 'travel_latam',
    name: 'Latin America Travel Security Assessment',
    description: 'Personal security risk assessment for executive travel',
    methodology: 'probability_impact_5x5',
    items: [
      {
        threat: 'Express Kidnapping',
        description: 'Short-term abduction for immediate ransom or ATM withdrawals',
        probability: 2,
        impact: 5,
        category: 'physical',
        mitigations: [
          'Secure transportation arrangements',
          'Low-profile travel practices',
          'Duress protocols and check-in procedures',
        ],
      },
      {
        threat: 'Street Crime',
        description: 'Robbery, mugging, or theft targeting foreign visitors',
        probability: 4,
        impact: 2,
        category: 'physical',
        mitigations: [
          'Avoid high-risk areas and times',
          'Minimal visible valuables',
          'Decoy wallet and phone',
        ],
      },
      {
        threat: 'Civil Unrest',
        description: 'Protests or demonstrations affecting travel or meetings',
        probability: 3,
        impact: 3,
        category: 'political',
        mitigations: [
          'Real-time monitoring of local events',
          'Flexible itinerary planning',
          'Alternative venue arrangements',
        ],
      },
      {
        threat: 'Medical Emergency',
        description: 'Serious illness or injury requiring evacuation',
        probability: 1,
        impact: 4,
        category: 'health',
        mitigations: [
          'Comprehensive travel insurance with evacuation',
          'Pre-identified quality medical facilities',
          'Travel health kit and medications',
        ],
      },
      {
        threat: 'Digital Security Compromise',
        description: 'Device theft, network interception, or account compromise',
        probability: 3,
        impact: 4,
        category: 'cyber',
        mitigations: [
          'Travel devices with minimal data',
          'VPN for all connections',
          'Multi-factor authentication',
        ],
      },
    ],
  },
  {
    situationKey: 'fintech_dd',
    name: 'FinTech Investment Risk Assessment',
    description: 'Due diligence risk matrix for Series B investment decision',
    methodology: 'probability_impact_5x5',
    items: [
      {
        threat: 'Regulatory Change',
        description: 'Changes in financial services regulations affecting business model',
        probability: 3,
        impact: 4,
        category: 'regulatory',
        mitigations: [
          'Regulatory flexibility assessment',
          'Multi-jurisdiction strategy',
          'Compliance buffer in valuation',
        ],
      },
      {
        threat: 'Founder Risk',
        description: 'Key founder departure or misconduct',
        probability: 2,
        impact: 5,
        category: 'governance',
        mitigations: [
          'Founder background checks',
          'Vesting and lockup provisions',
          'Management depth assessment',
        ],
      },
      {
        threat: 'Technology Scalability',
        description: 'Platform unable to scale with growth projections',
        probability: 2,
        impact: 4,
        category: 'technical',
        mitigations: [
          'Technical due diligence',
          'Architecture review',
          'Performance milestone requirements',
        ],
      },
      {
        threat: 'Market Timing',
        description: 'Market conditions deteriorate before exit opportunity',
        probability: 3,
        impact: 3,
        category: 'market',
        mitigations: [
          'Multiple exit pathway analysis',
          'Diversified investor base',
          'Reasonable entry valuation',
        ],
      },
      {
        threat: 'Competitive Disruption',
        description: 'Well-funded competitor capturing market position',
        probability: 3,
        impact: 4,
        category: 'competitive',
        mitigations: [
          'Competitive moat assessment',
          'Differentiation validation',
          'Network effect analysis',
        ],
      },
    ],
  },
];

export async function seedAssessments(
  db: DB,
  context: SeedContext
): Promise<number> {
  let count = 0;

  for (const assessment of DEMO_ASSESSMENTS) {
    const situationId = context.situationIds[assessment.situationKey];
    const createdById = context.userIds['lead_analyst'] || context.userIds['analyst_1'];

    if (!situationId || !createdById) continue;

    const [createdAssessment] = await db
      .insert(threatAssessments)
      .values({
        situationId,
        name: assessment.name,
        description: assessment.description,
        methodology: assessment.methodology,
        status: 'active',
        createdById,
        createdAt: daysAgo(Math.floor(Math.random() * 30) + 7),
        updatedAt: daysAgo(Math.floor(Math.random() * 7)),
      })
      .onConflictDoNothing()
      .returning({ id: threatAssessments.id });

    if (createdAssessment) {
      count++;

      for (const item of assessment.items) {
        await db
          .insert(threatAssessmentItems)
          .values({
            assessmentId: createdAssessment.id,
            threat: item.threat,
            description: item.description,
            probability: item.probability,
            impact: item.impact,
            riskScore: item.probability * item.impact,
            category: item.category,
            mitigations: item.mitigations,
            status: 'identified',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoNothing();
      }
    }
  }

  return count;
}
```

---

## 6. Collection Plan Seeds (PIRs/NAIs)

### 6.1 Intelligence Collection

**File:** `apps/api/src/db/seeds/collection.ts`

```typescript
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { priorityIntelligenceRequirements, namedAreasOfInterest, collectionTasks } from '../schema';
import * as schema from '../schema';
import { daysAgo, daysFromNow } from './utils';

type DB = NodePgDatabase<typeof schema>;

interface SeedContext {
  userIds: Record<string, string>;
  situationIds: Record<string, string>;
}

interface DemoPIR {
  situationKey: string;
  question: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'partially_answered' | 'answered' | 'overtaken';
  context: string;
  indicators: string[];
  deadline?: Date;
}

interface DemoNAI {
  situationKey: string;
  name: string;
  type: 'geographic' | 'topical' | 'organizational' | 'temporal';
  description: string;
  boundaries: Record<string, unknown>;
  keywords: string[];
  status: 'active' | 'inactive';
}

const DEMO_PIRS: DemoPIR[] = [
  // Vietnam entry PIRs
  {
    situationKey: 'vietnam_entry',
    question: 'What are the key decision points and timeline for investment certificate approval in targeted provinces?',
    priority: 'critical',
    status: 'open',
    context: 'Understanding the approval process is critical for timeline planning and resource allocation',
    indicators: [
      'Official processing time announcements',
      'Recent approval case studies',
      'Provincial investment promotion updates',
    ],
    deadline: daysFromNow(30),
  },
  {
    situationKey: 'vietnam_entry',
    question: 'Which local partners have successfully facilitated foreign market entries in our sector?',
    priority: 'high',
    status: 'partially_answered',
    context: 'Local partnerships significantly impact success rate and speed of market entry',
    indicators: [
      'Partner track record with foreign companies',
      'Government relationship strength',
      'Industry reputation assessment',
    ],
    deadline: daysFromNow(45),
  },
  {
    situationKey: 'vietnam_entry',
    question: 'What labor market conditions exist for technical talent in target locations?',
    priority: 'high',
    status: 'open',
    context: 'Workforce availability directly impacts operational planning and location selection',
    indicators: [
      'University graduate statistics',
      'Salary survey data',
      'Competitor hiring activity',
    ],
  },
  {
    situationKey: 'vietnam_entry',
    question: 'Are there pending regulatory changes that could impact our business model?',
    priority: 'medium',
    status: 'open',
    context: 'Regulatory changes could require business model adjustments',
    indicators: [
      'Draft legislation tracking',
      'Ministry consultation documents',
      'Industry association feedback',
    ],
  },

  // Semiconductor shortage PIRs
  {
    situationKey: 'semiconductor_shortage',
    question: 'When will fab capacity additions meaningfully impact supply for our component requirements?',
    priority: 'critical',
    status: 'partially_answered',
    context: 'Production planning requires visibility into supply normalization timeline',
    indicators: [
      'Fab construction progress reports',
      'Equipment lead time data',
      'Supplier capacity announcements',
    ],
    deadline: daysFromNow(14),
  },
  {
    situationKey: 'semiconductor_shortage',
    question: 'What alternative suppliers can meet our specifications if primary sources remain constrained?',
    priority: 'high',
    status: 'open',
    context: 'Supply chain resilience requires qualified alternative sources',
    indicators: [
      'Supplier qualification status',
      'Sample availability',
      'Price competitiveness',
    ],
  },

  // Travel assessment PIRs
  {
    situationKey: 'travel_latam',
    question: 'What is the current threat level for executive kidnapping in target cities?',
    priority: 'critical',
    status: 'answered',
    context: 'Fundamental go/no-go decision factor for travel approval',
    indicators: [
      'Recent incident reports',
      'Law enforcement assessments',
      'Insurance risk ratings',
    ],
  },
  {
    situationKey: 'travel_latam',
    question: 'Are there planned protests or civil unrest events during the travel window?',
    priority: 'high',
    status: 'open',
    context: 'Civil unrest could disrupt meetings and pose safety risks',
    indicators: [
      'Social media monitoring',
      'Labor union announcements',
      'Political event calendar',
    ],
    deadline: daysFromNow(7),
  },
];

const DEMO_NAIS: DemoNAI[] = [
  // Vietnam entry NAIs
  {
    situationKey: 'vietnam_entry',
    name: 'Ho Chi Minh City Business District',
    type: 'geographic',
    description: 'Primary business hub and potential headquarters location',
    boundaries: {
      type: 'geographic',
      region: 'Ho Chi Minh City',
      districts: ['District 1', 'District 3', 'Thu Duc City'],
    },
    keywords: ['hcmc', 'saigon', 'district 1', 'phu my hung'],
    status: 'active',
  },
  {
    situationKey: 'vietnam_entry',
    name: 'Vietnam FDI Policy',
    type: 'topical',
    description: 'Foreign direct investment regulations and incentives',
    boundaries: {
      type: 'topical',
      topics: ['investment law', 'fdi incentives', 'special economic zones', 'tax holidays'],
    },
    keywords: ['fdi', 'investment certificate', 'enterprise law', 'incentives'],
    status: 'active',
  },
  {
    situationKey: 'vietnam_entry',
    name: 'Ministry of Planning and Investment',
    type: 'organizational',
    description: 'Key government body for investment approvals',
    boundaries: {
      type: 'organizational',
      organization: 'Ministry of Planning and Investment',
      subunits: ['Foreign Investment Agency', 'Provincial DPIs'],
    },
    keywords: ['mpi', 'dpi', 'investment registration'],
    status: 'active',
  },
  {
    situationKey: 'vietnam_entry',
    name: 'Q2 2025 Entry Window',
    type: 'temporal',
    description: 'Target timeline for market entry execution',
    boundaries: {
      type: 'temporal',
      startDate: '2025-04-01',
      endDate: '2025-06-30',
      milestones: ['entity registration', 'office setup', 'initial hiring'],
    },
    keywords: ['q2 2025', 'april', 'may', 'june'],
    status: 'active',
  },

  // Semiconductor NAIs
  {
    situationKey: 'semiconductor_shortage',
    name: 'Taiwan Semiconductor Ecosystem',
    type: 'geographic',
    description: 'Primary semiconductor manufacturing region',
    boundaries: {
      type: 'geographic',
      region: 'Taiwan',
      focus: ['Hsinchu Science Park', 'Tainan Science Park'],
    },
    keywords: ['tsmc', 'umc', 'taiwan', 'hsinchu'],
    status: 'active',
  },
  {
    situationKey: 'semiconductor_shortage',
    name: 'Automotive Chip Supply',
    type: 'topical',
    description: 'Automotive-grade semiconductor supply dynamics',
    boundaries: {
      type: 'topical',
      topics: ['automotive mcu', 'power semiconductors', 'adas chips'],
    },
    keywords: ['automotive', 'mcu', 'aec-q100', 'infineon', 'nxp'],
    status: 'active',
  },

  // FinTech DD NAIs
  {
    situationKey: 'fintech_dd',
    name: 'Target Company Ecosystem',
    type: 'organizational',
    description: 'Target company and its key relationships',
    boundaries: {
      type: 'organizational',
      primaryTarget: 'Target FinTech Co',
      relationships: ['investors', 'partners', 'key customers', 'competitors'],
    },
    keywords: ['target company', 'founders', 'board', 'investors'],
    status: 'active',
  },
  {
    situationKey: 'fintech_dd',
    name: 'Payment Regulatory Landscape',
    type: 'topical',
    description: 'Regulatory environment for payment services',
    boundaries: {
      type: 'topical',
      topics: ['money transmission', 'payment licensing', 'psd2', 'open banking'],
    },
    keywords: ['mtl', 'payment license', 'regulator', 'compliance'],
    status: 'active',
  },
];

export async function seedCollectionPlan(
  db: DB,
  context: SeedContext
): Promise<number> {
  let count = 0;

  // Seed PIRs
  for (const pir of DEMO_PIRS) {
    const situationId = context.situationIds[pir.situationKey];
    const createdById = context.userIds['lead_analyst'] || context.userIds['analyst_1'];

    if (!situationId || !createdById) continue;

    await db
      .insert(priorityIntelligenceRequirements)
      .values({
        situationId,
        question: pir.question,
        priority: pir.priority,
        status: pir.status,
        context: pir.context,
        indicators: pir.indicators,
        deadline: pir.deadline,
        createdById,
        createdAt: daysAgo(Math.floor(Math.random() * 21) + 7),
        updatedAt: daysAgo(Math.floor(Math.random() * 7)),
      })
      .onConflictDoNothing();

    count++;
  }

  // Seed NAIs
  for (const nai of DEMO_NAIS) {
    const situationId = context.situationIds[nai.situationKey];
    const createdById = context.userIds['analyst_1'] || context.userIds['lead_analyst'];

    if (!situationId || !createdById) continue;

    await db
      .insert(namedAreasOfInterest)
      .values({
        situationId,
        name: nai.name,
        type: nai.type,
        description: nai.description,
        boundaries: nai.boundaries,
        keywords: nai.keywords,
        status: nai.status,
        createdById,
        createdAt: daysAgo(Math.floor(Math.random() * 30) + 7),
        updatedAt: daysAgo(Math.floor(Math.random() * 7)),
      })
      .onConflictDoNothing();

    count++;
  }

  return count;
}
```

---

## 7. Indicator and Tripwire Seeds

### 7.1 Monitoring Indicators

**File:** `apps/api/src/db/seeds/indicators.ts`

```typescript
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { indicators, tripwires, indicatorReadings } from '../schema';
import * as schema from '../schema';
import { daysAgo, randomItem } from './utils';

type DB = NodePgDatabase<typeof schema>;

interface SeedContext {
  userIds: Record<string, string>;
  situationIds: Record<string, string>;
}

interface DemoIndicator {
  situationKey: string;
  name: string;
  description: string;
  type: 'quantitative' | 'qualitative' | 'binary';
  source: string;
  frequency: 'realtime' | 'daily' | 'weekly' | 'monthly';
  unit?: string;
  baselineValue?: number;
  currentValue?: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'unknown';
  tripwires: DemoTripwire[];
  readings: DemoReading[];
}

interface DemoTripwire {
  name: string;
  condition: string;
  threshold: number | string;
  severity: 'info' | 'warning' | 'critical';
  action: string;
  status: 'active' | 'triggered' | 'acknowledged' | 'disabled';
}

interface DemoReading {
  value: number | string;
  daysAgo: number;
  notes?: string;
}

const DEMO_INDICATORS: DemoIndicator[] = [
  // Vietnam entry indicators
  {
    situationKey: 'vietnam_entry',
    name: 'VND/USD Exchange Rate',
    description: 'Vietnamese Dong to US Dollar exchange rate',
    type: 'quantitative',
    source: 'State Bank of Vietnam',
    frequency: 'daily',
    unit: 'VND per USD',
    baselineValue: 24500,
    currentValue: 25100,
    trend: 'increasing',
    tripwires: [
      {
        name: 'Moderate Depreciation Alert',
        condition: 'greater_than',
        threshold: 25500,
        severity: 'warning',
        action: 'Review currency hedging strategy',
        status: 'active',
      },
      {
        name: 'Significant Depreciation Alert',
        condition: 'greater_than',
        threshold: 26500,
        severity: 'critical',
        action: 'Escalate to CFO, activate hedging',
        status: 'active',
      },
    ],
    readings: [
      { value: 24500, daysAgo: 30 },
      { value: 24650, daysAgo: 21 },
      { value: 24800, daysAgo: 14 },
      { value: 24950, daysAgo: 7 },
      { value: 25100, daysAgo: 0 },
    ],
  },
  {
    situationKey: 'vietnam_entry',
    name: 'Investment License Processing Time',
    description: 'Average days to process investment registration certificates',
    type: 'quantitative',
    source: 'Industry contacts and reports',
    frequency: 'monthly',
    unit: 'days',
    baselineValue: 45,
    currentValue: 52,
    trend: 'increasing',
    tripwires: [
      {
        name: 'Processing Delay Alert',
        condition: 'greater_than',
        threshold: 60,
        severity: 'warning',
        action: 'Engage expediting services',
        status: 'active',
      },
    ],
    readings: [
      { value: 45, daysAgo: 90, notes: 'Pre-Tet baseline' },
      { value: 48, daysAgo: 60 },
      { value: 55, daysAgo: 30, notes: 'Post-Tet backlog' },
      { value: 52, daysAgo: 0, notes: 'Slight improvement' },
    ],
  },
  {
    situationKey: 'vietnam_entry',
    name: 'Competitor Market Entry Activity',
    description: 'Tracking of competitor announcements or filings in Vietnam',
    type: 'qualitative',
    source: 'Media monitoring, registry filings',
    frequency: 'weekly',
    trend: 'stable',
    tripwires: [
      {
        name: 'Competitor Entry Announcement',
        condition: 'equals',
        threshold: 'major_announcement',
        severity: 'critical',
        action: 'Accelerate entry timeline review',
        status: 'active',
      },
    ],
    readings: [
      { value: 'no_activity', daysAgo: 21 },
      { value: 'minor_activity', daysAgo: 14, notes: 'Competitor B opened rep office' },
      { value: 'no_activity', daysAgo: 7 },
      { value: 'no_activity', daysAgo: 0 },
    ],
  },

  // Semiconductor indicators
  {
    situationKey: 'semiconductor_shortage',
    name: 'Lead Time - MCU Primary Supplier',
    description: 'Order to delivery lead time for primary MCU supplier',
    type: 'quantitative',
    source: 'Supplier communications',
    frequency: 'weekly',
    unit: 'weeks',
    baselineValue: 12,
    currentValue: 26,
    trend: 'decreasing',
    tripwires: [
      {
        name: 'Extended Lead Time Alert',
        condition: 'greater_than',
        threshold: 30,
        severity: 'warning',
        action: 'Activate secondary supplier',
        status: 'active',
      },
      {
        name: 'Critical Lead Time Alert',
        condition: 'greater_than',
        threshold: 40,
        severity: 'critical',
        action: 'Escalate to executive team, production risk',
        status: 'active',
      },
      {
        name: 'Normalization Indicator',
        condition: 'less_than',
        threshold: 16,
        severity: 'info',
        action: 'Review inventory strategy',
        status: 'active',
      },
    ],
    readings: [
      { value: 36, daysAgo: 60 },
      { value: 32, daysAgo: 45 },
      { value: 30, daysAgo: 30 },
      { value: 28, daysAgo: 14 },
      { value: 26, daysAgo: 0, notes: 'Continued improvement' },
    ],
  },
  {
    situationKey: 'semiconductor_shortage',
    name: 'Spot Market Price Index',
    description: 'Price index for spot market component purchases',
    type: 'quantitative',
    source: 'Broker quotes, market reports',
    frequency: 'daily',
    unit: 'index (100 = baseline)',
    baselineValue: 100,
    currentValue: 185,
    trend: 'decreasing',
    tripwires: [
      {
        name: 'Price Spike Alert',
        condition: 'greater_than',
        threshold: 200,
        severity: 'warning',
        action: 'Review spot purchase approvals',
        status: 'triggered',
      },
      {
        name: 'Price Normalization',
        condition: 'less_than',
        threshold: 120,
        severity: 'info',
        action: 'Reduce spot market dependency',
        status: 'active',
      },
    ],
    readings: [
      { value: 220, daysAgo: 45 },
      { value: 205, daysAgo: 30 },
      { value: 195, daysAgo: 14 },
      { value: 185, daysAgo: 0 },
    ],
  },

  // Shipping indicators
  {
    situationKey: 'shipping_disruption',
    name: 'Red Sea Transit Status',
    description: 'Binary indicator of whether Red Sea route is operationally viable',
    type: 'binary',
    source: 'Carrier advisories, security reports',
    frequency: 'daily',
    trend: 'stable',
    tripwires: [
      {
        name: 'Route Reopening',
        condition: 'equals',
        threshold: 'operational',
        severity: 'info',
        action: 'Assess return to Red Sea routing',
        status: 'active',
      },
    ],
    readings: [
      { value: 'non_operational', daysAgo: 30 },
      { value: 'non_operational', daysAgo: 14 },
      { value: 'non_operational', daysAgo: 0 },
    ],
  },
  {
    situationKey: 'shipping_disruption',
    name: 'Asia-Europe Container Rate',
    description: 'Spot container shipping rate for Asia-Europe route',
    type: 'quantitative',
    source: 'Freightos Baltic Index',
    frequency: 'daily',
    unit: 'USD per FEU',
    baselineValue: 1500,
    currentValue: 4200,
    trend: 'stable',
    tripwires: [
      {
        name: 'Rate Spike Alert',
        condition: 'greater_than',
        threshold: 5000,
        severity: 'warning',
        action: 'Review shipping budget and alternatives',
        status: 'active',
      },
      {
        name: 'Rate Normalization',
        condition: 'less_than',
        threshold: 2000,
        severity: 'info',
        action: 'Renegotiate long-term contracts',
        status: 'active',
      },
    ],
    readings: [
      { value: 1800, daysAgo: 60, notes: 'Pre-disruption' },
      { value: 3500, daysAgo: 45, notes: 'Initial spike' },
      { value: 4800, daysAgo: 30, notes: 'Peak' },
      { value: 4500, daysAgo: 14 },
      { value: 4200, daysAgo: 0, notes: 'Slight easing' },
    ],
  },

  // Travel security indicators
  {
    situationKey: 'travel_latam',
    name: 'Sao Paulo Security Level',
    description: 'Overall security assessment level for Sao Paulo',
    type: 'qualitative',
    source: 'Security provider daily brief',
    frequency: 'daily',
    trend: 'stable',
    tripwires: [
      {
        name: 'Elevated Threat Level',
        condition: 'equals',
        threshold: 'elevated',
        severity: 'warning',
        action: 'Review travel security measures',
        status: 'active',
      },
      {
        name: 'High Threat Level',
        condition: 'equals',
        threshold: 'high',
        severity: 'critical',
        action: 'Consider travel postponement',
        status: 'active',
      },
    ],
    readings: [
      { value: 'moderate', daysAgo: 14 },
      { value: 'moderate', daysAgo: 7 },
      { value: 'moderate', daysAgo: 0 },
    ],
  },
  {
    situationKey: 'travel_latam',
    name: 'Protest Activity Index',
    description: 'Level of protest/demonstration activity in target cities',
    type: 'qualitative',
    source: 'Social media monitoring, local news',
    frequency: 'daily',
    trend: 'unknown',
    tripwires: [
      {
        name: 'Significant Protest Activity',
        condition: 'equals',
        threshold: 'high',
        severity: 'warning',
        action: 'Avoid affected areas, review meeting locations',
        status: 'active',
      },
      {
        name: 'Major Civil Unrest',
        condition: 'equals',
        threshold: 'critical',
        severity: 'critical',
        action: 'Postpone non-essential travel',
        status: 'active',
      },
    ],
    readings: [
      { value: 'low', daysAgo: 7 },
      { value: 'moderate', daysAgo: 3, notes: 'Labor union announcements' },
      { value: 'low', daysAgo: 0 },
    ],
  },
];

export async function seedIndicators(
  db: DB,
  context: SeedContext
): Promise<number> {
  let count = 0;

  for (const indicator of DEMO_INDICATORS) {
    const situationId = context.situationIds[indicator.situationKey];
    const createdById = context.userIds['analyst_1'] || context.userIds['lead_analyst'];

    if (!situationId || !createdById) continue;

    const [createdIndicator] = await db
      .insert(indicators)
      .values({
        situationId,
        name: indicator.name,
        description: indicator.description,
        type: indicator.type,
        source: indicator.source,
        frequency: indicator.frequency,
        unit: indicator.unit,
        baselineValue: indicator.baselineValue?.toString(),
        currentValue: indicator.currentValue?.toString(),
        trend: indicator.trend,
        status: 'active',
        createdById,
        lastUpdatedAt: new Date(),
        createdAt: daysAgo(Math.floor(Math.random() * 60) + 30),
        updatedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: indicators.id });

    if (createdIndicator) {
      count++;

      // Create tripwires for this indicator
      for (const tripwire of indicator.tripwires) {
        await db
          .insert(tripwires)
          .values({
            indicatorId: createdIndicator.id,
            name: tripwire.name,
            condition: tripwire.condition,
            threshold: tripwire.threshold.toString(),
            severity: tripwire.severity,
            action: tripwire.action,
            status: tripwire.status,
            notifyUsers: [createdById],
            createdById,
            createdAt: daysAgo(Math.floor(Math.random() * 30) + 14),
            updatedAt: new Date(),
          })
          .onConflictDoNothing();
      }

      // Create historical readings
      for (const reading of indicator.readings) {
        await db
          .insert(indicatorReadings)
          .values({
            indicatorId: createdIndicator.id,
            value: reading.value.toString(),
            notes: reading.notes,
            recordedAt: daysAgo(reading.daysAgo),
            recordedById: createdById,
            createdAt: daysAgo(reading.daysAgo),
          })
          .onConflictDoNothing();
      }
    }
  }

  return count;
}
```

---

## 8. Package Configuration

### 8.1 Seed Scripts

Add the following scripts to `apps/api/package.json`:

```json
{
  "scripts": {
    "db:seed": "tsx src/db/seed.ts",
    "db:seed:dev": "NODE_ENV=development tsx src/db/seed.ts",
    "db:seed:test": "NODE_ENV=test DATABASE_URL=$TEST_DATABASE_URL tsx src/db/seed.ts",
    "db:reset": "pnpm db:migrate:reset && pnpm db:seed",
    "db:fresh": "pnpm db:push && pnpm db:seed"
  }
}
```

### 8.2 Environment-Specific Configuration

**File:** `apps/api/src/db/seeds/config.ts`

```typescript
export interface SeedConfig {
  /** Whether to include verbose sample data */
  includeExtendedData: boolean;
  /** Whether to include test-only data (e.g., for integration tests) */
  includeTestData: boolean;
  /** Number of historical readings to generate */
  historicalReadingsCount: number;
  /** Default password for demo users (will be hashed) */
  defaultPassword: string;
}

export function getSeedConfig(): SeedConfig {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'test':
      return {
        includeExtendedData: false,
        includeTestData: true,
        historicalReadingsCount: 3,
        defaultPassword: 'test123!',
      };

    case 'staging':
      return {
        includeExtendedData: true,
        includeTestData: false,
        historicalReadingsCount: 30,
        defaultPassword: 'staging123!',
      };

    case 'development':
    default:
      return {
        includeExtendedData: true,
        includeTestData: false,
        historicalReadingsCount: 10,
        defaultPassword: 'dev123!',
      };
  }
}
```

---

## 9. Running Seeds

### 9.1 Development Environment

```bash
# Ensure database is running
docker-compose up -d postgres

# Run migrations first
pnpm db:migrate

# Seed the database
pnpm db:seed

# Or reset and reseed
pnpm db:reset
```

### 9.2 Test Environment

```bash
# Set test database URL
export TEST_DATABASE_URL="postgresql://test:test@localhost:5433/situation_monitor_test"

# Run test seeds
pnpm db:seed:test
```

### 9.3 CI/CD Pipeline

```yaml
# Example GitHub Actions step
- name: Seed test database
  run: |
    pnpm db:migrate
    pnpm db:seed:test
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    NODE_ENV: test
```

---

## Files to Create

| File Path | Description |
|-----------|-------------|
| `apps/api/src/db/seed.ts` | Main seed orchestration file |
| `apps/api/src/db/seeds/utils.ts` | Seed utility functions |
| `apps/api/src/db/seeds/users.ts` | User seed data |
| `apps/api/src/db/seeds/organizations.ts` | Organization seed data |
| `apps/api/src/db/seeds/projects.ts` | Project and situation seed data |
| `apps/api/src/db/seeds/pmesii-pt.ts` | PMESII-PT factor seed data |
| `apps/api/src/db/seeds/threat-actors.ts` | Threat actor seed data |
| `apps/api/src/db/seeds/assessments.ts` | Threat assessment seed data |
| `apps/api/src/db/seeds/collection.ts` | PIR and NAI seed data |
| `apps/api/src/db/seeds/indicators.ts` | Indicator and tripwire seed data |
| `apps/api/src/db/seeds/config.ts` | Environment-specific seed configuration |

---

## Acceptance Criteria

### Functional Requirements

- [ ] Seed script executes without errors on clean database
- [ ] Seed script is idempotent (can run multiple times safely)
- [ ] All foreign key relationships are correctly established
- [ ] Demo users can authenticate with documented passwords
- [ ] Seeded data represents realistic scenarios across all modules

### Data Quality

- [ ] PMESII-PT factors cover all 8 domains with realistic assessments
- [ ] Threat assessments include properly calculated risk scores
- [ ] PIRs have varied priority levels and statuses
- [ ] NAIs represent different types (geographic, topical, organizational, temporal)
- [ ] Indicators have historical readings showing trends
- [ ] Tripwires demonstrate different severity levels and conditions

### Technical Requirements

- [ ] Seeds run in under 30 seconds for development environment
- [ ] No hardcoded secrets in seed files (passwords hashed)
- [ ] Environment-specific configurations work correctly
- [ ] Test seeds are minimal for fast CI/CD cycles

---

## Cross-References

- **Parent Document:** [01-DATA-LAYER.md](./01-DATA-LAYER.md) - Complete data layer implementation
- **Schema Reference:** [01-DATA-LAYER.md#database-schema](./01-DATA-LAYER.md#database-schema) - Database schema definitions
- **Migration Reference:** [01-DATA-LAYER.md#migrations](./01-DATA-LAYER.md#migrations) - Migration setup and execution

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-20 | System | Initial seed data specification |
