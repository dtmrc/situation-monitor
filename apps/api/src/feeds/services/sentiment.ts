/**
 * Sentiment Analysis Service
 *
 * Lightweight lexicon-based sentiment analysis for news text.
 * Uses curated word lists for geopolitical/intelligence context.
 *
 * For production, consider integrating an ML-based sentiment API.
 */

/**
 * Sentiment analysis result
 */
export interface SentimentResult {
  /** Score from -1 (negative) to 1 (positive) */
  score: number;
  /** Categorical label */
  label: 'negative' | 'neutral' | 'positive';
  /** Confidence in the classification (0-1) */
  confidence: number;
  /** Breakdown of sentiment indicators */
  breakdown?: {
    positiveCount: number;
    negativeCount: number;
    totalWords: number;
  };
}

// Geopolitically-relevant positive terms
const POSITIVE_WORDS = new Set([
  // Diplomatic positive
  'agreement',
  'accord',
  'treaty',
  'alliance',
  'cooperation',
  'partnership',
  'peace',
  'ceasefire',
  'truce',
  'reconciliation',
  'dialogue',
  'talks',
  'negotiation',
  'diplomacy',
  'resolution',
  'compromise',

  // Stability/progress
  'stable',
  'stability',
  'progress',
  'improvement',
  'growth',
  'recovery',
  'reform',
  'development',
  'prosperity',
  'success',
  'victory',
  'achievement',

  // Security positive
  'secure',
  'security',
  'protection',
  'defense',
  'safety',
  'deterrent',

  // General positive
  'good',
  'great',
  'positive',
  'excellent',
  'strong',
  'support',
  'aid',
  'assistance',
  'relief',
  'hope',
  'optimism',
  'confident',
  'win',
  'winning',
  'won',
]);

// Geopolitically-relevant negative terms
const NEGATIVE_WORDS = new Set([
  // Conflict terms
  'war',
  'conflict',
  'battle',
  'combat',
  'fighting',
  'hostilities',
  'clash',
  'confrontation',
  'skirmish',
  'offensive',
  'attack',
  'assault',
  'strike',
  'bombing',
  'shelling',
  'invasion',
  'incursion',
  'occupation',

  // Violence
  'violence',
  'violent',
  'kill',
  'killed',
  'killing',
  'death',
  'deaths',
  'dead',
  'casualties',
  'wounded',
  'injured',
  'victim',
  'victims',
  'massacre',
  'genocide',
  'atrocity',
  'atrocities',

  // Instability
  'crisis',
  'crises',
  'emergency',
  'chaos',
  'collapse',
  'instability',
  'unrest',
  'turmoil',
  'upheaval',
  'riot',
  'riots',
  'protest',
  'protests',
  'demonstration',

  // Threats
  'threat',
  'threaten',
  'threatening',
  'danger',
  'dangerous',
  'risk',
  'warning',
  'alert',
  'alarm',
  'concern',
  'worry',
  'fear',

  // Diplomatic negative
  'sanction',
  'sanctions',
  'embargo',
  'blockade',
  'condemn',
  'condemnation',
  'criticism',
  'dispute',
  'tension',
  'tensions',
  'escalation',
  'deterioration',
  'breakdown',
  'failure',
  'failed',

  // Security threats
  'terrorism',
  'terrorist',
  'terror',
  'extremism',
  'extremist',
  'militant',
  'insurgent',
  'insurgency',
  'radicalization',

  // General negative
  'bad',
  'terrible',
  'negative',
  'worse',
  'worst',
  'severe',
  'serious',
  'grave',
  'dire',
  'critical',
  'destruction',
  'devastation',
  'damage',
  'loss',
  'lose',
  'defeat',
]);

// Words that intensify sentiment
const INTENSIFIERS = new Set([
  'very',
  'extremely',
  'highly',
  'absolutely',
  'completely',
  'totally',
  'utterly',
  'deeply',
  'severely',
  'significantly',
  'dramatically',
  'sharply',
  'major',
  'massive',
  'huge',
  'enormous',
]);

// Words that negate sentiment
const NEGATORS = new Set([
  'not',
  'no',
  'never',
  'neither',
  "don't",
  "doesn't",
  "didn't",
  "won't",
  "wouldn't",
  "couldn't",
  "shouldn't",
  'without',
  'lack',
  'lacking',
  'failed',
  'unable',
  'unlikely',
]);

/**
 * Analyze sentiment of text
 *
 * @param text - Text to analyze
 * @returns Sentiment result with score, label, and confidence
 */
export function analyzeSentiment(text: string): SentimentResult {
  const words = text.toLowerCase().split(/\W+/);

  let score = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let intensifierActive = false;
  let negatorActive = false;
  let negatorWindow = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    // Track intensifier
    if (INTENSIFIERS.has(word)) {
      intensifierActive = true;
      continue;
    }

    // Track negator with a window (affects next 3 words)
    if (NEGATORS.has(word)) {
      negatorActive = true;
      negatorWindow = 3;
      continue;
    }

    // Determine word sentiment
    let wordScore = 0;
    if (POSITIVE_WORDS.has(word)) {
      wordScore = 1;
      positiveCount++;
    } else if (NEGATIVE_WORDS.has(word)) {
      wordScore = -1;
      negativeCount++;
    }

    // Apply modifiers
    if (wordScore !== 0) {
      // Intensifier amplifies
      if (intensifierActive) {
        wordScore *= 1.5;
      }

      // Negator reverses
      if (negatorActive && negatorWindow > 0) {
        wordScore *= -0.5; // Partial reversal (not fully positive)
      }

      score += wordScore;
    }

    // Reset intensifier after use
    intensifierActive = false;

    // Decrease negator window
    if (negatorWindow > 0) {
      negatorWindow--;
      if (negatorWindow === 0) {
        negatorActive = false;
      }
    }
  }

  // Calculate normalized score
  const totalSentimentWords = positiveCount + negativeCount;
  const normalizedScore =
    totalSentimentWords > 0 ? Math.max(-1, Math.min(1, score / (totalSentimentWords * 1.5))) : 0;

  // Calculate confidence based on evidence
  const evidenceRatio = totalSentimentWords / words.length;
  const confidence = Math.min(1, Math.max(0.1, evidenceRatio * 10));

  // Determine label with thresholds
  let label: 'negative' | 'neutral' | 'positive' = 'neutral';
  if (normalizedScore > 0.15) {
    label = 'positive';
  } else if (normalizedScore < -0.15) {
    label = 'negative';
  }

  return {
    score: Math.round(normalizedScore * 100) / 100,
    label,
    confidence: Math.round(confidence * 100) / 100,
    breakdown: {
      positiveCount,
      negativeCount,
      totalWords: words.length,
    },
  };
}

/**
 * Get sentiment for intelligence relevance
 * Maps sentiment to operational concern levels
 */
export function getSentimentRelevance(
  result: SentimentResult
): 'routine' | 'monitoring' | 'attention' | 'concern' {
  // High negative sentiment with high confidence = concern
  if (result.score < -0.5 && result.confidence > 0.5) {
    return 'concern';
  }

  // Moderate negative = attention
  if (result.score < -0.2 && result.confidence > 0.3) {
    return 'attention';
  }

  // Slight negative or mixed = monitoring
  if (result.score < 0 || (result.breakdown && result.breakdown.negativeCount > 2)) {
    return 'monitoring';
  }

  return 'routine';
}

/**
 * Compare sentiment between two texts
 * Useful for tracking sentiment change over time
 */
export function compareSentiment(
  current: SentimentResult,
  previous: SentimentResult
): {
  change: 'improved' | 'stable' | 'deteriorated';
  delta: number;
} {
  const delta = current.score - previous.score;
  const threshold = 0.2;

  return {
    change: delta > threshold ? 'improved' : delta < -threshold ? 'deteriorated' : 'stable',
    delta: Math.round(delta * 100) / 100,
  };
}
