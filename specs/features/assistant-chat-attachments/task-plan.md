# Task Plan: Assistant Chat Attachments

## Objective and Status

Convert the approved requirements and technical design into bounded Developer work for durable, secure attachment chat on web and Flutter, including scanned OCR, HEIC/HEIF, and genuine photo understanding.

- Classification/workflow: **New Feature**, `.sdd/workflows/new-feature.md`.
- Authoring role: Tech Lead, `.sdd/agents/tech-lead.md`; documentation only.
- **Implementation task plan status: User-approved.** The user replied **“apruebo”** to the implementation-plan approval request, explicitly including tests with nonsensitive synthetic files against the configured Hermes service. This records user authority; it is not agent self-approval.
- Requirements and technical design: externally user-approved by the recorded **“apruebo”** evidence; see their approval sections.
- Amendment/task alignment: **User-approved and AUTHORIZED** by the user's latest “apruebo” for `direct-hermes-constraints-addendum.md` and current explicit instruction to align tasks. **T03 onward may proceed in dependency order now**; G1–G3 residual proof gates affected live activation/release, not all code. Validation: **Partial feasibility checks executed; see `implementation-report.md`**. Full-feature QA decision: **Pending**.
- Implementation status (2026-10-28): **T03–T12 implemented and their offline validations executed; T13 QA evidence partially executed** (backend e2e suite plus two real product-bug fixes). G1–G3 live/native/device activation-release gates remain open. See `implementation-report.md` for deliverable/test evidence.
- Backend, frontend, mobile, shared contracts, database, deployment and documentation: all apply. Only the Developer implements code; QA validates independently.

## Preconditions and Gates

| Gate | Required evidence / authority | Blocks |
| --- | --- | --- |
| G0 — Task approval | **Approved:** baseline plan plus latest “apruebo” for the constraints amendment and explicit task-alignment authority | Closed; T03 onward authorized in dependency order |
| G1 — Runtime proof | T00/T08: remaining live profile, safe image/context accounting, policy/privacy/grounding and bounded response behavior; 16/16 calls consumed | Affected live profile activation/full release; mock/discovery GET cannot close it. Does not block offline implementation |
| G2 — Worker/native proof | T01/T07: current libheif 1.23.7/libde265 1.1.3 arm64 proof and actual HEIC pass; modern amd64 build not completed; target-host isolation/resources remain | Affected deployment architecture activation/full release, not application implementation on proven modern arm64 stack |
| G3 — Coverage/native input | T02/T11: design-approved source/log/encoding/OCR matrix accepted; untested encodings explicit; physical iPhone gallery original retention and Android parity pending | Device/full-format release acceptance, not contracts/worker/UI implementation; no silent narrowing |
| G4 — Release acceptance | All required checks in `test-plan.md`, restore/proxy/device/live evidence and QA decision | Completion/release claim |

Current Phase 0 results: T00 exhausted sixteen/sixteen approved attempts. Session controls and five 1 MiB PNGs passed; output-cap observation timed out after 90 seconds without retry. The strict shape case remains failed without proving transport incompatibility. Pinned upstream source, not attested deployed source, reports 10,000,000 bytes/65,536 Python characters and no evidenced HTTP token-cap forwarding. The **user-approved** `direct-hermes-constraints-addendum.md` corrects the bounds and authorizes implementation with remaining acceptance at activation/release. Modern arm64 libheif 1.23.7/libde265 1.1.3 native/security/actual-HEIC proof passed and is locally QA-qualified; modern amd64 build is not completed, and target-host/gallery retention remains open. No more model calls without later explicit user authorization; compilation/mocks/offline tests can proceed.

The size/option findings above apply to the pinned reviewed upstream source. Its identity with the deployed 0.21.2 code is not established; do not describe those constants as measured deployed limits.

Shared-contract and database impact: **Reviewed: Yes**, per approved design and contracts/scripts. Implementation/migration validation remains pending. Approval accepts architecture, not runtime capability. A genuinely different protocol/model/codec/sandbox/resource policy requires revised approval for the affected change; selecting/implementing the already-designed original-resource bridge is not a new approval gate. Do not turn unavailable capability into omitted scope or stop unrelated authorized work for residual activation/release evidence.

## Execution Order and Milestones

| Milestone | Tasks / dependency | Exit evidence |
| --- | --- | --- |
| M0 — Feasibility evidence | T00–T02 partial evidence retained; remaining proofs alongside implementation; no live budget remains | Record residual G1–G3 activation/release evidence; not a blanket M1 dependency |
| M1 — Contracts | T03 after G0 and approved constraints/task alignment (**satisfied**) | Canonical wire types compile; all consumers of changed unions identified |
| M2 — Durable ingestion | T04 → T05 → T06 → T07 after T03 | Migration, immutable storage, secure upload and worker recovery proven |
| M3 — Grounded chat | T08 → T09 after M2 | Verified provider serialization, atomic tasks, bounded context and history |
| M4 — Web | T10 after M3 | Web composition/history/download/coverage behavior verified |
| M5 — Mobile | T11 after M4; physical evidence follows the prototype | Flutter implementation/automated parity checks; pending device evidence tracked for release |
| M6 — Deploy and QA | T12 → T13 after M5; packaging/tests authorized, activation gated by remaining G1–G3 | Proxy/resource/restore/device/live evidence, current-state docs and independent QA acceptance |

Each task includes focused tests; T13 consolidates acceptance. Authorized order is contracts → migration/storage/worker → provider/context/messages → frontend → mobile → deployment/docs and QA. Residual proof runs alongside/after the implementation needed to exercise it. Packaging authorization is not live activation or release acceptance.

## Tasks

Paths below are repository-relative. New paths are planned, not claims of existing files. T00–T02 have partial evidence; T03–T12 are **implemented** and T13 is **partially executed** (independent QA decision still pending). Per-task status: **T03 done** (contracts + build), **T04 done** (migration six tables), **T05 done** (filesystem storage), **T06 done** (9 controller endpoints + multipart staging), **T07 done** (worker, 21/21 unit + 13/13 local e2e), **T08 done** (envelope/output guards/capability gating), **T09 done** (submission/dispatch/history), **T10 done** (web UI, e2e 2 passing), **T11 done** (web mobile parity code; physical gallery proof pending), **T12 partially done** (compose volume, ops README done; amd64 build, worker seccomp finalization, nginx proxy path NOT done), **T13 partially executed** (backend e2e 9/9; QA decision pending). Activation/release gates G1–G3 remain open. Developer owns code; QA owns its independent decision. Validation case IDs refer to `test-plan.md`.

### Phase 0 — Existing Proof and Remaining Activation/Release Evidence

**T00 — Establish external Hermes/model protocol and photo proof**

- Depends: G0 plus explicit authorization naming the live environment/model, nonsensitive fixtures and request/cost scope. Do not send new authenticated network/model requests during this documentation stage.
- Files/evidence: `implementation-report.md` proof ledger; future `apps/backend/test/fixtures/attachments/` fixture manifest and isolated runtime proof harness under `apps/backend/test/` only if approved. No secrets, base64, raw provider echoes or private photos in reports.
- Work: retain actual results and source/deployment distinction; validate the approved isolated current-turn envelope and amended 9,000,000-byte/60,000 combined UTF-16-unit guards, supplied-input accounting, safe image costs and backend output/deadline behavior. No unsupported runtime token/cost guarantee. No live allowance remains.
- Acceptance/validation: Q00 grounding, converted-image delivery, privacy/policy and live-profile evidence remain G1 activation/release requirements. Discovery/mocks support implementation, not live acceptance. A different runtime/model/adapter still requires revised approval.

**T01 — Prove worker, OCR, codecs and rootless isolation**

- Depends: G0; no external model calls. Files: proposed `apps/attachment-worker/Dockerfile`, pinned dependency lock/build files, `src/` proof coordinator/parser launcher and `tests/` nonsensitive fixtures/harness; evidence in `implementation-report.md`.
- Work: build actual Debian/Python 3.12 release candidates for amd64 and arm64. Prove Poppler, Tesseract English/Spanish, Pillow JPEG/PNG/WebP, DOCX/XML and XLSX tooling, patched libheif/libde265 with HEVC decode explicitly linked/enabled and required runtime libraries. Verify `heif-info`/`heif-dec`, loader/plugin behavior, codec limits, orientation/8–10-bit/HDR-to-SDR and real iPhone HEIC/HEIF conversion. Record exact patched versions, licensing/distribution and trained data.
- Prove mixed-page PDF OCR (selectable text beside a scanned region), not just empty-document OCR. Prove namespaces/seccomp/UID/rlimits on target host without privileged deployment; child cannot network, read coordinator `/proc`, persistent roots, secrets or other jobs.
- Acceptance/validation: Q01/Q04/Q07/Q13; measure image size, RSS, CPU/wall time, scratch/output within approved bounds. Reuse current proof entrypoints/evidence accurately; record actual production harness commands when created. A failed proof blocks affected activation/acceptance; obtain revised approval only if remediation changes the approved design, not for an in-scope fix. Do not disable OCR/HEIC scope.

**T02 — Freeze fixtures and prove native original input**

- Depends: G0 (satisfied); physical input checks follow T11 prototype. Files: fixture manifests under backend/worker tests and `apps/mobile/test/features/assistant/`; report evidence. Approved-design plugin/native paths: `apps/mobile/pubspec.yaml`, `pubspec.lock`, `ios/Runner/Info.plist`, `ios/Runner/` original-resource bridge if needed under the existing design, and Android declarations as needed.
- Work: enumerate every Q02 format/name/encoding fixture and broad source/log categories under the accepted design matrix; no additional business approval is needed for that matrix or English+Spanish OCR defaults. Track untested legacy encodings/languages explicitly without claiming support. Evaluate/pin the design-selected picker/save/share packages.
- Acceptance/validation: Q02/Q11 on a **physical iPhone gallery** after T11 prototype: establish an independently exported original HEIC resource hash and compare selected/uploaded/downloaded bytes/name/container. No resize/quality conversion. Simulator, relabeled JPEG or Files-only cannot prove gallery retention. If plugin transcodes, implement the design-selected original-resource bridge/picker solution and validate it before claiming parity; no repeat approval for that existing design. Record HEIF/Android checks too.

### Shared Contracts

**T03 — Define canonical additive attachment contracts**

- Depends: G0 and approved constraints/task alignment (**satisfied; start now**), not closure of G1–G3. Files: new `packages/shared-contracts/src/attachments/attachment.contracts.ts`; `src/index.ts`, `src/openclaw/openclaw.contracts.ts`, `src/agents/agent.contracts.ts` within that package.
- Work: batch/idempotency commands, lifecycle versus processing outcome, sanitized errors, capability snapshot/version, source locators/unknown totals, extraction coverage, prepared/delivered/failed context manifests and additive history/task fields. Include the amendment-approved `partialOutput`, stable partial reason and accounting-mode/provenance semantics before backend/client integration, without introducing new API design. Define ordered unique 1–5 ids with batch/client-message key requirements and alias compatibility. Typed user text/image parts must be explicitly handled by every CHAT/RUN consumer; system/assistant stay strings. No framework, storage keys, raw extraction, secrets or client File objects.
- Acceptance/validation: Q03; shared package build, backend/frontend compilation at consumer-integration milestones, Dart parity fixtures in T11. Old text-only requests/rows remain valid; no string coercion of image parts.

### Database and Storage

**T04 — Add migration, entities and restrictive lifecycle references**

- Depends: T03. Files: new `apps/backend/src/database/migrations/<timestamp>-add-assistant-attachments.ts`; six matching entities in new `apps/backend/src/assistant-attachments/` for batches, attachments, derivatives, jobs, submissions and contexts; `src/database/data-source.ts`, runtime TypeORM registration, `src/messages/message.entity.ts`, `conversation.entity.ts`, relevant user/conversation deletion services.
- Work: implement the approved table checks, unique idempotency/logical-job keys, runnable/expiry indexes, owner/session/message consistency and ordinal constraints. Record durable deletion jobs before deleting references; prevent cascade loss of object keys. No binary columns, permission seeds or synchronize changes.
- Acceptance/validation: Q05 on a fresh isolated PostgreSQL database and populated legacy-chat snapshot: migrate/revert/reapply, constraints/FKs, legacy empty attachment mapping, seed compatibility and rollback backup. Do not assume the root DB helper provisions PostgreSQL.

**T05 — Implement immutable private storage and recovery lifecycle**

- Depends: T04. Files: new `src/assistant-attachments/attachment-storage.ts`, `filesystem-attachment-storage.service.ts`, `attachment-cleanup.service.ts`, `attachment-reconciliation.service.ts` and focused specs under backend; worker storage adapter later in T07.
- Work: bounded temporary streaming, SHA-256/size, file fsync → same-filesystem rename → directory fsync, opaque keys, restrictive modes, no symlink/traversal/overwrite/public serving. Ready requires durable original. Retain attached originals through failure/archive for conversation lifetime; abandoned staging expires at fixed 24 hours. Cleanup every 15 minutes uses database claim/lease, skips active operations; stale upload lease 10 minutes, orphan grace 48 hours plus authoritative recheck. Idempotent deletes preserve bookkeeping until completion.
- Acceptance/validation: Q06/Q08/Q13: crashes at each storage/DB boundary, ENOSPC/missing object, immutable hash-identical originals, committed-file cleanup exclusion and paired DB/volume restore. No cross-user hash deduplication.

### Backend Ingestion, Worker and Chat

**T06 — Implement centralized access, staging and authenticated streams**

- Depends: T05; T00 residual proof does not block implementation. Files: new `src/assistant-attachments/assistant-attachments.module.ts`, controller/service/DTOs, `assistant-access-policy.service.ts`, streaming multipart engine, audit mapping; `src/app.module.ts`, `src/main.ts` CORS/header integration; existing centralized auth/audit integration points. Expose live-profile unavailability truthfully until validated.
- Work: all approved capability/batch/file/status/cancel/original/thumbnail routes. JWT/permission checks before bytes; fresh account/permission resolution and owner lookup at finalization/commit/read/dispatch. Lock batch reservations including uploading rows; actual counts/bytes, duplicate keys/conflicting payloads, cancellation and lease release. Enforce one file/one bounded field, inclusive 20 MiB originals, 21 MiB body including chunked requests, 128-byte field, 255 UTF-8-byte filename and bounded headers/parts; abort/unlink on limits/disconnect/deadline. Two client transfers never bypass backend limits.
- Serve original bytes only with safe attachment disposition, nosniff, private/no-store; safe raster thumbnail only. No token URLs/public paths. Audit the design's upload/commit/download/deny/failure/removal actions with allowed safe metadata; distinguish started/completed/aborted download. Periodic long-stream revocation checks are best effort, not byte recall.
- Acceptance/validation: Q03/Q06/Q09/Q12; 401/403/indistinguishable foreign/absent 404, admin/auditor isolation, live revocation and secret/content-free telemetry. OpenClaw rejection occurs before chat mutation. Five exact-limit originals remain eligible.

**T07 — Complete durable worker processing and fenced jobs**

- Depends: T06 and current T01 modern arm64 libheif 1.23.7/libde265 1.1.3 proof (available). Modern amd64/target-host acceptance gates deployment, not writing this worker. Files: `apps/attachment-worker/src/{coordinator,storage,job_runner,sandbox,parsers}/` and `tests/`; backend `src/assistant-attachments/attachment-jobs.service.ts`, job repository and worker protocol/schema documentation.
- Work: PostgreSQL `FOR UPDATE SKIP LOCKED`, 2-second polling, 60-second lease/15-second heartbeat, finite two local transient attempts, attempt/generation fencing, terminal outcome persistence and immutable versioned derivatives. Implement every approved format route, including same-page mixed OCR, DOCX ancillary text, XLSX hidden sheets/formulas/caches and broad strictly decoded source/log text. Do not execute content, resolve external resources or evaluate formulas. Separate coordinator credentials from sandbox children.
- Enforce all design resource/coverage bounds (Q07 table); meaningful empty/partial/failed results and exact locators/unknown totals. OCR alone cannot make a general photo question usable. Recovery resumes committed work; stale jobs cannot publish after replacement/cancel/revocation. No attachment task may also run in fire-and-forget processing.
- Acceptance/validation: Q02/Q04/Q07/Q08 with real parsers/codecs in release images, worker kill/OOM/timeout, concurrency and fenced PostgreSQL updates. Keep original download available after all processing failures.

**T08 — Integrate verified provider profile and bounded context**

- Depends: T07; G1 closure is required for affected live activation, not implementation/mock tests. Files: `src/agents/hermes-agent.provider.ts`, `openclaw-agent.provider.ts`, `agent-orchestrator.service.ts`, new model-profile/capability service; new `src/messages/assistant-context-builder.service.ts`; execution/event/trace persistence redaction points.
- Work: activate only evidenced exact model/profile/version, serialize private normalized image bytes using proven schema; no client URLs/original HEIC. Block unknown image costs/capability contradictions and all OpenClaw attachments; preserve text-only and RUN behavior. Build deterministic new-first/fair-share context with image reservation, 8,000 text tokens/file, source-order segments, old owned attachments/follow-ups and chronological recent text. Bind committed-message cutoff and processing versions; serialize attachment dispatch per conversation.
- Enforce 24,000 Kyrae-supplied input tokens with the approved planning reserves/allocation; do not promise complete Hermes internal-context bounds. Use the approved isolated per-dispatch current-turn envelope. Enforce actual serialized UTF-8 JSON ≤9,000,000 bytes and all combined normalized text/trusted system sections ≤60,000 JavaScript UTF-16 units, including wrappers/escaping/locators/instruction; select at source boundaries before serialization. Five ≤1 MiB image derivatives must fit with evidenced safe image costs; otherwise keep the live profile explicitly unavailable, never silently omit the fifth image. Enforce visible output ≤4,096 tokens only with a verified serving-model tokenizer, else ≤16,000 UTF-16 units at valid Unicode boundaries; raw response ≤256 KiB incrementally and absolute 120-second deadline through full body. Persist `partialOutput`/reason/accounting provenance and visible notices; malformed/oversize raw fragments are not complete answers. No internal Hermes generation/compute/cost guarantee and no automatic retry after indeterminate dispatch. Persist exact prepared/delivered/failed manifests and redact content-bearing telemetry.
- Acceptance/validation: Q00/Q10; mocked unit tests prove selection/redaction/serialization boundaries, real authorized image/model tests prove grounding and runtime memory behavior. No silent fallback or reduced budget/profile.

**T09 — Commit and dispatch attachments through sync/async/history**

- Depends: T08. Files: `src/messages/messages.service.ts`, `messages.controller.ts`, `messages.module.ts`, `dto/send-message.dto.ts`, `assistant-message-task.entity.ts`, `messages.gateway.ts`; new submission unit-of-work/dispatcher services; backend `test/assistant-attachments*.e2e-spec.ts`.
- Work: one transaction for locked exact-ready-set association, conversation/message/task/jobs, consumed batch and fingerprinted `(owner, clientMessageId)` result. Validate trimmed nonempty instruction ≤4,000 characters and alias consistency. No provider/conversion call inside transaction; emit only after commit. Retry returns same task/session; conflict returns 409. Wait for every file outcome; partial answers name exclusions; all unusable fails without analysis.
- Same path for `/messages/tasks` and `/messages`; sync waits at most 25 seconds, returns completion or safe 504 task/session identifiers for polling. Recheck access/profile/lease before provider dispatch; indeterminate timeout/stale dispatch requires reconciliation/failure, never blind resend. Batch-map descriptors/manifests in sync/task/history and reconnect; no binary realtime payloads or N+1 extraction reads.
- Acceptance/validation: Q05/Q08/Q10/Q14 including concurrent sends, rollback at each write, lost acknowledgement, cleanup/commit race, history cutoff, no double dispatch and text/voice compatibility.

### Frontend

**T10 — Deliver Angular composer, outcomes and durable history UX**

- Depends: T09. Files: `apps/frontend/src/app/features/assistant/services/assistant.service.ts`, new `assistant-attachments.service.ts`, `models/`, `pages/assistant.component.ts/.html/.css`; new standalone `components/attachment-picker/`, `attachment-list/`, `attachment-coverage/` complete TS/HTML/CSS sets; focused specs and `apps/frontend/e2e/assistant-attachments.spec.ts`.
- Work: canonical contract imports, two-transfer concurrency, filename/size/remove/retry, exact count/size feedback, stable retry keys, poll/cancel/session switch, truthful progress, ready-only send and commit acknowledgement. Display terminal failures/coverage/source usage and retain original download for partial/failed files; no optimistic success. Owned Blob downloads/rasters use auth interceptor and revoked temporary URLs. HEIC fallback label until derivative; never browser-transcode original.
- Preserve Signals/service boundaries, existing palette/layout, keyboard/focus/live status and narrow-screen wrapping. Explain voice/file-draft incompatibility without losing files; preserve independent STT/TTS/realtime/polling/history.
- Acceptance/validation: Q11/Q12/Q14; frontend build, unit behavior tests and Playwright; real proxy/backend flow separately from mocked UI tests.

### Mobile

**T11 — Deliver Flutter attachment parity and original save/share**

- Depends: T10; implement original-preserving native input now, then execute T02 physical proof against it. Device proof gates activation/release acceptance, not this prototype. Files under `apps/mobile/lib/features/assistant/`: `data/datasources/assistant_remote_datasource.dart`, `data/models/assistant_message_model.dart`, new attachment models, `data/repositories/assistant_repository_impl.dart`, `domain/entities/`, `domain/repositories/assistant_repository.dart`, attachment use cases, `presentation/providers/assistant_provider.dart`, `presentation/pages/assistant_page.dart`, `presentation/widgets/assistant_message_bubble.dart` and new attachment/coverage widgets; `lib/core/` auth replay integration as needed; approved `pubspec.yaml`/lock/platform declarations and focused `test/` files.
- Work: explicitly map wire fixtures, Files/Photos input, two streaming transfers, recreated multipart streams after token refresh, stable submission ids, cancel/status recovery and no 100 MiB Dart buffer. Authenticated thumbnails and app-private streaming downloads followed by explicit save/share; safe names and temporary cleanup on completion/logout. Preserve Riverpod layering, styles, SafeArea, keyboard, status notifications and polling/realtime reconciliation. Restart reloads canonical history; missing picker temp bytes asks for reselect.
- Acceptance/validation: Q03/Q11/Q12/Q14; `flutter analyze`, `flutter test`, physical Android and iPhone selection, gallery original HEIC hash retention and original save/share. Native cancel/error is distinct from server success; no external unauthenticated download URL.

### Deployment, Documentation and QA

**T12 — Package rollout, proxy alignment, resources and runbooks**

- Depends: T11; uses earlier worker proof artifacts. Files: `docker-compose.yml`, `infra/docker/backend/Dockerfile`, `infra/docker/frontend/Dockerfile`, worker Dockerfile/config examples, `apps/backend/.env.example`, new worker `.env.example`; `docs/system-context.md`, `docs/source-of-truth.md`, `docs/architecture/` overview/agent-providers/deployment/audit/shared-contracts docs, new worker operations runbook and Scalar DTO annotations. Outer ingress changes are an explicitly coordinated deployment responsibility outside repository evidence.
- Work: schema/storage before backend-worker/client activation; private same-host persistent mount, read-only worker root/bounded scratch, no published worker port/Docker socket/privilege, DB-only coordinator network. Startup validation and truthful capability/readiness; pinned builds and documented updates. Backend model profile remains backend-only.
- Route-specific Nginx `21m`, no upload buffering, correct `/api/` rewrite, bounded headers, 60-second upload idle/300-second API total deadline, small 64 KiB message JSON; outer upload ingress at least the same ceiling. Runtime path must support the selected ≤9,000,000-byte serialized requests (apply any established lower deployment cap explicitly); no 16 MiB runtime assumption. Validate the independent 120-second full-body invocation deadline and 256 KiB raw response guard. Preserve Socket.IO forwarding. Document measured resources, paired backup/restore, leases, cleanup and rollback. G1–G3 residual proofs gate activation/full release, not packaging work.
- Acceptance/validation: Q12/Q13; actual proxy/ingress and resource-limited release images, five exact-limit originals on both clients, restart/restore, no public file route. Update current-state docs only for implemented/evidenced behavior; list every canonical contract area from actual source.

**T13 — QA acceptance and implementation evidence**

- Depends: T12 and all task validations. Owner: QA for independent decision; Developer fixes approved-scope defects.
- Files: `implementation-report.md`, this plan's task statuses and `test-plan.md` evidence/decision sections; relevant test suites from each task.
- Work: execute required checks below, link each Q case and R1–R7/BR1–BR6 outcome to actual evidence, record versions/commands/environment, failures, resource observations and residual risks. Repeat only checks affected by fixes. Live tests still need separate authorization; no fabricated dates, pass status or approval.
- Acceptance: G4 only closes when QA accepts the full scope and user gates are satisfied; missing physical/native/model/DB/proxy evidence remains a release blocker, not a waived test.

## Validation Commands and Environment Prerequisites

Inspected sources: root/app package scripts, `packages/shared-contracts/package.json`, `apps/backend/test/jest-e2e.json`, `apps/backend/src/database/data-source.ts`, Flutter pubspec, frontend Playwright config, Compose and frontend Dockerfile; testing/shared-contract/security/database standards. Use Node/pnpm versions from root config and Flutter SDK compatible with pubspec.

- Contracts: `pnpm --filter @kyrae/shared-contracts build` (actual `tsc` script); backend/frontend builds validate consumers. Shared-contract `lint` currently uses `--fix`; it is not a read-only documentation check.
- Backend: `pnpm backend:lint`, `pnpm backend:build`, focused Jest unit tests via `pnpm --dir apps/backend test --runInBand --testPathPatterns='assistant-attachments|messages|agents|voice'`; `pnpm backend:test:e2e --runInBand` with isolated database plus focused new PostgreSQL attachment suite. Verify selected tests actually exist/run after implementation.
- Database: with explicitly injected isolated test DB settings, `pnpm --dir apps/backend migration:run`, `migration:revert`, then `migration:run`; verify legacy seed compatibility with `pnpm --dir apps/backend seed` only in disposable test DB. Production-style migration packaging must also be exercised.
- **Provisioning blocker (resolved for e2e):** root `docker:db` executes `docker compose up -d postgres`, but current Compose defines no `postgres` service; it expects external `kyrae-postgres`, external network and `SERVER_ROOT` secret file. The new `apps/backend/test/assistant-attachments.e2e-spec.ts` resolves this for its own suite via explicitly injected ephemeral `postgres:18` settings (`KYRAE_ATTACH_E2E_DB_*` env helper contract, suite skips when unset). Do not run seed/revert against deployment data or claim `pnpm docker:db` provides general DB provisioning.
- Frontend: `pnpm frontend:build`, `pnpm frontend:test --watch=false`, `pnpm frontend:e2e`. Current Playwright starts Angular dev server on localhost:4200, Chromium only; it does not provision backend, Nginx, external ingress or real model. T12 must supply a separate explicit proxy acceptance environment/runner.
- Mobile from `apps/mobile`: `flutter analyze`, `flutter test`; physical-device/gallery/save-share checks are additional evidence.
- Worker/container/proxy/native/live: current proof-only worker harness/build entrypoints and results are recorded in `implementation-report.md` and the worker README/evidence. Production coordinator/proxy/release runners remain to be implemented; record their actual commands/digests/targets before claiming a pass. Unit mocks cannot substitute for release-native/device/live acceptance.

## Rollback and Stop Conditions

- Before rollout, preserve PostgreSQL metadata and private originals/derivatives as a consistent recoverable set; rehearse restore and hashes. Keep old text-only clients compatible.
- Preferred application rollback: disable new attachment admission/UI truthfully, fence/drain workers and uncertain provider dispatch, deploy compatible previous application while retaining attachment schema, metadata and objects. Preserve authorized history/download access via a compatible service; do not strand originals by dropping tables or volumes.
- Migration down is destructive for attachment metadata; rehearse only in disposable DB, export/preserve data first in any real rollback and require an approved recovery procedure. Never use volume deletion or age-cleanup of committed originals as rollback. Reconciliation checks authoritative references before deletion.
- Stop affected unsafe operations/activation on failed isolation/resource/proxy/byte-integrity/access checks or unknown dispatch state; never automatically resend an indeterminate call. Residual G1–G3 evidence alone does not stop authorized implementation/offline tests. Stop for genuinely changed architecture/product scope or unresolved contract/cascade decisions, recording evidence and seeking revised approval only for that change. The accepted source/log/encoding/OCR matrix needs no repeat business approval. No execution board or unrelated module is included.
