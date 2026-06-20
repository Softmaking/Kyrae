# Architecture Decisions

## ADR-001: IAM-First Assistant Platform

Mandatory:

- The system is Kyrae, an IAM-first assistant platform foundation.
- Baseline modules include authentication, authorization, users, roles, permissions, audit, organizations, branches, configuration, health, security, database, and common concerns.
- `OpenClaw` is the documented principal assistant agent target.
- Voice interaction is documented as a future target capability and is not implemented yet.

Sources: `docs/system-context.md`, `apps/backend/src/app.module.ts`, `apps/frontend/src/app/features/*`.

## ADR-002: Monorepo With Shared Contracts

Mandatory:

- The repository uses a pnpm workspace with `apps/*` and `packages/*`.
- `packages/shared-contracts` is the source for shared DTOs and cross-app types.

Sources: `pnpm-workspace.yaml`, `docs/source-of-truth.md`, `packages/shared-contracts/src/index.ts`.

## ADR-003: Backend Uses NestJS Modules And TypeORM

Mandatory:

- Backend uses NestJS modules, DTO validation, services, controllers, TypeORM entities, and migrations.
- `synchronize: false` means database schema changes must be tracked by migrations.

Sources: `apps/backend/src/*`, `apps/backend/src/database/typeorm.config.ts`, `apps/backend/src/database/migrations/*`.

## ADR-004: Authorization Is Permission-Based

Mandatory:

- Backend permission enforcement uses `@Permissions()` and `PermissionsGuard`.
- Frontend route access uses permission guards as UX support; backend remains authoritative.

Sources: `apps/backend/src/auth/decorators/permissions.decorator.ts`, `apps/backend/src/auth/guards/permissions.guard.ts`, `apps/frontend/src/app/core/guards/permission.guard.ts`, `docs/system-context.md`.

## ADR-005: Audit Trail Is A Core Module

Mandatory:

- Security-sensitive and IAM actions should be audited.
- Audit list uses cursor pagination.

Sources: `apps/backend/src/audit/*`, `packages/shared-contracts/src/audit/audit.contracts.ts`, `docs/system-context.md`.

## ADR-006: Frontend Uses Angular Standalone And Feature Structure

Mandatory:

- Angular standalone components are required.
- Features live under `apps/frontend/src/app/features/*`.
- Shared UI lives under `apps/frontend/src/app/shared/*`.

Sources: `apps/frontend/AGENTS.md`, `apps/frontend/src/app/features/*`, `apps/frontend/src/app/shared/components/*`.

## ADR-007: Mobile Is A Beta Client With Limited Scope

Mandatory:

- Mobile currently supports auth, home, and profile only.

Sources: `docs/system-context.md`, `apps/mobile/lib/features/*`.

## Pending / Not Evidenced

- Active multi-tenancy is not implemented as a baseline.
- OAuth flows are prepared but not implemented.
- Real multi-agent SDD automation is not implemented.
