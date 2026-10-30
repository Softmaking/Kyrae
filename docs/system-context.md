# System Context

## Overview

Kyrae is an IAM-first assistant platform foundation.

It includes:

- Angular frontend
- NestJS backend
- Flutter mobile client (official beta)
- OpenClaw HTTP adapter for the external OpenClaw runtime
- Hermes and OpenClaw agent providers behind a Kyrae orchestrator
- STT gateway for speech-to-text provider integration
- Assistant attachments pipeline with private storage and an internal extraction worker (`apps/attachment-worker`)
- PostgreSQL + TypeORM
- Shared contracts package
- Role/permission based authorization
- Audit trail
- Organizations and branches
- Configuration management
- Documented target principal assistant agent: `OpenClaw`
- Documented target voice interaction capability

The IAM and security foundation must remain reusable. Unrelated business modules must not be added unless a specification explicitly requires them.

`OpenClaw` has a backend text-message adapter. The adapter defaults to mock mode and can call an external OpenClaw-compatible HTTP service when configured. `apps/openclaw-http-adapter` is the repository-owned HTTP wrapper intended to run next to the external OpenClaw CLI/runtime. Web and mobile voice input are implemented through the backend voice STT adapter. Clients call Kyrae backend only; `apps/openclaw-http-adapter` and `apps/stt-gateway` are internal backend dependencies and must not be called directly by web or mobile clients. Voice output is implemented through the backend voice TTS adapter. Web and mobile chat attachments are handled by the backend `assistant-attachments` module plus the internal `apps/attachment-worker` extraction worker, which is also not client-facing.

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
- automation-schedules
- messages
- openclaw
- agents
- assistant-attachments
- voice
- health
- security
- database
- common

### Frontend

- public
- auth
- dashboard
- automation-schedules
- users
- roles
- permissions
- audit
- organizations
- branches
- configuration
- assistant
- assistant voice output
- assistant attachments

### Mobile (Official Beta)

- auth (login, logout, me, refresh)
- home (dashboard)
- profile
- assistant text chat
- assistant chat attachments
- assistant voice input
- assistant voice output

Documented target capabilities, not implemented in mobile beta:

- none

Out of scope for mobile beta:

- users
- roles
- permissions
- audit
- organizations
- branches
- configuration

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
- attachments
- voice
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

## OpenClaw Assistant Messaging

Current implementation:

- `/messages` accepts authenticated web text messages.
- `/messages/tasks` accepts authenticated asynchronous assistant text-message tasks.
- `/messages/tasks/:id` returns task status and the assistant response when completed.
- `/voice/messages` accepts authenticated web/mobile audio, transcribes it, and creates an assistant text-message task.
- `/voice/speak` accepts authenticated web/mobile text, generates TTS audio, and returns an immediate audio blob response.
- `/sessions` lists authenticated assistant sessions with cursor pagination and a default page size of 10.
- `/sessions/:id/messages` returns the persisted message history for one owned assistant session.
- `/openclaw/events` accepts internal OpenClaw cron automation events protected by `OPENCLAW_EVENTS_API_KEY`.
- Socket.IO realtime events expose assistant message status for web and mobile clients.
- The endpoint requires `ASSISTANT_CHAT_USE`.
- User and assistant messages are stored in PostgreSQL.
- Conversations are stored in PostgreSQL.
- Public API uses `sessionId`; the current database implementation still uses `conversations` as the internal sessions table.
- OpenClaw request/response traces are stored in PostgreSQL through `openclaw_requests`.
- OpenClaw cron automation events are stored in PostgreSQL through `openclaw_events`, create assistant messages with `channel=automation`, and use one per-user session titled `Automatizaciones de Kyrae` in V1.
- The backend uses `AgentOrchestratorService` as the provider-neutral entrypoint and `OpenClawAgentProvider` as the OpenClaw adapter.
- `OPENCLAW_MODE=mock` returns a deterministic local response.
- `OPENCLAW_MODE=http` sends normalized requests to `POST {OPENCLAW_BASE_URL}/messages` and includes `Authorization: Bearer {OPENCLAW_API_KEY}` when configured.
- `apps/openclaw-http-adapter` exposes internal `GET /health` and `POST /messages`, wraps the external `openclaw agent` CLI, defaults to `OPENCLAW_HTTP_HOST=127.0.0.1`, and requires `OPENCLAW_HTTP_API_KEY` unless explicitly disabled for local development.
- `VOICE_STT_MODE=mock` returns a deterministic local transcription for development.
- `VOICE_STT_MODE=http` sends audio from the Kyrae backend to `POST {VOICE_STT_BASE_URL}/transcribe` with an internal bearer token from `VOICE_STT_API_KEY`.
- `apps/stt-gateway` exposes internal `POST /transcribe`, requires `STT_GATEWAY_API_KEY`, defaults to `HOST=127.0.0.1`, and currently supports `STT_PROVIDER=openai`.
- `VOICE_TTS_MODE=mock` returns deterministic local WAV audio for web/mobile voice output development.
- `VOICE_TTS_MODE=elevenlabs` sends text from the Kyrae backend to ElevenLabs and returns `audio/mpeg`.
- Web and mobile voice output use `ASSISTANT_VOICE_OUTPUT_USE` and play returned audio blobs locally.
- Mobile polls asynchronous assistant tasks, can show a local best-effort notification when a response completes while the app is not active, and loads assistant session history through a paginated bottom sheet.
- Mobile joins assistant sessions over Socket.IO when available and keeps polling as a fallback.

Not implemented:

- OpenClaw runtime inside this repository.
- WebSocket streaming from the Hermes runtime; Kyrae normalizes streaming into Socket.IO events.
- External messaging channels.
- Agent task execution beyond adapter request/response.
- Real push notifications through FCM/APNs for completed assistant tasks.

## Assistant Attachments

Current implementation:

- Web and mobile assistant chat accepts up to 5 original files per message, 20 MiB (20,971,520 bytes) each, 100 MiB (104,857,600 bytes) aggregate, with original filenames up to 255 bytes; limits are canonical in `packages/shared-contracts/src/attachments/attachment.contracts.ts` and enforced by the backend.
- Approved original formats: `pdf`, `docx` (documents); `jpg`, `jpeg`, `png`, `webp`, `heic`, `heif` (images); `xlsx`, `csv`, `tsv` (spreadsheets); `txt`, `md`, `json`, `xml`, `yaml`, `yml`, `toml`, `ini` and `env.example` filename patterns (text/config); textual logs and source code. `.env` files are explicitly rejected.
- Endpoints, all under `JwtAuthGuard`, `PermissionsGuard` and `ASSISTANT_CHAT_USE` with owner-scoped access:
  - `GET /messages/attachment-capabilities`
  - `POST /messages/upload-batches`
  - `GET /messages/upload-batches/:id`
  - `POST /messages/upload-batches/:id/files` (multipart/form-data)
  - `DELETE /messages/upload-batches/:id`
  - `DELETE /messages/upload-batches/:id/files/:attachmentId`
  - `GET /messages/attachments/:id`
  - `GET /messages/attachments/:id/content` (original bytes)
  - `GET /messages/attachments/:id/thumbnail`
- `POST /messages` and `POST /messages/tasks` accept optional additive `uploadBatchId`, `attachmentIds` (1–5 unique ids matching the batch) and `clientMessageId` (owner-scoped idempotency key). Attachment sends always create a durable assistant task and reuse task polling plus Socket.IO events; message/task/send responses expose additive `attachments`, `contextManifest` and output-accounting metadata.
- Upload staging uses a fixed 24-hour batch expiry; attached originals have no age expiry; the active upload lease is 10 minutes with a 300-second upload request maximum; delete waits 310 seconds after cancellation and orphan reconciliation uses a 48-hour grace.
- Originals and derivatives are flat UUID-keyed private filesystem objects; the backend resolves both under `ASSISTANT_ATTACHMENT_STORAGE_ROOT` per `apps/backend/src/assistant-attachments/PROTOCOL.md`, and streams originals/thumbnails with private no-store headers while auditing downloads.
- The agent layer serializes a `kyrae-attachment-envelope-v1` request: authoritative system policy plus a single current user turn with quoted history/attachment records, inline JPEG/PNG data-URL images (≤1 MiB each, ≤5 images, long edge ≤2,048 px), ≤9,000,000 serialized JSON bytes, ≤60,000 combined UTF-16 text units and ≤24,000 accounted input tokens. Raw responses are read incrementally up to 262,144 bytes with a 120-second deadline; valid answers above 16,000 UTF-16 units persist partial-output metadata; stale dispatching leases become indeterminate failures and never trigger automatic redispatch.
- `apps/attachment-worker` is the repository-owned Python extraction worker. It claims `kind='process'` jobs only from `assistant_attachment_jobs` with `FOR UPDATE SKIP LOCKED`, 60-second leases, 15-second heartbeats and generation fencing; parses PDF (text + OCR), DOCX/XLSX (stdlib zip+expat), text/config/log/source, and images (HEIC/HEIF→JPEG/PNG conversion, normalization, thumbnails); writes derivative objects before one fenced publish transaction; and makes no provider or network calls. The backend claims `dispatch`/`delete` jobs only.
- The compose `attachment-worker` service shares the private `attachments-storage` volume read/write with the backend and runs hardened: read-only root filesystem, tmpfs scratch, dropped capabilities, `no-new-privileges` and resource limits. Derivative keys are published flat inside `ASSISTANT_ATTACHMENT_STORAGE_ROOT`, matching `PROTOCOL.md`.
- Capability gating is live: `GET /messages/attachment-capabilities` composes the backend-private `ASSISTANT_MODEL_PROFILES_JSON` profile, `ASSISTANT_ATTACHMENT_WORKER_VALIDATED`, the storage root and provider identity into a sanitized projection with `available=false` and explicit `unavailableReasons` until all activation evidence flags are true. Default `.env.example` values keep the feature unavailable. On 2026-10-29 the operator activated G1 with a fresh authorized live budget of 12 requests (11 used, 1 reserved): model identity, inline image input, text/image accounting, policy, privacy and deployment were verified on the approved deployment (`apps/backend/test/g1-evidence.json`, harness `apps/backend/test/g1-model-capability-proof.cjs`, profile version `g1-2026-10-29`); the operator's private `.env` now carries the validated profile and resolves `available=true`. Distributed `.env.example` defaults remain `available=false`. Live Hermes attachment analysis is validated only for the probed raw chat-completions path; the full `kyrae-attachment-envelope-v1` round trip with real uploads, amd64 build (G2), device gallery parity (G3) and production deployment remain open gates.
- Audit events include `ASSISTANT_ATTACHMENTS_COMMITTED`, `ASSISTANT_ATTACHMENT_DOWNLOAD_STARTED/COMPLETED/ABORTED` and `ASSISTANT_ATTACHMENT_DISPATCH_FAILED`; audit metadata carries no file bytes, extracted text or provider payloads.
- Database tables (migration `1716090000000-add-assistant-attachments.ts`): `assistant_upload_batches`, `assistant_attachments`, `assistant_attachment_derivatives`, `assistant_attachment_jobs`, `assistant_message_submissions`, `assistant_message_contexts`.
- Recorded local evidence: worker 21/21 unit tests and 13/13 local e2e expectations (`apps/attachment-worker/README-worker-ops.md`); web attachment e2e suite `apps/frontend/e2e/assistant-attachments.spec.ts` via `apps/frontend/playwright.attachments.config.ts`; G1 live activation evidence `apps/backend/test/g1-evidence.json` (11/12 authorized requests used). Residual activation gates (amd64 build, device/gallery parity, envelope round trip with real uploads, full QA) remain open; no production deployment is claimed.

## Agent Providers and Executions

Current implementation:

- `AgentProviderFactory` resolves an explicit agent provider, then `DEFAULT_AGENT_PROVIDER`.
- Hermes is the default provider and supports CHAT SSE, RUN lifecycle, approvals, stop, steer, health, capabilities, skills, toolsets, and models.
- OpenClaw remains a secondary provider through the existing HTTP Adapter.
- `AgentExecution` and `AgentExecutionEvent` persist provider-neutral lifecycle state and normalized events.
- Existing OpenClaw conversations are migrated as `legacy-openclaw`; new conversations resolve Hermes by default.
- Typed attachment requests (`AgentChatMessage` content parts) are CHAT-only and Hermes-only: Hermes serializes them through `attachment-hermes.protocol.ts`, streaming and RUN lifecycles reject typed parts, and OpenClaw rejects typed parts with `ATTACHMENTS_UNSUPPORTED_PROVIDER`. Attachment dispatch is a backend pump (`AttachmentDispatcher`) that claims `dispatch` jobs and requires an activated attachment model profile.

Environment variables:

- `DEFAULT_AGENT_PROVIDER`
- `HERMES_BASE_URL`
- `HERMES_API_KEY`
- `HERMES_DEFAULT_MODEL`
- `HERMES_REQUEST_TIMEOUT_MS`

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

Automation schedules use:

- `AUTOMATION_READ`
- `AUTOMATION_CREATE`
- `AUTOMATION_UPDATE`
- `AUTOMATION_DELETE`

Audit currently exposes only:

- `AUDIT_READ`

Assistant currently exposes:

- `ASSISTANT_CHAT_USE`
- `ASSISTANT_VOICE_USE`
- `ASSISTANT_VOICE_OUTPUT_USE`

Assistant attachments reuse `ASSISTANT_CHAT_USE`; no new permission code is introduced.

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

### Automation Schedules

Current implementation:

- CRUD for automation schedule definitions
- Each schedule has: userId, automationKey, title, instruction, cronExpression, isActive, notifyMode, lastRunAt
- Permissions: `AUTOMATION_READ`, `AUTOMATION_CREATE`, `AUTOMATION_UPDATE`, `AUTOMATION_DELETE`
- Frontend UI in `/automation-schedules`
- `notifyMode` per schedule: `'always'` (default, notify always), `'on_content'` (only substantive content), `'silent'` (no notification)
- Backend-native cron (`AutomationCronService`) runs every minute via `@nestjs/schedule`
- `AutomationCronService` fetches active schedules, checks due schedules with `cron-parser`, calls `OpenClawService.sendMessage()`, persists results via `OpenClawEventsService.processScheduleExecution()`, and updates `lastRunAt`
- `send-event.js` is deprecated as the scheduler (kept for fallback); `OS cron` no longer required

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
- beta scope includes auth, home (dashboard), profile, assistant text chat, assistant voice input, assistant voice output, and assistant chat attachments
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
- `OPENCLAW_API_KEY`
- `OPENCLAW_EVENTS_API_KEY`

OpenClaw HTTP adapter variables:

- `OPENCLAW_HTTP_HOST`
- `OPENCLAW_HTTP_PORT`
- `OPENCLAW_HTTP_API_KEY`
- `OPENCLAW_HTTP_REQUIRE_API_KEY`
- `OPENCLAW_HTTP_MAX_BODY_BYTES`
- `OPENCLAW_HTTP_MAX_CONCURRENT_REQUESTS`
- `OPENCLAW_AGENT_NAME`
- `OPENCLAW_BIN`
- `OPENCLAW_AGENT_TIMEOUT_SECONDS`

Voice STT adapter variables:

- `VOICE_STT_MODE`
- `VOICE_STT_BASE_URL`
- `VOICE_STT_API_KEY`
- `VOICE_STT_TIMEOUT_MS`
- `VOICE_MAX_AUDIO_MB`

Voice TTS adapter variables:

- `VOICE_TTS_MODE`
- `VOICE_TTS_API_KEY`
- `VOICE_TTS_VOICE_ID`
- `VOICE_TTS_MODEL`
- `VOICE_TTS_TIMEOUT_MS`

STT gateway variables:

- `STT_PROVIDER`
- `HOST`
- `STT_GATEWAY_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_TRANSCRIPTION_MODEL`
- `OPENAI_TRANSCRIPTION_LANGUAGE`
- `OPENAI_TIMEOUT_MS`
- `STT_MAX_AUDIO_MB`

Assistant attachments variables:

- `ASSISTANT_ATTACHMENT_STORAGE_ROOT`
- `ASSISTANT_ATTACHMENT_WORKER_VALIDATED`
- `ASSISTANT_MODEL_PROFILES_JSON`

Attachment worker variables (docker-compose `attachment-worker` service; documented in `apps/attachment-worker/README-worker-ops.md`):

- `ASSISTANT_ATTACHMENT_STORAGE_ROOT`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`
- `WORKER_POLL_SECONDS`
- `WORKER_LEASE_SECONDS`
- `WORKER_HEARTBEAT_SECONDS`
- `WORKER_MAX_TRANSIENT_ATTEMPTS`
- `WORKER_JOB_DEADLINE_SECONDS`
- `WORKER_CPU_SECONDS`

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

Attachment worker:

- `docker build --target test -t kyrae-attachment-e2e:local apps/attachment-worker/`
- `apps/attachment-worker/tools/run_local_e2e.sh kyrae-attachment-e2e:local`
- `docker run --rm kyrae-attachment-e2e:local` (pure unit tests)

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
