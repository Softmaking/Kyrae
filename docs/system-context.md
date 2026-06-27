# System Context

## Overview

Kyrae is an IAM-first assistant platform foundation.

It includes:

- Angular frontend
- NestJS backend
- Flutter mobile client (official beta)
- PostgreSQL + TypeORM
- Shared contracts package
- Role/permission based authorization
- Audit trail
- Organizations and branches
- Configuration management
- Documented target principal assistant agent: `OpenClaw`
- Documented target voice interaction capability

The IAM and security foundation must remain reusable. Unrelated business modules must not be added unless a specification explicitly requires them.

`OpenClaw` has a backend text-message adapter. The adapter defaults to mock mode and can call an external OpenClaw-compatible HTTP service when configured. Voice interaction remains a documented target capability only. No voice capture, speech-to-text, text-to-speech, or voice orchestration service is implemented yet.

## Current Modules

### Backend

- auth
- users
- roles
- permissions
- audit
- organizations
- branches
- configuration
- messages
- openclaw
- health
- security
- database
- common

### Frontend

- public
- auth
- dashboard
- users
- roles
- permissions
- audit
- organizations
- branches
- configuration
- assistant

### Mobile (Official Beta)

- auth (login, logout, me, refresh)
- home (dashboard)
- profile
- assistant text chat

Documented target capabilities, not implemented in mobile beta:

- voice input
- voice output

Out of scope for mobile beta:

- users
- roles
- permissions
- audit
- organizations
- branches
- configuration
- voice features

### Shared Contracts

Shared contracts live in `packages/shared-contracts/src/`.

Current contract areas:

- auth
- users
- roles
- permissions
- audit
- organizations
- branches
- configuration
- openclaw
- common

## Authentication

Current implementation:

- local email/password login
- JWT access token
- refresh token
- `/auth/login`
- `/auth/refresh`
- `/auth/me`
- `/auth/logout`

Prepared but not implemented:

- Google OAuth flow
- Microsoft OAuth flow
- forgot password flow
- reset password flow
- change password flow
- MFA
- OpenClaw agent runtime
- voice interaction flows

## OpenClaw Assistant Messaging

Current implementation:

- `/messages` accepts authenticated web text messages.
- `/messages/tasks` accepts authenticated asynchronous assistant text-message tasks.
- `/messages/tasks/:id` returns task status and the assistant response when completed.
- `/sessions` lists authenticated assistant sessions with cursor pagination and a default page size of 10.
- `/sessions/:id/messages` returns the persisted message history for one owned assistant session.
- The endpoint requires `ASSISTANT_CHAT_USE`.
- User and assistant messages are stored in PostgreSQL.
- Conversations are stored in PostgreSQL.
- Public API uses `sessionId`; the current database implementation still uses `conversations` as the internal sessions table.
- OpenClaw request/response traces are stored in PostgreSQL through `openclaw_requests`.
- The backend uses `OpenClawService` as the only OpenClaw adapter.
- `OPENCLAW_MODE=mock` returns a deterministic local response.
- `OPENCLAW_MODE=http` sends normalized requests to `POST {OPENCLAW_BASE_URL}/messages`.
- Mobile polls asynchronous assistant tasks, can show a local best-effort notification when a response completes while the app is not active, and loads assistant session history through a paginated bottom sheet.

Not implemented:

- OpenClaw runtime inside this repository.
- WebSocket streaming.
- Voice input or output.
- External messaging channels.
- Agent task execution beyond adapter request/response.
- Real push notifications through FCM/APNs for completed assistant tasks.

`AuthProvider` values:

- `LOCAL`
- `GOOGLE`
- `MICROSOFT`

`users.provider` exists and defaults to `LOCAL`.

OAuth env vars are prepared in `.env.example` but are not consumed by backend code yet.

## Authorization

Current implementation:

- role-permission relationships
- backend `PermissionsGuard`
- backend `@Permissions()` decorator
- frontend `permissionGuard`
- permission-based route protection

Optional project extensions (not baseline):

- `RolesGuard`
- `@Roles()` decorator
- direct user permissions
- scoped permission enforcement

## Permissions

Source permissions are seeded in backend.

Current domains:

- USERS
- ROLES
- PERMISSIONS
- AUDIT
- ORGANIZATIONS
- BRANCHES
- CONFIGURATION
- ASSISTANT

Most domains use:

- `MODULE_READ`
- `MODULE_CREATE`
- `MODULE_UPDATE`
- `MODULE_DELETE`

Audit currently exposes only:

- `AUDIT_READ`

Assistant currently exposes only:

- `ASSISTANT_CHAT_USE`

## Organizations And Branches

Current implementation:

- organizations CRUD
- branches CRUD
- activation/deactivation for organizations and branches
- assign/remove users to/from organizations
- assign/remove users to/from branches
- list users assigned to organizations and branches

Branch user assignment requires the user to already belong to the branch parent organization. The backend rejects direct branch assignment when the matching `user_organizations` relationship does not exist.

Not implemented:

- `GET /organizations/:id/branches`

## Configuration

Current implementation:

- list with filters
- find by id
- find by key
- create
- update
- delete

Frontend exposes `findByKey()`, but no component currently consumes it.

## Audit

Current implementation:

- audit event persistence
- list audit events with cursor/keyset pagination
- get audit event by id
- auth/security-sensitive events
- IAM/configuration/org/branch events

Audit list pagination uses `limit` and an opaque `cursor`, ordered by `createdAt DESC` and `id DESC`.

Audit retention is not enforced automatically.

## Frontend Rules

- standalone components only
- feature-based structure
- HTTP calls live in services
- auth/permission logic remains centralized
- frontend route guards are UX support only
- backend remains the authorization authority
- wildcard route `**` muestra `PublicNotFoundComponent` para usuarios autenticados; redirige a `/` para no autenticados

Frontend API base URL source:

- `apps/frontend/src/environments/environment.ts`
- `apps/frontend/src/environments/environment.production.ts`

## Mobile Rules (Beta)

- mobile client lives in `apps/mobile`
- mobile consumes backend APIs without bypassing auth/authorization rules
- mobile refresh token flow is implemented; expired tokens are automatically refreshed via AuthInterceptor
- beta scope includes auth, home (dashboard), profile, and assistant text chat
- voice interaction remains a target capability only and must not be implemented without approved feature artifacts
- mobile modules outside beta scope are intentionally not implemented yet

## Backend Rules

- lightweight controllers
- business logic in services
- DTO validation on inputs
- entities are not request DTOs
- migrations required for schema changes
- permission logic centralized and auditable
- security-sensitive actions should be audited

## Environment

Backend env source of truth:

- `apps/backend/.env.example`

Prepared but not active OAuth variables:

- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_TENANT_ID`
- `GOOGLE_CLIENT_ID`

OpenClaw adapter variables:

- `OPENCLAW_MODE`
- `OPENCLAW_BASE_URL`
- `OPENCLAW_TIMEOUT_MS`

Frontend does not use runtime `NG_APP_*` variables. It uses Angular environment files.

## Validation Commands

Frontend:

- `pnpm frontend:build`
- `pnpm frontend:test`
- `pnpm frontend:e2e`

Mobile:

- `flutter analyze` from `apps/mobile`
- `flutter test` from `apps/mobile`

Backend:

- `pnpm backend:lint`
- `pnpm backend:build`
- `pnpm backend:test`
- `pnpm backend:test:e2e`

Database:

- `pnpm --dir apps/backend migration:run`
- `pnpm --dir apps/backend seed`

## Non-Goals

Do not add by default:

- project-specific business modules
- POS/inventory/sales/billing/logistics modules
- active multi-tenancy
- OAuth implementation unless explicitly requested
- duplicated DTOs outside `packages/shared-contracts`
- OpenClaw runtime behavior without an approved feature spec
- voice capture, speech-to-text, text-to-speech, wake-word, or voice orchestration without an approved feature spec
