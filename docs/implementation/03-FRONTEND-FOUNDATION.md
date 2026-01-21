# Phase 3: Frontend Foundation

## Overview

**Purpose:** Establish the React frontend with TanStack Router/Query, design system, base components, and the ops-center dark theme.

**Dependencies:** Phase 0 (Infrastructure), Phase 2 (Backend API)

**Deliverables:**
- React 18 application with Vite
- TanStack Router file-based routing
- TanStack Query API integration
- Tailwind CSS with ops-center dark theme
- shadcn/ui component library setup
- Base layout components
- Authentication flow UI

---

## Sub-Documents

| Document | Scope | Tasks |
|----------|-------|-------|
| [03a-VISUAL-COMPONENTS.md](./03a-VISUAL-COMPONENTS.md) | Tailwind theme, shadcn/ui, layout components | 3.4-3.9 |
| [03b-ROUTES-AUTHENTICATION.md](./03b-ROUTES-AUTHENTICATION.md) | TanStack Router/Query, auth flow, pages | 3.1-3.3, 3.10-3.12 |

---

## Architecture

### Frontend Structure

```
apps/web/src/
├── main.tsx                    # Entry point
├── App.tsx                     # Root component
├── routeTree.gen.ts            # Generated route tree
├── routes/
│   ├── __root.tsx              # Root layout
│   ├── index.tsx               # Landing/home
│   ├── _auth.tsx               # Auth layout
│   ├── _auth.login.tsx         # Login page
│   ├── _auth.register.tsx      # Register page
│   ├── _app.tsx                # App layout (authenticated)
│   ├── _app.projects.tsx       # Projects list
│   ├── _app.projects.$projectId.tsx
│   └── _app.projects.$projectId.assessments.$assessmentId.tsx
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/                 # Layout components
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── StatusBar.tsx
│   └── common/                 # Shared components
│       ├── DataTable.tsx
│       ├── LoadingSpinner.tsx
│       └── ErrorBoundary.tsx
├── features/
│   ├── auth/                   # Auth feature
│   │   ├── hooks/
│   │   ├── components/
│   │   └── stores/
│   └── projects/               # Projects feature
├── hooks/
│   ├── useAuth.ts
│   └── useApi.ts
├── lib/
│   ├── api.ts                  # API client
│   ├── queryClient.ts          # TanStack Query config
│   └── utils.ts                # Utilities
├── styles/
│   ├── globals.css             # Global styles
│   └── theme.css               # Theme variables
└── types/
    └── index.ts                # Frontend types
```

### State Management Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐    ┌────────────────┐                   │
│  │ TanStack Query │    │   React State  │                   │
│  │   (Server)     │    │    (Client)    │                   │
│  └───────┬────────┘    └───────┬────────┘                   │
│          │                     │                             │
│  • API responses       • UI state (modals,                  │
│  • Caching             │   forms, toggles)                  │
│  • Background sync     • Local preferences                  │
│  • Optimistic updates  • Ephemeral state                    │
│                                                              │
│  ┌────────────────┐                                         │
│  │    Zustand     │  ← Optional for complex                 │
│  │ (Global Client)│    cross-cutting state                  │
│  └────────────────┘                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

| ID | Task | Agent | Priority | Dependencies | Sub-Doc |
|----|------|-------|----------|--------------|---------|
| 3.1 | Set up TanStack Router with file-based routing | `frontend-developer-designer` | Critical | Phase 0 | [03b](./03b-ROUTES-AUTHENTICATION.md) |
| 3.2 | Configure TanStack Query client | `frontend-developer-designer` | Critical | 3.1 | [03b](./03b-ROUTES-AUTHENTICATION.md) |
| 3.3 | Create API client with interceptors | `frontend-developer-designer` | Critical | 3.2 | [03b](./03b-ROUTES-AUTHENTICATION.md) |
| 3.4 | Set up Tailwind with ops-center theme | `ops-center-ui-expert` | Critical | 3.1 | [03a](./03a-VISUAL-COMPONENTS.md) |
| 3.5 | Initialize shadcn/ui components | `ops-center-ui-expert` | Critical | 3.4 | [03a](./03a-VISUAL-COMPONENTS.md) |
| 3.6 | Create AppShell layout component | `ops-center-ui-expert` | High | 3.5 | [03a](./03a-VISUAL-COMPONENTS.md) |
| 3.7 | Build Sidebar navigation | `ops-center-ui-expert` | High | 3.6 | [03a](./03a-VISUAL-COMPONENTS.md) |
| 3.8 | Build Header component | `ops-center-ui-expert` | High | 3.6 | [03a](./03a-VISUAL-COMPONENTS.md) |
| 3.9 | Build StatusBar component | `ops-center-ui-expert` | Medium | 3.6 | [03a](./03a-VISUAL-COMPONENTS.md) |
| 3.10 | Implement auth flow (login/register) | `frontend-developer-designer` | Critical | 3.3 | [03b](./03b-ROUTES-AUTHENTICATION.md) |
| 3.11 | Create protected route wrapper | `frontend-developer-designer` | Critical | 3.10 | [03b](./03b-ROUTES-AUTHENTICATION.md) |
| 3.12 | Build projects list page | `frontend-developer-designer` | High | 3.11 | [03b](./03b-ROUTES-AUTHENTICATION.md) |
| 3.13 | Create base chart components | `tactical-visualization-expert` | High | 3.4 | — |
| 3.14 | Set up D3.js integration | `tactical-visualization-expert` | High | 3.13 | — |

---

## Detailed Specifications

### 3.1 TanStack Router Setup

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

### 3.3 API Client

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

### 3.4 Tailwind Ops-Center Theme

**File: `apps/web/tailwind.config.ts`**
```typescript
import type { Config } from 'tailwindcss';
import tailwindAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ops-Center Dark Theme
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Tactical accent colors
        tactical: {
          green: '#00ff88',
          blue: '#00d4ff',
          amber: '#ffaa00',
          red: '#ff3333',
          purple: '#a855f7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        scanline: 'scanline 8s linear infinite',
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                         linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)`,
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;
```

**File: `apps/web/src/styles/globals.css`**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Ops-Center Dark Theme */
    --background: 0 0% 4%;          /* #0a0a0a */
    --foreground: 0 0% 90%;         /* #e5e5e5 */

    --card: 0 0% 7%;                /* #111111 */
    --card-foreground: 0 0% 90%;

    --popover: 0 0% 7%;
    --popover-foreground: 0 0% 90%;

    --primary: 152 100% 50%;        /* #00ff88 - Terminal green */
    --primary-foreground: 0 0% 4%;

    --secondary: 0 0% 10%;          /* #1a1a1a */
    --secondary-foreground: 0 0% 90%;

    --muted: 0 0% 15%;
    --muted-foreground: 0 0% 64%;   /* #a3a3a3 */

    --accent: 192 100% 50%;         /* #00d4ff - Tactical blue */
    --accent-foreground: 0 0% 4%;

    --destructive: 0 100% 60%;      /* #ff3333 */
    --destructive-foreground: 0 0% 100%;

    --border: 0 0% 16%;             /* #2a2a2a */
    --input: 0 0% 16%;
    --ring: 152 100% 50%;

    --radius: 0.5rem;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    @apply bg-background;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-border rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-muted;
  }
}

@layer components {
  /* Tactical glow effect */
  .glow-green {
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.3),
                0 0 20px rgba(0, 255, 136, 0.1);
  }

  .glow-blue {
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.3),
                0 0 20px rgba(0, 212, 255, 0.1);
  }

  .glow-amber {
    box-shadow: 0 0 10px rgba(255, 170, 0, 0.3),
                0 0 20px rgba(255, 170, 0, 0.1);
  }

  .glow-red {
    box-shadow: 0 0 10px rgba(255, 51, 51, 0.3),
                0 0 20px rgba(255, 51, 51, 0.1);
  }

  /* Scanline overlay */
  .scanline-overlay::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.1) 2px,
      rgba(0, 0, 0, 0.1) 4px
    );
    pointer-events: none;
  }

  /* Grid background */
  .grid-bg {
    background-size: 20px 20px;
    background-image:
      linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
      linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px);
  }

  /* Data display monospace */
  .data-display {
    @apply font-mono text-sm tracking-tight;
  }

  /* Status indicator */
  .status-indicator {
    @apply inline-block w-2 h-2 rounded-full;
  }

  .status-indicator.active {
    @apply bg-tactical-green animate-pulse-glow;
  }

  .status-indicator.warning {
    @apply bg-tactical-amber animate-pulse-glow;
  }

  .status-indicator.critical {
    @apply bg-tactical-red animate-pulse-glow;
  }
}
```

### 3.5 shadcn/ui Setup

**File: `apps/web/components.json`**
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

**File: `apps/web/src/lib/utils.ts`**
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date) {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const now = new Date();
  const then = new Date(date);
  const diff = then.getTime() - now.getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));

  if (Math.abs(days) < 1) {
    const hours = Math.round(diff / (1000 * 60 * 60));
    if (Math.abs(hours) < 1) {
      const minutes = Math.round(diff / (1000 * 60));
      return rtf.format(minutes, 'minute');
    }
    return rtf.format(hours, 'hour');
  }
  return rtf.format(days, 'day');
}
```

**Initial shadcn components to install:**
```bash
cd apps/web
npx shadcn@latest add button card input label dialog dropdown-menu \
  select tabs toast tooltip avatar badge separator scroll-area
```

### 3.6 AppShell Layout

**File: `apps/web/src/components/layout/AppShell.tsx`**
```typescript
import { ReactNode } from 'react';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { StatusBar } from './StatusBar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>

        {/* Status bar */}
        <StatusBar />
      </div>

      {/* Optional: Scanline overlay for full tactical effect */}
      {/* <div className="fixed inset-0 pointer-events-none scanline-overlay opacity-30" /> */}
    </div>
  );
}
```

### 3.7 Sidebar Component

**File: `apps/web/src/components/layout/Sidebar.tsx`**
```typescript
import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  FolderKanban,
  Map,
  Shield,
  Target,
  Radio,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FolderKanban, label: 'Projects', href: '/projects' },
  { icon: Map, label: 'Command Center', href: '/command' },
  { icon: Shield, label: 'Assessments', href: '/assessments' },
  { icon: Target, label: 'Threats', href: '/threats' },
  { icon: Radio, label: 'Intelligence', href: '/intel' },
  { icon: Bell, label: 'Alerts', href: '/alerts' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col bg-card border-r border-border transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-foreground tracking-tight">
                SITMON
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = currentPath.startsWith(item.href);
              const Icon = item.icon;

              const linkContent = (
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
                    'hover:bg-secondary',
                    isActive && 'bg-primary/10 text-primary glow-green'
                  )}
                >
                  <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary')} />
                  {!collapsed && (
                    <span className={cn('text-sm', isActive ? 'text-primary font-medium' : 'text-muted-foreground')}>
                      {item.label}
                    </span>
                  )}
                </Link>
              );

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="bg-popover border-border">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Settings & Collapse */}
        <div className="border-t border-border p-2">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-secondary transition-colors"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
            {!collapsed && <span className="text-sm text-muted-foreground">Settings</span>}
          </Link>

          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 justify-center"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
```

### 3.8 Header Component

**File: `apps/web/src/components/layout/Header.tsx`**
```typescript
import { Bell, Search, User } from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-card/50 backdrop-blur">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects, assessments..."
            className="pl-10 bg-background border-border"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Alerts */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            3
          </Badge>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline-block">
                {user?.name || 'User'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

### 3.9 StatusBar Component

**File: `apps/web/src/components/layout/StatusBar.tsx`**
```typescript
import { Activity, Clock, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export function StatusBar() {
  const [time, setTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulated connection status
  useEffect(() => {
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <footer className="flex items-center justify-between h-8 px-4 border-t border-border bg-card/50 text-xs font-mono text-muted-foreground">
      {/* Left: Status indicators */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'status-indicator',
              isConnected ? 'active' : 'critical'
            )}
          />
          <span>{isConnected ? 'CONNECTED' : 'OFFLINE'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          <span>SYSTEM NOMINAL</span>
        </div>
      </div>

      {/* Center: Active project indicator (optional) */}
      <div className="flex items-center gap-1.5">
        <span className="text-primary">●</span>
        <span>NO ACTIVE PROJECT</span>
      </div>

      {/* Right: Time */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>{time.toLocaleTimeString('en-US', { hour12: false })}</span>
        </div>
        <span>UTC{time.getTimezoneOffset() > 0 ? '-' : '+'}{Math.abs(time.getTimezoneOffset() / 60)}</span>
      </div>
    </footer>
  );
}
```

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

### 3.11 Protected Route

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

## Acceptance Criteria

- [ ] App boots without errors on `pnpm dev`
- [ ] TanStack Router file-based routing works
- [ ] TanStack Query caching and refetching works
- [ ] API client handles auth tokens correctly
- [ ] Login/register flow works end-to-end
- [ ] Protected routes redirect to login
- [ ] AppShell layout renders correctly
- [ ] Sidebar navigation works with active states
- [ ] Dark theme applied consistently
- [ ] shadcn/ui components styled correctly
- [ ] Projects CRUD works through UI

---

## Files to Create/Modify

| Path | Description |
|------|-------------|
| `apps/web/src/main.tsx` | Entry point with providers |
| `apps/web/src/routes/__root.tsx` | Root route layout |
| `apps/web/src/routes/_auth.tsx` | Auth layout |
| `apps/web/src/routes/_auth.login.tsx` | Login page |
| `apps/web/src/routes/_auth.register.tsx` | Register page |
| `apps/web/src/routes/_app.tsx` | Protected app layout |
| `apps/web/src/routes/_app.projects.tsx` | Projects list |
| `apps/web/src/components/layout/AppShell.tsx` | Main layout |
| `apps/web/src/components/layout/Sidebar.tsx` | Navigation sidebar |
| `apps/web/src/components/layout/Header.tsx` | Top header |
| `apps/web/src/components/layout/StatusBar.tsx` | Bottom status bar |
| `apps/web/src/hooks/useAuth.ts` | Auth hook |
| `apps/web/src/lib/api.ts` | API client |
| `apps/web/src/lib/queryClient.ts` | Query client config |
| `apps/web/src/lib/utils.ts` | Utilities |
| `apps/web/src/styles/globals.css` | Global styles |
| `apps/web/tailwind.config.ts` | Tailwind config |
| `apps/web/components.json` | shadcn/ui config |

---

## Dependencies to Install

```bash
cd apps/web

# TanStack ecosystem
pnpm add @tanstack/react-router @tanstack/react-query @tanstack/react-query-devtools

# Router devtools (dev only)
pnpm add -D @tanstack/router-devtools @tanstack/router-vite-plugin

# UI dependencies
pnpm add clsx tailwind-merge tailwindcss-animate class-variance-authority
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip
pnpm add @radix-ui/react-avatar @radix-ui/react-label @radix-ui/react-select
pnpm add @radix-ui/react-tabs @radix-ui/react-scroll-area @radix-ui/react-separator

# Icons
pnpm add lucide-react

# PWA support
pnpm add -D vite-plugin-pwa workbox-window

# Form handling
pnpm add react-hook-form @hookform/resolvers zod

# Toast notifications
pnpm add sonner
```

---

## Progressive Web App (PWA) Support

Basic PWA with cached UI shell and offline indicators.

### Vite PWA Plugin Configuration

**File: `apps/web/vite.config.ts`** (updated)
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

### Update main.tsx for PWA

**File: `apps/web/src/main.tsx`** (add PWA registration)
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

### Login Form Example

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
                  placeholder="••••••••"
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

---

## Additional Files to Create

| Path | Description |
|------|-------------|
| `apps/web/src/lib/pwa.ts` | PWA service worker registration |
| `apps/web/src/hooks/useToast.ts` | Toast notification hook |
| `apps/web/src/components/common/OfflineIndicator.tsx` | Offline status indicator |
| `apps/web/src/components/ui/form.tsx` | Form component primitives |
| `apps/web/src/features/auth/components/LoginForm.tsx` | Login form with validation |
| `apps/web/src/features/auth/components/RegisterForm.tsx` | Register form with validation |
| `apps/web/public/manifest.json` | PWA manifest (auto-generated) |
| `apps/web/public/pwa-192x192.png` | PWA icon 192px |
| `apps/web/public/pwa-512x512.png` | PWA icon 512px |
