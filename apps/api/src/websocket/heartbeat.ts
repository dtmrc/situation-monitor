/**
 * WebSocket Heartbeat Manager
 *
 * Manages keep-alive pings for WebSocket connections.
 * Detects and handles stale connections.
 */

import type { WebSocket } from 'ws';

// Heartbeat configuration
export interface HeartbeatConfig {
  /** Interval between pings (ms) */
  pingInterval: number;
  /** Time to wait for pong before considering connection dead (ms) */
  pongTimeout: number;
}

const DEFAULT_CONFIG: HeartbeatConfig = {
  pingInterval: 30000, // 30 seconds
  pongTimeout: 10000, // 10 seconds
};

// Connection state
interface ConnectionState {
  ws: WebSocket;
  isAlive: boolean;
  lastPing: number;
  lastPong: number;
  missedPings: number;
  onDisconnect?: () => void;
}

/**
 * Heartbeat Manager
 */
export class HeartbeatManager {
  private readonly config: HeartbeatConfig;
  private readonly connections = new Map<string, ConnectionState>();
  private intervalId?: NodeJS.Timeout;

  constructor(config: Partial<HeartbeatConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the heartbeat manager
   */
  start(): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.checkConnections();
    }, this.config.pingInterval);

    console.log(`[Heartbeat] Started with ${this.config.pingInterval}ms interval`);
  }

  /**
   * Stop the heartbeat manager
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('[Heartbeat] Stopped');
    }
  }

  /**
   * Register a connection for heartbeat monitoring
   */
  register(connectionId: string, ws: WebSocket, onDisconnect?: () => void): void {
    const state: ConnectionState = {
      ws,
      isAlive: true,
      lastPing: 0,
      lastPong: Date.now(),
      missedPings: 0,
      onDisconnect,
    };

    this.connections.set(connectionId, state);

    // Handle pong responses
    ws.on('pong', () => {
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.isAlive = true;
        conn.lastPong = Date.now();
        conn.missedPings = 0;
      }
    });
  }

  /**
   * Unregister a connection
   */
  unregister(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  /**
   * Handle a manual pong message from client
   */
  handlePong(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.isAlive = true;
      conn.lastPong = Date.now();
      conn.missedPings = 0;
    }
  }

  /**
   * Check all connections and send pings
   */
  private checkConnections(): void {
    const now = Date.now();
    const deadConnections: string[] = [];

    for (const [connectionId, state] of this.connections.entries()) {
      // Check if connection is still alive
      if (state.ws.readyState !== 1) {
        // WebSocket.OPEN = 1
        deadConnections.push(connectionId);
        continue;
      }

      // Check for missed pings
      if (!state.isAlive) {
        state.missedPings++;

        // Too many missed pings - connection is dead
        if (state.missedPings >= 2) {
          console.log(
            `[Heartbeat] Connection ${connectionId} dead (missed ${state.missedPings} pings)`
          );
          deadConnections.push(connectionId);
          continue;
        }
      }

      // Send ping
      state.isAlive = false;
      state.lastPing = now;

      try {
        state.ws.ping();
      } catch (error) {
        console.error(`[Heartbeat] Failed to ping ${connectionId}:`, error);
        deadConnections.push(connectionId);
      }
    }

    // Clean up dead connections
    for (const connectionId of deadConnections) {
      this.terminateConnection(connectionId);
    }
  }

  /**
   * Terminate a connection
   */
  private terminateConnection(connectionId: string): void {
    const state = this.connections.get(connectionId);
    if (!state) {
      return;
    }

    // Call disconnect callback
    if (state.onDisconnect) {
      try {
        state.onDisconnect();
      } catch (error) {
        console.error(`[Heartbeat] Error in disconnect callback:`, error);
      }
    }

    // Close the WebSocket
    try {
      state.ws.terminate();
    } catch {
      // Already closed
    }

    this.connections.delete(connectionId);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    total: number;
    alive: number;
    unhealthy: number;
  } {
    let alive = 0;
    let unhealthy = 0;

    for (const state of this.connections.values()) {
      if (state.isAlive) {
        alive++;
      } else if (state.missedPings > 0) {
        unhealthy++;
      }
    }

    return {
      total: this.connections.size,
      alive,
      unhealthy,
    };
  }

  /**
   * Get number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}

// Global heartbeat manager instance
let heartbeatManager: HeartbeatManager | null = null;

/**
 * Get or create the global heartbeat manager
 */
export function getHeartbeatManager(): HeartbeatManager {
  if (!heartbeatManager) {
    heartbeatManager = new HeartbeatManager();
    heartbeatManager.start();
  }
  return heartbeatManager;
}

/**
 * Stop the global heartbeat manager
 */
export function stopHeartbeatManager(): void {
  if (heartbeatManager) {
    heartbeatManager.stop();
    heartbeatManager = null;
  }
}
