# Phase 3b: Routes & Authentication

## Overview

**Parent:** [03-FRONTEND-FOUNDATION.md](./03-FRONTEND-FOUNDATION.md)

This document covers TanStack Router setup, TanStack Query configuration, API client implementation, authentication flow, and protected routes.

**Tasks Covered:** 3.1, 3.2, 3.3, 3.10, 3.11, 3.12

**Related Sub-documents:**
- [03a-DESIGN-SYSTEM.md](./03a-DESIGN-SYSTEM.md) - Tailwind theme, shadcn/ui, layout components
- [03c-VISUALIZATION.md](./03c-VISUALIZATION.md) - D3.js and chart components

---

## Implementation Tasks

| ID | Task | Agent | Priority | Dependencies |
|----|------|-------|----------|--------------|
| 3.1 | Set up TanStack Router with file-based routing | `frontend-developer-designer` | Critical | Phase 0 |
| 3.2 | Configure TanStack Query client | `frontend-developer-designer` | Critical | 3.1 |
| 3.3 | Create API client with interceptors | `frontend-developer-designer` | Critical | 3.2 |
| 3.10 | Implement auth flow (login/register) | `frontend-developer-designer` | Critical | 3.3 |
| 3.11 | Create protected route wrapper | `frontend-developer-designer` | Critical | 3.10 |
| 3.12 | Build projects list page | `frontend-developer-designer` | High | 3.11 |

---

## Files to Create

| Path | Description |
|------|-------------|
| `apps/web/src/main.tsx` | Entry point with providers |
| `apps/web/src/routes/__root.tsx` | Root route layout |
| `apps/web/src/routes/_auth.tsx` | Auth layout |
| `apps/web/src/routes/_auth.login.tsx` | Login page |
| `apps/web/src/routes/_auth.register.tsx` | Register page |
| `apps/web/src/routes/_app.tsx` | Protected app layout |
| `apps/web/src/routes/_app.projects.tsx` | Projects list |
| `apps/web/src/hooks/useAuth.ts` | Auth hook |
| `apps/web/src/hooks/useToast.ts` | Toast notification hook |
| `apps/web/src/lib/api.ts` | API client |
| `apps/web/src/lib/queryClient.ts` | Query client config |
| `apps/web/src/lib/pwa.ts` | PWA service worker registration |
| `apps/web/src/components/ui/form.tsx` | Form component primitives |
| `apps/web/src/components/common/OfflineIndicator.tsx` | Offline status indicator |
| `apps/web/src/features/auth/components/LoginForm.tsx` | Login form with validation |
| `apps/web/src/features/auth/components/RegisterForm.tsx` | Register form with validation |
| `apps/web/vite.config.ts` | Vite configuration with PWA |

---

## Dependencies to Install

```bash
cd apps/web

# TanStack ecosystem
pnpm add @tanstack/react-router @tanstack/react-query @tanstack/react-query-devtools

# Router devtools and Vite plugin (dev only)
pnpm add -D @tanstack/router-devtools @tanstack/router-vite-plugin

# Form handling
pnpm add react-hook-form @hookform/resolvers zod

# Toast notifications
pnpm add sonner

# PWA support
pnpm add -D vite-plugin-pwa workbox-window
```

---

## Detailed Specifications

### 3.1 TanStack Router Setup

TanStack Router provides type-safe, file-based routing with built-in data loading and caching integration.

#### Entry Point

**File: `apps/web/src/main.tsx`**
```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { routeTree } from './routeTree.gen';
import { queryClient } from './lib/queryClient';
import './styles/globals.css';

// Create router instance
const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
```

#### Root Route

**File: `apps/web/src/routes/__root.tsx`**
```typescript
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import type { QueryClient } from '@tanstack/react-query';

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  );
}
```

#### Route Structure

```
apps/web/src/routes/
├── __root.tsx              # Root layout with context
├── index.tsx               # Landing/home page
├── _auth.tsx               # Auth layout (unauthenticated)
├── _auth.login.tsx         # Login page
├── _auth.register.tsx      # Register page
├── _app.tsx                # App layout (authenticated, protected)
├── _app.projects.tsx       # Projects list
├── _app.projects.$projectId.tsx
└── _app.projects.$projectId.assessments.$assessmentId.tsx
```

---

### 3.2 TanStack Query Configuration

**File: `apps/web/src/lib/queryClient.ts`**
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // 30 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

---

### 3.3 API Client with Interceptors

**File: `apps/web/src/lib/api.ts`**
```typescript
import { queryClient } from './queryClient';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface ApiError {
  message: string;
  code: string;
  details?: unknown;
}

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

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
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
      const error = await response.json().catch(() => ({
        error: { message: 'Request failed', code: 'UNKNOWN' },
      }));

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

    return response.json();
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

// Types
interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}
```

---

### 3.10 Auth Hook & Flow

**File: `apps/web/src/hooks/useAuth.ts`**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { api, authApi } from '@/lib/api';

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    retry: false,
    enabled: !!api.getAccessToken(),
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      api.setAccessToken(data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      queryClient.setQueryData(['auth', 'me'], { user: data.user });
      navigate({ to: '/projects' });
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      api.setAccessToken(data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      queryClient.setQueryData(['auth', 'me'], { user: data.user });
      navigate({ to: '/projects' });
    },
  });

  const logout = () => {
    api.setAccessToken(null);
    localStorage.removeItem('refreshToken');
    queryClient.clear();
    navigate({ to: '/login' });
  };

  return {
    user: userData?.user,
    isLoading,
    isAuthenticated: !!userData?.user,
    error,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout,
    loginPending: loginMutation.isPending,
    registerPending: registerMutation.isPending,
  };
}
```

---

### 3.11 Protected Route Wrapper

**File: `apps/web/src/routes/_app.tsx`**
```typescript
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    // Check if user is authenticated
    const token = api.getAccessToken();

    if (!token) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.pathname,
        },
      });
    }

    // Optionally verify token is valid
    try {
      await context.queryClient.ensureQueryData({
        queryKey: ['auth', 'me'],
        queryFn: () => api.get('/auth/me'),
      });
    } catch {
      api.setAccessToken(null);
      throw redirect({ to: '/login' });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
```

---

### 3.12 Projects Page

**File: `apps/web/src/routes/_app.projects.tsx`**
```typescript
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderKanban, MoreVertical, Archive, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { projectsApi } from '@/lib/api';
import { formatRelativeTime, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/_app/projects')({
  component: ProjectsPage,
});

function ProjectsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleCreate = () => {
    if (newProjectName.trim()) {
      createMutation.mutate({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      });
    }
  };

  const statusColors = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-primary/20 text-primary',
    archived: 'bg-secondary text-secondary-foreground',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your strategic assessment projects
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Create a new strategic assessment project
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Eastern Europe Assessment"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief description..."
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newProjectName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No projects yet. Create your first project to get started.
            </p>
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.projects.map((project) => (
            <Card
              key={project.id}
              className="group hover:border-primary/50 transition-colors"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <Link to={`/projects/${project.id}`}>
                    <CardTitle className="text-lg hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                  </Link>
                  <CardDescription>
                    {project.description || 'No description'}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(project.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <Badge className={cn(statusColors[project.status])}>
                    {project.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    Updated {formatRelativeTime(project.updatedAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## PWA Service Worker Registration

### Vite PWA Plugin Configuration

**File: `apps/web/vite.config.ts`**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Situation Monitor',
        short_name: 'SitMon',
        description: 'Strategic Assessment Platform',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache strategies
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
        // Skip waiting and claim clients
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Service Worker Registration

**File: `apps/web/src/lib/pwa.ts`**
```typescript
import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const updateSW = registerSW({
      onNeedRefresh() {
        // Prompt user to refresh for new content
        if (confirm('New version available. Reload to update?')) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        console.log('App ready for offline use');
      },
      onRegistered(registration) {
        console.log('Service worker registered:', registration);
      },
      onRegisterError(error) {
        console.error('Service worker registration failed:', error);
      },
    });
  }
}
```

### Offline Indicator Component

**File: `apps/web/src/components/common/OfflineIndicator.tsx`**
```typescript
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2 px-4 py-2 rounded-lg',
        'bg-tactical-amber/20 border border-tactical-amber/50',
        'text-tactical-amber text-sm font-medium',
        'animate-pulse-glow'
      )}
    >
      <WifiOff className="w-4 h-4" />
      <span>You're offline. Some features may be unavailable.</span>
    </div>
  );
}
```

### Updated Entry Point with PWA

**File: `apps/web/src/main.tsx`** (full version with PWA)
```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { routeTree } from './routeTree.gen';
import { queryClient } from './lib/queryClient';
import { registerServiceWorker } from './lib/pwa';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import './styles/globals.css';

// Register PWA service worker
registerServiceWorker();

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        theme="dark"
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: '#111111',
            border: '1px solid #2a2a2a',
            color: '#e5e5e5',
          },
        }}
      />
      <OfflineIndicator />
    </QueryClientProvider>
  </StrictMode>
);
```

---

## Form Handling with React Hook Form

Standardized form handling with Zod validation.

### Form Component Wrapper

**File: `apps/web/src/components/ui/form.tsx`**
```typescript
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  return {
    name: fieldContext.name,
    ...fieldState,
  };
};

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('space-y-2', className)} {...props} />
  );
});
FormItem.displayName = 'FormItem';

const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const { error } = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(error && 'text-destructive', className)}
      {...props}
    />
  );
});
FormLabel.displayName = 'FormLabel';

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error } = useFormField();

  return (
    <Slot
      ref={ref}
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = 'FormControl';

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
});
FormDescription.displayName = 'FormDescription';

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error } = useFormField();
  const body = error ? String(error?.message) : children;

  if (!body) return null;

  return (
    <p
      ref={ref}
      className={cn('text-sm font-medium text-destructive', className)}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
```

---

## Login/Register Form Components

### Login Form

**File: `apps/web/src/features/auth/components/LoginForm.tsx`**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from '@tanstack/react-router';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login, loginPending } = useAuth();
  const toast = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await login(data);
      toast.success('Welcome back!');
    } catch (error) {
      toast.error('Login failed', {
        description: error instanceof Error ? error.message : 'Invalid credentials',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <Input
                  type="password"
                  placeholder="********"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loginPending}>
          {loginPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </Form>
  );
}
```

### Register Form

**File: `apps/web/src/features/auth/components/RegisterForm.tsx`**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { register, registerPending } = useAuth();
  const toast = useToast();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      await register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      toast.success('Account created successfully!');
    } catch (error) {
      toast.error('Registration failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="John Doe"
                  autoComplete="name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="********"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="********"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={registerPending}>
          {registerPending ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </Form>
  );
}
```

---

## Toast Notification System

Using Sonner for toast notifications with tactical styling.

### Toast Hook

**File: `apps/web/src/hooks/useToast.ts`**
```typescript
import { toast } from 'sonner';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  return {
    success: (message: string, options?: ToastOptions) => {
      toast.success(message, {
        description: options?.description,
        duration: options?.duration ?? 4000,
        action: options?.action,
      });
    },

    error: (message: string, options?: ToastOptions) => {
      toast.error(message, {
        description: options?.description,
        duration: options?.duration ?? 6000,
        action: options?.action,
      });
    },

    warning: (message: string, options?: ToastOptions) => {
      toast.warning(message, {
        description: options?.description,
        duration: options?.duration ?? 5000,
        action: options?.action,
      });
    },

    info: (message: string, options?: ToastOptions) => {
      toast.info(message, {
        description: options?.description,
        duration: options?.duration ?? 4000,
        action: options?.action,
      });
    },

    loading: (message: string) => {
      return toast.loading(message);
    },

    dismiss: (id?: string | number) => {
      toast.dismiss(id);
    },

    promise: <T>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: Error) => string);
      }
    ) => {
      return toast.promise(promise, messages);
    },
  };
}
```

### Usage Example

```typescript
import { useToast } from '@/hooks/useToast';

function ProjectActions() {
  const toast = useToast();

  const handleSave = async () => {
    toast.promise(saveProject(), {
      loading: 'Saving project...',
      success: 'Project saved successfully',
      error: (err) => `Failed to save: ${err.message}`,
    });
  };

  const handleDelete = () => {
    toast.warning('Project deleted', {
      description: 'This action cannot be undone',
      action: {
        label: 'Undo',
        onClick: () => restoreProject(),
      },
    });
  };

  return (/* ... */);
}
```

---

## Acceptance Criteria

### Routing & Navigation
- [ ] TanStack Router file-based routing works correctly
- [ ] Route type safety is enforced throughout the application
- [ ] Route preloading on intent works for faster navigation
- [ ] Router devtools available in development mode

### API & Data Fetching
- [ ] TanStack Query caching and refetching works as configured
- [ ] API client handles auth tokens correctly (set, get, clear)
- [ ] 401 responses trigger token clearing and redirect to login
- [ ] Query retry logic skips 4xx errors appropriately

### Authentication Flow
- [ ] Login form validates email and password
- [ ] Register form validates all fields with Zod schema
- [ ] Successful login stores tokens and redirects to `/projects`
- [ ] Successful registration stores tokens and redirects to `/projects`
- [ ] Logout clears all tokens and query cache
- [ ] Protected routes redirect unauthenticated users to login
- [ ] Login page accepts `?redirect=` query param for return URL

### Projects Page
- [ ] Projects list loads and displays correctly
- [ ] Empty state shows when no projects exist
- [ ] Create project dialog works with form validation
- [ ] Project cards show status badge and relative time
- [ ] Dropdown menu appears on hover with Archive/Delete options
- [ ] Delete action removes project and refreshes list
- [ ] Loading skeleton shows while data is fetching

### PWA Support
- [ ] Service worker registers successfully
- [ ] App works offline with cached UI shell
- [ ] API requests use NetworkFirst caching strategy
- [ ] Offline indicator appears when connection is lost
- [ ] Update prompt appears when new version is available

### Toast Notifications
- [ ] Toast notifications display with correct styling
- [ ] Success, error, warning, and info variants work
- [ ] Toast promise helper shows loading/success/error states
- [ ] Close button dismisses toast

---

## Cross-References

- **Parent Document:** [03-FRONTEND-FOUNDATION.md](./03-FRONTEND-FOUNDATION.md)
- **Design System & Layout:** [03a-DESIGN-SYSTEM.md](./03a-DESIGN-SYSTEM.md) - Tailwind theme, shadcn/ui setup, AppShell, Sidebar, Header, StatusBar
- **Visualization:** [03c-VISUALIZATION.md](./03c-VISUALIZATION.md) - D3.js integration, chart components
- **Backend API:** [02-BACKEND-CORE.md](./02-BACKEND-CORE.md) - Auth endpoints, Projects API
