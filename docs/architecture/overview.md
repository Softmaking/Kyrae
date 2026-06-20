# Architecture Overview

# Overview

Kyrae is an enterprise-ready monorepo architecture designed for scalable enterprise platforms, identity and access management foundations, and AI-assisted development workflows.

The architecture prioritizes:

- security,
- scalability,
- maintainability,
- modularity,
- AI-assisted development,
- future repository separation,
- enterprise standards.

---

# Monorepo Strategy

The repository uses a monorepo structure based on pnpm workspace.

Applications are intentionally isolated to allow future separation into independent repositories if needed.

Current structure:

```txt
apps/
├── frontend/
├── backend/
└── mobile/

packages/
└── shared-contracts/
```

---

# Mobile Architecture (Official Beta)

## Stack

- Flutter

## Beta Scope

- auth (login, refresh, logout, me)
- home (dashboard)
- profile

Out of scope for current beta:

- users
- roles
- permissions
- audit
- organizations
- branches
- configuration

## Principles

- Mobile consumes the same backend API boundaries.
- Authentication and authorization rules remain server-authoritative.
- Scope remains intentionally small during beta.

---

# Frontend Architecture

## Stack

- Angular
- Standalone Components
- Signals
- Tailwind CSS
- Angular Material

## Principles

- Feature-based organization.
- Reusable UI components.
- Responsive-first design.
- Services for HTTP communication.
- Business logic separated from UI.
- Signals preferred for local state management.
- Authentication and authorization flows centralized.

## Structure

```txt
src/
├── app/
│   ├── core/           # Guards, interceptors, layout, global config
│   ├── features/       # Feature modules (audit, auth, branches, configuration, dashboard, organizations, public, users, roles, permissions)
│   ├── shared/         # Reusable shared UI/code placeholders
│   ├── app.config.ts   # Application configuration
│   ├── app.routes.ts  # Main routing
│   └── app.ts         # Root component
```

Notes:

- Guards, interceptors and global API configuration live inside `core/`.
- Feature-specific API services live under `features/<feature>/services`.
- Feature modules are organized under `features/` directory
- `shared/` contains reusable UI components (e.g., `app-table`) and cross-feature patterns.

---

# Backend Architecture

## Stack

- NestJS
- TypeScript
- TypeORM
- PostgreSQL
- Scalar

## Principles

- Modular architecture.
- Lightweight controllers.
- Business logic inside services.
- DTO validation required.
- Scalable entity relationships.
- Reusable services and modules.
- IAM modules independent from project-specific modules.

## Structure

```txt
src/
├── audit/
├── auth/
├── branches/
├── common/        # Reusable backend cross-cutting utilities (e.g., logging interceptor)
├── configuration/
├── database/
├── health/
├── organizations/
├── permissions/
├── roles/
├── security/
├── users/
├── app.module.ts
└── main.ts
```

---

# Core Enterprise Modules

The Kyrae base is focused on IAM and security foundations.

Core modules:

- Authentication
- Authorization
- Identity and Access Management
- Users
- Roles
- Permissions
- Audit
- Security
- Organizations
- Branches
- Configuration
- Health

Business-specific modules must be defined by each project and must not be part of the Kyrae platform foundation.

---

# Authentication Strategy

The architecture is initially based on JWT authentication.

The system must remain prepared for:

- Microsoft Authentication,
- Google Authentication,
- external identity providers.

Authentication providers must remain modular and optional.

Initial authentication:

- email and password,
- JWT access token,
- refresh token strategy,
- role and permission-based authorization.

Future authentication support:

- Microsoft Entra ID,
- Google Identity,
- MFA,
- SSO,
- external identity provider mapping.

---

# Authorization Strategy

Authorization must be based on roles and permissions.

The system must support:

- role assignment,
- permission assignment,
- user-role relationships,
- role-permission relationships,
- route guards,
- API guards,
- permission-based access control.

Authorization logic must remain centralized and reusable.

---

# Shared Packages

Shared contracts belong in:

```txt
packages/shared-contracts
```

This package may contain:

- DTOs,
- enums,
- shared types,
- contracts,
- reusable interfaces.

Frontend and backend must remain decoupled and communicate through contracts and APIs.

Shared packages must not contain:

- business logic,
- database access,
- framework-specific implementation,
- secrets,
- environment-specific configuration.

---

# Package Manager Strategy

The repository uses pnpm workspace as the official package manager.

Goals:

- centralized dependency management,
- workspace-aware commands,
- scalable monorepo structure,
- reusable packages,
- optimized installations.

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

- `.env.example` documents required variables.
- `.env.development` is used for local development.
- `.env.production` is used as production reference.
- Real secrets must not be committed.
- Each application may define its own environment files when needed.

---

# Docker Strategy

The architecture is Docker-ready but not Docker-dependent.

## Goals

- support demos and onboarding,
- simplify deployment,
- standardize environments,
- maintain optional local development.

## Development

Developers may work without Docker using:

```bash
pnpm frontend:dev
pnpm backend:dev
```

Optional PostgreSQL container:

```bash
pnpm docker:db
```

## Demo / Deployment

Complete environment:

```bash
pnpm docker:up
```

Docker is recommended for:

- onboarding,
- demos,
- deployments,
- CI/CD environments.

---

# Scalability Goals

The architecture must support:

- enterprise applications,
- multiple modules,
- mobile applications,
- future microservices,
- future repository separation,
- multi-client systems,
- IAM-first platforms,
- optional multi-tenant systems,
- AI-assisted development workflows.

---

# AI-Assisted Development

The repository is optimized for:

- OpenCode,
- Codex,
- Claude Code,
- Warp Agents,
- multi-agent workflows.

AI agents must:

1. Read `AGENTS.md`.
2. Review architecture before implementation.
3. Follow coding standards.
4. Respect repository structure.
5. Review specs before generating features.
