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

## Security Hardening

### 2.16 Production Rate Limiting

The current in-memory rate limiter doesn't scale to multiple instances. For production, use Redis-backed sliding window rate limiting.

**File: `apps/api/src/middleware/rateLimit.ts`** (production version)
```typescript
import { createMiddleware } from 'hono/factory';
import { redis } from '../lib/redis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyPrefix: 'rl:',
};

// Per-route rate limit configurations
export const rateLimitConfigs = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },      // 5 attempts per 15 min
  register: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 per hour
  api: { windowMs: 60 * 1000, maxRequests: 100 },         // 100 per minute
  ai: { windowMs: 60 * 1000, maxRequests: 10 },           // 10 AI calls per minute
} as const;

export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const { windowMs, maxRequests, keyPrefix } = { ...defaultConfig, ...config };

  return createMiddleware(async (c, next) => {
    const clientId = c.get('user')?.sub ||
                     c.req.header('x-forwarded-for') ||
                     c.req.header('x-real-ip') ||
                     'anonymous';

    const key = `${keyPrefix}${clientId}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Sliding window using sorted set
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.pexpire(key, windowMs);

    const results = await pipeline.exec();
    const requestCount = results?.[2]?.[1] as number || 0;

    // Set rate limit headers
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, maxRequests - requestCount).toString());
    c.header('X-RateLimit-Reset', (now + windowMs).toString());

    if (requestCount > maxRequests) {
      c.header('Retry-After', Math.ceil(windowMs / 1000).toString());
      return c.json(
        { error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
        429
      );
    }

    await next();
  });
}

// Convenience middleware for common routes
export const authRateLimiter = createRateLimiter(rateLimitConfigs.auth);
export const registerRateLimiter = createRateLimiter(rateLimitConfigs.register);
export const apiRateLimiter = createRateLimiter(rateLimitConfigs.api);
export const aiRateLimiter = createRateLimiter(rateLimitConfigs.ai);
```

---

### 2.17 CSRF Protection

Implement double-submit cookie pattern for state-changing requests.

**File: `apps/api/src/middleware/csrf.ts`**
```typescript
import { createMiddleware } from 'hono/factory';
import { randomBytes, timingSafeEqual } from 'crypto';
import { getCookie, setCookie } from 'hono/cookie';

import { ForbiddenError } from '../lib/errors';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const TOKEN_LENGTH = 32;

export const csrfProtection = createMiddleware(async (c, next) => {
  // Skip for safe methods
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(c.req.method);

  // Generate or retrieve CSRF token
  let token = getCookie(c, CSRF_COOKIE);

  if (!token) {
    token = randomBytes(TOKEN_LENGTH).toString('hex');
    setCookie(c, CSRF_COOKIE, token, {
      httpOnly: false, // JS needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
  }

  // For unsafe methods, verify token
  if (!safeMethod) {
    const headerToken = c.req.header(CSRF_HEADER);

    if (!headerToken) {
      throw new ForbiddenError('CSRF token missing');
    }

    // Timing-safe comparison to prevent timing attacks
    const tokenBuffer = Buffer.from(token);
    const headerBuffer = Buffer.from(headerToken);

    if (tokenBuffer.length !== headerBuffer.length ||
        !timingSafeEqual(tokenBuffer, headerBuffer)) {
      throw new ForbiddenError('CSRF token invalid');
    }
  }

  // Make token available for response
  c.set('csrfToken' as never, token);

  await next();
});

// Endpoint to get CSRF token for SPA
export function csrfTokenEndpoint(c: any) {
  const token = c.get('csrfToken');
  return c.json({ csrfToken: token });
}
```

---

### 2.18 Request Correlation IDs

Track requests across distributed systems for debugging.

**File: `apps/api/src/middleware/correlation.ts`**
```typescript
import { createMiddleware } from 'hono/factory';
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage for request context
export const requestContext = new AsyncLocalStorage<{
  requestId: string;
  userId?: string;
  startTime: number;
}>();

const REQUEST_ID_HEADER = 'x-request-id';

export const correlationMiddleware = createMiddleware(async (c, next) => {
  // Use existing request ID or generate new one
  const requestId = c.req.header(REQUEST_ID_HEADER) || randomUUID();
  const startTime = Date.now();

  // Set in response header
  c.header(REQUEST_ID_HEADER, requestId);

  // Run in async context
  await requestContext.run({ requestId, startTime }, async () => {
    c.set('requestId', requestId);
    await next();
  });
});

// Helper to get current request context
export function getRequestContext() {
  return requestContext.getStore();
}

// Helper to get request ID for logging
export function getRequestId(): string {
  return requestContext.getStore()?.requestId || 'unknown';
}
```

---

### 2.19 API Versioning

Implement URL prefix versioning with deprecation support.

**File: `apps/api/src/routes/index.ts`** (updated with versioning)
```typescript
import { Hono } from 'hono';

import { auth } from './auth';
import { projectRoutes } from './projects';
import { assessmentRoutes } from './assessments';
import { pmesiiRoutes } from './pmesii';
import { orgRoutes } from './organizations';

// Version 1 API routes
const v1 = new Hono();
v1.route('/auth', auth);
v1.route('/projects', projectRoutes);
v1.route('/', assessmentRoutes);
v1.route('/', pmesiiRoutes);
v1.route('/organizations', orgRoutes);

// Main router with versioning
const routes = new Hono();

// Versioned routes
routes.route('/v1', v1);

// Legacy routes (deprecated, redirect to v1)
routes.use('/*', async (c, next) => {
  // Set deprecation warning header for non-versioned API calls
  const path = c.req.path;
  if (!path.startsWith('/api/v') && !path.includes('/health')) {
    c.header('Deprecation', 'true');
    c.header('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString());
    c.header('Link', '</api/v1>; rel="successor-version"');
  }
  await next();
});

// Mount v1 as default for backwards compatibility
routes.route('/', v1);

export { routes };
```

**API Version Header Middleware:**
```typescript
// File: apps/api/src/middleware/apiVersion.ts
import { createMiddleware } from 'hono/factory';

export const apiVersionMiddleware = createMiddleware(async (c, next) => {
  // Check for version header override
  const versionHeader = c.req.header('x-api-version');

  if (versionHeader) {
    c.set('apiVersion' as never, versionHeader);
  }

  // Set response version header
  c.header('X-API-Version', '1.0');

  await next();
});
```

---

### 2.20 Input Sanitization

Sanitize user input to prevent XSS and injection attacks.

**File: `apps/api/src/lib/sanitize.ts`**
```typescript
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Configure DOMPurify
DOMPurify.setConfig({
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],
});

/**
 * Sanitize HTML content from user input
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { RETURN_DOM: false }) as string;
}

/**
 * Sanitize string for safe display (escape HTML entities)
 */
export function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

/**
 * Sanitize file path to prevent directory traversal
 */
export function sanitizePath(inputPath: string): string {
  // Remove null bytes
  let sanitized = inputPath.replace(/\0/g, '');

  // Normalize path separators
  sanitized = sanitized.replace(/\\/g, '/');

  // Remove directory traversal attempts
  sanitized = sanitized.replace(/\.{2,}/g, '.');

  // Remove leading slashes
  sanitized = sanitized.replace(/^\/+/, '');

  return sanitized;
}

/**
 * Sanitize object keys and string values recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = escapeHtml(key);

    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeHtml(value);
    } else if (Array.isArray(value)) {
      sanitized[sanitizedKey] = value.map((item) =>
        typeof item === 'string' ? sanitizeHtml(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>) :
        item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[sanitizedKey] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }

  return sanitized as T;
}
```

---

## Performance Optimization

### 2.21 Connection Pooling

Configure Drizzle connection pool for optimal database performance.

**File: `apps/api/src/db/index.ts`** (updated)
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';

import * as schema from './schema';

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,

  // Pool sizing
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),

  // Timeouts
  idleTimeoutMillis: 30000,           // Close idle connections after 30s
  connectionTimeoutMillis: 5000,       // Fail if can't connect in 5s
  allowExitOnIdle: false,              // Keep pool alive

  // Statement timeout (prevent runaway queries)
  statement_timeout: 30000,            // 30 second query timeout
};

export const pool = new Pool(poolConfig);

// Connection event logging
pool.on('connect', (client) => {
  console.log('[DB] New client connected');
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err);
});

pool.on('remove', () => {
  console.log('[DB] Client removed from pool');
});

export const db = drizzle(pool, { schema });

// Health check query
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  poolSize: number;
  idleCount: number;
  waitingCount: number;
}> {
  const start = Date.now();

  try {
    await pool.query('SELECT 1');
    const latencyMs = Date.now() - start;

    return {
      status: latencyMs < 100 ? 'healthy' : 'degraded',
      latencyMs,
      poolSize: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      poolSize: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  await pool.end();
  console.log('[DB] Pool closed');
}
```

---

### 2.22 Database Indexes

Recommended indexes for common query patterns.

**File: `apps/api/drizzle/0002_add_indexes.sql`**
```sql
-- Performance indexes for common queries

-- Projects: list by owner, filter by status
CREATE INDEX IF NOT EXISTS idx_projects_owner_status
  ON projects (owner_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_updated
  ON projects (updated_at DESC)
  WHERE deleted_at IS NULL;

-- Assessments: list by project
CREATE INDEX IF NOT EXISTS idx_assessments_project
  ON assessments (project_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- Factors: query by assessment and domain
CREATE INDEX IF NOT EXISTS idx_factors_assessment_domain
  ON factors (assessment_id, domain, sort_order);

-- Factor evidence: query by factor
CREATE INDEX IF NOT EXISTS idx_factor_evidence_factor
  ON factor_evidence (factor_id, created_at DESC);

-- Threats: query by assessment, filter by status
CREATE INDEX IF NOT EXISTS idx_threats_assessment_status
  ON threats (assessment_id, status)
  WHERE deleted_at IS NULL;

-- Organization members: query membership
CREATE INDEX IF NOT EXISTS idx_org_members_user
  ON organization_members (user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_org_members_org
  ON organization_members (organization_id, role);

-- Feed items: time-series queries with location
CREATE INDEX IF NOT EXISTS idx_feed_items_project_time
  ON feed_items (project_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_feed_items_type_time
  ON feed_items (type, timestamp DESC);

-- Partial index for unprocessed items
CREATE INDEX IF NOT EXISTS idx_feed_items_unprocessed
  ON feed_items (project_id, created_at)
  WHERE processed_at IS NULL;

-- GIN index for JSONB metadata searches
CREATE INDEX IF NOT EXISTS idx_feed_items_metadata
  ON feed_items USING GIN (metadata);

-- Documents: full-text search
CREATE INDEX IF NOT EXISTS idx_documents_title_trgm
  ON documents USING GIN (title gin_trgm_ops);

-- Users: email lookup (already unique, but explicit)
CREATE INDEX IF NOT EXISTS idx_users_email_lower
  ON users (LOWER(email));

-- Audit log: time-series with user filter
CREATE INDEX IF NOT EXISTS idx_audit_log_user_time
  ON audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_resource
  ON audit_log (resource_type, resource_id, created_at DESC);
```

---

### 2.23 Response Compression

Enable Brotli and gzip compression for API responses.

**File: `apps/api/src/middleware/compression.ts`**
```typescript
import { createMiddleware } from 'hono/factory';
import { compress } from 'hono/compress';

// Minimum response size to compress (1KB)
const MIN_SIZE = 1024;

// Content types to compress
const COMPRESSIBLE_TYPES = [
  'application/json',
  'text/plain',
  'text/html',
  'text/css',
  'application/javascript',
  'application/xml',
  'text/xml',
];

export const compressionMiddleware = compress({
  encoding: 'gzip', // Hono supports 'gzip' | 'deflate'
});

// Custom compression with size threshold
export const smartCompression = createMiddleware(async (c, next) => {
  await next();

  // Skip if already compressed or no body
  const contentEncoding = c.res.headers.get('content-encoding');
  if (contentEncoding) return;

  const contentType = c.res.headers.get('content-type') || '';
  const contentLength = c.res.headers.get('content-length');

  // Check if compressible type
  const isCompressible = COMPRESSIBLE_TYPES.some((type) =>
    contentType.includes(type)
  );

  if (!isCompressible) return;

  // Check minimum size
  if (contentLength && parseInt(contentLength) < MIN_SIZE) return;

  // Let the compression middleware handle it
  // This is handled by Hono's built-in compress
});
```

**Updated app.ts with compression:**
```typescript
import { compress } from 'hono/compress';

// Add compression early in middleware stack
app.use('*', compress());
```

---

### 2.24 Redis Caching Layer

Cache-aside pattern for frequently accessed data.

**File: `apps/api/src/lib/cache.ts`**
```typescript
import { redis } from './redis';

interface CacheOptions {
  ttl?: number;           // TTL in seconds
  prefix?: string;        // Key prefix
  serialize?: boolean;    // JSON serialize (default true)
}

const DEFAULT_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'cache:';

/**
 * Get from cache or fetch and cache
 */
export async function cacheGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = DEFAULT_TTL, prefix = CACHE_PREFIX, serialize = true } = options;
  const cacheKey = `${prefix}${key}`;

  // Try cache first
  const cached = await redis.get(cacheKey);

  if (cached !== null) {
    return serialize ? JSON.parse(cached) : (cached as T);
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache the result
  const value = serialize ? JSON.stringify(data) : (data as string);
  await redis.setex(cacheKey, ttl, value);

  return data;
}

/**
 * Invalidate cache by key or pattern
 */
export async function cacheInvalidate(pattern: string): Promise<number> {
  const keys = await redis.keys(`${CACHE_PREFIX}${pattern}`);

  if (keys.length === 0) return 0;

  return redis.del(...keys);
}

/**
 * Invalidate specific key
 */
export async function cacheDelete(key: string): Promise<void> {
  await redis.del(`${CACHE_PREFIX}${key}`);
}

/**
 * Set cache value directly
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  const { ttl = DEFAULT_TTL, prefix = CACHE_PREFIX, serialize = true } = options;
  const cacheKey = `${prefix}${key}`;
  const data = serialize ? JSON.stringify(value) : (value as string);

  await redis.setex(cacheKey, ttl, data);
}

/**
 * Cache decorator for service methods
 */
export function cached(keyFn: (...args: any[]) => string, ttl = DEFAULT_TTL) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = keyFn(...args);
      return cacheGet(key, () => originalMethod.apply(this, args), { ttl });
    };

    return descriptor;
  };
}

// Common cache key helpers
export const cacheKeys = {
  user: (id: string) => `user:${id}`,
  project: (id: string) => `project:${id}`,
  projectList: (userId: string) => `projects:${userId}`,
  assessment: (id: string) => `assessment:${id}`,
  factors: (assessmentId: string) => `factors:${assessmentId}`,
};
```

---

### 2.25 Circuit Breaker for External APIs

Prevent cascading failures when external services (Claude, OpenAI) are down.

**File: `apps/api/src/lib/circuitBreaker.ts`**
```typescript
type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
  failureThreshold: number;    // Failures before opening
  resetTimeout: number;        // Ms before trying half-open
  halfOpenRequests: number;    // Requests to test in half-open
  timeout?: number;            // Request timeout in ms
}

interface CircuitStats {
  failures: number;
  successes: number;
  lastFailure: number;
  state: CircuitState;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 30000,    // 30 seconds
  halfOpenRequests: 3,
  timeout: 30000,         // 30 second timeout
};

export class CircuitBreaker {
  private stats: CircuitStats = {
    failures: 0,
    successes: 0,
    lastFailure: 0,
    state: 'closed',
  };

  private options: CircuitBreakerOptions;
  private halfOpenAttempts = 0;

  constructor(
    private name: string,
    options: Partial<CircuitBreakerOptions> = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    // Check if circuit should transition
    this.checkState();

    if (this.stats.state === 'open') {
      console.warn(`[CircuitBreaker:${this.name}] Circuit open, rejecting request`);

      if (fallback) {
        return fallback();
      }

      throw new CircuitOpenError(`Circuit breaker open for ${this.name}`);
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.options.timeout) {
      return fn();
    }

    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${this.options.timeout}ms`)),
          this.options.timeout
        )
      ),
    ]);
  }

  private checkState(): void {
    if (this.stats.state === 'open') {
      const elapsed = Date.now() - this.stats.lastFailure;

      if (elapsed >= this.options.resetTimeout) {
        console.log(`[CircuitBreaker:${this.name}] Transitioning to half-open`);
        this.stats.state = 'half-open';
        this.halfOpenAttempts = 0;
      }
    }
  }

  private onSuccess(): void {
    if (this.stats.state === 'half-open') {
      this.halfOpenAttempts++;

      if (this.halfOpenAttempts >= this.options.halfOpenRequests) {
        console.log(`[CircuitBreaker:${this.name}] Transitioning to closed`);
        this.stats.state = 'closed';
        this.stats.failures = 0;
        this.stats.successes = 0;
      }
    }

    this.stats.successes++;
  }

  private onFailure(error: unknown): void {
    this.stats.failures++;
    this.stats.lastFailure = Date.now();

    console.error(`[CircuitBreaker:${this.name}] Failure #${this.stats.failures}:`, error);

    if (this.stats.state === 'half-open') {
      console.log(`[CircuitBreaker:${this.name}] Half-open test failed, reopening`);
      this.stats.state = 'open';
      return;
    }

    if (this.stats.failures >= this.options.failureThreshold) {
      console.log(`[CircuitBreaker:${this.name}] Threshold reached, opening circuit`);
      this.stats.state = 'open';
    }
  }

  getStats(): CircuitStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      failures: 0,
      successes: 0,
      lastFailure: 0,
      state: 'closed',
    };
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

// Pre-configured circuit breakers for external services
export const circuitBreakers = {
  claude: new CircuitBreaker('claude', {
    failureThreshold: 3,
    resetTimeout: 60000,
    timeout: 60000,
  }),
  openai: new CircuitBreaker('openai', {
    failureThreshold: 3,
    resetTimeout: 60000,
    timeout: 60000,
  }),
  newsApi: new CircuitBreaker('news-api', {
    failureThreshold: 5,
    resetTimeout: 30000,
    timeout: 10000,
  }),
};
```

---

## Operational Concerns

### 2.26 Deep Health Checks

Comprehensive health endpoint with dependency checks.

**File: `apps/api/src/routes/health.ts`**
```typescript
import { Hono } from 'hono';

import { checkDatabaseHealth } from '../db';
import { redis } from '../lib/redis';
import { circuitBreakers } from '../lib/circuitBreaker';

const health = new Hono();

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: string;
      latencyMs: number;
      poolSize?: number;
      idleCount?: number;
    };
    redis: {
      status: string;
      latencyMs: number;
    };
    external: Record<string, {
      status: string;
      circuit: string;
      failures: number;
    }>;
  };
}

// Simple liveness probe
health.get('/live', (c) => {
  return c.json({ status: 'ok' });
});

// Readiness probe (can accept traffic)
health.get('/ready', async (c) => {
  try {
    // Quick DB check
    const dbHealth = await checkDatabaseHealth();

    if (dbHealth.status === 'unhealthy') {
      return c.json({ status: 'not ready', reason: 'database' }, 503);
    }

    return c.json({ status: 'ready' });
  } catch {
    return c.json({ status: 'not ready' }, 503);
  }
});

// Detailed health check
health.get('/health', async (c) => {
  const startTime = Date.now();

  // Check database
  const dbHealth = await checkDatabaseHealth();

  // Check Redis
  let redisHealth: { status: string; latencyMs: number };
  try {
    const redisStart = Date.now();
    await redis.ping();
    redisHealth = {
      status: 'healthy',
      latencyMs: Date.now() - redisStart,
    };
  } catch {
    redisHealth = {
      status: 'unhealthy',
      latencyMs: 0,
    };
  }

  // Check circuit breakers
  const externalHealth: Record<string, any> = {};
  for (const [name, breaker] of Object.entries(circuitBreakers)) {
    const stats = breaker.getStats();
    externalHealth[name] = {
      status: stats.state === 'closed' ? 'healthy' : stats.state,
      circuit: stats.state,
      failures: stats.failures,
    };
  }

  // Determine overall status
  const isDbHealthy = dbHealth.status !== 'unhealthy';
  const isRedisHealthy = redisHealth.status === 'healthy';
  const hasOpenCircuits = Object.values(circuitBreakers).some(
    (b) => b.getStats().state === 'open'
  );

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (!isDbHealthy) {
    overallStatus = 'unhealthy';
  } else if (!isRedisHealthy || hasOpenCircuits) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.0.1',
    uptime: process.uptime(),
    checks: {
      database: {
        status: dbHealth.status,
        latencyMs: dbHealth.latencyMs,
        poolSize: dbHealth.poolSize,
        idleCount: dbHealth.idleCount,
      },
      redis: redisHealth,
      external: externalHealth,
    },
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
  return c.json(result, statusCode);
});

export { health };
```

---

### 2.27 Graceful Shutdown

Handle SIGTERM/SIGINT for clean shutdown.

**File: `apps/api/src/index.ts`** (updated with graceful shutdown)
```typescript
import { serve } from '@hono/node-server';

import { createApp } from './app';
import { closeDatabase, pool } from './db';
import { shutdownRedis } from './lib/redis';
import { stopAllFeeds } from './feeds/scheduler';

const app = createApp();
const PORT = parseInt(process.env.PORT || '3001');

let isShuttingDown = false;

const server = serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`Server running on http://localhost:${PORT}`);

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    console.log('Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 30000); // 30 second timeout

  try {
    // 1. Stop accepting new connections
    console.log('[Shutdown] Closing HTTP server...');
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 2. Stop feed scheduler
    console.log('[Shutdown] Stopping feed scheduler...');
    await stopAllFeeds();

    // 3. Wait for in-flight requests (pool.waitingCount)
    console.log('[Shutdown] Waiting for in-flight requests...');
    await waitForInflightRequests();

    // 4. Close database connections
    console.log('[Shutdown] Closing database connections...');
    await closeDatabase();

    // 5. Close Redis connections
    console.log('[Shutdown] Closing Redis connections...');
    await shutdownRedis();

    clearTimeout(shutdownTimeout);
    console.log('[Shutdown] Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Shutdown] Error during shutdown:', error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

async function waitForInflightRequests(maxWaitMs = 10000): Promise<void> {
  const startTime = Date.now();

  while (pool.waitingCount > 0 || pool.totalCount > pool.idleCount) {
    if (Date.now() - startTime > maxWaitMs) {
      console.log('[Shutdown] Max wait time reached, proceeding...');
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

export { app };
```

---

### 2.28 Structured Logging

Production-ready logging with Pino.

**File: `apps/api/src/lib/logger.ts`**
```typescript
import pino from 'pino';

import { getRequestId } from '../middleware/correlation';

// Sensitive fields to redact
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
];

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // Production: JSON, Development: pretty print
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,

  // Redact sensitive data
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },

  // Custom serializers
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },

  // Base context
  base: {
    service: 'situation-monitor-api',
    version: process.env.npm_package_version,
  },

  // Custom timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Child logger with request context
export function getRequestLogger() {
  const requestId = getRequestId();
  return logger.child({ requestId });
}

// Structured log helpers
export const log = {
  info: (msg: string, data?: object) => getRequestLogger().info(data, msg),
  warn: (msg: string, data?: object) => getRequestLogger().warn(data, msg),
  error: (msg: string, error?: Error, data?: object) =>
    getRequestLogger().error({ err: error, ...data }, msg),
  debug: (msg: string, data?: object) => getRequestLogger().debug(data, msg),

  // HTTP request logging
  request: (method: string, path: string, statusCode: number, durationMs: number) =>
    getRequestLogger().info(
      { method, path, statusCode, durationMs },
      `${method} ${path} ${statusCode} ${durationMs}ms`
    ),

  // Database query logging
  query: (query: string, durationMs: number) =>
    getRequestLogger().debug({ query: query.slice(0, 200), durationMs }, 'DB query'),

  // External API logging
  external: (service: string, operation: string, durationMs: number, success: boolean) =>
    getRequestLogger().info(
      { service, operation, durationMs, success },
      `External API: ${service}.${operation}`
    ),
};
```

**Request/Response Logging Middleware:**
```typescript
// File: apps/api/src/middleware/requestLogger.ts
import { createMiddleware } from 'hono/factory';
import { log } from '../lib/logger';

export const requestLoggerMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now();

  await next();

  const duration = Date.now() - start;
  const { method } = c.req;
  const path = c.req.path;
  const status = c.res.status;

  log.request(method, path, status, duration);
});
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

### Core Functionality
- [ ] All endpoints return proper JSON responses
- [ ] JWT authentication works for protected routes
- [ ] RBAC correctly restricts access based on roles
- [ ] Validation errors return 400 with details
- [ ] Not found errors return 404
- [ ] Rate limiting returns 429 when exceeded
- [ ] CORS headers set correctly
- [ ] All CRUD operations work for projects and assessments
- [ ] PMESII-PT factors can be created and updated

### Security Hardening
- [ ] Rate limiting uses Redis in production (scales across instances)
- [ ] CSRF protection enabled for state-changing endpoints
- [ ] All requests have correlation ID in logs
- [ ] API versioning implemented with deprecation headers
- [ ] Input sanitization prevents XSS and injection attacks
- [ ] Sensitive data redacted from logs (passwords, tokens, API keys)

### Performance
- [ ] Database connection pool configured with proper sizing
- [ ] Recommended indexes created for common queries
- [ ] Response compression enabled for JSON responses
- [ ] Redis caching layer functional for hot data paths
- [ ] Circuit breaker prevents cascading failures from external APIs

### Operational
- [ ] Health check returns degraded state when dependencies fail
- [ ] Graceful shutdown completes within 30 seconds
- [ ] Liveness and readiness probes available for Kubernetes
- [ ] Structured logging with Pino produces JSON in production

---

## Files to Create/Modify

| Path | Description |
|------|-------------|
| `apps/api/src/app.ts` | Hono app configuration |
| `apps/api/src/index.ts` | Entry point with graceful shutdown |
| `apps/api/src/types/index.ts` | API type definitions |
| `apps/api/src/lib/jwt.ts` | JWT utilities |
| `apps/api/src/lib/password.ts` | Password hashing |
| `apps/api/src/lib/errors.ts` | Custom error classes |
| `apps/api/src/lib/sanitize.ts` | Input sanitization (XSS, path traversal) |
| `apps/api/src/lib/cache.ts` | Redis caching layer |
| `apps/api/src/lib/circuitBreaker.ts` | Circuit breaker for external APIs |
| `apps/api/src/lib/logger.ts` | Structured logging with Pino |
| `apps/api/src/middleware/auth.ts` | JWT auth middleware |
| `apps/api/src/middleware/rbac.ts` | Role-based access control |
| `apps/api/src/middleware/validation.ts` | Zod validation |
| `apps/api/src/middleware/rateLimit.ts` | Redis-backed rate limiting |
| `apps/api/src/middleware/errorHandler.ts` | Error handling |
| `apps/api/src/middleware/csrf.ts` | CSRF protection |
| `apps/api/src/middleware/correlation.ts` | Request correlation IDs |
| `apps/api/src/middleware/apiVersion.ts` | API versioning headers |
| `apps/api/src/middleware/compression.ts` | Response compression |
| `apps/api/src/middleware/requestLogger.ts` | Request/response logging |
| `apps/api/src/routes/index.ts` | Route aggregation with versioning |
| `apps/api/src/routes/auth.ts` | Authentication routes |
| `apps/api/src/routes/health.ts` | Health check endpoints |
| `apps/api/src/routes/projects.ts` | Project CRUD |
| `apps/api/src/routes/assessments.ts` | Assessment CRUD |
| `apps/api/src/routes/pmesii.ts` | PMESII-PT routes |
| `apps/api/src/routes/threats.ts` | Threat routes |
| `apps/api/src/routes/cog.ts` | CoG routes |
| `apps/api/src/routes/intel.ts` | Intel collection routes |
| `apps/api/src/routes/indicators.ts` | Indicator routes |
| `apps/api/src/db/index.ts` | Database with connection pooling |
| `apps/api/drizzle/0002_add_indexes.sql` | Performance indexes migration |

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
