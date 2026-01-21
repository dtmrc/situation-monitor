# Phase 2: Backend API

## Overview

**Purpose:** Build the Hono-based REST API with authentication, authorization, and core CRUD services for all domain entities.

**Dependencies:** Phase 0 (Infrastructure), Phase 1 (Data Layer)

**Deliverables:**
- Hono API framework with middleware stack
- JWT-based authentication system
- Role-based access control (RBAC)
- CRUD endpoints for all domain entities
- Request validation with Zod
- Error handling and logging
- Rate limiting and security headers

---

## Architecture

### API Layer Structure

```
apps/api/src/
├── index.ts                 # Entry point
├── app.ts                   # Hono app configuration
├── routes/
│   ├── index.ts             # Route aggregation
│   ├── auth.ts              # Authentication routes
│   ├── projects.ts          # Project CRUD
│   ├── assessments.ts       # Assessment CRUD
│   ├── pmesii.ts            # PMESII-PT factors
│   ├── threats.ts           # Threat assessments
│   ├── cog.ts               # Center of Gravity
│   ├── intel.ts             # PIR, NAI, Sources
│   ├── indicators.ts        # Indicators, Tripwires
│   ├── documents.ts         # RAG documents
│   └── ai.ts                # AI/LLM endpoints
├── middleware/
│   ├── auth.ts              # JWT verification
│   ├── rbac.ts              # Role-based access
│   ├── validation.ts        # Zod validation
│   ├── rateLimit.ts         # Rate limiting
│   └── errorHandler.ts      # Error handling
├── services/
│   ├── auth.service.ts      # Auth business logic
│   ├── project.service.ts   # Project operations
│   ├── assessment.service.ts
│   └── ...                  # Other services
├── lib/
│   ├── jwt.ts               # JWT utilities
│   ├── password.ts          # Password hashing
│   └── errors.ts            # Custom error classes
└── types/
    └── index.ts             # API-specific types
```

### Request Flow

```
Request
   │
   ▼
┌──────────────────┐
│  Rate Limiter    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Security Headers│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  CORS Middleware │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Logger          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Auth Middleware │ ◄── JWT Verification
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  RBAC Check      │ ◄── Permission verification
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Validation      │ ◄── Zod schema validation
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Route Handler   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Service Layer   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Database        │
└──────────────────┘
```

---

## Implementation Tasks

| ID | Task | Agent | Priority | Dependencies |
|----|------|-------|----------|--------------|
| 2.1 | Configure Hono app with middleware stack | `node-developer` | Critical | Phase 1 |
| 2.2 | Implement JWT authentication | `node-developer` | Critical | 2.1 |
| 2.3 | Implement RBAC middleware | `node-developer` | Critical | 2.2 |
| 2.4 | Create Zod validation middleware | `node-developer` | High | 2.1 |
| 2.5 | Build error handling system | `node-developer` | High | 2.1 |
| 2.6 | Implement auth routes (login, register, refresh) | `node-developer` | Critical | 2.2 |
| 2.7 | Implement project CRUD routes | `node-developer` | Critical | 2.3 |
| 2.8 | Implement assessment CRUD routes | `node-developer` | Critical | 2.7 |
| 2.9 | Implement PMESII-PT routes | `node-developer` | High | 2.8 |
| 2.10 | Implement threat assessment routes | `node-developer` | High | 2.8 |
| 2.11 | Implement CoG routes | `node-developer` | High | 2.8 |
| 2.12 | Implement intelligence collection routes | `node-developer` | High | 2.7 |
| 2.13 | Implement indicator/tripwire routes | `node-developer` | High | 2.12 |
| 2.14 | Add rate limiting | `node-developer` | Medium | 2.1 |
| 2.15 | Domain logic validation | `intelligence-analysis-expert` | Medium | 2.9-2.13 |

---

## Detailed Specifications

### 2.1 Hono App Configuration

**File: `apps/api/src/app.ts`**
```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';

import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimit';
import { routes } from './routes';
import type { AppEnv } from './types';

export function createApp() {
  const app = new Hono<AppEnv>();

  // Global middleware
  app.use('*', timing());
  app.use('*', logger());
  app.use('*', secureHeaders());
  app.use('*', rateLimiter);
  app.use('/api/*', cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }));

  // Error handling
  app.onError(errorHandler);

  // Health check (no auth required)
  app.get('/api/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.0.1',
    });
  });

  // Mount routes
  app.route('/api', routes);

  return app;
}
```

**File: `apps/api/src/types/index.ts`**
```typescript
import type { Context } from 'hono';

export interface JWTPayload {
  sub: string;      // User ID
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AppEnv {
  Variables: {
    user: JWTPayload;
    requestId: string;
  };
}

export type AppContext = Context<AppEnv>;
```

### 2.2 JWT Authentication

**File: `apps/api/src/lib/jwt.ts`**
```typescript
import { sign, verify } from 'hono/jwt';
import type { JWTPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export async function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      ...payload,
      iat: now,
      exp: now + 15 * 60, // 15 minutes
    },
    JWT_SECRET
  );
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: userId,
      type: 'refresh',
      iat: now,
      exp: now + 7 * 24 * 60 * 60, // 7 days
    },
    JWT_SECRET
  );
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  return verify(token, JWT_SECRET) as Promise<JWTPayload>;
}

export function generateTokenPair(user: { id: string; email: string; role: string }) {
  return Promise.all([
    generateAccessToken({ sub: user.id, email: user.email, role: user.role }),
    generateRefreshToken(user.id),
  ]).then(([accessToken, refreshToken]) => ({ accessToken, refreshToken }));
}
```

**File: `apps/api/src/lib/password.ts`**
```typescript
import { hash, verify } from '@node-rs/argon2';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return verify(hashedPassword, password);
}
```

**File: `apps/api/src/middleware/auth.ts`**
```typescript
import { createMiddleware } from 'hono/factory';

import { verifyToken } from '../lib/jwt';
import { UnauthorizedError } from '../lib/errors';
import type { AppEnv } from '../types';

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyToken(token);
    c.set('user', payload);
    await next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
});

// Optional auth - sets user if token present, continues otherwise
export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = await verifyToken(token);
      c.set('user', payload);
    } catch {
      // Token invalid, continue without user
    }
  }

  await next();
});
```

### 2.3 RBAC Middleware

**File: `apps/api/src/middleware/rbac.ts`**
```typescript
import { createMiddleware } from 'hono/factory';

import { ForbiddenError } from '../lib/errors';
import type { AppEnv } from '../types';

type Role = 'owner' | 'admin' | 'analyst' | 'viewer';

const roleHierarchy: Record<Role, number> = {
  owner: 4,
  admin: 3,
  analyst: 2,
  viewer: 1,
};

export function requireRole(...allowedRoles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user');

    if (!user) {
      throw new ForbiddenError('Authentication required');
    }

    const userRole = user.role as Role;
    const hasPermission = allowedRoles.some(
      (role) => roleHierarchy[userRole] >= roleHierarchy[role]
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions');
    }

    await next();
  });
}

// Project-specific RBAC check
export function requireProjectAccess(minRole: Role = 'viewer') {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user');
    const projectId = c.req.param('projectId');

    if (!user || !projectId) {
      throw new ForbiddenError('Access denied');
    }

    // TODO: Check project membership in database
    // For now, delegate to route handler

    await next();
  });
}
```

### 2.4 Zod Validation Middleware

**File: `apps/api/src/middleware/validation.ts`**
```typescript
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';

import { ValidationError } from '../lib/errors';

export function validateBody<T extends z.ZodType>(schema: T) {
  return createMiddleware(async (c, next) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);
      c.set('validatedBody' as never, validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid request body', error.errors);
      }
      throw error;
    }
  });
}

export function validateQuery<T extends z.ZodType>(schema: T) {
  return createMiddleware(async (c, next) => {
    try {
      const query = c.req.query();
      const validated = schema.parse(query);
      c.set('validatedQuery' as never, validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid query parameters', error.errors);
      }
      throw error;
    }
  });
}

export function validateParams<T extends z.ZodType>(schema: T) {
  return createMiddleware(async (c, next) => {
    try {
      const params = c.req.param();
      const validated = schema.parse(params);
      c.set('validatedParams' as never, validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid path parameters', error.errors);
      }
      throw error;
    }
  });
}
```

### 2.5 Error Handling

**File: `apps/api/src/lib/errors.ts`**
```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}
```

**File: `apps/api/src/middleware/errorHandler.ts`**
```typescript
import type { Context } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';

import { AppError } from '../lib/errors';

export function errorHandler(error: Error, c: Context) {
  console.error('Error:', error);

  if (error instanceof AppError) {
    return c.json(
      {
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      },
      error.statusCode as StatusCode
    );
  }

  // Unexpected error
  return c.json(
    {
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    },
    500
  );
}
```

### 2.6 Auth Routes

**File: `apps/api/src/routes/auth.ts`**
```typescript
import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../db';
import { users } from '../db/schema';
import { generateTokenPair, verifyToken } from '../lib/jwt';
import { hashPassword, verifyPassword } from '../lib/password';
import { ConflictError, UnauthorizedError, ValidationError } from '../lib/errors';
import { validateBody } from '../middleware/validation';
import { eq } from 'drizzle-orm';

const auth = new Hono();

// Schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(255),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

// Register
auth.post('/register', validateBody(registerSchema), async (c) => {
  const { email, password, name } = await c.req.json();

  // Check if user exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    throw new ConflictError('Email already registered');
  }

  // Create user
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({
    email,
    name,
    passwordHash,
  }).returning({ id: users.id, email: users.email, name: users.name });

  // Generate tokens
  const tokens = await generateTokenPair({ id: user.id, email: user.email, role: 'owner' });

  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    ...tokens,
  }, 201);
});

// Login
auth.post('/login', validateBody(loginSchema), async (c) => {
  const { email, password } = await c.req.json();

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const tokens = await generateTokenPair({ id: user.id, email: user.email, role: 'owner' });

  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    ...tokens,
  });
});

// Refresh token
auth.post('/refresh', validateBody(refreshSchema), async (c) => {
  const { refreshToken } = await c.req.json();

  try {
    const payload = await verifyToken(refreshToken);

    if ((payload as { type?: string }).type !== 'refresh') {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const tokens = await generateTokenPair({ id: user.id, email: user.email, role: 'owner' });

    return c.json(tokens);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }
});

// Get current user
auth.get('/me', async (c) => {
  // Auth middleware should have already set the user
  const jwtPayload = c.get('user');

  if (!jwtPayload) {
    throw new UnauthorizedError();
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, jwtPayload.sub),
    columns: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  return c.json({ user });
});

export { auth };
```

### 2.7 Project Routes

**File: `apps/api/src/routes/projects.ts`**
```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';

import { db } from '../db';
import { projects, projectMembers, assessments } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import type { AppEnv } from '../types';

const projectRoutes = new Hono<AppEnv>();

// All routes require auth
projectRoutes.use('*', authMiddleware);

// Schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

// List projects
projectRoutes.get('/', async (c) => {
  const user = c.get('user');

  const userProjects = await db.query.projects.findMany({
    where: eq(projects.ownerId, user.sub),
    orderBy: [desc(projects.updatedAt)],
    with: {
      assessments: {
        columns: { id: true },
      },
    },
  });

  return c.json({
    projects: userProjects.map((p) => ({
      ...p,
      assessmentCount: p.assessments.length,
      assessments: undefined,
    })),
  });
});

// Create project
projectRoutes.post('/', validateBody(createProjectSchema), async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const [project] = await db.insert(projects).values({
    name: body.name,
    description: body.description,
    ownerId: user.sub,
  }).returning();

  // Add owner as project member
  await db.insert(projectMembers).values({
    projectId: project.id,
    userId: user.sub,
    role: 'owner',
  });

  return c.json({ project }, 201);
});

// Get single project
projectRoutes.get('/:projectId', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.ownerId, user.sub)
    ),
    with: {
      assessments: true,
      members: {
        with: {
          // Omit password from user
        },
      },
    },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  return c.json({ project });
});

// Update project
projectRoutes.patch('/:projectId', validateBody(updateProjectSchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  const body = await c.req.json();

  // Verify ownership
  const existing = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.ownerId, user.sub)
    ),
  });

  if (!existing) {
    throw new NotFoundError('Project');
  }

  const [updated] = await db.update(projects)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();

  return c.json({ project: updated });
});

// Delete project
projectRoutes.delete('/:projectId', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  const existing = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.ownerId, user.sub)
    ),
  });

  if (!existing) {
    throw new NotFoundError('Project');
  }

  await db.delete(projects).where(eq(projects.id, projectId));

  return c.json({ success: true });
});

export { projectRoutes };
```

### 2.8 Assessment Routes

**File: `apps/api/src/routes/assessments.ts`**
```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';

import { db } from '../db';
import { projects, assessments, factors } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import type { AppEnv } from '../types';

const assessmentRoutes = new Hono<AppEnv>();

assessmentRoutes.use('*', authMiddleware);

// Schemas
const createAssessmentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

const updateAssessmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

// Helper: verify project access
async function verifyProjectAccess(projectId: string, userId: string) {
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.ownerId, userId)
    ),
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  return project;
}

// List assessments for a project
assessmentRoutes.get('/projects/:projectId/assessments', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  await verifyProjectAccess(projectId, user.sub);

  const projectAssessments = await db.query.assessments.findMany({
    where: eq(assessments.projectId, projectId),
    orderBy: [desc(assessments.updatedAt)],
  });

  return c.json({ assessments: projectAssessments });
});

// Create assessment
assessmentRoutes.post('/projects/:projectId/assessments', validateBody(createAssessmentSchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  const body = await c.req.json();

  await verifyProjectAccess(projectId, user.sub);

  const [assessment] = await db.insert(assessments).values({
    projectId,
    name: body.name,
    description: body.description,
  }).returning();

  return c.json({ assessment }, 201);
});

// Get assessment with factors
assessmentRoutes.get('/assessments/:assessmentId', async (c) => {
  const user = c.get('user');
  const assessmentId = c.req.param('assessmentId');

  const assessment = await db.query.assessments.findFirst({
    where: eq(assessments.id, assessmentId),
    with: {
      project: true,
    },
  });

  if (!assessment) {
    throw new NotFoundError('Assessment');
  }

  // Verify project access
  await verifyProjectAccess(assessment.projectId, user.sub);

  // Get factors grouped by domain
  const assessmentFactors = await db.query.factors.findMany({
    where: eq(factors.assessmentId, assessmentId),
    orderBy: [factors.sortOrder],
  });

  return c.json({
    assessment,
    factors: assessmentFactors,
  });
});

// Update assessment
assessmentRoutes.patch('/assessments/:assessmentId', validateBody(updateAssessmentSchema), async (c) => {
  const user = c.get('user');
  const assessmentId = c.req.param('assessmentId');
  const body = await c.req.json();

  const existing = await db.query.assessments.findFirst({
    where: eq(assessments.id, assessmentId),
  });

  if (!existing) {
    throw new NotFoundError('Assessment');
  }

  await verifyProjectAccess(existing.projectId, user.sub);

  const [updated] = await db.update(assessments)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(assessments.id, assessmentId))
    .returning();

  return c.json({ assessment: updated });
});

// Delete assessment
assessmentRoutes.delete('/assessments/:assessmentId', async (c) => {
  const user = c.get('user');
  const assessmentId = c.req.param('assessmentId');

  const existing = await db.query.assessments.findFirst({
    where: eq(assessments.id, assessmentId),
  });

  if (!existing) {
    throw new NotFoundError('Assessment');
  }

  await verifyProjectAccess(existing.projectId, user.sub);

  await db.delete(assessments).where(eq(assessments.id, assessmentId));

  return c.json({ success: true });
});

export { assessmentRoutes };
```

### 2.9 PMESII-PT Routes

**File: `apps/api/src/routes/pmesii.ts`**
```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

import { db } from '../db';
import { assessments, factors, factorEvidence } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { NotFoundError } from '../lib/errors';
import type { AppEnv } from '../types';

const pmesiiRoutes = new Hono<AppEnv>();

pmesiiRoutes.use('*', authMiddleware);

// Schemas
const domainEnum = z.enum([
  'political', 'military', 'economic', 'social',
  'information', 'infrastructure', 'physical', 'time',
]);

const createFactorSchema = z.object({
  domain: domainEnum,
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  analysis: z.string().optional(),
  impact: z.enum(['negligible', 'minor', 'moderate', 'significant', 'critical']).optional(),
  trend: z.enum(['improving', 'stable', 'declining']).optional(),
  confidence: z.number().min(0).max(100).optional(),
});

const updateFactorSchema = createFactorSchema.partial();

const createEvidenceSchema = z.object({
  content: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  sourceType: z.string().optional(),
  observedAt: z.string().datetime().optional(),
});

// Get all factors for an assessment (grouped by domain)
pmesiiRoutes.get('/assessments/:assessmentId/factors', async (c) => {
  const assessmentId = c.req.param('assessmentId');

  const allFactors = await db.query.factors.findMany({
    where: eq(factors.assessmentId, assessmentId),
    with: {
      evidence: true,
    },
    orderBy: [factors.domain, factors.sortOrder],
  });

  // Group by domain
  const byDomain = allFactors.reduce((acc, factor) => {
    if (!acc[factor.domain]) {
      acc[factor.domain] = [];
    }
    acc[factor.domain].push(factor);
    return acc;
  }, {} as Record<string, typeof allFactors>);

  return c.json({ factors: byDomain });
});

// Create factor
pmesiiRoutes.post('/assessments/:assessmentId/factors', validateBody(createFactorSchema), async (c) => {
  const assessmentId = c.req.param('assessmentId');
  const body = await c.req.json();

  // Verify assessment exists
  const assessment = await db.query.assessments.findFirst({
    where: eq(assessments.id, assessmentId),
  });

  if (!assessment) {
    throw new NotFoundError('Assessment');
  }

  const [factor] = await db.insert(factors).values({
    assessmentId,
    ...body,
  }).returning();

  return c.json({ factor }, 201);
});

// Update factor
pmesiiRoutes.patch('/factors/:factorId', validateBody(updateFactorSchema), async (c) => {
  const factorId = c.req.param('factorId');
  const body = await c.req.json();

  const existing = await db.query.factors.findFirst({
    where: eq(factors.id, factorId),
  });

  if (!existing) {
    throw new NotFoundError('Factor');
  }

  const [updated] = await db.update(factors)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(factors.id, factorId))
    .returning();

  return c.json({ factor: updated });
});

// Delete factor
pmesiiRoutes.delete('/factors/:factorId', async (c) => {
  const factorId = c.req.param('factorId');

  const existing = await db.query.factors.findFirst({
    where: eq(factors.id, factorId),
  });

  if (!existing) {
    throw new NotFoundError('Factor');
  }

  await db.delete(factors).where(eq(factors.id, factorId));

  return c.json({ success: true });
});

// Add evidence to factor
pmesiiRoutes.post('/factors/:factorId/evidence', validateBody(createEvidenceSchema), async (c) => {
  const factorId = c.req.param('factorId');
  const body = await c.req.json();

  const factor = await db.query.factors.findFirst({
    where: eq(factors.id, factorId),
  });

  if (!factor) {
    throw new NotFoundError('Factor');
  }

  const [evidence] = await db.insert(factorEvidence).values({
    factorId,
    content: body.content,
    sourceUrl: body.sourceUrl,
    sourceType: body.sourceType,
    observedAt: body.observedAt ? new Date(body.observedAt) : null,
  }).returning();

  return c.json({ evidence }, 201);
});

// Delete evidence
pmesiiRoutes.delete('/evidence/:evidenceId', async (c) => {
  const evidenceId = c.req.param('evidenceId');

  await db.delete(factorEvidence).where(eq(factorEvidence.id, evidenceId));

  return c.json({ success: true });
});

export { pmesiiRoutes };
```

### 2.14 Rate Limiting

**File: `apps/api/src/middleware/rateLimit.ts`**
```typescript
import { createMiddleware } from 'hono/factory';

// Simple in-memory rate limiter
// For production, use Redis-based rate limiting
const requests = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // per window

export const rateLimiter = createMiddleware(async (c, next) => {
  // Get client identifier (IP or user ID)
  const clientId = c.req.header('x-forwarded-for') ||
                   c.req.header('x-real-ip') ||
                   'unknown';

  const now = Date.now();
  const record = requests.get(clientId);

  if (!record || now > record.resetAt) {
    // New window
    requests.set(clientId, { count: 1, resetAt: now + WINDOW_MS });
  } else if (record.count >= MAX_REQUESTS) {
    // Rate limited
    c.header('X-RateLimit-Limit', MAX_REQUESTS.toString());
    c.header('X-RateLimit-Remaining', '0');
    c.header('X-RateLimit-Reset', record.resetAt.toString());

    return c.json(
      { error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
      429
    );
  } else {
    // Increment counter
    record.count++;
  }

  const current = requests.get(clientId)!;
  c.header('X-RateLimit-Limit', MAX_REQUESTS.toString());
  c.header('X-RateLimit-Remaining', (MAX_REQUESTS - current.count).toString());
  c.header('X-RateLimit-Reset', current.resetAt.toString());

  await next();
});
```

### Route Aggregation

**File: `apps/api/src/routes/index.ts`**
```typescript
import { Hono } from 'hono';

import { auth } from './auth';
import { projectRoutes } from './projects';
import { assessmentRoutes } from './assessments';
import { pmesiiRoutes } from './pmesii';
// Import other routes as they're created

const routes = new Hono();

// Auth routes (some public)
routes.route('/auth', auth);

// Protected routes
routes.route('/projects', projectRoutes);
routes.route('/', assessmentRoutes); // Nested under projects
routes.route('/', pmesiiRoutes);     // Factor routes

// TODO: Add remaining routes
// routes.route('/', threatRoutes);
// routes.route('/', cogRoutes);
// routes.route('/', intelRoutes);
// routes.route('/', indicatorRoutes);

export { routes };
```

---

## API Endpoint Summary

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Assessments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:projectId/assessments` | List assessments |
| POST | `/api/projects/:projectId/assessments` | Create assessment |
| GET | `/api/assessments/:id` | Get assessment |
| PATCH | `/api/assessments/:id` | Update assessment |
| DELETE | `/api/assessments/:id` | Delete assessment |

### PMESII-PT Factors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assessments/:id/factors` | Get factors by domain |
| POST | `/api/assessments/:id/factors` | Create factor |
| PATCH | `/api/factors/:id` | Update factor |
| DELETE | `/api/factors/:id` | Delete factor |
| POST | `/api/factors/:id/evidence` | Add evidence |
| DELETE | `/api/evidence/:id` | Delete evidence |

### (Additional routes to implement)
- Threat Actors & Assessments
- Center of Gravity
- PIRs, NAIs, Sources
- Indicators, Tripwires, Alerts
- Documents & RAG queries

---

## Acceptance Criteria

- [ ] All endpoints return proper JSON responses
- [ ] JWT authentication works for protected routes
- [ ] RBAC correctly restricts access based on roles
- [ ] Validation errors return 400 with details
- [ ] Not found errors return 404
- [ ] Rate limiting returns 429 when exceeded
- [ ] CORS headers set correctly
- [ ] All CRUD operations work for projects and assessments
- [ ] PMESII-PT factors can be created and updated

---

## Files to Create/Modify

| Path | Description |
|------|-------------|
| `apps/api/src/app.ts` | Hono app configuration |
| `apps/api/src/types/index.ts` | API type definitions |
| `apps/api/src/lib/jwt.ts` | JWT utilities |
| `apps/api/src/lib/password.ts` | Password hashing |
| `apps/api/src/lib/errors.ts` | Custom error classes |
| `apps/api/src/middleware/auth.ts` | JWT auth middleware |
| `apps/api/src/middleware/rbac.ts` | Role-based access control |
| `apps/api/src/middleware/validation.ts` | Zod validation |
| `apps/api/src/middleware/rateLimit.ts` | Rate limiting |
| `apps/api/src/middleware/errorHandler.ts` | Error handling |
| `apps/api/src/routes/index.ts` | Route aggregation |
| `apps/api/src/routes/auth.ts` | Authentication routes |
| `apps/api/src/routes/projects.ts` | Project CRUD |
| `apps/api/src/routes/assessments.ts` | Assessment CRUD |
| `apps/api/src/routes/pmesii.ts` | PMESII-PT routes |
| `apps/api/src/routes/threats.ts` | Threat routes |
| `apps/api/src/routes/cog.ts` | CoG routes |
| `apps/api/src/routes/intel.ts` | Intel collection routes |
| `apps/api/src/routes/indicators.ts` | Indicator routes |

---

## Dependencies to Add

```bash
pnpm --filter @situation-monitor/api add @node-rs/argon2 zod
```

---

## Organization Routes

Multi-tenancy support via organization management endpoints.

**File: `apps/api/src/routes/organizations.ts`**
```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

import { db } from '../db';
import { organizations, organizationMembers, organizationInvitations, users } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { ForbiddenError, NotFoundError, ConflictError } from '../lib/errors';
import type { AppEnv } from '../types';

const orgRoutes = new Hono<AppEnv>();

orgRoutes.use('*', authMiddleware);

// Schemas
const createOrgSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

// List user's organizations
orgRoutes.get('/', async (c) => {
  const user = c.get('user');

  const memberships = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.userId, user.sub),
    with: {
      organization: true,
    },
  });

  return c.json({
    organizations: memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    })),
  });
});

// Create organization
orgRoutes.post('/', validateBody(createOrgSchema), async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  // Check slug uniqueness
  const existing = await db.query.organizations.findFirst({
    where: eq(organizations.slug, body.slug),
  });

  if (existing) {
    throw new ConflictError('Organization slug already exists');
  }

  // Create org and add creator as owner
  const [org] = await db.insert(organizations).values({
    name: body.name,
    slug: body.slug,
    description: body.description,
  }).returning();

  await db.insert(organizationMembers).values({
    organizationId: org.id,
    userId: user.sub,
    role: 'owner',
    invitedBy: user.sub,
  });

  return c.json({ organization: org }, 201);
});

// Get organization
orgRoutes.get('/:orgId', async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('orgId');

  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, orgId),
      eq(organizationMembers.userId, user.sub)
    ),
    with: { organization: true },
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this organization');
  }

  return c.json({
    organization: membership.organization,
    role: membership.role,
  });
});

// List organization members
orgRoutes.get('/:orgId/members', async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('orgId');

  await verifyOrgMembership(orgId, user.sub);

  const members = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.organizationId, orgId),
    with: { user: true },
  });

  return c.json({
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
      },
    })),
  });
});

// Invite member
orgRoutes.post('/:orgId/invitations', validateBody(inviteMemberSchema), async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('orgId');
  const body = await c.req.json();

  await verifyOrgAdmin(orgId, user.sub);

  // Check if already member
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, body.email),
  });

  if (existingUser) {
    const existingMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, existingUser.id)
      ),
    });

    if (existingMember) {
      throw new ConflictError('User is already a member');
    }
  }

  // Generate invitation token
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

  const [invitation] = await db.insert(organizationInvitations).values({
    organizationId: orgId,
    email: body.email,
    role: body.role,
    token,
    invitedBy: user.sub,
    expiresAt,
  }).returning();

  // TODO: Send invitation email

  return c.json({ invitation }, 201);
});

// Accept invitation
orgRoutes.post('/invitations/:token/accept', async (c) => {
  const user = c.get('user');
  const token = c.req.param('token');

  const invitation = await db.query.organizationInvitations.findFirst({
    where: and(
      eq(organizationInvitations.token, token),
      eq(organizationInvitations.email, user.email)
    ),
    with: { organization: true },
  });

  if (!invitation) {
    throw new NotFoundError('Invitation');
  }

  if (invitation.acceptedAt) {
    throw new ConflictError('Invitation already accepted');
  }

  if (new Date() > invitation.expiresAt) {
    throw new ConflictError('Invitation expired');
  }

  // Create membership
  await db.insert(organizationMembers).values({
    organizationId: invitation.organizationId,
    userId: user.sub,
    role: invitation.role,
    invitedBy: invitation.invitedBy,
  });

  // Mark invitation as accepted
  await db.update(organizationInvitations)
    .set({ acceptedAt: new Date() })
    .where(eq(organizationInvitations.id, invitation.id));

  return c.json({ success: true });
});

// Update member role
orgRoutes.patch('/:orgId/members/:memberId', validateBody(updateMemberRoleSchema), async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('orgId');
  const memberId = c.req.param('memberId');
  const body = await c.req.json();

  await verifyOrgOwner(orgId, user.sub);

  const [updated] = await db.update(organizationMembers)
    .set({ role: body.role })
    .where(and(
      eq(organizationMembers.id, memberId),
      eq(organizationMembers.organizationId, orgId)
    ))
    .returning();

  if (!updated) {
    throw new NotFoundError('Member');
  }

  return c.json({ member: updated });
});

// Remove member
orgRoutes.delete('/:orgId/members/:memberId', async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('orgId');
  const memberId = c.req.param('memberId');

  await verifyOrgAdmin(orgId, user.sub);

  // Prevent removing the owner
  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.id, memberId),
  });

  if (!member) {
    throw new NotFoundError('Member');
  }

  if (member.role === 'owner') {
    throw new ForbiddenError('Cannot remove organization owner');
  }

  await db.delete(organizationMembers).where(eq(organizationMembers.id, memberId));

  return c.json({ success: true });
});

// Helper functions
async function verifyOrgMembership(orgId: string, userId: string) {
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, orgId),
      eq(organizationMembers.userId, userId)
    ),
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this organization');
  }

  return membership;
}

async function verifyOrgAdmin(orgId: string, userId: string) {
  const membership = await verifyOrgMembership(orgId, userId);

  if (!['owner', 'admin'].includes(membership.role)) {
    throw new ForbiddenError('Admin access required');
  }

  return membership;
}

async function verifyOrgOwner(orgId: string, userId: string) {
  const membership = await verifyOrgMembership(orgId, userId);

  if (membership.role !== 'owner') {
    throw new ForbiddenError('Owner access required');
  }

  return membership;
}

export { orgRoutes };
```

---

## Password Reset Flow

**File: `apps/api/src/routes/auth.ts`** (add these endpoints)
```typescript
// Password reset schemas
const requestResetSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8),
});

// Request password reset
auth.post('/forgot-password', validateBody(requestResetSchema), async (c) => {
  const { email } = await c.req.json();

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return c.json({ success: true });
  }

  // Generate reset token
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

  // Store token (add password_reset_tokens table or use Redis)
  await redis.set(`password_reset:${token}`, user.id, 'EX', 3600);

  // TODO: Send password reset email with link:
  // `${FRONTEND_URL}/reset-password?token=${token}`

  return c.json({ success: true });
});

// Reset password
auth.post('/reset-password', validateBody(resetPasswordSchema), async (c) => {
  const { token, password } = await c.req.json();

  // Verify token
  const userId = await redis.get(`password_reset:${token}`);

  if (!userId) {
    throw new ApiError(400, 'INVALID_TOKEN', 'Invalid or expired reset token');
  }

  // Hash new password
  const passwordHash = await hashPassword(password);

  // Update user password
  await db.update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Delete used token
  await redis.del(`password_reset:${token}`);

  return c.json({ success: true });
});
```

---

## Cursor-Based Pagination

Standardized pagination for list endpoints, especially useful for real-time feeds.

**File: `apps/api/src/lib/pagination.ts`**
```typescript
import { z } from 'zod';
import { gt, lt, desc, asc, SQL } from 'drizzle-orm';

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

export type CursorPagination = z.infer<typeof cursorPaginationSchema>;

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

/**
 * Create cursor condition for query
 * Assumes cursor is the ID field (UUID, sorted by createdAt desc)
 */
export function cursorCondition<T extends { id: any; createdAt: any }>(
  table: T,
  cursor: string | undefined,
  direction: 'forward' | 'backward'
): SQL | undefined {
  if (!cursor) return undefined;

  // Decode cursor (base64 encoded JSON with id and createdAt)
  const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());

  if (direction === 'forward') {
    return lt(table.createdAt, new Date(decoded.createdAt));
  } else {
    return gt(table.createdAt, new Date(decoded.createdAt));
  }
}

/**
 * Encode cursor from item
 */
export function encodeCursor<T extends { id: string; createdAt: Date }>(item: T): string {
  return Buffer.from(JSON.stringify({
    id: item.id,
    createdAt: item.createdAt.toISOString(),
  })).toString('base64');
}

/**
 * Build paginated response
 */
export function paginatedResponse<T extends { id: string; createdAt: Date }>(
  items: T[],
  limit: number
): PaginatedResult<T> {
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;

  return {
    items: resultItems,
    nextCursor: resultItems.length > 0 ? encodeCursor(resultItems[resultItems.length - 1]) : null,
    prevCursor: resultItems.length > 0 ? encodeCursor(resultItems[0]) : null,
    hasMore,
  };
}
```

**Example usage in feed routes:**
```typescript
import { cursorPaginationSchema, cursorCondition, paginatedResponse } from '../lib/pagination';

feedRoutes.get('/news', async (c) => {
  const query = cursorPaginationSchema.parse(c.req.query());

  const items = await db.query.newsData.findMany({
    where: cursorCondition(newsData, query.cursor, query.direction),
    orderBy: [desc(newsData.publishedAt)],
    limit: query.limit + 1, // Fetch one extra to check hasMore
  });

  return c.json(paginatedResponse(items, query.limit));
});
```

---

## Organization Endpoint Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations` | List user's organizations |
| POST | `/api/organizations` | Create organization |
| GET | `/api/organizations/:id` | Get organization |
| GET | `/api/organizations/:id/members` | List members |
| POST | `/api/organizations/:id/invitations` | Invite member |
| POST | `/api/invitations/:token/accept` | Accept invitation |
| PATCH | `/api/organizations/:id/members/:memberId` | Update member role |
| DELETE | `/api/organizations/:id/members/:memberId` | Remove member |

---

## Password Reset Endpoint Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |

---

## Additional Files to Create

| Path | Description |
|------|-------------|
| `apps/api/src/routes/organizations.ts` | Organization management |
| `apps/api/src/lib/pagination.ts` | Cursor pagination utilities |
