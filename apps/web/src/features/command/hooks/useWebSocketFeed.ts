import { useCallback, useEffect, useRef } from 'react';

import { useMapStore } from '../store';
import type {
  Alert,
  AlertPayload,
  MapMarker,
  MarkerUpdatePayload,
  TrackUpdatePayload,
  WsMessage,
} from '../types';

/**
 * WebSocket hook for real-time map updates
 *
 * Connects to /api/ws/map/:projectId and handles:
 * - marker_update: Add/update/remove markers
 * - alert: New alert notifications
 * - track_update: Maritime/flight track updates
 * - nai_update: Named Area of Interest updates
 *
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Connection status updates to store
 * - Message parsing and dispatch to store
 */

interface UseWebSocketFeedOptions {
  /** Project ID for the WebSocket connection */
  projectId?: string;
  /** Whether to auto-connect on mount */
  autoConnect?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

const WS_BASE_URL = (import.meta.env.VITE_WS_URL as string) || 'ws://localhost:3001';
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;

export function useWebSocketFeed(options: UseWebSocketFeedOptions = {}) {
  const { projectId, autoConnect = true, debug = false } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const { setWsConnected, addMarker, updateMarker, removeMarker, addAlert, setTracks, tracks } =
    useMapStore();

  // Log helper
  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) {
        console.log('[WebSocket]', ...args);
      }
    },
    [debug]
  );

  // Handle incoming messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string) as WsMessage;
        log('Received:', message.type, message.payload);

        switch (message.type) {
          case 'marker_update': {
            const payload = message.payload as MarkerUpdatePayload;
            switch (payload.action) {
              case 'add':
                if (payload.marker) {
                  addMarker(payload.marker);
                }
                break;
              case 'update':
                if (payload.marker) {
                  updateMarker(payload.markerId, payload.marker);
                }
                break;
              case 'remove':
                removeMarker(payload.markerId);
                break;
            }
            break;
          }

          case 'alert': {
            const payload = message.payload as AlertPayload;
            addAlert(payload);
            break;
          }

          case 'track_update': {
            const payload = message.payload as TrackUpdatePayload;
            // For track updates, we update the tracks array directly
            if (payload.action === 'update' && payload.track) {
              const updatedTracks = tracks.map((t) =>
                t.id === payload.trackId ? { ...t, ...payload.track } : t
              );
              setTracks(updatedTracks);
            } else if (payload.action === 'add' && payload.track) {
              setTracks([...tracks, payload.track]);
            } else if (payload.action === 'remove') {
              setTracks(tracks.filter((t) => t.id !== payload.trackId));
            }
            break;
          }

          case 'nai_update': {
            // NAI updates are handled separately, typically via REST API refresh
            log('NAI update received - refresh NAIs');
            break;
          }

          default:
            log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    },
    [addMarker, updateMarker, removeMarker, addAlert, setTracks, tracks, log]
  );

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('Already connected');
      return;
    }

    const url = projectId ? `${WS_BASE_URL}/api/ws/map/${projectId}` : `${WS_BASE_URL}/api/ws/map`;

    log('Connecting to:', url);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        log('Connected');
        setWsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onclose = (event) => {
        log('Disconnected:', event.code, event.reason);
        setWsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current);
          log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          log('Max reconnection attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.onmessage = handleMessage;

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      setWsConnected(false);
    }
  }, [projectId, handleMessage, setWsConnected, log]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (wsRef.current) {
      log('Disconnecting');
      wsRef.current.close();
      wsRef.current = null;
    }

    setWsConnected(false);
    reconnectAttempts.current = 0;
  }, [setWsConnected, log]);

  // Send message to server
  const send = useCallback(
    (type: string, payload: unknown) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
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

  // Reconnect when projectId changes
  useEffect(() => {
    if (wsRef.current && projectId) {
      disconnect();
      connect();
    }
  }, [projectId, connect, disconnect]);

  return {
    connect,
    disconnect,
    send,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}

/**
 * Mock data generator for testing without a backend
 * Generates random markers and alerts
 */
export function useMockDataFeed() {
  const { addMarker, addAlert, setOverview } = useMapStore();

  useEffect(() => {
    // Set initial overview data
    setOverview({
      activeThreats: 3,
      openPirs: 7,
      naisMonitored: 12,
      activeAlerts: 2,
      lastUpdate: new Date().toISOString(),
    });

    // Add some initial markers
    const initialMarkers: MapMarker[] = [
      {
        id: 'marker-1',
        type: 'threat',
        coordinates: [2.3522, 48.8566] as [number, number],
        name: 'Threat Alpha',
        severity: 'high',
        status: 'active',
      },
      {
        id: 'marker-2',
        type: 'nai',
        coordinates: [2.2945, 48.8584] as [number, number],
        name: 'NAI-001',
        severity: 'medium',
        status: 'active',
      },
      {
        id: 'marker-3',
        type: 'asset',
        coordinates: [2.3488, 48.8534] as [number, number],
        name: 'Asset Bravo',
        status: 'active',
      },
    ];

    initialMarkers.forEach(addMarker);

    // Simulate periodic alerts
    const alertInterval = setInterval(() => {
      const randomAlert: Alert = {
        id: `alert-${Date.now()}`,
        type: 'tripwire',
        severity: Math.random() > 0.7 ? 'critical' : 'medium',
        title: `Alert ${Math.floor(Math.random() * 100)}`,
        message: 'Automated alert from monitoring system',
        coordinates: [
          2.3522 + (Math.random() - 0.5) * 0.1,
          48.8566 + (Math.random() - 0.5) * 0.1,
        ] as [number, number],
        timestamp: new Date().toISOString(),
        acknowledged: false,
      };

      addAlert(randomAlert);
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(alertInterval);
    };
  }, [addMarker, addAlert, setOverview]);
}
