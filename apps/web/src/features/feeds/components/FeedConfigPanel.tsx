/**
 * Feed Configuration Panel
 *
 * Manages feed subscriptions with:
 * - Feed list with enable/disable toggles
 * - Polling interval configuration
 * - Health status indicators
 * - Add/edit/delete feeds
 */

import { formatDistanceToNow } from 'date-fns';
import {
  Newspaper,
  Plane,
  Ship,
  AlertTriangle,
  Flame,
  MessageSquare,
  Settings,
  Plus,
  Trash2,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type FeedType =
  | 'news'
  | 'flight'
  | 'maritime'
  | 'civil_unrest'
  | 'fire'
  | 'telegram'
  | 'custom';

export type FeedHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface FeedConfig {
  id: string;
  name: string;
  type: FeedType;
  enabled: boolean;
  isPolling: boolean;
  pollInterval: number;
  lastFetchAt?: string;
  lastError?: string;
  errorCount: number;
  status: FeedHealthStatus;
}

export interface FeedConfigPanelProps {
  feeds: FeedConfig[];
  onToggleEnabled: (feedId: string, enabled: boolean) => void;
  onStartPolling: (feedId: string) => void;
  onStopPolling: (feedId: string) => void;
  onDelete: (feedId: string) => void;
  onEdit: (feedId: string) => void;
  onAddFeed: () => void;
  className?: string;
}

const feedTypeConfig: Record<FeedType, { icon: typeof Newspaper; label: string; color: string }> = {
  news: { icon: Newspaper, label: 'News', color: 'text-blue-400' },
  flight: { icon: Plane, label: 'Flight', color: 'text-cyan-400' },
  maritime: { icon: Ship, label: 'Maritime', color: 'text-teal-400' },
  civil_unrest: { icon: AlertTriangle, label: 'Civil Unrest', color: 'text-amber-400' },
  fire: { icon: Flame, label: 'Fire', color: 'text-orange-400' },
  telegram: { icon: MessageSquare, label: 'Telegram', color: 'text-purple-400' },
  custom: { icon: Settings, label: 'Custom', color: 'text-gray-400' },
};

const statusConfig: Record<
  FeedHealthStatus,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  healthy: { icon: CheckCircle2, color: 'text-green-400', label: 'Healthy' },
  degraded: { icon: AlertCircle, color: 'text-amber-400', label: 'Degraded' },
  unhealthy: { icon: AlertCircle, color: 'text-red-400', label: 'Unhealthy' },
};

function formatInterval(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export function FeedConfigPanel({
  feeds,
  onToggleEnabled,
  onStartPolling,
  onStopPolling,
  onDelete,
  onEdit,
  onAddFeed,
  className,
}: FeedConfigPanelProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const enabledCount = feeds.filter((f) => f.enabled).length;
  const pollingCount = feeds.filter((f) => f.isPolling).length;
  const unhealthyCount = feeds.filter((f) => f.status === 'unhealthy').length;

  return (
    <div className={cn('flex flex-col rounded-lg border border-border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Feed Configuration</span>
        </div>
        <Button onClick={onAddFeed} size="sm" className="h-7 gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add Feed
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 border-b border-border bg-muted/30 px-4 py-2 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Feeds:</span>
          <span className="font-medium">
            {enabledCount}/{feeds.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-muted-foreground">Polling:</span>
          <span className="font-medium">{pollingCount}</span>
        </div>
        {unhealthyCount > 0 && (
          <div className="flex items-center gap-1 text-red-400">
            <AlertCircle className="h-3 w-3" />
            <span>{unhealthyCount} unhealthy</span>
          </div>
        )}
      </div>

      {/* Feed list */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {feeds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Settings className="mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">No feeds configured</p>
              <Button onClick={onAddFeed} variant="link" size="sm" className="mt-2">
                Add your first feed
              </Button>
            </div>
          ) : (
            feeds.map((feed) => (
              <FeedConfigRow
                key={feed.id}
                feed={feed}
                onToggleEnabled={(enabled) => onToggleEnabled(feed.id, enabled)}
                onStartPolling={() => onStartPolling(feed.id)}
                onStopPolling={() => onStopPolling(feed.id)}
                onEdit={() => onEdit(feed.id)}
                onDelete={() => setDeleteConfirmId(feed.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feed</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feed? This action cannot be undone. All
              associated feed items will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  onDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeedConfigRow({
  feed,
  onToggleEnabled,
  onStartPolling,
  onStopPolling,
  onEdit,
  onDelete,
}: {
  feed: FeedConfig;
  onToggleEnabled: (enabled: boolean) => void;
  onStartPolling: () => void;
  onStopPolling: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeConfig = feedTypeConfig[feed.type];
  const TypeIcon = typeConfig.icon;
  const status = statusConfig[feed.status];
  const StatusIcon = status.icon;

  return (
    <div className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
      {/* Type icon */}
      <TypeIcon className={cn('h-5 w-5 flex-shrink-0', typeConfig.color)} />

      {/* Feed info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{feed.name}</span>
          <Badge variant="outline" className="text-[10px]">
            {typeConfig.label}
          </Badge>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatInterval(feed.pollInterval)}
          </span>
          {feed.lastFetchAt && (
            <span>
              Last fetch: {formatDistanceToNow(new Date(feed.lastFetchAt), { addSuffix: true })}
            </span>
          )}
          {feed.lastError && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    Error
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">{feed.lastError}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Status indicator */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <StatusIcon className={cn('h-4 w-4', status.color)} />
            </div>
          </TooltipTrigger>
          <TooltipContent>{status.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Polling control */}
      <div className="flex items-center gap-1">
        {feed.enabled && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={feed.isPolling ? onStopPolling : onStartPolling}
                >
                  {feed.isPolling ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{feed.isPolling ? 'Stop polling' : 'Start polling'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Enable/disable switch */}
      <Switch
        checked={feed.enabled}
        onCheckedChange={onToggleEnabled}
        className="data-[state=checked]:bg-green-600"
      />

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Configure</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
