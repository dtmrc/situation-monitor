/**
 * WebSocket Shutdown Manager
 *
 * Handles graceful shutdown of WebSocket connections.
 * Drains connections with proper close codes.
 */

import type { WebSocket, WebSocketServer } from 'ws';

import { stopHeartbeatManager } from './heartbeat';

// WebSocket close codes
export const CLOSE_CODES = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  INVALID_DATA: 1003,
  POLICY_VIOLATION: 1008,
  MESSAGE_TOO_BIG: 1009,
  INTERNAL_ERROR: 1011,
  SERVICE_RESTART: 1012,
  TRY_AGAIN_LATER: 1013,
} as const;

// Track all WebSocket servers for shutdown
const servers = new Set<WebSocketServer>();
const connections = new Set<WebSocket>();

/**
 * Register a WebSocket server for shutdown tracking
 */
export function registerServer(server: WebSocketServer): void {
  servers.add(server);
}

/**
 * Unregister a WebSocket server
 */
export function unregisterServer(server: WebSocketServer): void {
  servers.delete(server);
}

/**
 * Register a connection for shutdown tracking
 */
export function registerConnection(ws: WebSocket): void {
  connections.add(ws);

  ws.on('close', () => {
    connections.delete(ws);
  });
}

/**
 * Unregister a connection
 */
export function unregisterConnection(ws: WebSocket): void {
  connections.delete(ws);
}

/**
 * Get current connection count
 */
export function getConnectionCount(): number {
  return connections.size;
}

/**
 * Broadcast a message to all connections
 */
export function broadcastToAll(message: string): void {
  for (const ws of connections) {
    if (ws.readyState === 1) {
      // WebSocket.OPEN
      try {
        ws.send(message);
      } catch {
        // Ignore send errors during broadcast
      }
    }
  }
}

/**
 * Gracefully shutdown all WebSocket connections
 */
export async function shutdownWebSockets(
  closeCode = CLOSE_CODES.SERVICE_RESTART,
  reason = 'Server shutting down'
): Promise<void> {
  console.log(`[WebSocket] Shutting down ${connections.size} connections...`);

  // Stop heartbeat manager first
  stopHeartbeatManager();

  // Send close message to all clients
  const closeMessage = JSON.stringify({
    type: 'server_shutdown',
    payload: { reason },
    timestamp: new Date().toISOString(),
  });

  // Notify all clients about shutdown
  for (const ws of connections) {
    if (ws.readyState === 1) {
      try {
        ws.send(closeMessage);
      } catch {
        // Ignore errors
      }
    }
  }

  // Give clients a moment to receive the message
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Close all connections
  const closePromises: Promise<void>[] = [];

  for (const ws of connections) {
    closePromises.push(
      new Promise<void>((resolve) => {
        try {
          // Set up close listener
          const timeout = setTimeout(() => {
            // Force terminate if not closed within 5 seconds
            ws.terminate();
            resolve();
          }, 5000);

          ws.once('close', () => {
            clearTimeout(timeout);
            resolve();
          });

          // Initiate close
          ws.close(closeCode, reason);
        } catch {
          resolve();
        }
      })
    );
  }

  // Wait for all connections to close
  await Promise.all(closePromises);

  // Close all servers
  for (const server of servers) {
    await new Promise<void>((resolve) => {
      server.close((err) => {
        if (err) {
          console.error('[WebSocket] Error closing server:', err);
        }
        resolve();
      });
    });
  }

  // Clear tracking sets
  connections.clear();
  servers.clear();

  console.log('[WebSocket] All connections closed');
}

/**
 * Close a specific connection with a reason
 */
export function closeConnection(ws: WebSocket, closeCode: number, reason: string): void {
  if (ws.readyState === 1) {
    // Send close message
    const closeMessage = JSON.stringify({
      type: 'connection_close',
      payload: { reason, code: closeCode },
      timestamp: new Date().toISOString(),
    });

    try {
      ws.send(closeMessage);
    } catch {
      // Ignore errors
    }

    // Close the connection
    setTimeout(() => {
      try {
        ws.close(closeCode, reason);
      } catch {
        ws.terminate();
      }
    }, 100);
  }

  connections.delete(ws);
}
