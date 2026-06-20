# Infrastructure

# Overview

This folder contains infrastructure-related documentation and configuration for the Kyrae.

Kyrae is Docker-ready but not Docker-dependent.

This means the project can be developed locally with pnpm, while still being prepared for demos, onboarding, CI/CD and deployments using Docker-based workflows.

---

# Infrastructure Strategy

The infrastructure strategy is based on three principles:

1. Daily development should remain simple.
2. Docker should be available for reproducible environments.
3. Deployment preparation should exist without forcing local Docker usage.

---

# Development Modes

## 1. Local Development Without Docker

Recommended for daily development.

Use this mode when the developer already has the required dependencies installed locally.

Typical commands from repository root:

```bash
pnpm install
pnpm frontend:dev
pnpm backend:dev
```

This mode is useful for:

* faster development,
* debugging,
* working directly with local tools,
* running frontend and backend separately.

---

## 2. Local Development With Docker Database

Recommended when the developer does not want to install PostgreSQL locally.

Typical commands:

```bash
pnpm docker:db
pnpm backend:dev
pnpm frontend:dev
```

This mode uses Docker only for PostgreSQL, while frontend and backend run locally.

This is useful for:

* consistent database setup,
* demos,
* onboarding,
* avoiding local PostgreSQL installation.

---

## 3. Full Docker Environment

Recommended for demos, onboarding and deployment validation.

Typical command:

```bash
pnpm docker:up
```

This mode may run:

* frontend,
* backend,
* PostgreSQL,
* reverse proxy when configured.

This is useful for:

* demos,
* client presentations,
* reproducible environments,
* CI/CD validation,
* deployment simulation.

---

# Docker Strategy

Docker is optional for daily development.

Docker is recommended for:

* demos,
* onboarding,
* deployments,
* CI/CD environments,
* reproducible testing environments.

The repository must remain:

```txt
Docker-ready but not Docker-dependent
```

---

# Suggested Infrastructure Structure

Recommended structure:

```txt
infra/
├── docker/
│   ├── frontend/
│   │   └── Dockerfile
│   ├── backend/
│   │   └── Dockerfile
│   └── postgres/
│       └── init.sql
│
├── nginx/
│   └── README.md
│
├── traefik/
│   └── README.md
│
├── scripts/
│   └── README.md
│
└── README.md
```

At repository root:

```txt
docker-compose.yml
```

---

# Recommended Docker Services

A basic Docker Compose setup may include:

```txt
postgres
backend
frontend
```

Optional future services:

```txt
nginx
traefik
redis
mailhog
observability
```

---

# Recommended Root Scripts

The root `package.json` should expose infrastructure commands.

Recommended scripts:

```json
{
  "scripts": {
    "docker:db": "docker compose up -d postgres",
    "docker:up": "docker compose up --build",
    "docker:down": "docker compose down",
    "docker:logs": "docker compose logs -f",
    "docker:restart": "docker compose down && docker compose up --build"
  }
}
```

---

# Environment Strategy

The repository uses explicit environment files.

Recommended files:

```txt
.env.example
.env.development
.env.production
```

Rules:

* `.env.example` documents required variables.
* `.env.development` is used for local development.
* `.env.production` is used as a production reference.
* Real secrets must not be committed.
* Each application may define its own environment files when needed.

---

# Secrets Rules

Never commit real secrets.

Do not commit:

* database passwords,
* JWT secrets,
* refresh token secrets,
* API keys,
* OAuth client secrets,
* cloud credentials,
* private keys,
* production credentials.

Use `.env.example` to document required variables without exposing values.

---

# PostgreSQL Strategy

PostgreSQL is the official database for the backend.

Recommended local database options:

## Option A: Local PostgreSQL

Used when PostgreSQL is installed directly on the developer machine.

## Option B: Docker PostgreSQL

Used when PostgreSQL is managed through Docker.

Recommended command:

```bash
pnpm docker:db
```

The backend should connect using environment variables.

---

# Reverse Proxy Strategy

Kyrae may support Nginx and Traefik.

## Nginx

Recommended for:

* VPS deployments,
* simple reverse proxy,
* SSL termination with Certbot,
* serving static frontend files.

## Traefik

Recommended for:

* multi-app deployments,
* containerized reverse proxy,
* automatic HTTPS,
* Docker label-based routing.

Nginx and Traefik should be configured when needed by the target project.

They should not be mandatory for daily development.

---

# Deployment Strategy

Kyrae should be prepared for multiple deployment styles.

Supported deployment directions:

* VPS with Docker Compose,
* VPS with Nginx + process manager,
* Docker-based deployment,
* future cloud deployment,
* future CI/CD deployment.

The Kyrae platform should not hardcode project-specific deployment domains, server names or credentials.

---

# CI/CD Readiness

Infrastructure should support future CI/CD workflows.

Possible CI/CD stages:

1. Install dependencies.
2. Run lint.
3. Run tests.
4. Build frontend.
5. Build backend.
6. Build Docker images.
7. Run migrations when appropriate.
8. Deploy.

CI/CD implementation may vary by project.

---

# Migration Strategy

Database migrations must be managed by the backend.

Rules:

* Use TypeORM migrations.
* Do not modify database schema manually without migration tracking.
* Do not run production migrations automatically unless the deployment strategy explicitly allows it.
* Document migration commands in the backend README.

---

# Observability Strategy

Observability is not mandatory in the initial Kyrae baseline.

Future observability may include:

* structured logs,
* request logging,
* error tracking,
* metrics,
* health checks,
* uptime monitoring.

The initial required module is:

```txt
health
```

---

# Health Checks

The backend should provide health and readiness checks.

Recommended checks:

* API availability,
* database connectivity,
* application readiness.

Health checks are useful for:

* Docker,
* CI/CD,
* deployment validation,
* monitoring.

---

# Out of Scope

The generic infrastructure should not include:

* project-specific domains,
* production secrets,
* customer-specific deployment rules,
* business-specific infrastructure,
* hardcoded cloud credentials,
* hardcoded server IP addresses.

Those must be defined per project.

---

# AI Agent Rules

AI agents must follow these rules:

1. Do not add production secrets.
2. Do not hardcode domains, IP addresses or credentials.
3. Do not make Docker mandatory for daily development.
4. Keep Docker support optional but functional.
5. Do not introduce Nginx or Traefik complexity unless the project requires it.
6. Do not modify deployment strategy without documentation.
7. Do not add project-specific infrastructure to the Kyrae platform unless explicitly requested.
8. Keep infrastructure scripts simple and reproducible.
9. Document any new infrastructure command.
10. Keep the repository Docker-ready but not Docker-dependent.

---

# Recommended Workflow for Infrastructure Changes

Before changing infrastructure:

1. Identify whether the change is generic or project-specific.
2. Review `AGENTS.md`.
3. Review `docs/architecture/overview.md`.
4. Review this `infra/README.md`.
5. Avoid hardcoded environment-specific values.
6. Update `.env.example` if new variables are required.
7. Update root scripts if new commands are added.
8. Test local development without Docker.
9. Test Docker workflow when applicable.
10. Document any behavior change.
