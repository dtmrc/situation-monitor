import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { factors } from '../schema';
import type * as schema from '../schema';

import { daysAgo } from './utils';

type DB = NodePgDatabase<typeof schema>;

interface SeedContext {
  userIds: Record<string, string>;
  assessmentIds: Record<string, string>;
}

type PmesiiDomain =
  | 'political'
  | 'military'
  | 'economic'
  | 'social'
  | 'information'
  | 'infrastructure'
  | 'physical'
  | 'time';

type ImpactLevel = 'negligible' | 'minor' | 'moderate' | 'significant' | 'critical';

type Trend = 'improving' | 'stable' | 'declining';

interface DemoFactor {
  assessmentKey: string;
  domain: PmesiiDomain;
  title: string;
  description: string;
  analysis: string;
  impact: ImpactLevel;
  trend: Trend;
  confidence: number;
  sources: string[];
}

const VIETNAM_FACTORS: DemoFactor[] = [
  // Political factors
  {
    assessmentKey: 'vietnam_entry',
    domain: 'political',
    title: 'Government FDI Policy',
    description:
      'Vietnamese government actively encouraging foreign direct investment with incentive packages',
    analysis:
      'Strong policy support for foreign investment, especially in technology and manufacturing sectors. Recent reforms have streamlined business registration processes.',
    impact: 'significant',
    trend: 'improving',
    confidence: 85,
    sources: ['Ministry of Planning and Investment', 'World Bank Vietnam Report 2024'],
  },
  {
    assessmentKey: 'vietnam_entry',
    domain: 'political',
    title: 'Regulatory Complexity',
    description: 'Complex regulatory environment with multiple approval layers',
    analysis:
      'While improving, regulatory processes remain bureaucratic. Average business license approval takes 45-60 days. Local partnerships strongly recommended.',
    impact: 'moderate',
    trend: 'improving',
    confidence: 70,
    sources: ['AmCham Vietnam', 'Local legal counsel interviews'],
  },
  {
    assessmentKey: 'vietnam_entry',
    domain: 'political',
    title: 'US-Vietnam Relations',
    description: 'Upgraded bilateral relationship creating favorable conditions',
    analysis:
      'Elevation to Comprehensive Strategic Partnership in 2023 signals strong bilateral ties. Creates favorable environment for US-linked investments.',
    impact: 'significant',
    trend: 'stable',
    confidence: 90,
    sources: ['State Department', 'Embassy Hanoi briefings'],
  },

  // Economic factors
  {
    assessmentKey: 'vietnam_entry',
    domain: 'economic',
    title: 'GDP Growth Trajectory',
    description: 'Sustained high GDP growth rate above regional average',
    analysis:
      'Vietnam maintaining 6-7% annual GDP growth. Consumer spending rising with growing middle class. Currency relatively stable.',
    impact: 'significant',
    trend: 'stable',
    confidence: 90,
    sources: ['IMF Economic Outlook', 'General Statistics Office Vietnam'],
  },
  {
    assessmentKey: 'vietnam_entry',
    domain: 'economic',
    title: 'Labor Cost Competitiveness',
    description: 'Competitive labor costs compared to China and Thailand',
    analysis:
      'Average manufacturing wages 30-40% lower than coastal China. Skilled workforce availability improving but gaps remain in technical roles.',
    impact: 'significant',
    trend: 'declining',
    confidence: 75,
    sources: ['JETRO Survey', 'Industry HR consultants'],
  },
  {
    assessmentKey: 'vietnam_entry',
    domain: 'economic',
    title: 'Currency Risk',
    description: 'VND management and exchange rate considerations',
    analysis:
      'Central bank maintains managed float. Recent depreciation pressure but reserves adequate. Recommend hedging strategy for significant VND exposure.',
    impact: 'moderate',
    trend: 'declining',
    confidence: 65,
    sources: ['State Bank of Vietnam', 'Financial analyst reports'],
  },

  // Social factors
  {
    assessmentKey: 'vietnam_entry',
    domain: 'social',
    title: 'Demographic Dividend',
    description: 'Young, educated population entering workforce',
    analysis:
      'Median age 31. Strong emphasis on education. English proficiency improving in urban areas. High smartphone penetration (>70%).',
    impact: 'significant',
    trend: 'stable',
    confidence: 85,
    sources: ['UN Population Division', 'Vietnam Education Report'],
  },
  {
    assessmentKey: 'vietnam_entry',
    domain: 'social',
    title: 'Consumer Behavior Shift',
    description: 'Rising middle class changing consumption patterns',
    analysis:
      'Growing appetite for premium products and services. E-commerce adoption accelerating. Brand consciousness increasing among urban consumers.',
    impact: 'moderate',
    trend: 'improving',
    confidence: 75,
    sources: ['Nielsen Vietnam', 'McKinsey Consumer Report'],
  },

  // Information factors
  {
    assessmentKey: 'vietnam_entry',
    domain: 'information',
    title: 'Digital Ecosystem',
    description: 'Rapidly developing digital infrastructure and adoption',
    analysis:
      'High mobile internet penetration. Active social media landscape (Facebook, Zalo dominant). Digital payment adoption accelerating.',
    impact: 'significant',
    trend: 'improving',
    confidence: 85,
    sources: ['Google-Temasek-Bain e-Conomy Report', 'We Are Social Digital Report'],
  },
  {
    assessmentKey: 'vietnam_entry',
    domain: 'information',
    title: 'Media Environment',
    description: 'State-controlled media with active social media discourse',
    analysis:
      'Traditional media state-controlled. Social media relatively open but subject to content regulations. Reputation management requires local expertise.',
    impact: 'minor',
    trend: 'stable',
    confidence: 70,
    sources: ['Freedom House', 'Local media analysis'],
  },

  // Infrastructure factors
  {
    assessmentKey: 'vietnam_entry',
    domain: 'infrastructure',
    title: 'Industrial Park Availability',
    description: 'Expanding industrial zone capacity with modern facilities',
    analysis:
      'Major industrial parks in Binh Duong, Long An, Hai Phong expanding. Occupancy rates high in prime locations. Early engagement recommended.',
    impact: 'significant',
    trend: 'improving',
    confidence: 80,
    sources: ['CBRE Vietnam Industrial Report', 'Site visits'],
  },
  {
    assessmentKey: 'vietnam_entry',
    domain: 'infrastructure',
    title: 'Logistics Challenges',
    description: 'Transportation infrastructure improving but gaps remain',
    analysis:
      'Port capacity expanding (Cai Mep, Hai Phong). Road network improving. Logistics costs remain higher than regional competitors.',
    impact: 'moderate',
    trend: 'improving',
    confidence: 70,
    sources: ['World Bank Logistics Performance Index', 'Industry interviews'],
  },
  {
    assessmentKey: 'vietnam_entry',
    domain: 'infrastructure',
    title: 'Power Supply Reliability',
    description: 'Energy infrastructure under pressure from demand growth',
    analysis:
      'Occasional power shortages in industrial zones during peak demand. Backup power systems recommended. Renewable energy push underway.',
    impact: 'moderate',
    trend: 'stable',
    confidence: 65,
    sources: ['EVN reports', 'Industry feedback'],
  },

  // Physical Environment
  {
    assessmentKey: 'vietnam_entry',
    domain: 'physical',
    title: 'Climate Risk',
    description: 'Typhoon and flooding exposure in key regions',
    analysis:
      'Central and northern regions face typhoon risk (Jun-Nov). Mekong Delta flooding concerns. Climate adaptation planning required for facilities.',
    impact: 'moderate',
    trend: 'declining',
    confidence: 80,
    sources: ['Vietnam Disaster Management Authority', 'Climate risk assessments'],
  },

  // Time factors
  {
    assessmentKey: 'vietnam_entry',
    domain: 'time',
    title: 'Market Entry Window',
    description: 'Optimal timing considerations for market entry',
    analysis:
      'Current window favorable with FDI incentives and competitor positioning. Q2 entry aligns with fiscal year and avoids Tet disruption. 6-month establishment timeline realistic.',
    impact: 'significant',
    trend: 'stable',
    confidence: 70,
    sources: ['Internal analysis', 'Market timing models'],
  },
];

const SEMICONDUCTOR_FACTORS: DemoFactor[] = [
  {
    assessmentKey: 'semiconductor_shortage',
    domain: 'economic',
    title: 'Global Chip Demand Dynamics',
    description: 'AI boom driving unprecedented demand for advanced semiconductors',
    analysis:
      'AI-related chip demand surging 40% YoY. Automotive and IoT demand stabilizing. Mature node capacity additions coming online 2025.',
    impact: 'critical',
    trend: 'stable',
    confidence: 85,
    sources: ['Gartner Semiconductor Forecast', 'SEMI World Fab Report'],
  },
  {
    assessmentKey: 'semiconductor_shortage',
    domain: 'political',
    title: 'Export Control Impacts',
    description: 'US-China technology restrictions reshaping supply chains',
    analysis:
      'Export controls limiting advanced chip access for certain markets. Supply chain restructuring underway. Dual supply chain costs increasing.',
    impact: 'critical',
    trend: 'declining',
    confidence: 80,
    sources: ['BIS regulations', 'Industry analysis'],
  },
  {
    assessmentKey: 'semiconductor_shortage',
    domain: 'infrastructure',
    title: 'Fab Capacity Expansion',
    description: 'New fabrication facilities under construction globally',
    analysis:
      'TSMC Arizona, Samsung Taylor, Intel Ohio all progressing. First production 2025-2026. Will ease trailing-edge constraints.',
    impact: 'significant',
    trend: 'improving',
    confidence: 75,
    sources: ['Company announcements', 'SEMI reports'],
  },
];

const SHIPPING_FACTORS: DemoFactor[] = [
  {
    assessmentKey: 'shipping_disruption',
    domain: 'military',
    title: 'Red Sea Security Situation',
    description: 'Houthi attacks disrupting major shipping lane',
    analysis:
      'Attacks continuing despite military response. Major carriers rerouting via Cape of Good Hope. 10-14 day transit time addition.',
    impact: 'critical',
    trend: 'stable',
    confidence: 90,
    sources: ['CENTCOM reports', 'Shipping industry alerts'],
  },
  {
    assessmentKey: 'shipping_disruption',
    domain: 'economic',
    title: 'Freight Cost Impact',
    description: 'Container shipping rates elevated due to diversions',
    analysis:
      'Asia-Europe rates up 200-300% from baseline. Insurance premiums for Red Sea transit prohibitive. Long-term contracts being renegotiated.',
    impact: 'critical',
    trend: 'stable',
    confidence: 85,
    sources: ['Freightos Baltic Index', 'Industry interviews'],
  },
  {
    assessmentKey: 'shipping_disruption',
    domain: 'time',
    title: 'Disruption Timeline',
    description: 'Expected duration of shipping route disruptions',
    analysis:
      'No near-term resolution expected. Planning assumption: disruption through Q3 2025 minimum. Contingency planning for extended scenario advised.',
    impact: 'significant',
    trend: 'stable',
    confidence: 50,
    sources: ['Intelligence assessments', 'Industry forecasts'],
  },
];

const ALL_FACTORS = [...VIETNAM_FACTORS, ...SEMICONDUCTOR_FACTORS, ...SHIPPING_FACTORS];

export async function seedPmesiiPtFactors(db: DB, context: SeedContext): Promise<number> {
  let count = 0;

  for (const factor of ALL_FACTORS) {
    const assessmentId = context.assessmentIds[factor.assessmentKey];

    if (!assessmentId) continue;

    await db
      .insert(factors)
      .values({
        assessmentId,
        domain: factor.domain,
        title: factor.title,
        description: factor.description,
        analysis: factor.analysis,
        impact: factor.impact,
        trend: factor.trend,
        confidence: factor.confidence,
        sources: JSON.stringify(factor.sources),
        sortOrder: count,
        createdAt: daysAgo(Math.floor(Math.random() * 30) + 7),
        updatedAt: daysAgo(Math.floor(Math.random() * 7)),
      })
      .onConflictDoNothing();

    count++;
  }

  return count;
}
