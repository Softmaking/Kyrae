# Project Audit

## Scope

This audit covers architecture, backend, frontend, mobile, database, infrastructure, and quality based only on repository evidence.

## Evidence Sources

- `AGENTS.md`
- `docs/system-context.md`
- `docs/source-of-truth.md`
- `docs/architecture/*`
- `docs/standards/*`
- `specs/features/README.md`
- `apps/backend/src/*`
- `apps/frontend/src/app/*`
- `apps/mobile/lib/*`
- `packages/shared-contracts/src/*`
- `docker-compose.yml`
- `infra/docker/*`
- `package.json`
- `pnpm-workspace.yaml`

## Architecture Findings

Mandatory:

- The repository is a pnpm monorepo using `apps/*` and `packages/*`. Evidence: `pnpm-workspace.yaml`.
- The archetype is IAM-first, reusable, and must avoid project-specific business modules unless a spec explicitly requires them. Evidence: `AGENTS.md`, `docs/system-context.md`.
- Shared DTOs and cross-app contracts belong in `packages/shared-contracts/src/*`. Evidence: `docs/source-of-truth.md`, `docs/standards/shared-contracts.md`.

Recommended:

- Keep source-of-truth documents as the first context for agents. Evidence: `AGENTS.md`.
- Keep architecture docs aligned when modules, permissions, auth behavior, environment variables, or major decisions change. Evidence: `AGENTS.md`, `docs/source-of-truth.md`.

Pending / Not evidenced:

- No active multi-tenancy implementation is evidenced; it is explicitly not a baseline goal.

## Backend Findings

Mandatory:

- Backend uses NestJS modules for auth, users, roles, permissions, audit, organizations, branches, configuration, health, security, database, and common. Evidence: `apps/backend/src/app.module.ts`, `apps/backend/src/*`.
- Controllers must remain lightweight and services own business logic. Evidence: `AGENTS.md`, backend controller/service structure.
- Request inputs use DTOs, not entities. Evidence: `apps/backend/src/**/dto/*`, `docs/standards/backend-standards.md`.
- Database schema changes require TypeORM migrations. Evidence: `docs/source-of-truth.md`, `apps/backend/src/database/migrations/*`, `apps/backend/src/database/typeorm.config.ts`.
- Permission enforcement is centralized through `@Permissions()` and `PermissionsGuard`. Evidence: `apps/backend/src/auth/decorators/permissions.decorator.ts`, `apps/backend/src/auth/guards/permissions.guard.ts`.

Recommended:

- Security-sensitive actions should create audit events. Evidence: `AGENTS.md`, `apps/backend/src/audit/*`, service audit calls.
- Use backend lint and relevant tests for validation. Evidence: `AGENTS.md`, `package.json`, `apps/backend/package.json`.

Risks:

- Permission denial auditing is not evidenced in `PermissionsGuard`, despite audit constants containing denial-related actions.
- Password policy logic exists in security services, but full enforcement in user create/update flows was not evidenced.
- JWT secret fallbacks are present for development and must not be treated as production configuration.
- Some audit constants are not evidenced as emitted.

Pending / Not evidenced:

- OAuth provider flows are prepared but not implemented.
- Automatic audit retention is not evidenced.
- Rate limiting is not evidenced.

## Frontend Findings

Mandatory:

- Frontend uses Angular standalone components. Evidence: `apps/frontend/AGENTS.md`, feature components.
- Feature structure uses pages, services, models, components, and routes where applicable. Evidence: `apps/frontend/src/app/features/*`.
- API calls belong in services, not components. Evidence: `apps/frontend/AGENTS.md`, feature services.
- Auth and permission logic must remain centralized. Evidence: `apps/frontend/src/app/core/guards/*`, `apps/frontend/src/app/core/interceptors/auth.interceptor.ts`.

Recommended:

- Prefer Signals for local state. Evidence: `apps/frontend/AGENTS.md`, feature pages.
- Use shared components such as `app-table`, `form-modal`, `confirm-dialog`, and `user-assignment-modal` for reusable UI.

Risks:

- Action-level permission checks are repeated in templates.
- Delete confirmation behavior is inconsistent across features.
- Modal accessibility features such as focus trap and ARIA labelling are not evidenced.
- Tokens are stored in `localStorage`; this should be documented as an XSS-sensitive tradeoff.

Pending / Not evidenced:

- Accessibility validation for dialogs and tables was not evidenced.
- Tests for `form-modal`, `confirm-dialog`, and `user-assignment-modal` were not evidenced.

## Mobile Findings

Mandatory:

- Mobile beta scope is auth, home, and profile. Evidence: `docs/system-context.md`, `apps/mobile/lib/features/*`.
- Mobile uses Flutter, Riverpod, GoRouter, Dio, and secure storage. Evidence: `apps/mobile/lib/app/*`, `apps/mobile/lib/core/network/*`, `apps/mobile/lib/core/storage/*`.
- Mobile must not bypass backend auth or authorization rules. Evidence: `AGENTS.md`, `apps/mobile/AGENTS.md`.

Recommended:

- Keep mobile outside beta scope unimplemented unless explicitly approved.
- Use `flutter analyze` and `flutter test` from `apps/mobile`. Evidence: `AGENTS.md`, `apps/mobile/AGENTS.md`.

Risks:

- Login form contains hardcoded default admin credentials.
- Mobile logout only clears local session; backend `/auth/logout` integration was not evidenced.
- API base URL is hardcoded by platform; environment/flavor management was not evidenced.

Pending / Not evidenced:

- Permission-based mobile UI or route enforcement is not evidenced.
- Mobile integration or e2e tests are not evidenced.

## Database Findings

Mandatory:

- PostgreSQL and TypeORM are the database baseline. Evidence: `docker-compose.yml`, `apps/backend/src/database/typeorm.config.ts`.
- `synchronize: false` is required; migrations are the schema source of truth. Evidence: `docs/source-of-truth.md`, TypeORM config.

Recommended:

- Use `pnpm docker:db` for local database-only workflows. Evidence: `AGENTS.md`, root `package.json`.

Risks:

- E2E tests appear to depend on local/external database setup.

## Infrastructure Findings

Mandatory:

- Docker includes PostgreSQL, backend, and frontend services. Evidence: `docker-compose.yml`, `infra/docker/*`.
- Use pnpm only. Evidence: root `package.json`, `.npmrc`, `AGENTS.md`.

Recommended:

- Docker is ready but not required for local development. Evidence: `docs/architecture/deployment.md`, `infra/README.md`.

Risks:

- Docker Compose contains local/demo secrets and must not be reused as production secrets.
- Deployment docs mention `DATABASE_SSL`, while other sources reference `DB_SSL`.

## Quality Findings

Mandatory:

- Use frontend/backend linting and relevant tests. Evidence: root `package.json`, `docs/standards/testing-standards.md`.
- Conventional Commits in Spanish are required. Evidence: `docs/standards/git-workflow.md`.

Recommended:

- Add root scripts for shared-contracts validation and mobile validation.

Pending / Not evidenced:

- Commitlint config file was not evidenced, even though hooks reference commitlint.

## Opportunities For Improvement

- Add consistent delete confirmation through `confirm-dialog`.
- Add accessibility tests for dialogs and table interactions.
- Add root scripts for mobile and shared-contract validation.
- Audit and align environment variable naming across docs and code.
- Add explicit SDD checklist to feature specs.
