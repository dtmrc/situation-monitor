/**
 * Connection Status Component
 *
 * Displays WebSocket connection status with:
 * - LIVE / RECONNECTING / OFFLINE states
 * - Retry counter
 * - Manual reconnect button
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { RefreshCw, Wifi, WifiOff, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ConnectionState } from '@/hooks/useWebSocketReconnect';
import { cn } from '@/lib/utils';

const statusVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      state: {
        connected: 'bg-green-500/10 text-green-400 border border-green-500/20',
        connecting: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
        reconnecting: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        disconnected: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
        error: 'bg-red-500/10 text-red-400 border border-red-500/20',
      },
    },
    defaultVariants: {
      state: 'disconnected',
    },
  }
);

const pulseVariants = cva('h-2 w-2 rounded-full', {
  variants: {
    state: {
      connected: 'bg-green-400 animate-pulse',
      connecting: 'bg-blue-400 animate-ping',
      reconnecting: 'bg-amber-400 animate-pulse',
      disconnected: 'bg-gray-400',
      error: 'bg-red-400',
    },
  },
  defaultVariants: {
    state: 'disconnected',
  },
});

const statusLabels: Record<ConnectionState, string> = {
  connected: 'LIVE',
  connecting: 'CONNECTING',
  reconnecting: 'RECONNECTING',
  disconnected: 'OFFLINE',
  error: 'ERROR',
};

export interface ConnectionStatusProps extends VariantProps<typeof statusVariants> {
  /** Current connection state */
  state: ConnectionState;
  /** Number of retry attempts */
  retryCount?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Callback for manual reconnect */
  onReconnect?: () => void;
  /** Show compact version */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

export function ConnectionStatus({
  state,
  retryCount = 0,
  maxRetries = 10,
  onReconnect,
  compact = false,
  className,
}: ConnectionStatusProps) {
  const showRetryInfo = state === 'reconnecting' && retryCount > 0;
  const showReconnectButton = state === 'error' || state === 'disconnected';

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(statusVariants({ state }), 'px-1.5 py-0.5', className)}>
              <span className={pulseVariants({ state })} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium">{statusLabels[state]}</p>
            {showRetryInfo && (
              <p className="text-xs text-muted-foreground">
                Attempt {retryCount} of {maxRetries}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={statusVariants({ state })}>
        <span className={pulseVariants({ state })} />
        <span>{statusLabels[state]}</span>
        {showRetryInfo && (
          <span className="text-[10px] opacity-75">
            ({retryCount}/{maxRetries})
          </span>
        )}
      </div>

      {showReconnectButton && onReconnect && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onReconnect} className="h-6 w-6 p-0">
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="sr-only">Reconnect</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reconnect</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

/**
 * Connection Status Icon (for header/toolbar)
 */
export function ConnectionStatusIcon({
  state,
  className,
}: {
  state: ConnectionState;
  className?: string;
}) {
  const iconClass = cn('h-4 w-4', className);

  switch (state) {
    case 'connected':
      return <Wifi className={cn(iconClass, 'text-green-400')} />;
    case 'connecting':
      return <Loader2 className={cn(iconClass, 'text-blue-400 animate-spin')} />;
    case 'reconnecting':
      return <RefreshCw className={cn(iconClass, 'text-amber-400 animate-spin')} />;
    case 'error':
      return <WifiOff className={cn(iconClass, 'text-red-400')} />;
    default:
      return <WifiOff className={cn(iconClass, 'text-gray-400')} />;
  }
}

/**
 * Connection Status Badge (minimal inline indicator)
 */
export function ConnectionStatusBadge({
  state,
  className,
}: {
  state: ConnectionState;
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex h-5 items-center gap-1 rounded border px-1.5 text-[10px] font-medium uppercase',
              {
                'border-green-500/30 bg-green-500/10 text-green-400': state === 'connected',
                'border-blue-500/30 bg-blue-500/10 text-blue-400': state === 'connecting',
                'border-amber-500/30 bg-amber-500/10 text-amber-400': state === 'reconnecting',
                'border-gray-500/30 bg-gray-500/10 text-gray-400': state === 'disconnected',
                'border-red-500/30 bg-red-500/10 text-red-400': state === 'error',
              },
              className
            )}
          >
            <ConnectionStatusIcon state={state} className="h-3 w-3" />
            <span className="hidden sm:inline">{statusLabels[state]}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Connection: {statusLabels[state]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
