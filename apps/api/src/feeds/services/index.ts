/**
 * Feed Services Index
 *
 * Exports all feed enrichment and processing services.
 */

// Entity extraction
export {
  extractEntities,
  getPrimaryLocation,
  mentionsRegion,
  type ExtractedEntities,
} from './entity-extractor';

// Sentiment analysis
export {
  analyzeSentiment,
  getSentimentRelevance,
  compareSentiment,
  type SentimentResult,
} from './sentiment';

// Topic classification
export {
  classifyTopics,
  getPrimaryTopic,
  matchesTopic,
  getAvailableTopics,
  getTopicLabels,
  type TopicScore,
} from './topic-classifier';

// Deduplication
export {
  checkDuplicate,
  checkDuplicateBatch,
  addToCache,
  clearCache,
  getCacheStats,
  startDeduplicationCleanup,
  stopDeduplicationCleanup,
  type DeduplicationResult,
} from './deduplication';

// Source credibility
export {
  calculateCredibility,
  getQuickCredibility,
  isSourceInTier,
  getDomainsInTier,
  extractDomain,
  type CredibilityScore,
} from './credibility';

// Civil unrest aggregation
export { CivilUnrestAggregator, civilUnrestAggregator } from './civil-unrest-aggregator';
