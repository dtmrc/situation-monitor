# Phase 10: Testing, CI/CD & Deployment

## Overview

This phase establishes the quality assurance infrastructure, continuous integration/deployment pipelines, and production deployment strategy for Situation Monitor.

### Dependencies
- All previous phases (0-9) for comprehensive test coverage
- Phase 0 infrastructure for CI/CD foundation

### Deliverables
- Unit test framework with Vitest
- E2E test suite with Playwright
- GitHub Actions CI/CD pipelines
- Docker Compose production deployment
- Monitoring and observability setup

---

## Architecture

### Testing Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  Playwright
                    │   Tests     │  Critical user flows
                    ├─────────────┤
                    │ Integration │  API endpoint tests
                    │   Tests     │  Database operations
                    ├─────────────┤
                    │    Unit     │  Business logic
                    │   Tests     │  Utilities, hooks
                    └─────────────┘
```

### CI/CD Pipeline Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Push/PR    │───▶│    Build     │───▶│    Test      │───▶│   Deploy     │
│   Trigger    │    │   & Lint     │    │   Suite      │    │  (on main)   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                           │                   │                   │
                           ▼                   ▼                   ▼
                    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                    │ TypeScript   │    │ Unit Tests   │    │ Docker Build │
                    │ ESLint       │    │ Integration  │    │ Push to      │
                    │ Prettier     │    │ E2E Tests    │    │ Registry     │
                    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## Implementation Tasks

| ID | Task | Agent | Priority | Dependencies |
|----|------|-------|----------|--------------|
| 10.1 | Configure Vitest for unit testing | node-developer | P0 | - |
| 10.2 | Set up Playwright for E2E | frontend-developer-designer | P0 | - |
| 10.3 | Write API integration tests | node-developer | P1 | 10.1 |
| 10.4 | Write component unit tests | frontend-developer-designer | P1 | 10.1 |
| 10.5 | Create E2E test suite | frontend-developer-designer | P1 | 10.2 |
| 10.6 | Configure GitHub Actions CI | node-developer | P0 | - |
| 10.7 | Set up deployment workflow | node-developer | P1 | 10.6 |
| 10.8 | Add monitoring/health checks | node-developer | P2 | 10.7 |

---

## Detailed Specifications

### 10.1 Vitest Configuration

#### `apps/api/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'dist',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
    setupFiles: ['./src/test/setup.ts'],
    poolOptions: {
      threads: {
        singleThread: true, // For database tests
      },
    },
  },
});
```

#### `apps/web/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'dist',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
        'src/routes/**', // E2E covers routes
      ],
      thresholds: {
        statements: 60,
        branches: 60,
        functions: 60,
        lines: 60,
      },
    },
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

#### `apps/api/src/test/setup.ts`

```typescript
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../database/client';
import { sql } from 'drizzle-orm';

// Test database setup
beforeAll(async () => {
  // Run migrations on test database
  await db.execute(sql`SELECT 1`); // Connection check
});

afterAll(async () => {
  // Cleanup
});

beforeEach(async () => {
  // Reset database state between tests
  await db.execute(sql`
    TRUNCATE TABLE
      projects,
      situations,
      pmesii_analyses,
      threat_assessments,
      cog_analyses,
      indicators
    CASCADE
  `);
});
```

#### `apps/web/src/test/setup.ts`

```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

---

### 10.2 Playwright Configuration

#### `apps/web/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

#### `apps/web/e2e/fixtures.ts`

```typescript
import { test as base, expect } from '@playwright/test';

// Extend base test with custom fixtures
export const test = base.extend<{
  authenticatedPage: typeof base;
}>({
  authenticatedPage: async ({ page }, use) => {
    // Login before test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    await use(page);

    // Logout after test
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
  },
});

export { expect };
```

---

### 10.3 API Integration Tests

#### `apps/api/src/modules/situations/situations.service.spec.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SituationsService } from './situations.service';
import { db } from '../../database/client';
import { situations } from '../../database/schema';
import { eq } from 'drizzle-orm';

describe('SituationsService', () => {
  let service: SituationsService;
  const testOrgId = 'test-org-123';

  beforeEach(() => {
    service = new SituationsService();
  });

  describe('create', () => {
    it('should create a new situation', async () => {
      const data = {
        name: 'Test Situation',
        description: 'Test description',
        status: 'active' as const,
        organizationId: testOrgId,
        createdBy: 'user-123',
      };

      const result = await service.create(data);

      expect(result).toMatchObject({
        name: data.name,
        description: data.description,
        status: data.status,
      });
      expect(result.id).toBeDefined();
    });

    it('should enforce organization isolation', async () => {
      const situation = await service.create({
        name: 'Org A Situation',
        organizationId: 'org-a',
        createdBy: 'user-a',
      });

      // Should not find with different org
      const result = await service.findById(situation.id, 'org-b');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      // Create test data
      for (let i = 0; i < 15; i++) {
        await service.create({
          name: `Situation ${i}`,
          organizationId: testOrgId,
          createdBy: 'user-123',
        });
      }

      const result = await service.findAll(testOrgId, { limit: 10 });

      expect(result.items).toHaveLength(10);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });
  });

  describe('softDelete', () => {
    it('should soft delete a situation', async () => {
      const situation = await service.create({
        name: 'To Delete',
        organizationId: testOrgId,
        createdBy: 'user-123',
      });

      await service.softDelete(situation.id, testOrgId);

      // Should not appear in normal queries
      const result = await service.findById(situation.id, testOrgId);
      expect(result).toBeNull();

      // Should exist with deletedAt set
      const [deleted] = await db
        .select()
        .from(situations)
        .where(eq(situations.id, situation.id));
      expect(deleted.deletedAt).not.toBeNull();
    });
  });
});
```

#### `apps/api/src/modules/auth/auth.controller.spec.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../app';

describe('AuthController', () => {
  describe('POST /api/auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return tokens for valid credentials', async () => {
      // First create a user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'validpassword123',
          name: 'Test User',
        });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'validpassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return 200 even for non-existent email', async () => {
      // Security: don't reveal if email exists
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
    });
  });
});
```

---

### 10.4 Component Unit Tests

#### `apps/web/src/components/threat-matrix/ThreatMatrix.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThreatMatrix } from './ThreatMatrix';

const mockThreats = [
  {
    id: '1',
    name: 'Threat A',
    probability: 4,
    impact: 5,
    category: 'political',
  },
  {
    id: '2',
    name: 'Threat B',
    probability: 2,
    impact: 3,
    category: 'economic',
  },
];

describe('ThreatMatrix', () => {
  it('renders the matrix grid', () => {
    render(<ThreatMatrix threats={mockThreats} />);

    // 5x5 grid cells
    const cells = screen.getAllByTestId(/matrix-cell/);
    expect(cells).toHaveLength(25);
  });

  it('positions threats correctly in the matrix', () => {
    render(<ThreatMatrix threats={mockThreats} />);

    // Threat A at (4, 5) - high risk
    const threatA = screen.getByTestId('threat-marker-1');
    expect(threatA).toBeInTheDocument();
  });

  it('calls onThreatClick when a threat is clicked', () => {
    const onThreatClick = vi.fn();
    render(
      <ThreatMatrix threats={mockThreats} onThreatClick={onThreatClick} />
    );

    fireEvent.click(screen.getByTestId('threat-marker-1'));

    expect(onThreatClick).toHaveBeenCalledWith(mockThreats[0]);
  });

  it('displays risk levels with correct colors', () => {
    render(<ThreatMatrix threats={mockThreats} />);

    // High risk cells should have red styling
    const highRiskCell = screen.getByTestId('matrix-cell-4-5');
    expect(highRiskCell).toHaveClass('bg-red-900/50');
  });
});
```

#### `apps/web/src/hooks/useSituation.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSituation, useSituations } from './useSituation';

// Mock fetch
global.fetch = vi.fn();

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useSituation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a single situation', async () => {
    const mockSituation = {
      id: '123',
      name: 'Test Situation',
      status: 'active',
    };

    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSituation,
    });

    const { result } = renderHook(() => useSituation('123'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockSituation);
    });
  });

  it('handles errors gracefully', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useSituation('invalid'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});

describe('useSituations', () => {
  it('fetches paginated list', async () => {
    const mockResponse = {
      items: [{ id: '1', name: 'Situation 1' }],
      hasMore: true,
      nextCursor: 'cursor123',
    };

    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useSituations(), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.items).toHaveLength(1);
      expect(result.current.data?.hasMore).toBe(true);
    });
  });
});
```

---

### 10.5 E2E Test Suite

#### `apps/web/e2e/auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email-input"]', 'demo@situationmonitor.app');
    await page.fill('[data-testid="password-input"]', 'demopassword123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-greeting"]')).toContainText(
      'Welcome'
    );
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'demo@situationmonitor.app');
    await page.fill('[data-testid="password-input"]', 'demopassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    await expect(page).toHaveURL('/login');
  });
});
```

#### `apps/web/e2e/situations.spec.ts`

```typescript
import { test, expect } from './fixtures';

test.describe('Situations Management', () => {
  test('should create a new situation', async ({ authenticatedPage: page }) => {
    await page.goto('/situations');
    await page.click('[data-testid="create-situation-button"]');

    await page.fill('[data-testid="situation-name"]', 'E2E Test Situation');
    await page.fill(
      '[data-testid="situation-description"]',
      'Created by E2E test'
    );
    await page.selectOption('[data-testid="situation-status"]', 'active');
    await page.click('[data-testid="save-situation"]');

    await expect(page.locator('text=E2E Test Situation')).toBeVisible();
  });

  test('should edit an existing situation', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/situations');

    // Click first situation's edit button
    await page.click('[data-testid="situation-card"]:first-child');
    await page.click('[data-testid="edit-situation"]');

    await page.fill('[data-testid="situation-name"]', 'Updated Situation Name');
    await page.click('[data-testid="save-situation"]');

    await expect(page.locator('text=Updated Situation Name')).toBeVisible();
  });

  test('should delete a situation', async ({ authenticatedPage: page }) => {
    await page.goto('/situations');

    const situationName = await page
      .locator('[data-testid="situation-card"]:first-child [data-testid="situation-name"]')
      .textContent();

    await page.click('[data-testid="situation-card"]:first-child');
    await page.click('[data-testid="delete-situation"]');
    await page.click('[data-testid="confirm-delete"]');

    await expect(page.locator(`text=${situationName}`)).not.toBeVisible();
  });
});
```

#### `apps/web/e2e/geospatial.spec.ts`

```typescript
import { test, expect } from './fixtures';

test.describe('Geospatial Command Center', () => {
  test('should load the map', async ({ authenticatedPage: page }) => {
    await page.goto('/command');

    // Wait for Mapbox to initialize
    await page.waitForSelector('.mapboxgl-map', { timeout: 10000 });

    await expect(page.locator('.mapboxgl-map')).toBeVisible();
  });

  test('should toggle layers', async ({ authenticatedPage: page }) => {
    await page.goto('/command');
    await page.waitForSelector('.mapboxgl-map');

    // Open layer panel
    await page.click('[data-testid="layer-toggle"]');

    // Toggle flight layer
    await page.click('[data-testid="layer-flight-tracking"]');

    // Verify layer is active
    await expect(
      page.locator('[data-testid="layer-flight-tracking"]')
    ).toHaveAttribute('data-active', 'true');
  });

  test('should search locations', async ({ authenticatedPage: page }) => {
    await page.goto('/command');
    await page.waitForSelector('.mapboxgl-map');

    await page.fill('[data-testid="location-search"]', 'New York');
    await page.click('[data-testid="search-result"]:first-child');

    // Map should center on search result
    await page.waitForTimeout(1000); // Wait for animation
  });

  test('should create a NAI marker', async ({ authenticatedPage: page }) => {
    await page.goto('/command');
    await page.waitForSelector('.mapboxgl-map');

    // Enable NAI creation mode
    await page.click('[data-testid="create-nai-button"]');

    // Click on map to place marker
    await page.click('.mapboxgl-map', { position: { x: 400, y: 300 } });

    // Fill NAI details
    await page.fill('[data-testid="nai-name"]', 'Test NAI');
    await page.selectOption('[data-testid="nai-type"]', 'observation');
    await page.click('[data-testid="save-nai"]');

    await expect(page.locator('[data-testid="nai-marker"]')).toBeVisible();
  });
});
```

---

### 10.6 GitHub Actions CI

Already added to Phase 0. See `.github/workflows/ci.yml`.

Additional test job configuration:

#### `.github/workflows/ci.yml` (extended)

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
      - run: pnpm typecheck

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint
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
      - run: pnpm test:unit -- --coverage

      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  integration-tests:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: pgvector/pgvector:pg14
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
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
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/situation_monitor_test
      REDIS_URL: redis://localhost:6379
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
      - run: pnpm db:migrate
      - run: pnpm test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    services:
      postgres:
        image: pgvector/pgvector:pg14
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
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
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/situation_monitor_test
      REDIS_URL: redis://localhost:6379
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
      - run: pnpm db:migrate
      - run: pnpm db:seed

      - name: Install Playwright Browsers
        run: pnpm --filter web exec playwright install --with-deps

      - name: Run E2E Tests
        run: pnpm test:e2e
        env:
          E2E_BASE_URL: http://localhost:5173

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web/playwright-report/
          retention-days: 7
```

---

### 10.7 Deployment Workflow

#### `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    outputs:
      api-image: ${{ steps.meta-api.outputs.tags }}
      web-image: ${{ steps.meta-web.outputs.tags }}
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract API metadata
        id: meta-api
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/api
          tags: |
            type=sha,prefix=
            type=ref,event=branch
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./docker/api.Dockerfile
          push: true
          tags: ${{ steps.meta-api.outputs.tags }}
          labels: ${{ steps.meta-api.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Extract Web metadata
        id: meta-web
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/web
          tags: |
            type=sha,prefix=
            type=ref,event=branch
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Web image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./docker/web.Dockerfile
          push: true
          tags: ${{ steps.meta-web.outputs.tags }}
          labels: ${{ steps.meta-web.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.event.inputs.environment == 'staging'
    environment:
      name: staging
      url: https://staging.situationmonitor.app
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to staging
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/situation-monitor
            docker compose pull
            docker compose up -d --remove-orphans
            docker system prune -f

  deploy-production:
    needs: [build, deploy-staging]
    runs-on: ubuntu-latest
    if: github.event.inputs.environment == 'production'
    environment:
      name: production
      url: https://app.situationmonitor.app
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to production
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/situation-monitor
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d --remove-orphans
            docker system prune -f
```

---

### 10.8 Monitoring & Health Checks

#### `apps/api/src/modules/health/health.controller.ts`

```typescript
import { Hono } from 'hono';
import { db } from '../../database/client';
import { redis } from '../../lib/redis';
import { sql } from 'drizzle-orm';

const health = new Hono();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    memory: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}

async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkRedis(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    await redis.ping();
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function checkMemory(): ComponentHealth {
  const used = process.memoryUsage();
  const heapUsedPercent = (used.heapUsed / used.heapTotal) * 100;

  if (heapUsedPercent > 90) {
    return {
      status: 'unhealthy',
      error: `Heap usage at ${heapUsedPercent.toFixed(1)}%`,
    };
  }

  return { status: 'healthy' };
}

// Liveness probe - is the app running?
health.get('/live', (c) => {
  return c.json({ status: 'ok' });
});

// Readiness probe - is the app ready to serve traffic?
health.get('/ready', async (c) => {
  const [database, redisCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  const isReady = database.status === 'healthy' && redisCheck.status === 'healthy';

  return c.json(
    {
      ready: isReady,
      checks: { database, redis: redisCheck },
    },
    isReady ? 200 : 503
  );
});

// Full health check with metrics
health.get('/', async (c) => {
  const [database, redisCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);
  const memory = checkMemory();

  const checks = { database, redis: redisCheck, memory };
  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
  const anyUnhealthy = Object.values(checks).some((c) => c.status === 'unhealthy');

  const status: HealthStatus = {
    status: allHealthy ? 'healthy' : anyUnhealthy ? 'unhealthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.0.0',
    uptime: process.uptime(),
    checks,
  };

  return c.json(status, status.status === 'healthy' ? 200 : 503);
});

export { health };
```

#### `docker-compose.prod.yml` (health checks)

```yaml
version: '3.8'

services:
  api:
    image: ghcr.io/yourorg/situation-monitor/api:latest
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health/live']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  web:
    image: ghcr.io/yourorg/situation-monitor/web:latest
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:80/']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

  postgres:
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5
```

---

## Package.json Scripts

Add to root `package.json`:

```json
{
  "scripts": {
    "test": "pnpm -r test",
    "test:unit": "pnpm -r test:unit",
    "test:integration": "pnpm --filter api test:integration",
    "test:e2e": "pnpm --filter web test:e2e",
    "test:coverage": "pnpm -r test -- --coverage",
    "typecheck": "pnpm -r typecheck"
  }
}
```

Add to `apps/api/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run --exclude '**/*.integration.spec.ts'",
    "test:integration": "vitest run --include '**/*.integration.spec.ts'",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  }
}
```

Add to `apps/web/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Acceptance Criteria

- [ ] Vitest configured for both API and Web packages
- [ ] Unit tests achieve >70% coverage on business logic
- [ ] Integration tests cover all API endpoints
- [ ] E2E tests cover critical user flows:
  - [ ] Authentication (login, logout, password reset)
  - [ ] CRUD operations for situations
  - [ ] Geospatial map interactions
  - [ ] Dashboard navigation
- [ ] GitHub Actions CI passes on all PRs
- [ ] Docker images build and push successfully
- [ ] Staging deployment automated on main branch merge
- [ ] Production deployment requires manual approval
- [ ] Health check endpoints functional
- [ ] All tests pass locally and in CI

---

## Files to Create/Modify

| Path | Description |
|------|-------------|
| `apps/api/vitest.config.ts` | Vitest configuration for API |
| `apps/api/src/test/setup.ts` | API test setup |
| `apps/web/vitest.config.ts` | Vitest configuration for Web |
| `apps/web/src/test/setup.ts` | Web test setup with mocks |
| `apps/web/playwright.config.ts` | Playwright E2E configuration |
| `apps/web/e2e/fixtures.ts` | Playwright test fixtures |
| `apps/web/e2e/*.spec.ts` | E2E test files |
| `.github/workflows/ci.yml` | CI pipeline (updated) |
| `.github/workflows/deploy.yml` | Deployment pipeline |
| `apps/api/src/modules/health/` | Health check endpoints |
| `docker-compose.prod.yml` | Production compose with health checks |
| `package.json` | Root test scripts |
