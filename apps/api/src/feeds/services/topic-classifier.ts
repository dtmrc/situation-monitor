/**
 * Topic Classification Service
 *
 * Classifies news articles into intelligence-relevant topic categories.
 * Uses keyword matching with weighted scoring for topic relevance.
 *
 * Topics are aligned with JP 5-0 PMESII-PT framework and common
 * intelligence analysis domains.
 */

/**
 * Topic classification result
 */
export interface TopicScore {
  /** Topic identifier */
  topic: string;
  /** Display label */
  label: string;
  /** Relevance score (0-1) */
  score: number;
  /** Keywords that matched */
  keywords: string[];
}

/**
 * Topic classification configuration
 */
interface TopicConfig {
  /** Display label */
  label: string;
  /** Keywords to match */
  keywords: string[];
  /** Higher weight keywords (count 2x) */
  strongKeywords?: string[];
  /** Multi-word phrases to match */
  phrases?: string[];
}

// Intelligence-relevant topic definitions
const TOPIC_CONFIG: Record<string, TopicConfig> = {
  conflict: {
    label: 'Armed Conflict',
    keywords: [
      'war',
      'conflict',
      'battle',
      'combat',
      'military',
      'troops',
      'soldiers',
      'offensive',
      'invasion',
      'incursion',
      'artillery',
      'missile',
      'rocket',
      'drone',
      'airstrike',
      'bombing',
      'shelling',
      'frontline',
      'casualties',
    ],
    strongKeywords: [
      'invasion',
      'war',
      'offensive',
      'military operation',
      'armed conflict',
      'battlefield',
    ],
    phrases: ['military operation', 'armed conflict', 'ground offensive', 'air campaign'],
  },

  terrorism: {
    label: 'Terrorism',
    keywords: [
      'terror',
      'terrorist',
      'extremist',
      'militant',
      'insurgent',
      'bombing',
      'explosion',
      'hostage',
      'kidnapping',
      'assassination',
      'radicalization',
      'jihad',
      'jihadist',
      'cell',
      'sleeper',
    ],
    strongKeywords: ['terrorist attack', 'suicide bomber', 'ied', 'car bomb', 'mass casualty'],
    phrases: ['terrorist organization', 'terror cell', 'suicide attack', 'car bombing'],
  },

  political: {
    label: 'Political',
    keywords: [
      'government',
      'president',
      'minister',
      'parliament',
      'congress',
      'senate',
      'election',
      'vote',
      'campaign',
      'legislation',
      'policy',
      'law',
      'decree',
      'administration',
      'opposition',
      'coalition',
      'party',
      'politician',
    ],
    strongKeywords: ['election', 'coup', 'impeachment', 'resignation', 'constitutional'],
    phrases: ['political crisis', 'regime change', 'power transfer', 'state of emergency'],
  },

  diplomatic: {
    label: 'Diplomatic',
    keywords: [
      'diplomat',
      'embassy',
      'ambassador',
      'treaty',
      'agreement',
      'negotiation',
      'summit',
      'talks',
      'alliance',
      'relations',
      'bilateral',
      'multilateral',
      'sanction',
      'resolution',
    ],
    strongKeywords: ['peace talks', 'ceasefire', 'treaty', 'summit', 'diplomatic mission'],
    phrases: ['peace negotiations', 'diplomatic relations', 'foreign ministry', 'state visit'],
  },

  economic: {
    label: 'Economic',
    keywords: [
      'economy',
      'economic',
      'market',
      'trade',
      'inflation',
      'gdp',
      'currency',
      'stock',
      'investment',
      'bank',
      'finance',
      'budget',
      'debt',
      'tariff',
      'export',
      'import',
      'recession',
      'growth',
    ],
    strongKeywords: ['economic crisis', 'market crash', 'currency collapse', 'default', 'bailout'],
    phrases: ['trade war', 'economic sanctions', 'financial crisis', 'market volatility'],
  },

  humanitarian: {
    label: 'Humanitarian',
    keywords: [
      'refugee',
      'displaced',
      'humanitarian',
      'aid',
      'crisis',
      'disaster',
      'famine',
      'drought',
      'flood',
      'earthquake',
      'relief',
      'evacuation',
      'shelter',
      'food',
      'water',
      'medicine',
    ],
    strongKeywords: ['humanitarian crisis', 'refugee crisis', 'mass displacement', 'famine'],
    phrases: ['humanitarian aid', 'refugee camp', 'internally displaced', 'food insecurity'],
  },

  cyber: {
    label: 'Cyber',
    keywords: [
      'cyber',
      'hack',
      'hacker',
      'malware',
      'ransomware',
      'breach',
      'phishing',
      'ddos',
      'cybersecurity',
      'encryption',
      'vulnerability',
      'exploit',
      'backdoor',
    ],
    strongKeywords: ['cyberattack', 'data breach', 'critical infrastructure', 'state-sponsored'],
    phrases: ['cyber attack', 'data breach', 'ransomware attack', 'state-sponsored hacking'],
  },

  energy: {
    label: 'Energy',
    keywords: [
      'oil',
      'gas',
      'energy',
      'pipeline',
      'opec',
      'petroleum',
      'nuclear',
      'reactor',
      'renewable',
      'solar',
      'wind',
      'electricity',
      'grid',
      'refinery',
      'lng',
    ],
    strongKeywords: ['oil crisis', 'energy crisis', 'pipeline attack', 'nuclear'],
    phrases: ['energy security', 'oil prices', 'natural gas', 'power grid'],
  },

  civil_unrest: {
    label: 'Civil Unrest',
    keywords: [
      'protest',
      'demonstration',
      'rally',
      'march',
      'strike',
      'riot',
      'unrest',
      'uprising',
      'revolution',
      'movement',
      'activist',
      'opposition',
      'dissent',
      'crackdown',
    ],
    strongKeywords: ['mass protest', 'violent protest', 'revolution', 'uprising', 'crackdown'],
    phrases: ['civil unrest', 'mass demonstration', 'violent clashes', 'police crackdown'],
  },

  nuclear: {
    label: 'Nuclear',
    keywords: [
      'nuclear',
      'atomic',
      'uranium',
      'enrichment',
      'centrifuge',
      'warhead',
      'icbm',
      'ballistic',
      'proliferation',
      'nonproliferation',
      'iaea',
      'radiation',
    ],
    strongKeywords: ['nuclear weapon', 'nuclear test', 'ballistic missile', 'uranium enrichment'],
    phrases: ['nuclear program', 'weapons of mass destruction', 'nuclear proliferation'],
  },

  maritime: {
    label: 'Maritime',
    keywords: [
      'ship',
      'vessel',
      'navy',
      'naval',
      'maritime',
      'port',
      'shipping',
      'piracy',
      'blockade',
      'strait',
      'submarine',
      'carrier',
      'fleet',
      'coast',
      'territorial',
    ],
    strongKeywords: ['naval exercise', 'maritime security', 'piracy', 'blockade'],
    phrases: ['territorial waters', 'freedom of navigation', 'naval deployment'],
  },

  aviation: {
    label: 'Aviation',
    keywords: [
      'aircraft',
      'plane',
      'flight',
      'airline',
      'airport',
      'airspace',
      'aviation',
      'crash',
      'hijack',
      'pilot',
      'passenger',
      'boeing',
      'airbus',
    ],
    strongKeywords: ['plane crash', 'hijacking', 'airspace violation', 'shoot down'],
    phrases: ['aviation incident', 'air traffic', 'no-fly zone', 'emergency landing'],
  },

  health: {
    label: 'Health',
    keywords: [
      'health',
      'disease',
      'outbreak',
      'epidemic',
      'pandemic',
      'virus',
      'vaccine',
      'hospital',
      'medical',
      'infection',
      'quarantine',
      'who',
      'cdc',
    ],
    strongKeywords: ['pandemic', 'outbreak', 'epidemic', 'public health emergency'],
    phrases: ['public health', 'disease outbreak', 'health emergency', 'vaccine rollout'],
  },
};

/**
 * Classify text into topics
 *
 * @param text - Text to classify
 * @param minScore - Minimum score threshold (default: 0.1)
 * @param maxTopics - Maximum topics to return (default: 5)
 * @returns Sorted array of topic scores
 */
export function classifyTopics(
  text: string,
  minScore: number = 0.1,
  maxTopics: number = 5
): TopicScore[] {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\W+/);
  const wordSet = new Set(words);
  const results: TopicScore[] = [];

  for (const [topic, config] of Object.entries(TOPIC_CONFIG)) {
    const matchedKeywords: string[] = [];
    let score = 0;
    const totalPossible = config.keywords.length + (config.strongKeywords?.length || 0) * 2;

    // Match regular keywords
    for (const keyword of config.keywords) {
      if (keyword.includes(' ')) {
        // Multi-word keyword
        if (lowerText.includes(keyword)) {
          matchedKeywords.push(keyword);
          score += 1;
        }
      } else {
        // Single word
        if (wordSet.has(keyword)) {
          matchedKeywords.push(keyword);
          score += 1;
        }
      }
    }

    // Match strong keywords (double weight)
    if (config.strongKeywords) {
      for (const keyword of config.strongKeywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          if (!matchedKeywords.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
          score += 2;
        }
      }
    }

    // Match phrases
    if (config.phrases) {
      for (const phrase of config.phrases) {
        if (lowerText.includes(phrase.toLowerCase())) {
          if (!matchedKeywords.includes(phrase)) {
            matchedKeywords.push(phrase);
          }
          score += 1.5;
        }
      }
    }

    // Normalize score
    const normalizedScore = Math.min(1, score / Math.sqrt(totalPossible));

    if (normalizedScore >= minScore || matchedKeywords.length >= 2) {
      results.push({
        topic,
        label: config.label,
        score: Math.round(normalizedScore * 100) / 100,
        keywords: matchedKeywords,
      });
    }
  }

  // Sort by score descending and limit
  return results.sort((a, b) => b.score - a.score).slice(0, maxTopics);
}

/**
 * Get primary topic from classification
 */
export function getPrimaryTopic(results: TopicScore[]): string | null {
  if (results.length === 0) return null;
  return results[0]?.topic || null;
}

/**
 * Check if text relates to a specific topic
 */
export function matchesTopic(text: string, topic: string): boolean {
  const results = classifyTopics(text, 0.2, 10);
  return results.some((r) => r.topic === topic);
}

/**
 * Get available topic IDs
 */
export function getAvailableTopics(): string[] {
  return Object.keys(TOPIC_CONFIG);
}

/**
 * Get topic display labels
 */
export function getTopicLabels(): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const [topic, config] of Object.entries(TOPIC_CONFIG)) {
    labels[topic] = config.label;
  }
  return labels;
}
