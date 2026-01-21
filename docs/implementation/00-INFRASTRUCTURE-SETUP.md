# Phase 0: Infrastructure Setup

## Overview

**Purpose:** Establish the monorepo structure, development tooling, and local environment for the Situation Monitor project.

**Dependencies:** None (foundational phase)

**Deliverables:**
- pnpm workspace monorepo configuration
- TypeScript configuration (strict mode)
- ESLint + Prettier setup
- Docker Compose for local services
- Git hooks with Husky
- VS Code workspace settings

---

## Sub-Documents

| Document | Scope | Tasks |
|----------|-------|-------|
| [00a-DOCKER-CONFIGURATION.md](./00a-DOCKER-CONFIGURATION.md) | Docker Compose, Dockerfiles, nginx, production config | 0.5, production |

---

## Architecture

```
situation-monitor/
├── apps/
│   ├── web/                    # React frontend (Vite)
│   └── api/                    # Hono backend (Node.js)
├── packages/
│   └── shared/                 # Shared types and utilities
├── docker/
│   └── docker-compose.yml      # Local services
├── .vscode/
│   └── settings.json           # Workspace settings
├── package.json                # Workspace root
├── pnpm-workspace.yaml         # Workspace definition
├── tsconfig.base.json          # Shared TS config
├── .eslintrc.js                # ESLint configuration
├── .prettierrc                 # Prettier configuration
└── turbo.json                  # Turborepo config (optional)
```

---

## Implementation Tasks

| ID | Task | Agent | Priority | Dependencies | Sub-Doc |
|----|------|-------|----------|--------------|---------|
| 0.1 | Initialize pnpm workspace | `node-developer` | Critical | None | — |
| 0.2 | Create base TypeScript configuration | `node-developer` | Critical | 0.1 | — |
| 0.3 | Set up ESLint with TypeScript rules | `node-developer` | High | 0.2 | — |
| 0.4 | Configure Prettier | `node-developer` | High | 0.3 | — |
| 0.5 | Create Docker Compose for PostgreSQL/Redis | `node-developer` | High | 0.1 | [00a](./00a-DOCKER-CONFIGURATION.md) |
| 0.6 | Set up Husky + lint-staged | `node-developer` | Medium | 0.3, 0.4 | — |
| 0.7 | Create VS Code workspace settings | `node-developer` | Low | 0.3, 0.4 | — |
| 0.8 | Initialize apps/web with Vite + React | `node-developer` | Critical | 0.2 | — |
| 0.9 | Initialize apps/api with Hono | `node-developer` | Critical | 0.2 | — |
| 0.10 | Create packages/shared structure | `node-developer` | High | 0.2 | — |

---

## Detailed Specifications

### 0.1 pnpm Workspace Configuration

**File: `pnpm-workspace.yaml`**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**File: `package.json` (root)**
```json
{
  "name": "situation-monitor",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules",
    "db:migrate": "pnpm --filter @situation-monitor/api db:migrate",
    "db:generate": "pnpm --filter @situation-monitor/api db:generate",
    "db:studio": "pnpm --filter @situation-monitor/api db:studio"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

### 0.2 TypeScript Configuration

**File: `tsconfig.base.json`**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

### 0.3 ESLint Configuration

**File: `.eslintrc.js`**
```javascript
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './apps/*/tsconfig.json', './packages/*/tsconfig.json'],
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      },
    ],
    'import/no-duplicates': 'error',
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.json', './apps/*/tsconfig.json', './packages/*/tsconfig.json'],
      },
    },
  },
  ignorePatterns: ['node_modules', 'dist', '.turbo', 'coverage'],
};
```

**Dependencies to install:**
```bash
pnpm add -Dw eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-import eslint-import-resolver-typescript eslint-config-prettier
```

### 0.4 Prettier Configuration

**File: `.prettierrc`**
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**File: `.prettierignore`**
```
node_modules
dist
.turbo
coverage
pnpm-lock.yaml
```

### 0.5 Docker Compose

**File: `docker/docker-compose.yml`**
```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg14
    container_name: situation-monitor-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: situation_monitor
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: situation-monitor-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

**File: `docker/init.sql`**
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schema
CREATE SCHEMA IF NOT EXISTS app;
```

### 0.6 Husky + lint-staged

**File: `.husky/pre-commit`**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

**File: `.lintstagedrc.js`**
```javascript
module.exports = {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
```

**Setup commands:**
```bash
pnpm add -Dw husky lint-staged
pnpm exec husky init
```

### 0.7 VS Code Workspace Settings

**File: `.vscode/settings.json`**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.turbo": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.turbo": true,
    "pnpm-lock.yaml": true
  }
}
```

**File: `.vscode/extensions.json`**
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-azuretools.vscode-docker"
  ]
}
```

### 0.8 Frontend App (apps/web)

**File: `apps/web/package.json`**
```json
{
  "name": "@situation-monitor/web",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}
```

**File: `apps/web/tsconfig.json`**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@situation-monitor/shared": ["../../packages/shared/src"]
    },
    "outDir": "dist",
    "noEmit": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**File: `apps/web/vite.config.ts`**
```typescript
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
```

### 0.9 Backend App (apps/api)

**File: `apps/api/package.json`**
```json
{
  "name": "@situation-monitor/api",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format esm --dts",
    "start": "node dist/index.js",
    "lint": "eslint src --ext ts --report-unused-disable-directives --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@hono/node-server": "^1.12.0",
    "drizzle-orm": "^0.32.0",
    "hono": "^4.5.0",
    "postgres": "^3.4.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "drizzle-kit": "^0.23.0",
    "tsup": "^8.2.0",
    "tsx": "^4.16.0"
  }
}
```

**File: `apps/api/tsconfig.json`**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@situation-monitor/shared": ["../../packages/shared/src"]
    },
    "outDir": "dist"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**File: `apps/api/src/index.ts`**
```typescript
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('/api/*', cors());

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const port = parseInt(process.env.PORT || '4000', 10);
console.log(`Server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
```

### 0.10 Shared Package

**File: `packages/shared/package.json`**
```json
{
  "name": "@situation-monitor/shared",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src --ext ts --report-unused-disable-directives --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

**File: `packages/shared/tsconfig.json`**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**File: `packages/shared/src/index.ts`**
```typescript
// Domain types
export * from './types/project';
export * from './types/assessment';
export * from './types/common';
```

**File: `packages/shared/src/types/common.ts`**
```typescript
export type UUID = string;

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseEntity extends Timestamps {
  id: UUID;
}

export type Status = 'draft' | 'active' | 'archived';
```

**File: `packages/shared/src/types/project.ts`**
```typescript
import type { BaseEntity, Status } from './common';

export interface Project extends BaseEntity {
  name: string;
  description: string | null;
  status: Status;
  ownerId: string;
}
```

**File: `packages/shared/src/types/assessment.ts`**
```typescript
import type { BaseEntity } from './common';

export type PMESIIPTDomain =
  | 'political'
  | 'military'
  | 'economic'
  | 'social'
  | 'information'
  | 'infrastructure'
  | 'physical'
  | 'time';

export interface Assessment extends BaseEntity {
  projectId: string;
  name: string;
  summary: string | null;
}

export interface Factor extends BaseEntity {
  assessmentId: string;
  domain: PMESIIPTDomain;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
}
```

---

## Turbo Configuration (Optional)

**File: `turbo.json`**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

---

## Environment Variables

**File: `.env.example`**
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/situation_monitor

# Redis
REDIS_URL=redis://localhost:6379

# API
PORT=4000
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:4000/api
```

---

## Acceptance Criteria

- [ ] `pnpm install` completes without errors
- [ ] `pnpm dev` starts both frontend (port 3000) and backend (port 4000)
- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm typecheck` passes with no errors
- [ ] Docker services start with `docker-compose up -d`
- [ ] API health check returns 200 at `/api/health`
- [ ] Frontend loads at `http://localhost:3000`
- [ ] Git hooks run lint-staged on commit

---

## Files to Create

| Path | Description |
|------|-------------|
| `package.json` | Root workspace package |
| `pnpm-workspace.yaml` | Workspace definition |
| `tsconfig.base.json` | Shared TypeScript config |
| `.eslintrc.js` | ESLint configuration |
| `.prettierrc` | Prettier configuration |
| `.prettierignore` | Prettier ignore patterns |
| `turbo.json` | Turborepo configuration |
| `.env.example` | Environment template |
| `.gitignore` | Git ignore patterns |
| `docker/docker-compose.yml` | Local services |
| `docker/init.sql` | Database initialization |
| `.husky/pre-commit` | Git pre-commit hook |
| `.lintstagedrc.js` | lint-staged config |
| `.vscode/settings.json` | VS Code settings |
| `.vscode/extensions.json` | Recommended extensions |
| `apps/web/package.json` | Frontend package |
| `apps/web/tsconfig.json` | Frontend TS config |
| `apps/web/vite.config.ts` | Vite configuration |
| `apps/web/index.html` | HTML entry point |
| `apps/web/src/main.tsx` | React entry point |
| `apps/api/package.json` | Backend package |
| `apps/api/tsconfig.json` | Backend TS config |
| `apps/api/src/index.ts` | Hono entry point |
| `packages/shared/package.json` | Shared types package |
| `packages/shared/tsconfig.json` | Shared TS config |
| `packages/shared/src/index.ts` | Shared exports |
| `packages/shared/src/types/*.ts` | Type definitions |
| `.github/workflows/ci.yml` | GitHub Actions CI workflow |
| `.github/workflows/deploy.yml` | GitHub Actions deploy workflow |

---

## Additional File Specifications

### .gitignore

**File: `.gitignore`**
```gitignore
# Dependencies
node_modules
.pnpm-store

# Build outputs
dist
build
.next
.turbo

# Environment files
.env
.env.local
.env.*.local
!.env.example

# IDE
.idea
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs
*.log
npm-debug.log*
pnpm-debug.log*

# Testing
coverage
.nyc_output

# Database
*.sql.backup
pgdata/

# Misc
*.tgz
.cache
```

### HTML Entry Point

**File: `apps/web/index.html`**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Situation Monitor - Strategic Assessment Platform" />
    <meta name="theme-color" content="#0a0a0a" />

    <!-- Preload fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

    <!-- PWA manifest -->
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

    <title>Situation Monitor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### React Entry Point (Base)

**File: `apps/web/src/main.tsx`** (initial version before TanStack setup)
```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/globals.css';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Situation Monitor</h1>
        <p className="text-muted-foreground">Strategic Assessment Platform</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### Environment Configuration

**File: `.env.example`** (expanded)
```bash
# ===========================================
# Database
# ===========================================
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/situation_monitor
DATABASE_POOL_SIZE=10

# ===========================================
# Redis
# ===========================================
REDIS_URL=redis://localhost:6379

# ===========================================
# API Server
# ===========================================
PORT=4000
NODE_ENV=development
API_BASE_URL=http://localhost:4000

# ===========================================
# Authentication
# ===========================================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ===========================================
# Frontend
# ===========================================
VITE_API_URL=http://localhost:4000/api
VITE_APP_NAME=Situation Monitor

# ===========================================
# AI/LLM (configurable per deployment)
# ===========================================
# OpenAI
OPENAI_API_KEY=sk-your-openai-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Local embeddings (Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Active embedding provider: openai | ollama
EMBEDDING_PROVIDER=openai

# Active LLM provider: anthropic | openai
LLM_PROVIDER=anthropic

# ===========================================
# Mapbox
# ===========================================
VITE_MAPBOX_ACCESS_TOKEN=pk.your-mapbox-token
VITE_MAPBOX_STYLE_URL=mapbox://styles/your-username/tactical-dark

# ===========================================
# Feature Flags
# ===========================================
FEATURE_AI_ENABLED=true
FEATURE_REALTIME_FEEDS=true

# ===========================================
# Data Retention
# ===========================================
FEED_RETENTION_DAYS=7
```

---

## GitHub Actions CI/CD

### CI Workflow

**File: `.github/workflows/ci.yml`**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test:
    name: Test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg14
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: situation_monitor_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run unit tests
        run: pnpm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/situation_monitor_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: |
            apps/web/dist
            apps/api/dist

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [build]
    services:
      postgres:
        image: pgvector/pgvector:pg14
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: situation_monitor_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/situation_monitor_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret

      - name: Upload E2E report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web/playwright-report
```

### Deploy Workflow

**File: `.github/workflows/deploy.yml`**
```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    name: Build and Push Docker Images
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./docker/Dockerfile.api
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-api:${{ steps.meta.outputs.version }}

      - name: Build and push Web image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./docker/Dockerfile.web
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-web:${{ steps.meta.outputs.version }}
```

---

## Docker Production Configuration

### API Dockerfile

**File: `docker/Dockerfile.api`**
```dockerfile
# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY tsconfig.base.json ./

# Build
RUN pnpm --filter @situation-monitor/api build

# Production stage
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/drizzle ./drizzle

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

EXPOSE 4000

CMD ["node", "dist/index.js"]
```

### Web Dockerfile

**File: `docker/Dockerfile.web`**
```dockerfile
# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
COPY tsconfig.base.json ./

# Build arguments for environment
ARG VITE_API_URL
ARG VITE_MAPBOX_ACCESS_TOKEN

# Build
RUN pnpm --filter @situation-monitor/web build

# Production stage - nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

**File: `docker/nginx.conf`**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (if running behind same domain)
    location /api/ {
        proxy_pass http://api:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Production Docker Compose

**File: `docker/docker-compose.prod.yml`**
```yaml
version: '3.8'

services:
  web:
    build:
      context: ..
      dockerfile: docker/Dockerfile.web
      args:
        VITE_API_URL: ${VITE_API_URL}
        VITE_MAPBOX_ACCESS_TOKEN: ${VITE_MAPBOX_ACCESS_TOKEN}
    ports:
      - "80:80"
    depends_on:
      - api
    restart: unless-stopped

  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile.api
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: pgvector/pgvector:pg14
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-situation_monitor}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```
