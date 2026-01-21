import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { centersOfGravity, cogElements, cogElementLinks } from '../schema';
import type * as schema from '../schema';

import { daysAgo } from './utils';

type DB = NodePgDatabase<typeof schema>;

interface SeedContext {
  userIds: Record<string, string>;
  assessmentIds: Record<string, string>;
}

type CogType = 'friendly' | 'adversary' | 'neutral';
type CogElementType = 'critical_capability' | 'critical_requirement' | 'critical_vulnerability';

interface DemoCoGElement {
  type: CogElementType;
  title: string;
  description: string;
  priority: number;
}

interface DemoCoG {
  assessmentKey: string;
  name: string;
  type: CogType;
  description: string;
  rationale: string;
  elements: DemoCoGElement[];
}

const DEMO_COGS: DemoCoG[] = [
  // Vietnam entry - Own CoG
  {
    assessmentKey: 'vietnam_entry',
    name: 'Market Entry Team',
    type: 'friendly',
    description: 'Core team executing the Vietnam market entry initiative',
    rationale:
      'The specialized team is the source of competitive advantage and execution capability for successful market entry',
    elements: [
      {
        type: 'critical_capability',
        title: 'Local Market Knowledge',
        description:
          'Deep understanding of Vietnamese business culture, regulatory environment, and market dynamics',
        priority: 1,
      },
      {
        type: 'critical_capability',
        title: 'Partner Network Access',
        description: 'Ability to identify, vet, and engage with qualified local partners',
        priority: 2,
      },
      {
        type: 'critical_requirement',
        title: 'Executive Sponsorship',
        description: 'Continued commitment and resource allocation from corporate leadership',
        priority: 1,
      },
      {
        type: 'critical_requirement',
        title: 'Legal and Compliance Support',
        description: 'Access to experienced legal counsel for regulatory navigation',
        priority: 2,
      },
      {
        type: 'critical_vulnerability',
        title: 'Key Person Dependencies',
        description: 'Reliance on limited number of individuals with specialized knowledge',
        priority: 1,
      },
      {
        type: 'critical_vulnerability',
        title: 'Timeline Pressure',
        description: 'Compressed timeline creating risk of cutting corners on due diligence',
        priority: 2,
      },
    ],
  },

  // Competitor analysis - Adversary CoG
  {
    assessmentKey: 'competitor_a_watch',
    name: 'Competitor A Product Organization',
    type: 'adversary',
    description:
      'The integrated product and engineering organization driving competitor innovation',
    rationale:
      'The product org is the source of their competitive strength, driving rapid feature development and market responsiveness',
    elements: [
      {
        type: 'critical_capability',
        title: 'Rapid Product Iteration',
        description: 'Ability to quickly develop and deploy new features based on market feedback',
        priority: 1,
      },
      {
        type: 'critical_capability',
        title: 'AI/ML Integration',
        description: 'Strong capability to embed AI features across product portfolio',
        priority: 2,
      },
      {
        type: 'critical_requirement',
        title: 'Engineering Talent Pool',
        description: 'Continued access to top-tier software engineering talent',
        priority: 1,
      },
      {
        type: 'critical_requirement',
        title: 'Customer Feedback Loop',
        description: 'Robust mechanism for gathering and acting on customer insights',
        priority: 2,
      },
      {
        type: 'critical_vulnerability',
        title: 'Talent Retention Pressure',
        description: 'High demand for AI talent creating retention challenges',
        priority: 1,
      },
      {
        type: 'critical_vulnerability',
        title: 'Technical Debt',
        description: 'Rapid iteration accumulating technical debt affecting future agility',
        priority: 3,
      },
    ],
  },

  // Shipping disruption - Adversary CoG
  {
    assessmentKey: 'shipping_disruption',
    name: 'Houthi Maritime Strike Capability',
    type: 'adversary',
    description: 'The integrated targeting and strike capability threatening commercial shipping',
    rationale:
      'The ability to identify and engage commercial vessels is the source of their disruptive power over global trade',
    elements: [
      {
        type: 'critical_capability',
        title: 'Anti-Ship Missile Employment',
        description: 'Ability to launch accurate strikes against moving maritime targets',
        priority: 1,
      },
      {
        type: 'critical_capability',
        title: 'Drone Swarm Tactics',
        description: 'Capability to deploy multiple UAVs for saturation attacks',
        priority: 2,
      },
      {
        type: 'critical_requirement',
        title: 'Iranian Weapons Supply',
        description: 'Continued flow of advanced weapons systems from external sponsors',
        priority: 1,
      },
      {
        type: 'critical_requirement',
        title: 'Maritime Surveillance',
        description: 'Ability to identify and track target vessels in transit',
        priority: 2,
      },
      {
        type: 'critical_vulnerability',
        title: 'Supply Chain Interdiction',
        description: 'Potential to disrupt weapons and component supply from sponsors',
        priority: 1,
      },
      {
        type: 'critical_vulnerability',
        title: 'Coalition Degradation',
        description: 'US-led naval operations degrading launch capabilities over time',
        priority: 2,
      },
    ],
  },

  // FinTech DD - Neutral/Target CoG
  {
    assessmentKey: 'fintech_dd',
    name: 'Target Company Technology Platform',
    type: 'neutral',
    description: 'The core technology infrastructure and product capabilities under evaluation',
    rationale:
      'The platform is the foundation of their value proposition and the key to scalability',
    elements: [
      {
        type: 'critical_capability',
        title: 'Payment Processing',
        description: 'Core ability to process transactions at scale with high reliability',
        priority: 1,
      },
      {
        type: 'critical_capability',
        title: 'API Integration',
        description: 'Flexible API enabling rapid customer integration',
        priority: 2,
      },
      {
        type: 'critical_requirement',
        title: 'Regulatory Licenses',
        description: 'Money transmission licenses in key markets',
        priority: 1,
      },
      {
        type: 'critical_requirement',
        title: 'Banking Partnerships',
        description: 'Relationships with banks for settlement and compliance',
        priority: 2,
      },
      {
        type: 'critical_vulnerability',
        title: 'Single Cloud Dependency',
        description: 'Heavy reliance on single cloud provider creating concentration risk',
        priority: 2,
      },
      {
        type: 'critical_vulnerability',
        title: 'Founder Key Person Risk',
        description: 'Critical knowledge and relationships concentrated in founders',
        priority: 1,
      },
    ],
  },
];

export async function seedCentersOfGravity(db: DB, context: SeedContext): Promise<number> {
  let count = 0;

  for (const cog of DEMO_COGS) {
    const assessmentId = context.assessmentIds[cog.assessmentKey];

    if (!assessmentId) continue;

    const [createdCog] = await db
      .insert(centersOfGravity)
      .values({
        assessmentId,
        name: cog.name,
        type: cog.type,
        description: cog.description,
        rationale: cog.rationale,
        sortOrder: count,
        createdAt: daysAgo(Math.floor(Math.random() * 30) + 14),
        updatedAt: daysAgo(Math.floor(Math.random() * 7)),
      })
      .onConflictDoNothing()
      .returning({ id: centersOfGravity.id });

    if (createdCog) {
      count++;

      // Create elements for this CoG
      const elementIds: Record<string, string> = {};
      let elementIndex = 0;

      for (const element of cog.elements) {
        const [createdElement] = await db
          .insert(cogElements)
          .values({
            cogId: createdCog.id,
            type: element.type,
            title: element.title,
            description: element.description,
            priority: element.priority,
            createdAt: daysAgo(Math.floor(Math.random() * 21) + 7),
            updatedAt: daysAgo(Math.floor(Math.random() * 7)),
          })
          .onConflictDoNothing()
          .returning({ id: cogElements.id });

        if (createdElement) {
          elementIds[`${element.type}_${elementIndex}`] = createdElement.id;
          elementIndex++;
        }
      }

      // Create some element links (CC -> CR, CR -> CV relationships)
      const ccElements = Object.entries(elementIds).filter(([k]) =>
        k.startsWith('critical_capability')
      );
      const crElements = Object.entries(elementIds).filter(([k]) =>
        k.startsWith('critical_requirement')
      );
      const cvElements = Object.entries(elementIds).filter(([k]) =>
        k.startsWith('critical_vulnerability')
      );

      // Link first CC to first CR
      const firstCc = ccElements[0];
      const firstCr = crElements[0];
      const firstCv = cvElements[0];

      if (firstCc && firstCr) {
        await db
          .insert(cogElementLinks)
          .values({
            sourceId: firstCc[1],
            targetId: firstCr[1],
            relationship: 'depends_on',
            notes: 'Capability depends on this requirement',
            createdAt: daysAgo(Math.floor(Math.random() * 14)),
          })
          .onConflictDoNothing();
      }

      // Link first CR to first CV
      if (firstCr && firstCv) {
        await db
          .insert(cogElementLinks)
          .values({
            sourceId: firstCr[1],
            targetId: firstCv[1],
            relationship: 'exposes',
            notes: 'Requirement exposes this vulnerability',
            createdAt: daysAgo(Math.floor(Math.random() * 14)),
          })
          .onConflictDoNothing();
      }
    }
  }

  return count;
}
