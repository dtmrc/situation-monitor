# Phase 0a: Docker Configuration

## Overview

**Parent Document:** [00-INFRASTRUCTURE-SETUP.md](./00-INFRASTRUCTURE-SETUP.md)

This document covers Docker configuration for local development and production deployment of the Situation Monitor platform.

**Purpose:** Provide containerized development environment and production-ready Docker images for consistent deployments across environments.

**Tasks Covered:**
- Task 0.5: Docker Compose for PostgreSQL/Redis (local development)
- Production Dockerfiles for API and Web applications
- Nginx reverse proxy configuration
- Production orchestration with docker-compose.prod.yml

---

## Architecture

```
docker/
├── docker-compose.yml        # Local development services
├── docker-compose.prod.yml   # Production orchestration
├── init.sql                  # Database initialization
├── Dockerfile.api            # API production image
├── Dockerfile.web            # Web production image (with nginx)
└── nginx.conf                # Nginx configuration for SPA
```

---

## Implementation Tasks

| ID | Task | Priority | Description |
|----|------|----------|-------------|
| 0.5a | Create docker-compose.yml | High | PostgreSQL with pgvector + Redis for local development |
| 0.5b | Create init.sql | High | Database extension initialization script |
| 0.5c | Create Dockerfile.api | Medium | Multi-stage production build for Hono API |
| 0.5d | Create Dockerfile.web | Medium | Multi-stage production build for React frontend |
| 0.5e | Create nginx.conf | Medium | Nginx configuration for SPA routing and API proxy |
| 0.5f | Create docker-compose.prod.yml | Medium | Production orchestration with health checks |

---

## Detailed Specifications

### 0.5a Local Development Docker Compose

The local development setup provides PostgreSQL with pgvector extension for vector embeddings and Redis for caching/sessions.

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

**Key Configuration Notes:**
- Uses `pgvector/pgvector:pg14` for native vector similarity search support
- PostgreSQL data persisted in named volume `postgres_data`
- Redis configured with append-only file (AOF) persistence
- Health checks enable dependent services to wait for readiness
- Default credentials for development only (postgres/postgres)

**Usage:**
```bash
# Start services
cd docker && docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

---

### 0.5b Database Initialization Script

This script runs automatically on first PostgreSQL container creation to enable required extensions.

**File: `docker/init.sql`**
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schema
CREATE SCHEMA IF NOT EXISTS app;
```

**Extensions:**
| Extension | Purpose |
|-----------|---------|
| `uuid-ossp` | UUID generation functions (`uuid_generate_v4()`) |
| `vector` | pgvector for embedding storage and similarity search |
| `pg_trgm` | Trigram matching for fuzzy text search |

---

### 0.5c API Production Dockerfile

Multi-stage build for the Hono API service, optimized for small image size and security.

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

**Build Optimization Notes:**
- Alpine base image for minimal size (~100MB final image)
- Multi-stage build separates build dependencies from runtime
- `--frozen-lockfile` ensures reproducible builds
- Only production dependencies in final image
- Drizzle migrations copied for runtime schema updates

---

### 0.5d Web Production Dockerfile

Multi-stage build for the React frontend, served via nginx.

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

**Build Arguments:**
| Argument | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (baked into static bundle) |
| `VITE_MAPBOX_ACCESS_TOKEN` | Mapbox token for geospatial features |

**Build Example:**
```bash
docker build \
  --build-arg VITE_API_URL=https://api.situation-monitor.com \
  --build-arg VITE_MAPBOX_ACCESS_TOKEN=pk.xxx \
  -f docker/Dockerfile.web \
  -t situation-monitor-web:latest .
```

---

### 0.5e Nginx Configuration

Optimized nginx configuration for serving the React SPA with API proxying.

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

**Configuration Features:**
| Feature | Description |
|---------|-------------|
| Gzip compression | Reduces transfer size for text-based assets |
| Asset caching | 1-year cache for hashed static files (`/assets/`) |
| SPA fallback | All routes fall back to `index.html` for client-side routing |
| API proxy | Proxies `/api/*` requests to the API container |
| WebSocket support | `Upgrade` headers for real-time connections |

---

### 0.5f Production Docker Compose

Complete production orchestration with all services, health checks, and restart policies.

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

**Required Environment Variables:**

Create a `.env` file for production deployments:

```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=situation_monitor
DATABASE_URL=postgresql://postgres:<password>@postgres:5432/situation_monitor

# Redis
REDIS_PASSWORD=<strong-password>
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# Authentication
JWT_SECRET=<strong-256-bit-secret>

# AI Services
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# Frontend Build Args
VITE_API_URL=https://your-domain.com/api
VITE_MAPBOX_ACCESS_TOKEN=pk.xxx
```

**Production Deployment:**
```bash
# Build and start all services
cd docker
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale API horizontally (if using load balancer)
docker-compose -f docker-compose.prod.yml up -d --scale api=3

# Rolling update
docker-compose -f docker-compose.prod.yml up -d --no-deps --build api
```

---

## Files to Create

| Path | Description |
|------|-------------|
| `docker/docker-compose.yml` | Local development services (PostgreSQL + Redis) |
| `docker/init.sql` | Database extension initialization |
| `docker/Dockerfile.api` | Multi-stage API production image |
| `docker/Dockerfile.web` | Multi-stage web production image with nginx |
| `docker/nginx.conf` | Nginx SPA configuration |
| `docker/docker-compose.prod.yml` | Production orchestration |

---

## Acceptance Criteria

### Local Development
- [ ] `docker-compose up -d` starts PostgreSQL and Redis without errors
- [ ] PostgreSQL healthcheck passes within 30 seconds
- [ ] Redis healthcheck passes within 30 seconds
- [ ] `psql -h localhost -U postgres -d situation_monitor` connects successfully
- [ ] `SELECT * FROM pg_extension WHERE extname = 'vector';` returns the pgvector extension
- [ ] `redis-cli ping` returns `PONG`

### Production Images
- [ ] `docker build -f docker/Dockerfile.api .` completes successfully
- [ ] `docker build -f docker/Dockerfile.web .` completes successfully
- [ ] API image size is under 200MB
- [ ] Web image size is under 50MB
- [ ] API container starts and responds to health check at `/api/health`
- [ ] Web container serves index.html on all routes (SPA fallback)

### Production Orchestration
- [ ] `docker-compose -f docker-compose.prod.yml up -d` starts all services
- [ ] Services wait for dependencies (health check conditions)
- [ ] All services restart automatically after failure (`restart: unless-stopped`)
- [ ] Environment variables are properly injected
- [ ] Data persists across container restarts (volumes)

---

## Security Considerations

### Local Development
- Default credentials (`postgres/postgres`) are acceptable for local development only
- Redis runs without password in development mode
- Ports exposed to localhost only (127.0.0.1 binding recommended for shared machines)

### Production
- Use strong, unique passwords for PostgreSQL and Redis
- Store secrets in environment variables or secrets manager (never in docker-compose files)
- Consider using Docker secrets or Kubernetes secrets for sensitive data
- Enable SSL/TLS for database connections in production
- Use non-root users in containers where possible
- Regularly update base images for security patches

### Network Security
```yaml
# Example: Add internal network for service isolation
networks:
  internal:
    internal: true
  external:
    internal: false

services:
  api:
    networks:
      - internal
      - external
  postgres:
    networks:
      - internal  # Not exposed externally
```

---

## Troubleshooting

### PostgreSQL Connection Issues
```bash
# Check if container is running
docker ps | grep situation-monitor-db

# View PostgreSQL logs
docker logs situation-monitor-db

# Test connection from host
psql -h localhost -U postgres -d situation_monitor

# Check if pgvector is installed
docker exec situation-monitor-db psql -U postgres -c "SELECT * FROM pg_extension;"
```

### Redis Connection Issues
```bash
# Check if container is running
docker ps | grep situation-monitor-redis

# Test Redis connection
docker exec situation-monitor-redis redis-cli ping

# Check Redis memory usage
docker exec situation-monitor-redis redis-cli info memory
```

### Build Failures
```bash
# Clear Docker build cache
docker builder prune

# Build with no cache
docker-compose build --no-cache

# Check disk space
docker system df
```

### Port Conflicts
```bash
# Check what's using port 5432
lsof -i :5432

# Check what's using port 6379
lsof -i :6379

# Use alternative ports in docker-compose.yml
ports:
  - "5433:5432"  # Map to different host port
```

---

## Related Documents

- **Parent:** [00-INFRASTRUCTURE-SETUP.md](./00-INFRASTRUCTURE-SETUP.md) - Complete infrastructure setup
- **Next:** [01-DATA-LAYER.md](./01-DATA-LAYER.md) - Database schema and Drizzle ORM setup
- **Deployment:** [10-TESTING-CICD-DEPLOYMENT.md](./10-TESTING-CICD-DEPLOYMENT.md) - CI/CD and deployment workflows
