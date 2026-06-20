# OpenCode Workflow: Create Feature

# Overview

This workflow defines how OpenCode should create or implement a new feature in Kyrae.

The archetype is IAM-first, security-first and designed as a generic enterprise foundation. Business-specific features must only be created when a feature specification explicitly requires them.

---

# Goal

The goal of this workflow is to make feature implementation:

* structured,
* secure,
* documented,
* testable,
* aligned with architecture,
* aligned with pnpm workspace,
* safe for frontend and backend,
* compatible with AI-assisted development.

---

# Mandatory Reading

Before implementing a feature, OpenCode must read:

1. `docs/system-context.md`
2. `docs/source-of-truth.md`
3. `README.md`
4. `AGENTS.md`
5. `.opencode/instructions.md`
6. `docs/architecture/overview.md`
7. `docs/standards/coding-standards.md`
8. `docs/standards/security-standards.md`
9. `docs/standards/api-standards.md` when backend APIs are involved
10. `docs/standards/database-standards.md` when database changes are involved
11. Related feature specification under `specs/features`
12. Application-specific `AGENTS.md`
13. Application-specific `README.md`

---

# Required Feature Specification

For non-trivial features, a specification should exist under:

```txt
specs/features/feature-name/
```

Recommended files:

```txt
requirements.md
acceptance-criteria.md
api-contract.md
data-model.md
tasks.md
notes.md
```

If a feature specification does not exist, OpenCode should propose one before implementation.

---

# Feature Classification

Before implementing, classify the feature as one of:

## Core Enterprise Feature

Generic feature that belongs to the archetype.

Examples:

* auth,
* users,
* roles,
* permissions,
* audit,
* security,
* organizations,
* branches,
* configuration,
* health.

## Optional Enterprise Feature

Reusable enterprise capability that may be enabled later.

Examples:

* notifications,
* files,
* reports,
* multi-tenant support.

## Project-Specific Feature

Feature that belongs only to a concrete business domain.

Examples:

* POS,
* inventory,
* sales,
* billing,
* logistics,
* warehouse operations,
* customer-specific workflows.

Project-specific features must not be added to the generic archetype unless explicitly requested by a project specification.

---

# Planning Step

Before generating code for medium or large features, OpenCode must propose an implementation plan.

The plan should include:

* affected applications,
* affected packages,
* backend modules,
* frontend features,
* shared contracts,
* database changes,
* API endpoints,
* permissions,
* audit events,
* tests,
* documentation updates.

---

# Backend Implementation Rules

When the feature affects backend:

1. Create or update the NestJS module.
2. Keep controllers lightweight.
3. Put business logic in services.
4. Use DTOs for requests and responses.
5. Validate all DTOs.
6. Use TypeORM entities when persistence is required.
7. Create TypeORM migrations for schema changes.
8. Add guards and decorators when authorization is required.
9. Add audit events for security-sensitive actions.
10. Update Scalar API documentation when endpoints change.

Backend implementation must not:

* place business logic in controllers,
* bypass DTO validation,
* access the database directly from controllers,
* expose sensitive fields,
* use entities as request DTOs,
* create project-specific modules without explicit specification.

---

# Frontend Implementation Rules

When the feature affects frontend:

1. Use Angular standalone components.
2. Use feature-based organization.
3. Keep components lightweight.
4. Use services for API communication.
5. Use Signals when appropriate.
6. Use guards for protected routes.
7. Use interceptors for token handling and cross-cutting concerns.
8. Centralize auth and permission logic.
9. Use Tailwind CSS as primary styling system.
10. Use Angular Material when appropriate.

Frontend implementation must not:

* place business logic inside components,
* call APIs directly from components,
* duplicate permission checks,
* hardcode permissions across components,
* rely on frontend authorization as final security.

---

# Shared Contracts Rules

If the feature requires shared contracts:

Allowed:

* DTOs,
* enums,
* types,
* interfaces,
* permission codes.

Not allowed:

* business logic,
* database access,
* TypeORM entities,
* Angular components,
* NestJS services,
* guards,
* interceptors,
* secrets.

Every public contract should be exported through `index.ts`.

---

# API Rules

When creating or updating APIs:

* use REST-oriented routes,
* use explicit DTOs,
* validate request data,
* protect private endpoints with authentication,
* protect restricted endpoints with permissions,
* document endpoints with Scalar,
* avoid exposing sensitive data,
* keep error responses consistent.

Permission examples:

```txt
USERS_READ
USERS_CREATE
USERS_UPDATE
ROLES_READ
PERMISSIONS_ASSIGN
AUDIT_READ
```

---

# Database Rules

When schema changes are required:

* use TypeORM migrations,
* define explicit relationships,
* add indexes intentionally,
* add unique constraints where needed,
* do not enable `synchronize` in production,
* do not store plain text passwords,
* do not store raw refresh tokens,
* do not commit production data.

---

# Security Rules

Every feature must consider:

* authentication,
* authorization,
* permission checks,
* audit events,
* sensitive data exposure,
* environment variables,
* DTO validation,
* backend enforcement.

Backend authorization is mandatory for protected resources.

Frontend authorization is only UX support.

---

# Testing Rules

Add or update tests when behavior changes.

Testing priority:

1. Authentication flows.
2. Authorization rules.
3. Permission checks.
4. Backend services.
5. API endpoints.
6. Frontend guards.
7. Critical UI flows.

Use pnpm commands only.

Examples:

```bash
pnpm -r test
pnpm --filter backend test
pnpm --filter backend test:e2e
pnpm --filter frontend test
```

---

# Documentation Rules

Update documentation when the feature changes:

* architecture,
* commands,
* API contracts,
* database schema,
* authentication,
* authorization,
* permissions,
* shared contracts,
* environment variables,
* Docker behavior,
* testing strategy.

---

# Package Manager Rules

Use pnpm only.

Allowed:

```bash
pnpm install
pnpm frontend:dev
pnpm backend:dev
pnpm -r test
pnpm -r build
```

Forbidden:

```bash
npm install
npm run
npx
```

Do not generate `package-lock.json`.

---

# Completion Checklist

Before finishing a feature, verify:

* feature matches the specification,
* no unnecessary files were created,
* frontend/backend separation is preserved,
* DTOs are validated,
* backend endpoints are protected,
* permissions are enforced,
* audit events are considered,
* shared contracts are clean,
* migrations exist when schema changes,
* tests are added or updated,
* documentation is updated when needed,
* pnpm is used,
* no `package-lock.json` was generated,
* no secrets were committed.

---

# Recommended Final Response

When OpenCode finishes a feature, it should summarize:

* what was implemented,
* affected files,
* tests added or updated,
* commands to run,
* documentation updated,
* known limitations,
* follow-up recommendations.

---

# Out of Scope

This workflow must not create generic archetype modules for:

* POS,
* inventory,
* sales,
* billing,
* warehouse operations,
* logistics,
* project-specific operational workflows.

Those features require project-specific specifications.
