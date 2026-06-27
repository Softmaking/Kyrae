# Source Of Truth

## Overview

This document defines the authoritative source for each system concern.

If documentation conflicts with executable code or configuration, trust the source listed here.

## Package Manager

Source of truth:

- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`

Rules:

- use pnpm only
- do not generate `package-lock.json`

## Backend Entrypoints

Source of truth:

- `apps/backend/src/main.ts`
- `apps/backend/src/app.module.ts`

## Frontend Entrypoints

Source of truth:

- `apps/frontend/src/main.ts`
- `apps/frontend/src/app/app.config.ts`
- `apps/frontend/src/app/app.routes.ts`

## Mobile Entrypoints

Source of truth:

- `apps/mobile/lib/main.dart`

## Backend Modules

Source of truth:

- `apps/backend/src/`

Architecture docs should reflect current backend folders.

## Frontend Features

Source of truth:

- `apps/frontend/src/app/features/`

Architecture docs should reflect current frontend feature folders.

## Mobile Features

Source of truth:

- `apps/mobile/lib/`

Current official beta scope:

- auth (login, logout, me, refresh)
- home (dashboard)
- profile
- assistant text chat

Documented target capabilities:

- OpenClaw principal assistant agent
- voice interaction

OpenClaw currently has a backend text-message adapter. Voice runtime behavior is not implemented yet.

## API Endpoints

Backend source of truth:

- `apps/backend/src/**/*.controller.ts`

Frontend API usage source of truth:

- `apps/frontend/src/app/features/**/services/*.service.ts`

Audit list pagination shape is defined in `packages/shared-contracts/src/audit/audit.contracts.ts` and implemented by `GET /audit-events`.

Assistant message and task shapes are defined in `packages/shared-contracts/src/openclaw/openclaw.contracts.ts` and implemented by `POST /messages`, `POST /messages/tasks`, and `GET /messages/tasks/:id`.

When changing an endpoint:

1. update shared contracts if API shape changes
2. update backend controller/service/DTO
3. update frontend service/model usage
4. update mobile integration when endpoint is consumed by mobile beta scope
5. update docs when behavior changes

## Shared Contracts

Source of truth:

- `packages/shared-contracts/src/`
- `packages/shared-contracts/src/index.ts`

Package name:

- `@kyrae/shared-contracts`

Rules:

- shared contracts define DTOs, commands, queries, and shared types
- no framework code
- no business logic
- no database access
- no secrets

## Authentication

Source of truth:

- `packages/shared-contracts/src/auth/auth.contracts.ts`
- `apps/backend/src/auth/`
- `apps/frontend/src/app/features/auth/`
- `apps/mobile/lib/`

## Users

Source of truth:

- `packages/shared-contracts/src/users/user.contracts.ts`
- `apps/backend/src/users/`
- `apps/frontend/src/app/features/users/`

## Permissions

Seed source of truth:

- `apps/backend/src/database/seed.ts`

Runtime enforcement source of truth:

- `apps/backend/src/auth/decorators/permissions.decorator.ts`
- `apps/backend/src/auth/guards/permissions.guard.ts`
- `apps/backend/src/**/*.controller.ts`

Frontend route protection source of truth:

- `apps/frontend/src/app/core/guards/permission.guard.ts`
- `apps/frontend/src/app/**/*.routes.ts`

Documentation must not invent permissions not seeded or enforced.

## OpenClaw Assistant Messaging

Source of truth:

- `packages/shared-contracts/src/openclaw/openclaw.contracts.ts`
- `apps/backend/src/messages/`
- `apps/backend/src/openclaw/`
- `apps/frontend/src/app/features/assistant/`
- `apps/mobile/lib/features/assistant/`

Rules:

- Clients must call the Kyrae backend, not OpenClaw directly.
- `POST /messages` is the current backend entrypoint for text messages.
- `POST /messages/tasks` is the current backend entrypoint for asynchronous text-message tasks.
- `GET /messages/tasks/:id` is the current backend entrypoint for polling task status.
- `GET /sessions` is the current backend entrypoint for assistant session lists and uses cursor pagination with a default limit of 10.
- `GET /sessions/:id/messages` is the current backend entrypoint for persisted assistant message history.
- `OpenClawService` is the current backend adapter for OpenClaw-compatible request/response behavior.
- `sessionId` is the canonical API identifier for assistant context; `conversationId` remains a temporary compatibility alias.
- `openclaw_requests` persists OpenClaw request payloads, response payloads, status, errors, and duration.
- Mobile local notification behavior is implemented in `apps/mobile/lib/core/notifications/` and is best-effort while the app process is alive.
- Real OpenClaw runtime behavior is external to this repository unless a future approved feature changes this.
- Real mobile push delivery requires future Firebase Cloud Messaging/APNs credentials and device token registration.

## Environment Variables

Backend source of truth:

- `apps/backend/.env.example`

Frontend source of truth:

- `apps/frontend/src/environments/environment.ts`
- `apps/frontend/src/environments/environment.production.ts`

Rules:

- backend env vars must be listed in `.env.example`
- frontend must not contain secrets
- frontend uses `apiBaseUrl`
- runtime `NG_APP_*` variables are not used

OpenClaw adapter environment variables are defined in `apps/backend/.env.example`.

## Database Schema

Source of truth:

- `apps/backend/src/**/*.entity.ts`
- `apps/backend/src/database/migrations/`

Rules:

- entity changes require migrations
- `synchronize: false`
- do not modify production schema manually

## Seed Data

Source of truth:

- `apps/backend/src/database/seed.ts`

Seed defines:

- default permissions
- admin role
- default admin user
- default organization
- default branch
- default app configs
- assistant chat permission

## Docker

Source of truth:

- `docker-compose.yml`
- `infra/docker/backend/Dockerfile`
- `infra/docker/frontend/Dockerfile`

## Testing

Frontend source of truth:

- `apps/frontend/src/**/*.spec.ts`
- `apps/frontend/playwright.config.ts`

Backend source of truth:

- `apps/backend/src/**/*.spec.ts`
- `apps/backend/test/**/*.e2e-spec.ts`

Mobile source of truth:

- `apps/mobile/test/**/*.dart`

## Documentation

Fast agent context:

- `docs/system-context.md`
- `docs/source-of-truth.md`

Architecture docs:

- `docs/architecture/`

Standards docs:

- `docs/standards/`

When changing features, contracts, architecture, commands, env vars, Docker, auth, authorization, or database schema, update relevant docs.

## Conflict Resolution

When sources disagree, use this priority order:

1. executable config and scripts
2. source code
3. shared contracts
4. migrations
5. architecture docs
6. standards docs
7. README-style summaries
