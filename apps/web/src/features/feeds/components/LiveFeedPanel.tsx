/**
 * Live Feed Panel
 *
 * Displays real-time feed items with:
 * - Scrollable feed list
 * - Type filtering tabs
 * - Severity indicators
 * - Click to fly to location
 */

import { formatDistanceToNow } from 'date-fns';
import {
  Newspaper,
  Plane,
  Ship,
  AlertTriangle,
  Flame,
  MessageSquare,
  MapPin,
  Clock,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { useState, useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type FeedType =
  | 'news'
  | 'flight'
  | 'maritime'
  | 'civil_unrest'
  | 'fire'
  | 'telegram'
  | 'all';

export type FeedSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface FeedItem {
  id: string;
  type: Exclude<FeedType, 'all'>;
  title: string;
  content?: string;
  url?: string;
  timestamp: string;
  location?: {
    lat: number;
    lng: number;
    name?: string;
  };
  severity: FeedSeverity;
  metadata?: Record<string, unknown>;
}

export interface LiveFeedPanelProps {
  items: FeedItem[];
  onItemClick?: (item: FeedItem) => void;
  onFlyToLocation?: (lat: number, lng: number) => void;
  className?: string;
  maxHeight?: string;
}

const feedTypeConfig: Record<
  Exclude<FeedType, 'all'>,
  { icon: typeof Newspaper; label: string; color: string }
> = {
  news: { icon: Newspaper, label: 'News', color: 'text-blue-400' },
  flight: { icon: Plane, label: 'Flight', color: 'text-cyan-400' },
  maritime: { icon: Ship, label: 'Maritime', color: 'text-teal-400' },
  civil_unrest: { icon: AlertTriangle, label: 'Civil Unrest', color: 'text-amber-400' },
  fire: { icon: Flame, label: 'Fire', color: 'text-orange-400' },
  telegram: { icon: MessageSquare, label: 'Telegram', color: 'text-purple-400' },
};

const severityColors: Record<FeedSeverity, string> = {
  info: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function LiveFeedPanel({
  items,
  onItemClick,
  onFlyToLocation,
  className,
  maxHeight = '400px',
}: LiveFeedPanelProps) {
  const [activeFilter, setActiveFilter] = useState<FeedType>('all');

  const filteredItems =
    activeFilter === 'all' ? items : items.filter((item) => item.type === activeFilter);

  const handleFlyTo = useCallback(
    (item: FeedItem) => {
      if (item.location && onFlyToLocation) {
        onFlyToLocation(item.location.lat, item.location.lng);
      }
    },
    [onFlyToLocation]
  );

  return (
    <div className={cn('flex flex-col rounded-lg border border-border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium">Live Feed</span>
          <Badge variant="secondary" className="text-xs">
            {filteredItems.length}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2">
          <Filter className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
        <FilterButton active={activeFilter === 'all'} onClick={() => setActiveFilter('all')}>
          All
        </FilterButton>
        {(Object.keys(feedTypeConfig) as Exclude<FeedType, 'all'>[]).map((type) => {
          const config = feedTypeConfig[type];
          const count = items.filter((i) => i.type === type).length;
          return (
            <FilterButton
              key={type}
              active={activeFilter === type}
              onClick={() => setActiveFilter(type)}
              icon={config.icon}
              className={config.color}
            >
              {config.label}
              {count > 0 && <span className="ml-1 text-[10px] opacity-75">({count})</span>}
            </FilterButton>
          );
        })}
      </div>

      {/* Feed items */}
      <ScrollArea className="flex-1" style={{ maxHeight }}>
        <div className="divide-y divide-border">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Newspaper className="mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">No feed items</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <FeedItemCard
                key={item.id}
                item={item}
                onClick={() => onItemClick?.(item)}
                onFlyTo={() => handleFlyTo(item)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  icon: Icon,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  icon?: typeof Newspaper;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </button>
  );
}

function FeedItemCard({
  item,
  onClick,
  onFlyTo,
}: {
  item: FeedItem;
  onClick?: () => void;
  onFlyTo?: () => void;
}) {
  const config = feedTypeConfig[item.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'group cursor-pointer px-4 py-3 transition-colors hover:bg-muted/50',
        item.severity === 'critical' && 'border-l-2 border-l-red-500'
      )}
      onClick={onClick}
    >
      {/* Header row */}
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4 flex-shrink-0', config.color)} />
          <span
            className={cn(
              'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase',
              severityColors[item.severity]
            )}
          >
            {item.severity}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
        </div>
      </div>

      {/* Title */}
      <h4 className="mb-1 line-clamp-2 text-sm font-medium leading-tight">{item.title}</h4>

      {/* Content preview */}
      {item.content && (
        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{item.content}</p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2">
        {item.location && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFlyTo?.();
                  }}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <MapPin className="h-3 w-3" />
                  {item.location.name ||
                    `${item.location.lat.toFixed(2)}, ${item.location.lng.toFixed(2)}`}
                </button>
              </TooltipTrigger>
              <TooltipContent>Fly to location</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            Source
          </a>
        )}
      </div>
    </div>
  );
}
