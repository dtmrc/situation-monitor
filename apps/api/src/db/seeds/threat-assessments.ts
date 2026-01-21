import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { threatAssessments, threatActors } from '../schema';
import type * as schema from '../schema';

import { daysAgo } from './utils';

type DB = NodePgDatabase<typeof schema>;

interface SeedContext {
  userIds: Record<string, string>;
  projectIds: Record<string, string>;
  assessmentIds: Record<string, string>;
}

type Probability = 'rare' | 'unlikely' | 'possible' | 'likely' | 'certain';

interface DemoThreatAssessment {
  assessmentKey: string;
  threatActorName: string;
  projectKey: string;
  threatScenario: string;
  probability: Probability;
  probabilityScore: number;
  impactScore: number;
  impactCasualties?: number;
  impactEconomic?: number;
  impactInfrastructure?: number;
  impactReputation?: number;
  mitigations?: string;
  notes?: string;
}

const DEMO_THREAT_ASSESSMENTS: DemoThreatAssessment[] = [
  // Vietnam Entry threats
  {
    assessmentKey: 'vietnam_entry',
    threatActorName: 'Disgruntled Insider Profile',
    projectKey: 'apac_expansion',
    threatScenario: 'Insider theft of proprietary market entry strategy and competitive analysis',
    probability: 'possible',
    probabilityScore: 3,
    impactScore: 4,
    impactEconomic: 4,
    impactReputation: 3,
    mitigations:
      'Access controls, DLP monitoring, background checks, compartmentalized information',
    notes: 'Higher risk during initial setup when relying on local hires',
  },
  {
    assessmentKey: 'vietnam_entry',
    threatActorName: 'Regional Criminal Network',
    projectKey: 'supply_chain_risk',
    threatScenario: 'Corruption attempts during business registration and licensing process',
    probability: 'likely',
    probabilityScore: 4,
    impactScore: 3,
    impactEconomic: 2,
    impactReputation: 4,
    mitigations:
      'FCPA training, third-party due diligence, clear escalation procedures, documented processes',
    notes: 'Common issue for foreign companies; robust compliance program essential',
  },

  // Semiconductor threats
  {
    assessmentKey: 'semiconductor_shortage',
    threatActorName: 'APT-PHANTOM',
    projectKey: 'competitor_intel',
    threatScenario: 'Cyber espionage targeting semiconductor design IP and supplier relationships',
    probability: 'likely',
    probabilityScore: 4,
    impactScore: 5,
    impactEconomic: 5,
    impactInfrastructure: 2,
    impactReputation: 4,
    mitigations:
      'Enhanced endpoint security, network segmentation, threat hunting, supplier security requirements',
    notes: 'Active targeting of semiconductor sector confirmed by intelligence community',
  },

  // Shipping threats
  {
    assessmentKey: 'shipping_disruption',
    threatActorName: 'Houthi Forces',
    projectKey: 'supply_chain_risk',
    threatScenario: 'Direct attack on chartered vessel transiting Red Sea',
    probability: 'possible',
    probabilityScore: 3,
    impactScore: 4,
    impactCasualties: 3,
    impactEconomic: 4,
    impactInfrastructure: 2,
    impactReputation: 2,
    mitigations:
      'Reroute via Cape of Good Hope, war risk insurance, carrier coordination, real-time tracking',
    notes: 'Most carriers already avoiding Red Sea transit',
  },

  // Travel threats
  {
    assessmentKey: 'travel_latam',
    threatActorName: 'Express Kidnapping Groups',
    projectKey: 'hnwi_security',
    threatScenario: 'Express kidnapping of executive during ground transportation',
    probability: 'unlikely',
    probabilityScore: 2,
    impactScore: 5,
    impactCasualties: 4,
    impactEconomic: 2,
    impactReputation: 3,
    mitigations:
      'Vetted secure transportation, low-profile protocols, GPS tracking, duress procedures, travel insurance with K&R coverage',
    notes: 'Risk elevated in Sao Paulo; secure transport mandatory',
  },

  // Competitor threats
  {
    assessmentKey: 'competitor_a_watch',
    threatActorName: 'Competitor Alpha',
    projectKey: 'competitor_intel',
    threatScenario: 'Aggressive recruitment of key engineering personnel with NDA violations',
    probability: 'likely',
    probabilityScore: 4,
    impactScore: 4,
    impactEconomic: 4,
    impactReputation: 2,
    mitigations:
      'Competitive compensation, retention bonuses, non-compete enforcement, exit interviews, IP protection training',
    notes: 'Three engineers approached in past 6 months',
  },

  // Due diligence threats
  {
    assessmentKey: 'fintech_dd',
    threatActorName: 'Due Diligence Fraud Actor',
    projectKey: 'portfolio_dd',
    threatScenario:
      'Inflated revenue metrics through channel stuffing or related party transactions',
    probability: 'possible',
    probabilityScore: 3,
    impactScore: 5,
    impactEconomic: 5,
    impactReputation: 3,
    mitigations:
      'Independent revenue verification, customer reference calls, bank statement analysis, forensic accounting review',
    notes: 'Standard due diligence procedures must include fraud detection focus',
  },
];

export async function seedThreatAssessments(db: DB, context: SeedContext): Promise<number> {
  let count = 0;

  for (const assessment of DEMO_THREAT_ASSESSMENTS) {
    const assessmentId = context.assessmentIds[assessment.assessmentKey];
    const projectId = context.projectIds[assessment.projectKey];

    if (!assessmentId || !projectId) continue;

    // Find the threat actor by name and project
    const [threatActor] = await db
      .select({ id: threatActors.id })
      .from(threatActors)
      .where(eq(threatActors.name, assessment.threatActorName))
      .limit(1);

    if (!threatActor) continue;

    const riskScore =
      (assessment.probabilityScore *
        (assessment.impactCasualties ||
          assessment.impactEconomic ||
          assessment.impactInfrastructure ||
          assessment.impactReputation ||
          assessment.impactScore)) /
      5;

    await db
      .insert(threatAssessments)
      .values({
        assessmentId,
        threatActorId: threatActor.id,
        threatScenario: assessment.threatScenario,
        probability: assessment.probability,
        probabilityScore: assessment.probabilityScore,
        impactScore: assessment.impactScore,
        impactCasualties: assessment.impactCasualties || 1,
        impactEconomic: assessment.impactEconomic || 1,
        impactInfrastructure: assessment.impactInfrastructure || 1,
        impactReputation: assessment.impactReputation || 1,
        riskScore,
        mitigations: assessment.mitigations,
        notes: assessment.notes,
        createdAt: daysAgo(Math.floor(Math.random() * 30) + 7),
        updatedAt: daysAgo(Math.floor(Math.random() * 7)),
      })
      .onConflictDoNothing();

    count++;
  }

  return count;
}
