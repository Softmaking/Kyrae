# Environment Standards

# Overview

This document defines environment variable and configuration standards for the Kyrae.

Kyrae is IAM-first, security-first and Docker-ready but not Docker-dependent.

Environment configuration must remain safe, explicit and reusable across projects.

---

# Goals

Environment standards must help to:

- avoid hardcoded configuration,
- avoid committed secrets,
- support local development,
- support Docker-based demos,
- support CI/CD,
- support production deployments,
- keep frontend and backend configuration clear,
- make onboarding easier.

---

# Environment Files

Recommended files:

```txt
.env.example
.env.development
.env.production
```

Optional future file:

```txt
.env.test
```

---

# File Purpose

## .env.example

Documents all required variables.

Rules:

- must be committed,
- must not contain real secrets,
- should contain safe placeholder values,
- should be updated when new variables are required.

Example:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=change-me
DB_NAME=kyrae
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me
```

## .env.development

Used for local development.

Rules:

- may contain local-only values,
- should not contain production secrets,
- may be ignored depending on project policy,
- should be safe for local work.

## .env.production

Used as a production reference.

Rules:

- must not contain real production secrets,
- may contain placeholder values,
- should document required production variables,
- real production values must be managed outside the repository.

## .env.test

Optional file for automated tests.

Use when:

- e2e tests require a database,
- CI/CD requires test configuration,
- test isolation is needed.

---

# Secret Management Rules

Never commit real secrets.

Do not commit:

- production database passwords,
- JWT secrets,
- refresh token secrets,
- OAuth client secrets,
- API keys,
- private keys,
- cloud provider credentials,
- customer credentials,
- real user credentials.

Use secret managers or deployment environment variables for production.

---

# Backend Environment Variables

Recommended backend variables:

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=change-me
DB_NAME=kyrae
DB_SSL=false
DB_LOGGING=true

JWT_SECRET=change-me
JWT_EXPIRES_IN=900
JWT_REFRESH_SECRET=change-me
JWT_REFRESH_EXPIRES_IN=604800

AUTH_PASSWORD_HASH_ROUNDS=10
SECURITY_MAX_LOGIN_ATTEMPTS=5
SECURITY_LOCKOUT_DURATION_MINUTES=15
SECURITY_CRITICAL_LOGIN_FAILURES_THRESHOLD=10
SECURITY_CRITICAL_LOGIN_FAILURES_WINDOW_MINUTES=5
SECURITY_CRITICAL_LOGIN_SPRAY_DISTINCT_USERS_THRESHOLD=5
SECURITY_CRITICAL_LOGIN_SPRAY_WINDOW_MINUTES=10
SECURITY_CRITICAL_LOCKED_ATTEMPTS_THRESHOLD=5
SECURITY_CRITICAL_LOCKED_ATTEMPTS_WINDOW_MINUTES=10
SECURITY_CRITICAL_INVALID_TOKEN_THRESHOLD=8
SECURITY_CRITICAL_INVALID_TOKEN_WINDOW_MINUTES=5

MICROSOFT_CLIENT_ID=
MICROSOFT_TENANT_ID=
MICROSOFT_CLIENT_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Risk-threshold variables should be tuned per environment based on traffic profile and security posture.

---

# Frontend Environment Variables

Frontend variables must not contain secrets.

The frontend uses Angular environment files located in `apps/frontend/src/environments/`:

| File | `apiBaseUrl` | Use |
|------|-------------|-----|
| `environment.ts` | `http://localhost:3000` | local development |
| `environment.production.ts` | `/api` | production (proxied by Nginx) |

Frontend must not contain:

- JWT secrets,
- refresh token secrets,
- OAuth client secrets,
- database credentials,
- private keys,
- production credentials.

Frontend environment values are visible to users after build, so they must be treated as public configuration.

---

# Docker Environment Variables

Docker workflows may use environment variables for:

- PostgreSQL,
- backend,
- frontend API URL,
- service ports.

Recommended Docker variables:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-me
POSTGRES_DB=kyrae
BACKEND_PORT=3000
FRONTEND_PORT=4200
```

Docker variables must not include real production secrets in committed files.

---

# CI/CD Environment Variables

CI/CD should inject secrets using the platform secret manager.

Examples:

- GitHub Actions Secrets,
- Azure DevOps Library,
- GitLab CI/CD Variables,
- Docker secrets,
- cloud provider secret managers.

CI/CD secrets must not be written into repository files.

---

# Naming Conventions

Use uppercase snake case for backend and infrastructure variables.

Examples:

```txt
DB_HOST
JWT_SECRET
MICROSOFT_CLIENT_ID
GOOGLE_CLIENT_ID
```

The frontend uses Angular environment files (`apps/frontend/src/environments/`) instead of runtime `NG_APP_*` variables. Use `apiBaseUrl` as the primary API URL configuration key.

---

# Validation Rules

The backend should validate required environment variables at startup.

Validation should check:

- required variables exist,
- ports are valid numbers,
- secrets meet minimum length requirements,
- booleans are valid,
- environment values are known.

The application should fail fast when required environment variables are missing.

---

# Environment Separation

Recommended environments:

```txt
development
staging
production
test
```

Initial required environments:

```txt
development
production
```

Each environment must use different secrets.

Production values must never be reused in development.

---

# Configuration Ownership

Backend owns:

- database configuration,
- JWT configuration,
- auth provider configuration,
- security configuration,
- server ports,
- logging settings.

Frontend owns:

- API base URL,
- app display name,
- public feature flags,
- public auth provider selection when needed.

Current frontend baseline:

- development uses `http://localhost:3000`,
- production uses `/api`,
- production deployments must provide a proxy or reverse proxy from `/api` to the backend.

Infrastructure owns:

- container ports,
- service names,
- reverse proxy settings,
- deployment-specific values.

---

# Environment and Authentication

Authentication-related variables must be handled carefully.

Sensitive variables:

```txt
JWT_SECRET
JWT_REFRESH_SECRET
MICROSOFT_CLIENT_SECRET
GOOGLE_CLIENT_SECRET
```

Non-sensitive but environment-specific variables:

```txt
MICROSOFT_CLIENT_ID
MICROSOFT_TENANT_ID
GOOGLE_CLIENT_ID
```

Even non-sensitive values should be documented clearly.

---

# Environment and Database

Database variables must never be hardcoded.

Required database variables:

```txt
DB_HOST
DB_PORT
DB_USER
DB_PASS
DB_NAME
```

Optional variables:

```txt
DB_SSL
DB_LOGGING
DB_POOL_SIZE
```

---

# Environment and Docker

Docker Compose may read variables from:

```txt
.env
.env.development
```

Project policy should define which file Docker uses.

The Kyrae platform should document expected variables without committing real secrets.

---

# Environment and AI Agents

AI agents must not invent secret values.

AI agents may:

- add placeholders,
- update `.env.example`,
- document required variables,
- add validation rules.

AI agents must not:

- create real secrets,
- commit production credentials,
- hardcode local paths,
- hardcode user-specific machine values,
- expose private environment values in documentation.

---

# Recommended .gitignore Rules

The repository should ignore real environment files when they contain secrets.

Recommended:

```gitignore
.env
.env.local
.env.*.local
```

Depending on project policy, these may also be ignored:

```gitignore
.env.development
.env.production
.env.test
```

`.env.example` must be committed.

---

# Build Configuration

The root `.npmrc` file controls pnpm behavior for the workspace.

Current configuration:

```ini
package-manager-strict=true
only-built-dependencies[]=@nestjs/core
only-built-dependencies[]=@parcel/watcher
only-built-dependencies[]=@swc/core
only-built-dependencies[]=bcrypt
only-built-dependencies[]=esbuild
only-built-dependencies[]=lmdb
only-built-dependencies[]=msgpackr-extract
```

## `package-manager-strict`

Ensures that only pnpm is used to install dependencies. The root `preinstall` script enforces this at the package level.

## `only-built-dependencies`

Lists native packages whose build scripts must be executed during installation.

Without this setting, pnpm ignores `install` scripts for these dependencies and native binaries (e.g. `bcrypt`) will not be compiled or copied from prebuilt archives, causing runtime import errors.

Add a new entry here when a native dependency is added to the workspace.

---

# Out of Scope

The generic environment standard must not include:

- real production credentials,
- customer-specific secrets,
- project-specific domains,
- server IP addresses,
- cloud provider credentials,
- private keys,
- database dumps.

Those values must be managed per project and environment.

---

# AI Agent Rules

AI agents must follow these rules:

1. Do not create or commit real secrets.
2. Do not hardcode credentials.
3. Do not place backend secrets in frontend configuration.
4. Update `.env.example` when new variables are required.
5. Keep environment values generic in Kyrae.
6. Do not use production-like secrets as examples.
7. Do not hardcode local user paths.
8. Do not add project-specific domains unless explicitly requested.
9. Validate required backend environment variables when implementing configuration.
10. Document any new environment variable.
