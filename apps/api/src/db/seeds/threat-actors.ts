import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { threatActors } from '../schema';
import type * as schema from '../schema';

import { daysAgo } from './utils';

type DB = NodePgDatabase<typeof schema>;

interface SeedContext {
  userIds: Record<string, string>;
  projectIds: Record<string, string>;
}

type ThreatCategory =
  | 'state_actor'
  | 'non_state_actor'
  | 'natural'
  | 'technological'
  | 'economic'
  | 'social'
  | 'cyber'
  | 'other';

interface DemoThreatActor {
  projectKey: string;
  name: string;
  category: ThreatCategory;
  description: string;
  capabilities: string;
  intentions: string;
  history?: string;
}

const DEMO_THREAT_ACTORS: DemoThreatActor[] = [
  {
    projectKey: 'competitor_intel',
    name: 'APT-PHANTOM',
    category: 'state_actor',
    description: 'State-sponsored threat actor targeting technology and defense sectors',
    capabilities:
      'Advanced persistent access tools, Zero-day exploitation capability, Supply chain compromise, Social engineering operations',
    intentions:
      'Intellectual property theft, Strategic intelligence collection, Technology transfer',
    history:
      'Active since 2015. Attributed to multiple high-profile breaches in technology sector.',
  },
  {
    projectKey: 'competitor_intel',
    name: 'Competitor Alpha',
    category: 'other',
    description: 'Primary market competitor with aggressive intelligence collection posture',
    capabilities:
      'Competitive intelligence program, Recruiting from target companies, Trade show intelligence collection, Patent monitoring and filing',
    intentions:
      'Market share capture, Product roadmap intelligence, Key personnel recruitment, Price undercutting strategies',
  },
  {
    projectKey: 'supply_chain_risk',
    name: 'Regional Criminal Network',
    category: 'non_state_actor',
    description: 'Organized criminal group operating in Southeast Asian region',
    capabilities:
      'Corruption of local officials, Physical security compromise, Cyber fraud and scams, Supply chain theft',
    intentions:
      'Financial gain through theft, Extortion and protection rackets, Counterfeit goods distribution',
  },
  {
    projectKey: 'apac_expansion',
    name: 'Disgruntled Insider Profile',
    category: 'other',
    description: 'Generic profile of insider threat indicators and behaviors',
    capabilities:
      'Authorized access to sensitive systems, Knowledge of security procedures, Trusted position for data exfiltration, Physical access to facilities',
    intentions:
      'Financial gain from data sale, Revenge for perceived grievances, Ideological motivations, Coercion by external actors',
  },
  {
    projectKey: 'portfolio_dd',
    name: 'Due Diligence Fraud Actor',
    category: 'economic',
    description: 'Companies presenting fraudulent information during investment due diligence',
    capabilities:
      'Sophisticated financial statement manipulation, Fake customer references, Inflated metrics and KPIs, Hidden related party transactions',
    intentions:
      'Secure investment at inflated valuation, Hide operational problems, Obscure founder misconduct',
  },
  {
    projectKey: 'hnwi_security',
    name: 'Express Kidnapping Groups',
    category: 'non_state_actor',
    description: 'Criminal groups targeting high-net-worth individuals for short-term abduction',
    capabilities:
      'Surveillance and target identification, Quick extraction techniques, ATM fraud knowledge, Cross-border movement',
    intentions:
      'Immediate ransom payments, ATM withdrawals under duress, Quick release after payment',
  },
  {
    projectKey: 'supply_chain_risk',
    name: 'Houthi Forces',
    category: 'non_state_actor',
    description: 'Armed group targeting commercial shipping in Red Sea region',
    capabilities: 'Anti-ship missiles, Armed drones, Naval mines, Small boat attacks',
    intentions:
      'Disrupt international shipping, Apply pressure on Israel-linked interests, Demonstrate regional power projection',
    history:
      'Escalated attacks on commercial shipping since November 2023. Multiple vessels struck or seized.',
  },
];

export async function seedThreatActors(db: DB, context: SeedContext): Promise<number> {
  let count = 0;

  for (const actor of DEMO_THREAT_ACTORS) {
    const projectId = context.projectIds[actor.projectKey];

    if (!projectId) continue;

    await db
      .insert(threatActors)
      .values({
        projectId,
        name: actor.name,
        category: actor.category,
        description: actor.description,
        capabilities: actor.capabilities,
        intentions: actor.intentions,
        history: actor.history,
        createdAt: daysAgo(Math.floor(Math.random() * 180) + 30),
        updatedAt: daysAgo(Math.floor(Math.random() * 14)),
      })
      .onConflictDoNothing();

    count++;
  }

  return count;
}
