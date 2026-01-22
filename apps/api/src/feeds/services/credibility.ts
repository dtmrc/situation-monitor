/**
 * Source Credibility Scoring Service
 *
 * Evaluates news source credibility based on:
 * - Known domain reputation tiers
 * - Author attribution
 * - Content quality signals
 * - Publication metadata
 *
 * Used for filtering and weighting intelligence items.
 */

/**
 * Credibility assessment result
 */
export interface CredibilityScore {
  /** Overall score (0-100) */
  score: number;
  /** Tier classification */
  tier: 1 | 2 | 3;
  /** Tier label */
  tierLabel: 'High' | 'Medium' | 'Low';
  /** Factors affecting the score */
  factors: string[];
  /** Warnings or concerns */
  warnings: string[];
}

// Tier 1: Major wire services and papers of record
const TIER_1_DOMAINS = new Set([
  // Wire services
  'reuters.com',
  'apnews.com',
  'afp.com',

  // Papers of record
  'nytimes.com',
  'washingtonpost.com',
  'wsj.com',
  'ft.com',
  'theguardian.com',
  'economist.com',
  'bbc.com',
  'bbc.co.uk',

  // Quality international
  'dw.com',
  'france24.com',
  'aljazeera.com',
  'scmp.com',
]);

// Tier 2: Major national news and reputable regional
const TIER_2_DOMAINS = new Set([
  // US national
  'cnn.com',
  'nbcnews.com',
  'cbsnews.com',
  'abcnews.go.com',
  'npr.org',
  'pbs.org',
  'usatoday.com',
  'politico.com',
  'thehill.com',
  'axios.com',

  // Business/Finance
  'bloomberg.com',
  'cnbc.com',
  'marketwatch.com',
  'fortune.com',
  'forbes.com',
  'businessinsider.com',

  // International
  'cbc.ca',
  'globalnews.ca',
  'abc.net.au',
  'smh.com.au',
  'independent.co.uk',
  'telegraph.co.uk',
  'sky.com',
  'euronews.com',
  'thelocal.com',
  'japantimes.co.jp',
  'straitstimes.com',
  'hindustantimes.com',
  'timesofindia.indiatimes.com',

  // Tech/Science
  'wired.com',
  'arstechnica.com',
  'theverge.com',
  'techcrunch.com',

  // Defense/Security specialty
  'defensenews.com',
  'janes.com',
  'defenseone.com',
  'militarytimes.com',
]);

// Known satire/parody sites (legitimate but not news)
const SATIRE_DOMAINS = new Set([
  'theonion.com',
  'babylonbee.com',
  'clickhole.com',
  'thebeaverton.com',
  'waterfordwhispersnews.com',
  'newsthump.com',
  'thedailymash.co.uk',
]);

// Known low-credibility or unreliable sources
const LOW_CREDIBILITY_DOMAINS = new Set<string>([
  // Known misinformation sources would go here
  // This list should be maintained carefully
]);

// Content aggregators (quality depends on source)
const AGGREGATOR_DOMAINS = new Set([
  'news.google.com',
  'news.yahoo.com',
  'msn.com',
  'flipboard.com',
  'apple.news',
  'feedly.com',
]);

// Government/Official sources (high credibility for official statements)
const GOVERNMENT_DOMAINS = new Set([
  // US Government
  'state.gov',
  'defense.gov',
  'whitehouse.gov',
  'congress.gov',
  'cia.gov',
  'fbi.gov',
  'dhs.gov',
  'treasury.gov',
  'justice.gov',

  // International organizations
  'un.org',
  'nato.int',
  'europa.eu',
  'who.int',
  'imf.org',
  'worldbank.org',
  'iaea.org',

  // Foreign governments (for official statements)
  'gov.uk',
  'gouvernement.fr',
  'bundesregierung.de',
]);

/**
 * Calculate credibility score for a news source
 *
 * @param domain - Source domain (e.g., "reuters.com")
 * @param hasAuthor - Whether the article has author attribution
 * @param contentLength - Length of article content
 * @param hasDate - Whether the article has a publication date
 * @param hasImages - Whether the article has images
 * @returns Credibility assessment
 */
export function calculateCredibility(
  domain: string,
  hasAuthor: boolean = false,
  contentLength: number = 0,
  hasDate: boolean = true,
  hasImages: boolean = false
): CredibilityScore {
  const factors: string[] = [];
  const warnings: string[] = [];
  let score = 50; // Base score

  // Clean and normalize domain
  const cleanDomain = normalizeDomain(domain);

  // Check domain tier
  if (TIER_1_DOMAINS.has(cleanDomain)) {
    score += 40;
    factors.push('Tier 1 source (wire service or paper of record)');
  } else if (TIER_2_DOMAINS.has(cleanDomain)) {
    score += 25;
    factors.push('Tier 2 source (major news outlet)');
  } else if (GOVERNMENT_DOMAINS.has(cleanDomain) || cleanDomain.endsWith('.gov')) {
    score += 30;
    factors.push('Government/official source');
  } else if (SATIRE_DOMAINS.has(cleanDomain)) {
    score -= 30;
    warnings.push('Satire/parody site - not a news source');
  } else if (LOW_CREDIBILITY_DOMAINS.has(cleanDomain)) {
    score -= 40;
    warnings.push('Known low-credibility source');
  } else if (AGGREGATOR_DOMAINS.has(cleanDomain)) {
    factors.push('Aggregator - credibility depends on original source');
  } else {
    factors.push('Unranked source - credibility unknown');
  }

  // Author attribution
  if (hasAuthor) {
    score += 5;
    factors.push('Has author attribution');
  } else {
    score -= 5;
    warnings.push('No author attribution');
  }

  // Content length (substantial articles are more credible)
  if (contentLength > 1000) {
    score += 5;
    factors.push('Substantial article length');
  } else if (contentLength > 500) {
    score += 2;
  } else if (contentLength < 100) {
    score -= 5;
    warnings.push('Very short content');
  }

  // Publication date
  if (!hasDate) {
    score -= 5;
    warnings.push('No publication date');
  }

  // Images (articles with relevant images tend to be more substantial)
  if (hasImages) {
    score += 2;
    factors.push('Includes images');
  }

  // Normalize score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine tier
  let tier: 1 | 2 | 3;
  let tierLabel: 'High' | 'Medium' | 'Low';

  if (score >= 75) {
    tier = 1;
    tierLabel = 'High';
  } else if (score >= 50) {
    tier = 2;
    tierLabel = 'Medium';
  } else {
    tier = 3;
    tierLabel = 'Low';
  }

  return {
    score,
    tier,
    tierLabel,
    factors,
    warnings,
  };
}

/**
 * Quick credibility check based on domain only
 */
export function getQuickCredibility(domain: string): {
  tier: 1 | 2 | 3;
  tierLabel: 'High' | 'Medium' | 'Low';
  isSatire: boolean;
  isGovernment: boolean;
} {
  const cleanDomain = normalizeDomain(domain);

  let tier: 1 | 2 | 3 = 3;
  let tierLabel: 'High' | 'Medium' | 'Low' = 'Low';

  if (TIER_1_DOMAINS.has(cleanDomain) || GOVERNMENT_DOMAINS.has(cleanDomain)) {
    tier = 1;
    tierLabel = 'High';
  } else if (TIER_2_DOMAINS.has(cleanDomain)) {
    tier = 2;
    tierLabel = 'Medium';
  }

  return {
    tier,
    tierLabel,
    isSatire: SATIRE_DOMAINS.has(cleanDomain),
    isGovernment:
      GOVERNMENT_DOMAINS.has(cleanDomain) ||
      cleanDomain.endsWith('.gov') ||
      cleanDomain.endsWith('.gov.uk'),
  };
}

/**
 * Check if a source is in a specific tier
 */
export function isSourceInTier(domain: string, tier: 1 | 2 | 3): boolean {
  const cleanDomain = normalizeDomain(domain);

  switch (tier) {
    case 1:
      return TIER_1_DOMAINS.has(cleanDomain) || GOVERNMENT_DOMAINS.has(cleanDomain);
    case 2:
      return TIER_2_DOMAINS.has(cleanDomain);
    case 3:
      return !TIER_1_DOMAINS.has(cleanDomain) && !TIER_2_DOMAINS.has(cleanDomain);
    default:
      return false;
  }
}

/**
 * Get all domains in a specific tier
 */
export function getDomainsInTier(tier: 1 | 2 | 3): string[] {
  switch (tier) {
    case 1:
      return [...TIER_1_DOMAINS, ...GOVERNMENT_DOMAINS];
    case 2:
      return [...TIER_2_DOMAINS];
    case 3:
      return []; // Tier 3 is "everything else"
    default:
      return [];
  }
}

/**
 * Normalize domain for comparison
 */
function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^www\./, '')
    .trim();
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return normalizeDomain(parsed.hostname);
  } catch {
    return url;
  }
}
