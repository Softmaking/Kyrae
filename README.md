# kyrae

## Overview

Kyrae is an IAM-first assistant platform foundation with a NestJS backend, Angular frontend and Flutter mobile client.

Kyrae is being prepared to support a principal assistant agent named `OpenClaw` and future voice interaction across web and mobile experiences.

The architecture is designed to:

* support long-term scalability,
* work efficiently with AI agents,
* maintain clean separation of responsibilities,
* allow future repository separation if needed,
* standardize secure assistant-platform development practices.

---

# Main Technologies

## Frontend

* Angular
* Standalone Components
* Signals
* Tailwind CSS
* Angular Material

## Backend

* NestJS
* TypeScript
* PostgreSQL
* TypeORM

## API Documentation

* Scalar

## Package Manager

* pnpm Workspace

## Infrastructure

* Docker
* Nginx
* Traefik

## Mobile (Official Beta)

* Flutter

Current beta scope:

* Login
* Dashboard

## Documented Target Capabilities

* `OpenClaw` principal assistant agent
* Voice interaction
* Speech-driven user experiences
* Assistant orchestration

These capabilities are documented targets only. No OpenClaw runtime module or voice implementation exists yet.

---

# Repository Structure

```txt
apps/
├── frontend/
├── backend/
└── mobile/

packages/
└── shared-contracts/

docs/
├── architecture/
└── standards/

specs/
├── product/
└── features/

infra/

.opencode/
```

---

# Architecture Principles

* Frontend and backend must remain decoupled.
* Shared contracts belong in `/packages/shared-contracts`.
* Applications must be modular and scalable.
* Business logic must not be duplicated.
* Features should be spec-driven whenever possible.
* Architecture decisions should be documented.
* Security must be considered a core architectural requirement.

---

# Core Platform Modules

Kyrae is primarily focused on an assistant-ready IAM and security foundation.

Core modules include:

* Authentication
* Authorization
* Identity and Access Management
* Users
* Roles
* Permissions
* Audit
* Security
* Organizations
* Branches
* Configuration

Additional business modules must remain independent and specification-driven.

---

# Package Manager Rules

This repository uses pnpm as the official package manager.

Rules:

* Do not use npm install.
* Do not generate package-lock.json.
* Use pnpm install from repository root.
* Use pnpm workspace commands.
* Commit pnpm-lock.yaml.

---

# Docker Strategy

This repository is Docker-ready but not Docker-dependent.

Docker support exists for:

* demos,
* onboarding,
* deployments,
* CI/CD environments.

Daily development may be executed without Docker using local pnpm workflows.

Recommended approaches:

Frontend only:

```bash
pnpm frontend:dev
```

Backend only:

```bash
pnpm backend:dev
```

Database container only:

```bash
pnpm docker:db
```

Full environment:

```bash
pnpm docker:up
```

---

# AI-Assisted Development

This repository is optimized for:

* OpenCode
* Codex
* Claude Code
* Warp Agents
* Multi-agent workflows

AI agents must always:

1. Read `AGENTS.md`.
2. Read architecture documentation.
3. Review specs before generating code.
4. Respect repository structure and standards.

---

# Development Commands

Install dependencies:

```bash
pnpm install
```

Run frontend:

```bash
pnpm frontend:dev
```

Run backend:

```bash
pnpm backend:dev
```

Build all applications:

```bash
pnpm frontend:build
pnpm backend:build
```

Run tests:

```bash
pnpm frontend:test
pnpm frontend:e2e
pnpm backend:test
pnpm backend:test:e2e
```

Run full docker environment:

```bash
pnpm docker:up
```

Shutdown docker environment:

```bash
pnpm docker:down
```

---

# Goals

* Build a secure assistant platform foundation.
* Prepare the platform for OpenClaw.
* Prepare the product for future voice interaction.
* Improve maintainability.
* Enable scalable architectures.
* Improve AI-assisted development quality.
* Reduce technical debt.
* Provide a robust IAM foundation.

---

# Current Monorepo Strategy

The repository currently uses a monorepo approach.

However, applications are intentionally isolated to allow future separation into independent repositories if needed.

Example future split:

```txt
kyrae-frontend
kyrae-backend
kyrae-mobile
kyrae-shared-contracts
```

---

# Initial Vision

Kyrae aims to become an assistant platform capable of supporting:

* authentication and authorization,
* identity and access management,
* user management,
* role and permission management,
* audit and security workflows,
* modular frontend applications,
* modular backend APIs,
* mobile integrations,
* OpenClaw as principal assistant agent,
* future voice interaction,
* AI-assisted development workflows.

---

# Status

Current status:

* Initial Kyrae platform foundation created.
* Frontend and backend initialized.
* Mobile Flutter app initialized (official beta scope: login + dashboard + profile).
* pnpm workspace configured.
* Assistant-ready IAM-oriented architecture defined.
* AI-agent workflow documentation initialized.

---

# Roadmap Mobile (Post-Beta)

* Fase actual: login + dashboard.
* Proxima fase: nuevos modulos segun estrategia del producto.
* OpenClaw y voz permanecen documentados hasta contar con especificaciones aprobadas.
