/**
 * Telegram Feed Panel
 *
 * Dedicated panel for Telegram OSINT feed with:
 * - Channel grouping with collapsible sections
 * - Category/language filters
 * - Translation toggle
 * - Sentiment indicators
 * - Entity badges (locations, organizations)
 * - View/forward counts
 * - Auto-refresh (30s)
 */

import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Globe,
  Languages,
  MapPin,
  Building2,
  Eye,
  Forward,
  Clock,
  ExternalLink,
  RefreshCw,
  Filter,
  X,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { useState, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  fetchTelegramMessages,
  fetchTelegramChannels,
  type TelegramMessage,
  type TelegramChannel,
  type TelegramChannelCategory,
} from '@/lib/api/feeds/telegram';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TelegramFeedPanelProps {
  projectId: string;
  onMessageClick?: (message: TelegramMessage) => void;
  onLocationClick?: (lat: number, lng: number, name?: string) => void;
  className?: string;
  maxHeight?: string;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_LABELS: Record<TelegramChannelCategory, string> = {
  military: 'Military',
  political: 'Political',
  economic: 'Economic',
  social: 'Social',
  media: 'Media',
  regional: 'Regional',
  infrastructure: 'Infrastructure',
  other: 'Other',
};

const CATEGORY_COLORS: Record<TelegramChannelCategory, string> = {
  military: 'bg-red-500/20 text-red-400 border-red-500/30',
  political: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  economic: 'bg-green-500/20 text-green-400 border-green-500/30',
  social: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  media: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  regional: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  infrastructure: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const SENTIMENT_CONFIG = {
  negative: { icon: TrendingDown, color: 'text-red-400', label: 'Negative' },
  neutral: { icon: Minus, color: 'text-gray-400', label: 'Neutral' },
  positive: { icon: TrendingUp, color: 'text-green-400', label: 'Positive' },
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ru: 'Russian',
  uk: 'Ukrainian',
  ar: 'Arabic',
  he: 'Hebrew',
  zh: 'Chinese',
  fa: 'Persian',
  ko: 'Korean',
  ja: 'Japanese',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
};

// ============================================================================
// Component
// ============================================================================

export function TelegramFeedPanel({
  projectId,
  onMessageClick,
  onLocationClick,
  className,
  maxHeight = '600px',
}: TelegramFeedPanelProps) {
  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<TelegramChannelCategory | 'all'>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [showTranslations, setShowTranslations] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState<'negative' | 'neutral' | 'positive' | 'all'>('all');
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());

  // Fetch channels
  const { data: channelsData } = useQuery({
    queryKey: ['telegram-channels', projectId],
    queryFn: () => fetchTelegramChannels(projectId, { includeMessageCount: true }),
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch messages
  const { data: messagesData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['telegram-messages', projectId, categoryFilter, languageFilter, sentimentFilter],
    queryFn: () =>
      fetchTelegramMessages(projectId, {
        categories: categoryFilter !== 'all' ? [categoryFilter] : undefined,
        languages: languageFilter !== 'all' ? [languageFilter] : undefined,
        sentiment: sentimentFilter !== 'all' ? sentimentFilter : undefined,
        limit: 100,
        sortBy: 'date',
        sortOrder: 'desc',
      }),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Group messages by channel
  const messagesByChannel = useMemo(() => {
    if (!messagesData?.messages) return new Map<string, TelegramMessage[]>();

    const grouped = new Map<string, TelegramMessage[]>();
    for (const message of messagesData.messages) {
      const channelId = message.channelId;
      if (!grouped.has(channelId)) {
        grouped.set(channelId, []);
      }
      grouped.get(channelId)!.push(message);
    }
    return grouped;
  }, [messagesData?.messages]);

  // Create channel lookup
  const channelMap = useMemo(() => {
    if (!channelsData?.channels) return new Map<string, TelegramChannel>();
    return new Map(channelsData.channels.map((c) => [c.id, c]));
  }, [channelsData?.channels]);

  // Get unique languages from messages
  const availableLanguages = useMemo(() => {
    if (!messagesData?.messages) return [];
    const langs = new Set<string>();
    for (const msg of messagesData.messages) {
      if (msg.languageCode) langs.add(msg.languageCode);
    }
    return Array.from(langs).sort();
  }, [messagesData?.messages]);

  // Toggle channel expansion
  const toggleChannel = (channelId: string) => {
    setExpandedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  // Expand all channels
  const expandAll = () => {
    setExpandedChannels(new Set(messagesByChannel.keys()));
  };

  // Collapse all channels
  const collapseAll = () => {
    setExpandedChannels(new Set());
  };

  return (
    <div className={cn('flex flex-col rounded-lg border border-border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-purple-400" />
          <span className="font-medium">Telegram OSINT</span>
          {messagesData && (
            <Badge variant="secondary" className="text-xs">
              {messagesData.total} messages
            </Badge>
          )}
          {isFetching && (
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => expandAll()}>
            Expand
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => collapseAll()}>
            Collapse
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => void refetch()}>
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />

        {/* Category filter */}
        <Select
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v as TelegramChannelCategory | 'all')}
        >
          <SelectTrigger className="h-7 w-[120px] text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Language filter */}
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="h-7 w-[120px] text-xs">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {availableLanguages.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {LANGUAGE_NAMES[lang] || lang.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sentiment filter */}
        <Select
          value={sentimentFilter}
          onValueChange={(v) => setSentimentFilter(v as 'negative' | 'neutral' | 'positive' | 'all')}
        >
          <SelectTrigger className="h-7 w-[110px] text-xs">
            <SelectValue placeholder="Sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sentiment</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
          </SelectContent>
        </Select>

        {/* Translation toggle */}
        <div className="ml-auto flex items-center gap-2">
          <Languages className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Translations</span>
          <Switch
            checked={showTranslations}
            onCheckedChange={setShowTranslations}
            className="scale-75"
          />
        </div>

        {/* Clear filters */}
        {(categoryFilter !== 'all' || languageFilter !== 'all' || sentimentFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => {
              setCategoryFilter('all');
              setLanguageFilter('all');
              setSentimentFilter('all');
            }}
          >
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1" style={{ maxHeight }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
            <p className="text-sm">Failed to load messages</p>
          </div>
        ) : messagesByChannel.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageSquare className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">No messages found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Array.from(messagesByChannel.entries()).map(([channelId, messages]) => {
              const channel = channelMap.get(channelId);
              const isExpanded = expandedChannels.has(channelId);

              return (
                <ChannelGroup
                  key={channelId}
                  channel={channel}
                  messages={messages}
                  isExpanded={isExpanded}
                  onToggle={() => toggleChannel(channelId)}
                  showTranslations={showTranslations}
                  onMessageClick={onMessageClick}
                  onLocationClick={onLocationClick}
                />
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Channel Group Component
// ============================================================================

function ChannelGroup({
  channel,
  messages,
  isExpanded,
  onToggle,
  showTranslations,
  onMessageClick,
  onLocationClick,
}: {
  channel?: TelegramChannel;
  messages: TelegramMessage[];
  isExpanded: boolean;
  onToggle: () => void;
  showTranslations: boolean;
  onMessageClick?: (message: TelegramMessage) => void;
  onLocationClick?: (lat: number, lng: number, name?: string) => void;
}) {
  const category = channel?.category || 'other';

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-muted/50"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-medium">@{channel?.username || 'Unknown'}</span>
        {channel?.title && channel.title !== `@${channel.username}` && (
          <span className="text-sm text-muted-foreground">{channel.title}</span>
        )}
        <Badge variant="outline" className={cn('text-[10px]', CATEGORY_COLORS[category])}>
          {CATEGORY_LABELS[category]}
        </Badge>
        <Badge variant="secondary" className="ml-auto text-xs">
          {messages.length}
        </Badge>
      </button>

      {isExpanded && (
        <div className="divide-y divide-border/50 pl-6">
          {messages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              showTranslation={showTranslations}
              onClick={() => onMessageClick?.(message)}
              onLocationClick={onLocationClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Message Card Component
// ============================================================================

function MessageCard({
  message,
  showTranslation,
  onClick,
  onLocationClick,
}: {
  message: TelegramMessage;
  showTranslation: boolean;
  onClick?: () => void;
  onLocationClick?: (lat: number, lng: number, name?: string) => void;
}) {
  const sentiment = message.sentimentLabel
    ? SENTIMENT_CONFIG[message.sentimentLabel]
    : null;
  const SentimentIcon = sentiment?.icon || Minus;

  const displayText = showTranslation && message.translatedText
    ? message.translatedText
    : message.text;

  const locations = message.extractedEntities?.locations || [];
  const organizations = message.extractedEntities?.organizations || [];

  return (
    <div
      className="cursor-pointer px-4 py-3 transition-colors hover:bg-muted/30"
      onClick={onClick}
    >
      {/* Header */}
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {formatDistanceToNow(new Date(message.messageDate), { addSuffix: true })}

        {message.languageCode && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {message.languageCode.toUpperCase()}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {LANGUAGE_NAMES[message.languageCode] || message.languageCode}
                {message.translatedText && ' (translated)'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {sentiment && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn('flex items-center gap-1', sentiment.color)}>
                  <SentimentIcon className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {sentiment.label} sentiment
                {message.sentimentScore !== undefined &&
                  ` (${(message.sentimentScore * 100).toFixed(0)}%)`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {message.views !== undefined && (
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatNumber(message.views)}
          </span>
        )}

        {message.forwards !== undefined && message.forwards > 0 && (
          <span className="flex items-center gap-1">
            <Forward className="h-3 w-3" />
            {formatNumber(message.forwards)}
          </span>
        )}

        {message.forwardedFrom && (
          <Badge variant="outline" className="text-[10px]">
            Forwarded
          </Badge>
        )}
      </div>

      {/* Content */}
      <p className="mb-2 line-clamp-4 text-sm leading-relaxed">{displayText}</p>

      {/* Show original if showing translation */}
      {showTranslation && message.translatedText && (
        <details className="mb-2">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Show original
          </summary>
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{message.text}</p>
        </details>
      )}

      {/* Entities */}
      {(locations.length > 0 || organizations.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {locations.slice(0, 3).map((loc, i) => (
            <TooltipProvider key={`loc-${i}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (loc.coordinates) {
                        onLocationClick?.(loc.coordinates.lat, loc.coordinates.lng, loc.name);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]',
                      'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
                      !loc.coordinates && 'cursor-default'
                    )}
                  >
                    <MapPin className="h-2.5 w-2.5" />
                    {loc.name}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {loc.type.charAt(0).toUpperCase() + loc.type.slice(1)}
                  {loc.coordinates && ' - Click to view on map'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}

          {organizations.slice(0, 3).map((org, i) => (
            <span
              key={`org-${i}`}
              className="flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-400"
            >
              <Building2 className="h-2.5 w-2.5" />
              {org}
            </span>
          ))}

          {(locations.length > 3 || organizations.length > 3) && (
            <span className="text-[10px] text-muted-foreground">
              +{locations.length + organizations.length - 6} more
            </span>
          )}
        </div>
      )}

      {/* Link */}
      <div className="mt-2">
        <a
          href={`https://t.me/c/${message.channelId}/${message.telegramMessageId}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-3 w-3" />
          View on Telegram
        </a>
      </div>
    </div>
  );
}

// ============================================================================
// Utilities
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}
