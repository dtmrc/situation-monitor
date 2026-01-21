import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';
import { seedCentersOfGravity } from './seeds/cog';
import { seedCollectionPlan } from './seeds/collection';
import { getSeedConfig } from './seeds/config';
import { seedIndicators } from './seeds/indicators';
import { seedOrganizations } from './seeds/organizations';
import { seedPmesiiPtFactors } from './seeds/pmesii-pt';
import { seedProjects } from './seeds/projects';
import { seedThreatActors } from './seeds/threat-actors';
import { seedThreatAssessments } from './seeds/threat-assessments';
import { seedUsers } from './seeds/users';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

interface SeedContext {
  db: ReturnType<typeof drizzle>;
  userIds: Record<string, string>;
  orgIds: Record<string, string>;
  projectIds: Record<string, string>;
  assessmentIds: Record<string, string>;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const seedConfig = getSeedConfig();
  console.log(`\nSeed configuration: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Extended data: ${seedConfig.includeExtendedData}`);
  console.log(`  Test data: ${seedConfig.includeTestData}\n`);

  const queryClient = postgres(connectionString);
  const db = drizzle(queryClient, { schema });

  console.log('Starting seed process...\n');

  const context: SeedContext = {
    db,
    userIds: {},
    orgIds: {},
    projectIds: {},
    assessmentIds: {},
  };

  try {
    // Seed in dependency order
    console.log('Seeding users...');
    context.userIds = await seedUsers(db);
    console.log(`  Created ${Object.keys(context.userIds).length} users\n`);

    console.log('Seeding organizations...');
    context.orgIds = await seedOrganizations(db, context.userIds);
    console.log(`  Created ${Object.keys(context.orgIds).length} organizations\n`);

    console.log('Seeding projects and assessments...');
    context.projectIds = await seedProjects(db, context);
    console.log(`  Created ${Object.keys(context.projectIds).length} projects`);
    console.log(`  Created ${Object.keys(context.assessmentIds).length} assessments\n`);

    console.log('Seeding PMESII-PT factors...');
    const factorCount = await seedPmesiiPtFactors(db, context);
    console.log(`  Created ${factorCount} PMESII-PT factors\n`);

    console.log('Seeding threat actors...');
    const threatActorCount = await seedThreatActors(db, context);
    console.log(`  Created ${threatActorCount} threat actors\n`);

    console.log('Seeding threat assessments...');
    const threatAssessmentCount = await seedThreatAssessments(db, context);
    console.log(`  Created ${threatAssessmentCount} threat assessments\n`);

    console.log('Seeding collection plans (PIRs/NAIs/Sources)...');
    const collectionCount = await seedCollectionPlan(db, context);
    console.log(`  Created ${collectionCount} collection items\n`);

    console.log('Seeding indicators and tripwires...');
    const indicatorCount = await seedIndicators(db, context);
    console.log(`  Created ${indicatorCount} indicators and tripwires\n`);

    console.log('Seeding Centers of Gravity...');
    const cogCount = await seedCentersOfGravity(db, context);
    console.log(`  Created ${cogCount} Centers of Gravity\n`);

    console.log('Seed process completed successfully!');
    console.log('\nDemo accounts:');
    console.log('  - admin@situation-monitor.dev');
    console.log('  - analyst.lead@situation-monitor.dev');
    console.log('  - analyst1@situation-monitor.dev');
  } catch (error) {
    console.error('Seed process failed:', error);
    throw error;
  } finally {
    await queryClient.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
