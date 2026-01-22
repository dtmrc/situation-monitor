import { queryClient } from './queryClient';
import { ApiError } from './retry';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const API_VERSION = '1.0';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Queue entry for failed requests waiting for token refresh
 */
interface QueueEntry {
  resolve: () => void;
  reject: (error: Error) => void;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<void> | null = null;
  private failedQueue: QueueEntry[] = [];

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  getAccessToken(): string | null {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('accessToken');
    }
    return this.accessToken;
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  private clearTokens(): void {
    this.accessToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    queryClient.clear();
  }

  /**
   * Process the queue of failed requests after token refresh
   */
  private processQueue(error: Error | null): void {
    this.failedQueue.forEach((entry) => {
      if (error) {
        entry.reject(error);
      } else {
        entry.resolve();
      }
    });
    this.failedQueue = [];
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshTokens(): Promise<void> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = (await response.json()) as { accessToken: string; refreshToken: string };
    this.setAccessToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  }

  /**
   * Make an API request with automatic token refresh and timeout
   */
  async request<T>(endpoint: string, options: RequestInit & { timeout?: number } = {}): Promise<T> {
    const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;

    const makeRequest = async (): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const token = this.getAccessToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'X-API-Version': API_VERSION,
          ...fetchOptions.headers,
        };

        if (token) {
          (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    let response: Response;

    try {
      response = await makeRequest();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(408, 'TIMEOUT', `Request timed out after ${timeout}ms`);
      }
      throw error;
    }

    // Handle 401 - attempt token refresh
    if (response.status === 401 && this.getRefreshToken()) {
      // If already refreshing, wait for it
      if (this.refreshPromise) {
        try {
          await new Promise<void>((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          });
          response = await makeRequest();
        } catch {
          // Refresh failed while we were waiting
          this.clearTokens();
          window.location.href = '/login';
          throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
        }
      } else {
        // Start refresh process
        this.refreshPromise = this.refreshTokens()
          .then(() => {
            this.processQueue(null);
          })
          .catch((error: Error) => {
            this.processQueue(error);
            throw error;
          })
          .finally(() => {
            this.refreshPromise = null;
          });

        try {
          await this.refreshPromise;
          response = await makeRequest();
        } catch {
          // Refresh failed, redirect to login
          this.clearTokens();
          window.location.href = '/login';
          throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
        }
      }
    }

    // Check for deprecation warnings
    const deprecation = response.headers.get('Deprecation');
    const sunset = response.headers.get('Sunset');

    if (deprecation === 'true') {
      console.warn(
        `API Deprecation Warning: ${endpoint} will be sunset on ${sunset}. ` +
          `Please migrate to ${response.headers.get('Link') || 'new endpoint'}`
      );
    }

    if (!response.ok) {
      const error = (await response.json().catch(() => ({
        error: { message: 'Request failed', code: 'UNKNOWN' },
      }))) as { error?: { message?: string; code?: string; details?: unknown } };

      throw new ApiError(
        response.status,
        error.error?.code || 'UNKNOWN',
        error.error?.message || 'Request failed',
        error.error?.details
      );
    }

    return response.json() as Promise<T>;
  }

  get<T>(endpoint: string, options?: RequestInit & { timeout?: number }) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown, options?: RequestInit & { timeout?: number }) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data: unknown, options?: RequestInit & { timeout?: number }) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string, options?: RequestInit & { timeout?: number }) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// Type-safe API functions
export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', data),

  register: (data: { email: string; password: string; name: string }) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', data),

  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),

  me: () => api.get<{ user: User }>('/auth/me'),
};

export const projectsApi = {
  list: () => api.get<{ projects: Project[] }>('/projects'),
  get: (id: string) => api.get<{ project: Project }>(`/projects/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post<{ project: Project }>('/projects', data),
  update: (id: string, data: Partial<Project>) =>
    api.patch<{ project: Project }>(`/projects/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/projects/${id}`),
};

// Maritime/AIS vessel tracking types
export interface VesselState {
  mmsi: string;
  name: string;
  latitude: number;
  longitude: number;
  course: number;
  speed: number;
  heading: number;
  shipType: number;
  shipTypeLabel: string;
  shipCategory?: string;
  navStatus: number;
  navStatusLabel: string;
  destination?: string;
  imo?: string;
  callsign?: string;
  draught?: number;
  severity: string;
  isMoving: boolean;
  alerts?: string[];
}

export interface MaritimeDataResponse {
  vessels: VesselState[];
  timestamp: string;
  count: number;
}

export interface VesselTrackPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed: number;
  heading: number;
}

export interface VesselTrackResponse {
  mmsi: string;
  name: string;
  track: VesselTrackPoint[];
  startTime: string;
  endTime: string;
}

// Maritime API functions
export const maritimeApi = {
  /**
   * Fetch maritime vessel data for a project
   */
  getData: (projectId: string, options?: { shipTypes?: number[]; severity?: string[] }) => {
    const params = new URLSearchParams();
    if (options?.shipTypes?.length) {
      params.set('shipTypes', options.shipTypes.join(','));
    }
    if (options?.severity?.length) {
      params.set('severity', options.severity.join(','));
    }
    const query = params.toString();
    return api.get<MaritimeDataResponse>(
      `/projects/${projectId}/feeds/maritime${query ? `?${query}` : ''}`
    );
  },

  /**
   * Fetch vessel details by MMSI
   */
  getVessel: (projectId: string, mmsi: string) =>
    api.get<{ vessel: VesselState }>(`/projects/${projectId}/feeds/maritime/${mmsi}`),

  /**
   * Fetch vessel track history
   */
  getVesselTrack: (projectId: string, mmsi: string, hours = 24) =>
    api.get<VesselTrackResponse>(
      `/projects/${projectId}/feeds/maritime/${mmsi}/track?hours=${hours}`
    ),
};
