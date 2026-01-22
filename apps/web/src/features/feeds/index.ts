/**
 * Feeds Feature Module
 *
 * Real-time data feed management components:
 * - LiveFeedPanel: Display streaming feed items with filtering
 * - FeedConfigPanel: Manage feed subscriptions and settings
 */

export { LiveFeedPanel } from './components/LiveFeedPanel';
export type {
  FeedItem,
  FeedType,
  FeedSeverity,
  LiveFeedPanelProps,
} from './components/LiveFeedPanel';

export { FeedConfigPanel } from './components/FeedConfigPanel';
export type {
  FeedConfig,
  FeedType as FeedConfigType,
  FeedHealthStatus,
  FeedConfigPanelProps,
} from './components/FeedConfigPanel';

export { NewsFeedConfig } from './components/NewsFeedConfig';

// Analytics panels
export { CivilUnrestAnalyticsPanel } from './panels/CivilUnrestAnalyticsPanel';

// Telegram OSINT
export { TelegramFeedPanel } from './components/TelegramFeedPanel';
export type { TelegramFeedPanelProps } from './components/TelegramFeedPanel';
