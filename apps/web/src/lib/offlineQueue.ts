/**
 * Offline Request Queue
 *
 * Queues mutations when offline and replays them when the connection is restored.
 * Uses localStorage for persistence across page reloads.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const QUEUE_KEY = 'offline_request_queue';

/**
 * Represents a queued request
 */
export interface QueuedRequest {
  id: string;
  endpoint: string;
  method: string;
  body?: unknown;
  timestamp: number;
  retryCount: number;
}

/**
 * Result of processing a queued request
 */
export interface QueueProcessResult {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Events emitted by the offline queue
 */
export type OfflineQueueEvent =
  | { type: 'online' }
  | { type: 'offline' }
  | { type: 'enqueued'; request: QueuedRequest }
  | { type: 'processing'; count: number }
  | { type: 'processed'; results: QueueProcessResult[] };

type OfflineQueueListener = (event: OfflineQueueEvent) => void;

/**
 * Offline queue manager for handling requests when network is unavailable
 */
export class OfflineQueue {
  private isOnline = navigator.onLine;
  private listeners: Set<OfflineQueueListener> = new Set();
  private processing = false;

  constructor() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Subscribe to queue events
   */
  subscribe(listener: OfflineQueueListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: OfflineQueueEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Handle coming back online
   */
  private handleOnline(): void {
    this.isOnline = true;
    this.emit({ type: 'online' });
    void this.processQueue();
  }

  /**
   * Handle going offline
   */
  private handleOffline(): void {
    this.isOnline = false;
    this.emit({ type: 'offline' });
  }

  /**
   * Check if currently online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Get the current queue
   */
  getQueue(): QueuedRequest[] {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      return stored ? (JSON.parse(stored) as QueuedRequest[]) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save the queue to localStorage
   */
  private setQueue(queue: QueuedRequest[]): void {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  /**
   * Add a request to the queue
   */
  enqueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): void {
    const queue = this.getQueue();

    const queuedRequest: QueuedRequest = {
      ...request,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    queue.push(queuedRequest);
    this.setQueue(queue);

    this.emit({ type: 'enqueued', request: queuedRequest });
  }

  /**
   * Remove a request from the queue
   */
  remove(id: string): void {
    const queue = this.getQueue();
    this.setQueue(queue.filter((r) => r.id !== id));
  }

  /**
   * Clear all requests from the queue
   */
  clear(): void {
    localStorage.removeItem(QUEUE_KEY);
  }

  /**
   * Get the number of queued requests
   */
  getQueueLength(): number {
    return this.getQueue().length;
  }

  /**
   * Process all queued requests
   */
  async processQueue(): Promise<QueueProcessResult[]> {
    if (!this.isOnline || this.processing) {
      return [];
    }

    const queue = this.getQueue();

    if (queue.length === 0) {
      return [];
    }

    this.processing = true;
    this.emit({ type: 'processing', count: queue.length });

    const results: QueueProcessResult[] = [];

    for (const request of queue) {
      try {
        const response = await fetch(`${API_BASE}${request.endpoint}`, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            // Note: Auth token needs to be added by caller
          },
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        if (response.ok) {
          results.push({ id: request.id, success: true });
          this.remove(request.id);
        } else {
          // Check if error is permanent (4xx) or temporary (5xx)
          if (response.status >= 400 && response.status < 500) {
            // Permanent error, remove from queue
            results.push({
              id: request.id,
              success: false,
              error: `HTTP ${response.status}`,
            });
            this.remove(request.id);
          } else {
            // Temporary error, increment retry count
            const updatedQueue = this.getQueue().map((r) =>
              r.id === request.id ? { ...r, retryCount: r.retryCount + 1 } : r
            );
            this.setQueue(updatedQueue);
            results.push({
              id: request.id,
              success: false,
              error: `HTTP ${response.status}, will retry`,
            });
          }
        }
      } catch (error) {
        // Network error, keep in queue for retry
        const updatedQueue = this.getQueue().map((r) =>
          r.id === request.id ? { ...r, retryCount: r.retryCount + 1 } : r
        );
        this.setQueue(updatedQueue);
        results.push({
          id: request.id,
          success: false,
          error: error instanceof Error ? error.message : 'Network error',
        });
      }
    }

    this.processing = false;
    this.emit({ type: 'processed', results });

    // Report results
    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;

    if (failed > 0) {
      console.log(`Offline queue: ${successful} succeeded, ${failed} failed/pending`);
    }

    return results;
  }

  /**
   * Make a request that will be queued if offline
   *
   * @returns The response data, or { queued: true } if the request was queued
   */
  async queueableRequest<T>(
    endpoint: string,
    method: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T | { queued: true }> {
    if (!this.isOnline) {
      this.enqueue({ endpoint, method, body });
      return { queued: true };
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}

/**
 * Singleton instance of the offline queue
 */
export const offlineQueue = new OfflineQueue();

/**
 * React hook for offline queue state
 */
export function useOfflineQueue() {
  const [isOnline, setIsOnline] = React.useState(offlineQueue.getIsOnline());
  const [queueLength, setQueueLength] = React.useState(offlineQueue.getQueueLength());

  React.useEffect(() => {
    const unsubscribe = offlineQueue.subscribe((event) => {
      if (event.type === 'online') {
        setIsOnline(true);
      } else if (event.type === 'offline') {
        setIsOnline(false);
      } else if (event.type === 'enqueued' || event.type === 'processed') {
        setQueueLength(offlineQueue.getQueueLength());
      }
    });

    return unsubscribe;
  }, []);

  return {
    isOnline,
    queueLength,
    processQueue: () => offlineQueue.processQueue(),
    clear: () => offlineQueue.clear(),
  };
}

// Import React for the hook
import * as React from 'react';
