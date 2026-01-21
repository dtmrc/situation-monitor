import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { projects, assessments } from '../schema';
import type * as schema from '../schema';

import { daysAgo } from './utils';

type DB = NodePgDatabase<typeof schema>;

interface SeedContext {
  userIds: Record<string, string>;
  orgIds: Record<string, string>;
  projectIds: Record<string, string>;
  assessmentIds: Record<string, string>;
}

interface DemoAssessment {
  key: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
}

interface DemoProject {
  key: string;
  orgKey: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  ownerKey: string;
  assessments: DemoAssessment[];
}

const DEMO_PROJECTS: DemoProject[] = [
  {
    key: 'apac_expansion',
    orgKey: 'acme_intel',
    name: 'APAC Market Expansion Assessment',
    description: 'Comprehensive market entry analysis for Southeast Asian expansion',
    status: 'active',
    ownerKey: 'lead_analyst',
    assessments: [
      {
        key: 'vietnam_entry',
        name: 'Vietnam Market Entry',
        description: 'Assessment of Vietnam market conditions for Q2 2025 entry',
        status: 'active',
      },
      {
        key: 'thailand_entry',
        name: 'Thailand Market Assessment',
        description: 'Preliminary analysis of Thailand regulatory and competitive landscape',
        status: 'draft',
      },
      {
        key: 'indonesia_monitor',
        name: 'Indonesia Political Monitoring',
        description: 'Ongoing monitoring of Indonesian political developments affecting FDI',
        status: 'active',
      },
    ],
  },
  {
    key: 'supply_chain_risk',
    orgKey: 'acme_intel',
    name: 'Global Supply Chain Risk Assessment',
    description: 'Analysis of supply chain vulnerabilities and contingency planning',
    status: 'active',
    ownerKey: 'analyst_1',
    assessments: [
      {
        key: 'semiconductor_shortage',
        name: 'Semiconductor Supply Analysis',
        description: 'Assessment of global semiconductor supply constraints and alternatives',
        status: 'active',
      },
      {
        key: 'shipping_disruption',
        name: 'Maritime Shipping Disruption',
        description: 'Analysis of Red Sea shipping route alternatives and cost impacts',
        status: 'active',
      },
    ],
  },
  {
    key: 'competitor_intel',
    orgKey: 'acme_intel',
    name: 'Competitor Intelligence Program',
    description: 'Systematic competitive intelligence collection and analysis',
    status: 'active',
    ownerKey: 'analyst_2',
    assessments: [
      {
        key: 'competitor_a_watch',
        name: 'Competitor A Strategic Watch',
        description: 'Ongoing monitoring of Competitor A market moves and capabilities',
        status: 'active',
      },
      {
        key: 'market_consolidation',
        name: 'Market Consolidation Analysis',
        description: 'Assessment of potential M&A activity in the sector',
        status: 'active',
      },
    ],
  },
  {
    key: 'hnwi_security',
    orgKey: 'acme_intel',
    name: 'HNWI Personal Security Assessment',
    description: 'Personal security and travel risk assessment for high-net-worth client',
    status: 'active',
    ownerKey: 'analyst_3',
    assessments: [
      {
        key: 'travel_latam',
        name: 'Latin America Travel Assessment',
        description: 'Security assessment for planned travel to Brazil and Argentina',
        status: 'active',
      },
      {
        key: 'residence_security',
        name: 'Primary Residence Security Review',
        description: 'Comprehensive security assessment of primary residence',
        status: 'archived',
      },
    ],
  },
  {
    key: 'portfolio_dd',
    orgKey: 'global_ventures',
    name: 'Portfolio Company Due Diligence',
    description: 'Due diligence assessments for potential portfolio investments',
    status: 'active',
    ownerKey: 'client_exec',
    assessments: [
      {
        key: 'fintech_dd',
        name: 'FinTech Startup DD - Series B',
        description: 'Due diligence for potential Series B investment in payment platform',
        status: 'active',
      },
      {
        key: 'healthtech_dd',
        name: 'HealthTech Platform Assessment',
        description: 'Market and regulatory assessment for healthcare AI startup',
        status: 'draft',
      },
    ],
  },
  {
    key: 'archived_project',
    orgKey: 'acme_intel',
    name: 'Q3 2024 Election Monitoring',
    description: 'Completed monitoring of Q3 2024 election cycles and impacts',
    status: 'archived',
    ownerKey: 'lead_analyst',
    assessments: [
      {
        key: 'us_election_2024',
        name: 'US Presidential Election Analysis',
        description: 'Analysis of US election outcomes and policy implications',
        status: 'archived',
      },
    ],
  },
];

export async function seedProjects(db: DB, context: SeedContext): Promise<Record<string, string>> {
  const projectIds: Record<string, string> = {};
  const assessmentIds: Record<string, string> = {};

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
        ownerId,
        settings: JSON.stringify({
          defaultView: 'dashboard',
          notifications: true,
          autoArchiveDays: 90,
        }),
        createdAt: daysAgo(Math.floor(Math.random() * 90) + 30),
        updatedAt: daysAgo(Math.floor(Math.random() * 7)),
      })
      .onConflictDoNothing()
      .returning({ id: projects.id });

    if (createdProject) {
      projectIds[project.key] = createdProject.id;

      // Create assessments for this project
      for (const assessment of project.assessments) {
        const [createdAssessment] = await db
          .insert(assessments)
          .values({
            projectId: createdProject.id,
            name: assessment.name,
            description: assessment.description,
            status: assessment.status,
            assessmentDate: daysAgo(Math.floor(Math.random() * 30)),
            createdAt: daysAgo(Math.floor(Math.random() * 60) + 7),
            updatedAt: daysAgo(Math.floor(Math.random() * 7)),
          })
          .onConflictDoNothing()
          .returning({ id: assessments.id });

        if (createdAssessment) {
          assessmentIds[assessment.key] = createdAssessment.id;
        }
      }
    }
  }

  // Update context with assessment IDs
  context.assessmentIds = assessmentIds;

  return projectIds;
}
