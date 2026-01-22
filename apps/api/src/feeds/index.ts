/**
 * Feeds Module Exports
 */

// Adapter interface and base class
export {
  type FeedAdapter,
  type FeedType,
  type FeedSeverity,
  type FeedConfig,
  type NormalizedFeedItem,
  type FeedFetchResult,
  type FeedFilterOptions,
  type GeoBounds,
  type FeedAdapterHealth,
  BaseFeedAdapter,
} from './adapter.interface';

// Normalizer service
export {
  registerAdapter,
  getAdapter,
  getAllAdapters,
  getAvailableFeedTypes,
  fetchFeedItems,
  storeItems,
  createProcessingLog,
  updateProcessingLog,
  completeProcessingLog,
  getEnabledFeedConfigs,
  getAllEnabledFeedConfigs,
} from './normalizer.service';

// Scheduler
export {
  startFeedPolling,
  stopFeedPolling,
  updateFeedInterval,
  startProjectFeeds,
  stopProjectFeeds,
  startAllFeeds,
  stopAllFeeds,
  getActiveFeedStatus,
  getActiveFeedCount,
  isFeedPolling,
  syncFeedSchedules,
} from './scheduler';

// Adapters
export {
  registerAllAdapters,
  getAdapterInfo,
  allAdapters,
  newsAdapter,
  civilUnrestAdapter,
  flightAdapter,
  maritimeAdapter,
  fireAdapter,
  telegramAdapter,
} from './adapters';
