# Deployment Architecture

# Overview

This document defines the deployment architecture for the Kyrae.

Kyrae is Docker-ready but not Docker-dependent. It must support simple local development, reproducible demos and future production deployment without forcing a single deployment model.

The deployment strategy must remain generic and must not include project-specific domains, credentials, server IPs or customer-specific infrastructure.

---

# Deployment Goals

The deployment architecture must support:

- local development,
- Docker-based demos,
- onboarding environments,
- CI/CD readiness,
- VPS deployments,
- future cloud deployments,
- frontend/backend separation,
- secure environment configuration,
- IAM-first and security-first behavior.

---

# Deployment Principles

Deployment must follow these principles:

- no secrets in repository,
- no hardcoded production domains,
- no hardcoded server IPs,
- environment-based configuration,
- Docker-ready but not Docker-dependent,
- frontend and backend deployable independently,
- database migrations handled carefully,
- production changes documented.

---

# Supported Deployment Modes

## 1. Local Development

Recommended for daily development.

Frontend and backend run locally using pnpm:

```bash
pnpm frontend:dev
pnpm backend:dev
```

Optional PostgreSQL through Docker:

```bash
pnpm docker:db
```

## 2. Full Docker Demo

Recommended for demos and onboarding.

```bash
pnpm docker:up
```

This mode may run:

- frontend,
- backend,
- PostgreSQL,
- optional reverse proxy.

## 3. VPS Deployment

Recommended for small and medium enterprise projects.

Possible variants:

- Docker Compose deployment,
- Nginx reverse proxy + Node process manager,
- static frontend served by Nginx,
- backend behind reverse proxy.

## 4. Future Cloud Deployment

Possible future targets:

- container platforms,
- managed PostgreSQL,
- cloud runners,
- Kubernetes,
- serverless-compatible frontend hosting.

Cloud deployment must be defined per project.

---

# Frontend Deployment

Frontend deployment options:

## Static Build

Recommended for most Angular deployments.

Typical flow:

```bash
pnpm frontend:build
```

The generated frontend build can be served by:

- Nginx,
- static hosting,
- Docker container,
- CDN-backed hosting.

Frontend configuration must not contain secrets.

Current frontend API configuration:

- development builds use `http://localhost:3000`,
- production builds use `/api`,
- Docker/Nginx proxies `/api/*` to the backend service.

## Docker Frontend

Optional Docker-based frontend deployment may use:

```txt
infra/docker/frontend/Dockerfile
```

Frontend Docker image should serve static files through a lightweight web server.

---

# Backend Deployment

Backend deployment options:

## Node Runtime

Typical flow:

```bash
pnpm backend:build
```

Then run the built application with Node or a process manager.

## Docker Backend

Optional Docker-based backend deployment may use:

```txt
infra/docker/backend/Dockerfile
```

Backend Docker image should:

- install production dependencies,
- build the backend,
- run the compiled application,
- read configuration from environment variables.

---

# Database Deployment

PostgreSQL is the official database.

Deployment options:

- local PostgreSQL,
- Docker PostgreSQL,
- managed PostgreSQL,
- VPS-hosted PostgreSQL.

Production database configuration must use environment variables.

Production database credentials must not be committed.

---

# Migration Strategy

Database migrations must be handled carefully.

Rules:

- use TypeORM migrations,
- do not rely on `synchronize` in production,
- review migrations before production deployment,
- backup production database before risky migrations,
- avoid automatic production migrations unless the project explicitly allows it.

Recommended manual migration command pattern:

```bash
pnpm --dir apps/backend migration:run
```

The exact command depends on backend package scripts.

---

# Environment Strategy

Deployment must use environment variables.

Recommended files:

```txt
.env.example
.env.development
.env.production
```

Production secrets must be stored outside the repository.

Deployment variables may include:

```txt
NODE_ENV
PORT
DB_HOST
DB_PORT
DB_USER
DB_PASS
DB_NAME
DATABASE_SSL
JWT_SECRET
JWT_REFRESH_SECRET
MICROSOFT_CLIENT_ID
MICROSOFT_TENANT_ID
GOOGLE_CLIENT_ID
```

---

# Reverse Proxy Strategy

Kyrae may support Nginx and Traefik.

## Nginx

Recommended for:

- VPS deployments,
- SSL termination,
- static frontend hosting,
- reverse proxy to backend.

## Traefik

Recommended for:

- Docker-based multi-app deployments,
- automatic HTTPS,
- container routing,
- multi-domain environments.

Nginx or Traefik must be configured per project.

The provided Docker frontend image includes a generic Nginx rule that proxies `/api/*` to `backend:3000` for local Docker demos.

The Kyrae platform must not hardcode project domains.

---

# SSL/TLS Strategy

Production deployments must use HTTPS.

Possible SSL strategies:

- Certbot with Nginx,
- Traefik automatic certificates,
- cloud provider certificates,
- load balancer certificates.

HTTP-only production deployments are not recommended.

---

# CI/CD Deployment Readiness

Future CI/CD pipelines may include:

1. Install dependencies.
2. Run lint.
3. Run unit tests.
4. Run e2e tests when environment is available.
5. Build frontend.
6. Build backend.
7. Build Docker images when required.
8. Run migrations when approved.
9. Deploy.

CI/CD implementation should be defined per project.

---

# Docker Scripts

Los siguientes scripts de Docker están implementados en el `package.json` raíz:

```json
{
  "scripts": {
    "docker:db": "docker compose up -d postgres",
    "docker:up": "docker compose up --build",
    "docker:down": "docker compose down",
    "docker:logs": "docker compose logs -f"
  }
}
```

Scripts must use pnpm.

Do not use npm commands.

---

# Health Checks

Backend should expose health checks for deployment validation.

Recommended endpoint:

```txt
GET /health
GET /health/ready
```

Health checks may validate:

- API availability,
- database connectivity,
- application readiness.

Health endpoints should not expose secrets or internal infrastructure details.

---

# Logging Strategy

Deployment logs should support troubleshooting without exposing sensitive data.

Logs must not include:

- passwords,
- password hashes,
- access tokens,
- refresh tokens,
- secrets,
- private keys,
- full authorization headers.

Logs may include:

- request id,
- timestamp,
- route,
- status code,
- sanitized error message.

---

# Rollback Strategy

Each project should define rollback rules.

Recommended rollback considerations:

- previous frontend build,
- previous backend image or build,
- database migration rollback limitations,
- backup before risky migrations,
- tagged releases.

Database rollbacks must be handled carefully and should not assume all migrations are safely reversible.

---

# Deployment Security Checklist

Before deployment, verify:

- production secrets are not committed,
- `.env.example` is updated,
- production uses HTTPS,
- database credentials are environment-based,
- JWT secrets are strong,
- frontend contains no secrets,
- backend endpoints are protected,
- migrations are reviewed,
- health check is available,
- logs do not expose sensitive data.

---

# Out of Scope

The generic deployment architecture must not include:

- real production domains,
- server IP addresses,
- customer-specific deployment steps,
- production credentials,
- cloud provider secrets,
- project-specific infrastructure rules.

Those must be defined by each project.

---

# AI Agent Rules

AI agents must follow these rules:

1. Do not hardcode domains, IPs or credentials.
2. Do not commit real secrets.
3. Do not make Docker mandatory for daily development.
4. Keep deployment configuration generic.
5. Use environment variables for configuration.
6. Use pnpm commands.
7. Do not generate `package-lock.json`.
8. Update documentation when deployment commands change.
9. Do not add customer-specific deployment rules to the Kyrae platform.
10. Keep deployment Docker-ready but not Docker-dependent.
