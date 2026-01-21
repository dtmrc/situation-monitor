import { queryClient } from './queryClient';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private accessToken: string | null = null;

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

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getAccessToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({
        error: { message: 'Request failed', code: 'UNKNOWN' },
      }))) as { error?: { message?: string; code?: string; details?: unknown } };

      // Handle 401 - clear token and redirect
      if (response.status === 401) {
        this.setAccessToken(null);
        queryClient.clear();
        window.location.href = '/login';
      }

      const apiError = new Error(error.error?.message || 'Request failed') as Error & {
        status: number;
        code: string;
        details?: unknown;
      };
      apiError.status = response.status;
      apiError.code = error.error?.code || 'UNKNOWN';
      apiError.details = error.error?.details;
      throw apiError;
    }

    return response.json() as Promise<T>;
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
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
