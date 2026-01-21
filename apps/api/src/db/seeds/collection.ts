import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { pirs, nais, sources } from '../schema';
import type * as schema from '../schema';

import { daysAgo, daysFromNow } from './utils';

type DB = NodePgDatabase<typeof schema>;

interface SeedContext {
  userIds: Record<string, string>;
  projectIds: Record<string, string>;
}

type PirStatus = 'draft' | 'active' | 'answered' | 'obsolete';
type PirPriority = 'routine' | 'priority' | 'immediate' | 'flash';
type SourceReliability = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

interface DemoPIR {
  projectKey: string;
  question: string;
  priority: PirPriority;
  status: PirStatus;
  context: string;
  dueDate?: Date;
  answer?: string;
}

interface DemoNAI {
  projectKey: string;
  name: string;
  description: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  polygon?: string;
  color: string;
  isActive: boolean;
}

interface DemoSource {
  projectKey: string;
  name: string;
  type: string;
  description: string;
  reliability: SourceReliability;
  contactInfo?: string;
}

const DEMO_PIRS: DemoPIR[] = [
  // APAC expansion PIRs
  {
    projectKey: 'apac_expansion',
    question:
      'What are the key decision points and timeline for investment certificate approval in targeted provinces?',
    priority: 'immediate',
    status: 'active',
    context:
      'Understanding the approval process is critical for timeline planning and resource allocation',
    dueDate: daysFromNow(30),
  },
  {
    projectKey: 'apac_expansion',
    question:
      'Which local partners have successfully facilitated foreign market entries in our sector?',
    priority: 'priority',
    status: 'active',
    context: 'Local partnerships significantly impact success rate and speed of market entry',
    dueDate: daysFromNow(45),
  },
  {
    projectKey: 'apac_expansion',
    question: 'What labor market conditions exist for technical talent in target locations?',
    priority: 'priority',
    status: 'active',
    context: 'Workforce availability directly impacts operational planning and location selection',
  },
  {
    projectKey: 'apac_expansion',
    question: 'Are there pending regulatory changes that could impact our business model?',
    priority: 'routine',
    status: 'active',
    context: 'Regulatory changes could require business model adjustments',
  },

  // Supply chain PIRs
  {
    projectKey: 'supply_chain_risk',
    question:
      'When will fab capacity additions meaningfully impact supply for our component requirements?',
    priority: 'immediate',
    status: 'active',
    context: 'Production planning requires visibility into supply normalization timeline',
    dueDate: daysFromNow(14),
  },
  {
    projectKey: 'supply_chain_risk',
    question:
      'What alternative suppliers can meet our specifications if primary sources remain constrained?',
    priority: 'priority',
    status: 'active',
    context: 'Supply chain resilience requires qualified alternative sources',
  },
  {
    projectKey: 'supply_chain_risk',
    question: 'What is the expected timeline for Red Sea shipping route normalization?',
    priority: 'priority',
    status: 'active',
    context: 'Logistics planning depends on route availability',
    dueDate: daysFromNow(60),
  },

  // HNWI security PIRs
  {
    projectKey: 'hnwi_security',
    question: 'What is the current threat level for executive kidnapping in target cities?',
    priority: 'flash',
    status: 'answered',
    context: 'Fundamental go/no-go decision factor for travel approval',
    answer:
      'Elevated risk in Sao Paulo (score 7/10), moderate in Buenos Aires (5/10). Express kidnapping primary concern. Secure transportation mandatory.',
  },
  {
    projectKey: 'hnwi_security',
    question: 'Are there planned protests or civil unrest events during the travel window?',
    priority: 'priority',
    status: 'active',
    context: 'Civil unrest could disrupt meetings and pose safety risks',
    dueDate: daysFromNow(7),
  },

  // Competitor intel PIRs
  {
    projectKey: 'competitor_intel',
    question: 'What is Competitor A current product development roadmap and launch timeline?',
    priority: 'priority',
    status: 'active',
    context: 'Competitive positioning requires awareness of upcoming releases',
  },
  {
    projectKey: 'competitor_intel',
    question: 'Is there evidence of M&A activity or strategic partnership discussions?',
    priority: 'immediate',
    status: 'active',
    context: 'Market consolidation could significantly impact competitive landscape',
    dueDate: daysFromNow(21),
  },

  // Portfolio DD PIRs
  {
    projectKey: 'portfolio_dd',
    question: 'Can revenue figures be independently verified through customer references?',
    priority: 'immediate',
    status: 'active',
    context: 'Revenue verification is critical for valuation assessment',
    dueDate: daysFromNow(14),
  },
  {
    projectKey: 'portfolio_dd',
    question: 'What regulatory approvals are required for the target company business model?',
    priority: 'priority',
    status: 'active',
    context: 'Regulatory risk assessment essential for investment decision',
  },
];

const DEMO_NAIS: DemoNAI[] = [
  // Vietnam NAIs
  {
    projectKey: 'apac_expansion',
    name: 'Ho Chi Minh City Business District',
    description: 'Primary business hub and potential headquarters location',
    latitude: 10.7769,
    longitude: 106.7009,
    radius: 15000,
    color: '#00ff88',
    isActive: true,
  },
  {
    projectKey: 'apac_expansion',
    name: 'Binh Duong Industrial Zone',
    description: 'Major industrial park for manufacturing operations',
    latitude: 10.9804,
    longitude: 106.6519,
    radius: 25000,
    color: '#00d4ff',
    isActive: true,
  },
  {
    projectKey: 'apac_expansion',
    name: 'Hai Phong Port Complex',
    description: 'Northern logistics hub and port facilities',
    latitude: 20.8449,
    longitude: 106.6881,
    radius: 20000,
    color: '#ffaa00',
    isActive: true,
  },

  // Supply chain NAIs
  {
    projectKey: 'supply_chain_risk',
    name: 'Taiwan Semiconductor Cluster',
    description: 'Hsinchu and Tainan science parks - primary chip manufacturing',
    latitude: 24.7999,
    longitude: 120.9664,
    radius: 50000,
    color: '#00ff88',
    isActive: true,
  },
  {
    projectKey: 'supply_chain_risk',
    name: 'Red Sea Transit Zone',
    description: 'Bab el-Mandeb strait shipping lane - current disruption area',
    latitude: 12.5833,
    longitude: 43.3333,
    radius: 100000,
    color: '#ff3333',
    isActive: true,
  },
  {
    projectKey: 'supply_chain_risk',
    name: 'Suez Canal Approach',
    description: 'Northern terminus of Red Sea shipping route',
    latitude: 29.9667,
    longitude: 32.5667,
    radius: 30000,
    color: '#ffaa00',
    isActive: true,
  },

  // HNWI security NAIs
  {
    projectKey: 'hnwi_security',
    name: 'Sao Paulo Business District',
    description: 'Paulista Avenue area - primary meeting locations',
    latitude: -23.5614,
    longitude: -46.6558,
    radius: 5000,
    color: '#00ff88',
    isActive: true,
  },
  {
    projectKey: 'hnwi_security',
    name: 'Guarulhos Airport Zone',
    description: 'Airport and access routes - elevated security zone',
    latitude: -23.4356,
    longitude: -46.4731,
    radius: 10000,
    color: '#ffaa00',
    isActive: true,
  },
  {
    projectKey: 'hnwi_security',
    name: 'Buenos Aires Puerto Madero',
    description: 'Hotel and meeting district',
    latitude: -34.6118,
    longitude: -58.3628,
    radius: 3000,
    color: '#00d4ff',
    isActive: true,
  },

  // Competitor intel NAIs
  {
    projectKey: 'competitor_intel',
    name: 'Competitor A Headquarters',
    description: 'Primary corporate campus and R&D center',
    latitude: 37.4419,
    longitude: -122.143,
    radius: 2000,
    color: '#ff3333',
    isActive: true,
  },
  {
    projectKey: 'competitor_intel',
    name: 'Industry Conference Circuit',
    description: 'Major trade shows and conferences for intelligence collection',
    polygon: JSON.stringify({
      type: 'MultiPoint',
      cities: ['Las Vegas', 'San Francisco', 'Austin', 'New York'],
    }),
    color: '#00d4ff',
    isActive: true,
  },
];

const DEMO_SOURCES: DemoSource[] = [
  // Intelligence sources
  {
    projectKey: 'apac_expansion',
    name: 'Vietnam Embassy Commercial Service',
    type: 'OSINT',
    description: 'Official government trade and investment resources',
    reliability: 'B',
    contactInfo: 'commercial.hanoi@embassy.gov',
  },
  {
    projectKey: 'apac_expansion',
    name: 'AmCham Vietnam Network',
    type: 'HUMINT',
    description: 'American Chamber of Commerce member network and reports',
    reliability: 'B',
  },
  {
    projectKey: 'apac_expansion',
    name: 'Local Legal Counsel (Baker McKenzie)',
    type: 'HUMINT',
    description: 'On-ground legal expertise and regulatory intelligence',
    reliability: 'A',
    contactInfo: 'vietnam.partner@bakermckenzie.com',
  },

  // Supply chain sources
  {
    projectKey: 'supply_chain_risk',
    name: 'SEMI Industry Reports',
    type: 'OSINT',
    description: 'Semiconductor industry association data and forecasts',
    reliability: 'A',
  },
  {
    projectKey: 'supply_chain_risk',
    name: 'Freightos Baltic Index',
    type: 'OSINT',
    description: 'Container shipping rate data and market intelligence',
    reliability: 'A',
  },
  {
    projectKey: 'supply_chain_risk',
    name: 'Supplier Account Managers',
    type: 'HUMINT',
    description: 'Direct supplier contacts for allocation and timeline updates',
    reliability: 'B',
  },

  // Security sources
  {
    projectKey: 'hnwi_security',
    name: 'Global Guardian Daily Brief',
    type: 'OSINT',
    description: 'Commercial security intelligence provider',
    reliability: 'B',
  },
  {
    projectKey: 'hnwi_security',
    name: 'Local Security Provider (Brazil)',
    type: 'HUMINT',
    description: 'On-ground security team with local intelligence network',
    reliability: 'B',
    contactInfo: 'brazil.ops@securityfirm.com',
  },
  {
    projectKey: 'hnwi_security',
    name: 'State Department Travel Advisories',
    type: 'OSINT',
    description: 'Official US government travel security information',
    reliability: 'A',
  },

  // Competitor sources
  {
    projectKey: 'competitor_intel',
    name: 'Patent Database Monitoring',
    type: 'OSINT',
    description: 'USPTO and international patent filing tracking',
    reliability: 'A',
  },
  {
    projectKey: 'competitor_intel',
    name: 'LinkedIn Recruiter Activity',
    type: 'OSINT',
    description: 'Job postings and hiring patterns analysis',
    reliability: 'C',
  },
  {
    projectKey: 'competitor_intel',
    name: 'Trade Show Debriefs',
    type: 'HUMINT',
    description: 'Intelligence from industry events and conferences',
    reliability: 'C',
  },

  // DD sources
  {
    projectKey: 'portfolio_dd',
    name: 'Financial Statement Analysis',
    type: 'OSINT',
    description: 'Audited financials and management accounts',
    reliability: 'B',
  },
  {
    projectKey: 'portfolio_dd',
    name: 'Customer Reference Calls',
    type: 'HUMINT',
    description: 'Direct interviews with target company customers',
    reliability: 'B',
  },
  {
    projectKey: 'portfolio_dd',
    name: 'Background Check Services',
    type: 'OSINT',
    description: 'Third-party verification of founder and executive backgrounds',
    reliability: 'B',
  },
];

export async function seedCollectionPlan(db: DB, context: SeedContext): Promise<number> {
  let count = 0;

  // Seed PIRs
  for (const pir of DEMO_PIRS) {
    const projectId = context.projectIds[pir.projectKey];

    if (!projectId) continue;

    await db
      .insert(pirs)
      .values({
        projectId,
        question: pir.question,
        context: pir.context,
        status: pir.status,
        priority: pir.priority,
        dueDate: pir.dueDate,
        answer: pir.answer,
        answeredAt: pir.answer ? daysAgo(Math.floor(Math.random() * 7)) : undefined,
        sortOrder: count,
        createdAt: daysAgo(Math.floor(Math.random() * 21) + 7),
        updatedAt: daysAgo(Math.floor(Math.random() * 7)),
      })
      .onConflictDoNothing();

    count++;
  }

  // Seed NAIs
  for (const nai of DEMO_NAIS) {
    const projectId = context.projectIds[nai.projectKey];

    if (!projectId) continue;

    await db
      .insert(nais)
      .values({
        projectId,
        name: nai.name,
        description: nai.description,
        latitude: nai.latitude,
        longitude: nai.longitude,
        radius: nai.radius,
        polygon: nai.polygon,
        color: nai.color,
        isActive: nai.isActive,
        createdAt: daysAgo(Math.floor(Math.random() * 30) + 7),
        updatedAt: daysAgo(Math.floor(Math.random() * 7)),
      })
      .onConflictDoNothing();

    count++;
  }

  // Seed Sources
  for (const source of DEMO_SOURCES) {
    const projectId = context.projectIds[source.projectKey];

    if (!projectId) continue;

    await db
      .insert(sources)
      .values({
        projectId,
        name: source.name,
        type: source.type,
        description: source.description,
        reliability: source.reliability,
        contactInfo: source.contactInfo,
        isActive: true,
        createdAt: daysAgo(Math.floor(Math.random() * 60) + 14),
        updatedAt: daysAgo(Math.floor(Math.random() * 14)),
      })
      .onConflictDoNothing();

    count++;
  }

  return count;
}
