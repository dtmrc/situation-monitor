/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/**
 * Enhanced WebSocket Hook with Reconnection
 *
 * Features:
 * - Exponential backoff with jitter
 * - Max retry limit
 * - Connection state management
 * - Token-based authentication (first message)
 * - Heartbeat handling
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface UseWebSocketOptions {
  /** WebSocket URL */
  url: string;
  /** Auth token to send on connection */
  token?: string;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Enable debug logging */
  debug?: boolean;
  /** Max reconnection attempts */
  maxRetries?: number;
  /** Initial reconnection delay in ms */
  initialDelay?: number;
  /** Maximum reconnection delay in ms */
  maxDelay?: number;
  /** Heartbeat interval in ms */
  heartbeatInterval?: number;
  /** Message handler */
  onMessage?: (event: MessageEvent) => void;
  /** Connection state change handler */
  onStateChange?: (state: ConnectionState) => void;
  /** Error handler */
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Number of reconnection attempts */
  retryCount: number;
  /** Send a message */
  send: (type: string, payload: unknown) => void;
  /** Manually connect */
  connect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** Force reconnect */
  reconnect: () => void;
  /** Whether currently connected */
  isConnected: boolean;
}

const DEFAULT_MAX_RETRIES = 10;
const DEFAULT_INITIAL_DELAY = 1000;
const DEFAULT_MAX_DELAY = 30000;
const DEFAULT_HEARTBEAT_INTERVAL = 25000;

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, initialDelay: number, maxDelay: number): number {
  // Exponential backoff: 2^attempt * initialDelay
  const exponentialDelay = Math.pow(2, attempt) * initialDelay;
  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  // Add jitter (±25%)
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
}

export function useWebSocketReconnect(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    token,
    autoConnect = true,
    debug = false,
    maxRetries = DEFAULT_MAX_RETRIES,
    initialDelay = DEFAULT_INITIAL_DELAY,
    maxDelay = DEFAULT_MAX_DELAY,
    heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL,
    onMessage,
    onStateChange,
    onError,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [retryCount, setRetryCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isIntentionalDisconnect = useRef(false);

  // Log helper
  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) {
        console.log('[WebSocket]', ...args);
      }
    },
    [debug]
  );

  // Update connection state and notify
  const updateState = useCallback(
    (state: ConnectionState) => {
      setConnectionState(state);
      onStateChange?.(state);
    },
    [onStateChange]
  );

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    clearInterval(heartbeatIntervalRef.current!);
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
        log('Sent heartbeat');
      }
    }, heartbeatInterval);
  }, [heartbeatInterval, log]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('Already connected');
      return;
    }

    isIntentionalDisconnect.current = false;
    updateState('connecting');
    log('Connecting to:', url);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        log('Connection opened');
        setRetryCount(0);

        // Send auth token as first message
        if (token) {
          ws.send(JSON.stringify({ type: 'auth', token }));
          log('Sent auth token');
        }

        updateState('connected');
        startHeartbeat();
      };

      ws.onclose = (event) => {
        log('Connection closed:', event.code, event.reason);
        clearTimers();

        if (isIntentionalDisconnect.current) {
          updateState('disconnected');
          return;
        }

        // Attempt reconnection
        if (retryCount < maxRetries) {
          const delay = calculateDelay(retryCount, initialDelay, maxDelay);
          log(`Reconnecting in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

          updateState('reconnecting');
          setRetryCount((c) => c + 1);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          log('Max retries reached');
          updateState('error');
        }
      };

      ws.onerror = (error) => {
        log('Connection error:', error);
        onError?.(error);
      };

      ws.onmessage = (event) => {
        // Handle pong messages
        try {
          const data = JSON.parse(event.data as string);
          if (data.type === 'pong') {
            log('Received pong');
            return;
          }
        } catch {
          // Not JSON, pass through
        }

        onMessage?.(event);
      };

      wsRef.current = ws;
    } catch (error) {
      log('Failed to create WebSocket:', error);
      updateState('error');
    }
  }, [
    url,
    token,
    retryCount,
    maxRetries,
    initialDelay,
    maxDelay,
    log,
    updateState,
    clearTimers,
    startHeartbeat,
    onMessage,
    onError,
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    log('Disconnecting');
    isIntentionalDisconnect.current = true;
    clearTimers();

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }

    setRetryCount(0);
    updateState('disconnected');
  }, [log, clearTimers, updateState]);

  // Force reconnect
  const reconnect = useCallback(() => {
    log('Force reconnecting');
    disconnect();
    setRetryCount(0);
    setTimeout(connect, 100);
  }, [disconnect, connect, log]);

  // Send message
  const send = useCallback(
    (type: string, payload: unknown) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({
          type,
          payload,
          timestamp: new Date().toISOString(),
        });
        wsRef.current.send(message);
        log('Sent:', type, payload);
      } else {
        console.warn('[WebSocket] Cannot send - not connected');
      }
    },
    [log]
  );

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Reconnect when URL or token changes
  useEffect(() => {
    if (wsRef.current && connectionState === 'connected') {
      reconnect();
    }
  }, [url, token, connectionState, reconnect]);

  return {
    connectionState,
    retryCount,
    send,
    connect,
    disconnect,
    reconnect,
    isConnected: connectionState === 'connected',
  };
}
