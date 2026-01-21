import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { indicators, observations, tripwires, nais, pirs } from '../schema';
import type * as schema from '../schema';

import { daysAgo } from './utils';

type DB = NodePgDatabase<typeof schema>;

interface SeedContext {
  userIds: Record<string, string>;
  projectIds: Record<string, string>;
}

type IndicatorStatus = 'not_observed' | 'partially_observed' | 'fully_observed';
type AlertSeverity = 'info' | 'warning' | 'critical';

interface DemoObservation {
  content: string;
  sourceReliability: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  infoCredibility: '1' | '2' | '3' | '4' | '5' | '6';
  daysAgo: number;
  location?: string;
}

interface DemoIndicator {
  projectKey: string;
  pirQuestion: string; // Match by question text
  name: string;
  description: string;
  observationCriteria: string;
  status: IndicatorStatus;
  threshold: number;
  currentValue: number;
  observations: DemoObservation[];
}

interface DemoTripwire {
  projectKey: string;
  naiName: string; // Match by NAI name
  name: string;
  description: string;
  condition: string;
  threshold?: number;
  currentValue?: number;
  isTriggered: boolean;
  alertSeverity: AlertSeverity;
}

const DEMO_INDICATORS: DemoIndicator[] = [
  // APAC expansion indicators
  {
    projectKey: 'apac_expansion',
    pirQuestion:
      'What are the key decision points and timeline for investment certificate approval in targeted provinces?',
    name: 'License Processing Time',
    description: 'Average days to process investment registration certificates',
    observationCriteria:
      'Track reported processing times from industry contacts and official sources',
    status: 'partially_observed',
    threshold: 100,
    currentValue: 65,
    observations: [
      {
        content: 'Industry contact reports 45-day processing time for Ho Chi Minh City DPI',
        sourceReliability: 'B',
        infoCredibility: '2',
        daysAgo: 14,
        location: 'Ho Chi Minh City',
      },
      {
        content: 'AmCham survey indicates average 52 days for technology sector',
        sourceReliability: 'B',
        infoCredibility: '2',
        daysAgo: 7,
      },
    ],
  },
  {
    projectKey: 'apac_expansion',
    pirQuestion: 'Are there pending regulatory changes that could impact our business model?',
    name: 'Regulatory Change Activity',
    description: 'Monitoring of draft legislation and ministry consultations',
    observationCriteria: 'Track official gazette, ministry websites, and legal advisor alerts',
    status: 'not_observed',
    threshold: 100,
    currentValue: 0,
    observations: [],
  },

  // Supply chain indicators
  {
    projectKey: 'supply_chain_risk',
    pirQuestion:
      'When will fab capacity additions meaningfully impact supply for our component requirements?',
    name: 'TSMC Arizona Progress',
    description: 'Construction and commissioning progress of TSMC Arizona fab',
    observationCriteria:
      'Track company announcements, construction milestones, equipment installation',
    status: 'partially_observed',
    threshold: 100,
    currentValue: 40,
    observations: [
      {
        content: 'TSMC confirms Fab 21 Phase 1 on track for 2025 production start',
        sourceReliability: 'A',
        infoCredibility: '1',
        daysAgo: 21,
        location: 'Phoenix, Arizona',
      },
      {
        content: 'Equipment installation 60% complete per industry source',
        sourceReliability: 'C',
        infoCredibility: '3',
        daysAgo: 7,
      },
    ],
  },
  {
    projectKey: 'supply_chain_risk',
    pirQuestion: 'What is the expected timeline for Red Sea shipping route normalization?',
    name: 'Red Sea Attack Frequency',
    description: 'Weekly count of reported attacks on commercial shipping',
    observationCriteria: 'Track CENTCOM reports, shipping industry alerts, and news sources',
    status: 'fully_observed',
    threshold: 100,
    currentValue: 100,
    observations: [
      {
        content: 'CENTCOM reports 4 drone attacks on commercial vessels this week',
        sourceReliability: 'A',
        infoCredibility: '1',
        daysAgo: 3,
        location: 'Red Sea',
      },
      {
        content: 'Maersk confirms continued Cape routing for all Asia-Europe services',
        sourceReliability: 'A',
        infoCredibility: '1',
        daysAgo: 1,
      },
    ],
  },

  // Travel security indicators
  {
    projectKey: 'hnwi_security',
    pirQuestion: 'Are there planned protests or civil unrest events during the travel window?',
    name: 'Sao Paulo Protest Activity',
    description: 'Monitoring of planned demonstrations and labor actions',
    observationCriteria: 'Track social media, labor union announcements, local news',
    status: 'partially_observed',
    threshold: 100,
    currentValue: 30,
    observations: [
      {
        content: 'Transportation union announces possible strike action for next month',
        sourceReliability: 'C',
        infoCredibility: '3',
        daysAgo: 5,
        location: 'Sao Paulo',
      },
      {
        content: 'No major protests currently scheduled during travel window',
        sourceReliability: 'B',
        infoCredibility: '2',
        daysAgo: 2,
      },
    ],
  },

  // Competitor indicators
  {
    projectKey: 'competitor_intel',
    pirQuestion: 'What is Competitor A current product development roadmap and launch timeline?',
    name: 'Patent Filing Activity',
    description: 'New patent filings by Competitor A in relevant technology areas',
    observationCriteria: 'Track USPTO filings, international patent databases, technology news',
    status: 'partially_observed',
    threshold: 100,
    currentValue: 55,
    observations: [
      {
        content: 'Three new patent applications filed for edge computing architecture',
        sourceReliability: 'A',
        infoCredibility: '1',
        daysAgo: 14,
      },
      {
        content: 'Job postings suggest new team focused on AI integration',
        sourceReliability: 'C',
        infoCredibility: '3',
        daysAgo: 7,
      },
    ],
  },

  // DD indicators
  {
    projectKey: 'portfolio_dd',
    pirQuestion: 'Can revenue figures be independently verified through customer references?',
    name: 'Customer Verification Progress',
    description: 'Completion of customer reference verification calls',
    observationCriteria: 'Track completed calls vs. planned, note any discrepancies',
    status: 'partially_observed',
    threshold: 100,
    currentValue: 40,
    observations: [
      {
        content: 'Customer A confirmed $500K annual contract, consistent with claims',
        sourceReliability: 'A',
        infoCredibility: '1',
        daysAgo: 3,
      },
      {
        content: 'Customer B reference call scheduled for next week',
        sourceReliability: 'B',
        infoCredibility: '2',
        daysAgo: 1,
      },
    ],
  },
];

const DEMO_TRIPWIRES: DemoTripwire[] = [
  // APAC tripwires
  {
    projectKey: 'apac_expansion',
    naiName: 'Ho Chi Minh City Business District',
    name: 'Major Policy Announcement',
    description: 'Alert for significant FDI policy changes affecting target market',
    condition: 'Policy announcement impacting foreign investment in technology sector',
    isTriggered: false,
    alertSeverity: 'critical',
  },
  {
    projectKey: 'apac_expansion',
    naiName: 'Binh Duong Industrial Zone',
    name: 'Industrial Zone Capacity Alert',
    description: 'Alert when target industrial zone approaches capacity limits',
    condition: 'Occupancy rate exceeds threshold',
    threshold: 90,
    currentValue: 78,
    isTriggered: false,
    alertSeverity: 'warning',
  },

  // Supply chain tripwires
  {
    projectKey: 'supply_chain_risk',
    naiName: 'Taiwan Semiconductor Cluster',
    name: 'Taiwan Strait Escalation',
    description: 'Alert for military activity affecting semiconductor supply',
    condition: 'Military exercises or incidents in Taiwan Strait',
    isTriggered: false,
    alertSeverity: 'critical',
  },
  {
    projectKey: 'supply_chain_risk',
    naiName: 'Red Sea Transit Zone',
    name: 'Shipping Route Reopening',
    description: 'Alert when major carriers resume Red Sea transit',
    condition: 'Major carrier announces return to Red Sea routing',
    isTriggered: false,
    alertSeverity: 'info',
  },
  {
    projectKey: 'supply_chain_risk',
    naiName: 'Red Sea Transit Zone',
    name: 'Escalation Alert',
    description: 'Alert for significant escalation in Red Sea attacks',
    condition: 'Vessel sinking or major damage to commercial shipping',
    isTriggered: false,
    alertSeverity: 'critical',
  },

  // HNWI tripwires
  {
    projectKey: 'hnwi_security',
    naiName: 'Sao Paulo Business District',
    name: 'Security Incident Alert',
    description: 'Alert for kidnapping or violent crime in area of operations',
    condition: 'Reported kidnapping or armed robbery in Paulista area',
    isTriggered: false,
    alertSeverity: 'critical',
  },
  {
    projectKey: 'hnwi_security',
    naiName: 'Guarulhos Airport Zone',
    name: 'Airport Disruption',
    description: 'Alert for significant airport operational issues',
    condition: 'Airport closure or major security incident',
    isTriggered: false,
    alertSeverity: 'warning',
  },

  // Competitor tripwires
  {
    projectKey: 'competitor_intel',
    naiName: 'Competitor A Headquarters',
    name: 'Product Launch Announcement',
    description: 'Alert for competitor product announcements',
    condition: 'Public announcement of new product or major feature',
    isTriggered: false,
    alertSeverity: 'info',
  },
  {
    projectKey: 'competitor_intel',
    naiName: 'Competitor A Headquarters',
    name: 'M&A Activity',
    description: 'Alert for merger or acquisition activity',
    condition: 'Reported acquisition discussions or deal announcement',
    isTriggered: false,
    alertSeverity: 'critical',
  },
];

export async function seedIndicators(db: DB, context: SeedContext): Promise<number> {
  let count = 0;

  // Seed Indicators (linked to PIRs)
  for (const indicator of DEMO_INDICATORS) {
    const projectId = context.projectIds[indicator.projectKey];

    if (!projectId) continue;

    // Find the PIR by question text
    const [pir] = await db
      .select({ id: pirs.id })
      .from(pirs)
      .where(eq(pirs.question, indicator.pirQuestion))
      .limit(1);

    if (!pir) continue;

    const [createdIndicator] = await db
      .insert(indicators)
      .values({
        pirId: pir.id,
        name: indicator.name,
        description: indicator.description,
        observationCriteria: indicator.observationCriteria,
        status: indicator.status,
        threshold: indicator.threshold,
        currentValue: indicator.currentValue,
        sortOrder: count,
        createdAt: daysAgo(Math.floor(Math.random() * 30) + 14),
        updatedAt: daysAgo(Math.floor(Math.random() * 7)),
      })
      .onConflictDoNothing()
      .returning({ id: indicators.id });

    if (createdIndicator) {
      count++;

      // Create observations for this indicator
      for (const obs of indicator.observations) {
        await db
          .insert(observations)
          .values({
            indicatorId: createdIndicator.id,
            content: obs.content,
            sourceReliability: obs.sourceReliability,
            infoCredibility: obs.infoCredibility,
            observedAt: daysAgo(obs.daysAgo),
            location: obs.location,
            createdAt: daysAgo(obs.daysAgo),
          })
          .onConflictDoNothing();
      }
    }
  }

  // Seed Tripwires (linked to NAIs)
  for (const tripwire of DEMO_TRIPWIRES) {
    const projectId = context.projectIds[tripwire.projectKey];

    if (!projectId) continue;

    // Find the NAI by name
    const [nai] = await db
      .select({ id: nais.id })
      .from(nais)
      .where(eq(nais.name, tripwire.naiName))
      .limit(1);

    if (!nai) continue;

    await db
      .insert(tripwires)
      .values({
        naiId: nai.id,
        name: tripwire.name,
        description: tripwire.description,
        condition: tripwire.condition,
        threshold: tripwire.threshold,
        currentValue: tripwire.currentValue,
        isTriggered: tripwire.isTriggered,
        alertSeverity: tripwire.alertSeverity,
        isActive: true,
        createdAt: daysAgo(Math.floor(Math.random() * 30) + 14),
        updatedAt: daysAgo(Math.floor(Math.random() * 7)),
      })
      .onConflictDoNothing();

    count++;
  }

  return count;
}
