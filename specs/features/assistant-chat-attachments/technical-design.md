# Technical Design: Assistant Chat Attachments

## Summary and Status

- Direct Hermes constraints revision: [direct-hermes-constraints-addendum.md](direct-hermes-constraints-addendum.md) is **User-approved** by the latest “apruebo”, explicitly confirmed in the current user instruction, which also authorizes Tech Lead task alignment. It supersedes conflicting baseline limits/gates. **T03 onward is AUTHORIZED in aligned dependency order**; residual G1–G3 evidence gates affected live activation/release. Live budget: **16/16 exhausted**; no further model call without later explicit user authorization.
- Classification: **New Feature**; workflow: `.sdd/workflows/new-feature.md`.
- Role: Architect, following `.sdd/agents/architect.md`; documentation only.
- Requirements: **User-approved**, as recorded in `feature-spec.md`, including its Business Rules and Functional Impact analysis.
- Technical design: **User-approved**. Approval evidence: the user replied **“apruebo”** to the design approval request after the design was produced and its key decisions were summarized. This records external approval, not agent self-approval.
- Task/test plans are aligned with the approved amendment; implementation is authorized, not completed or QA-accepted. Phase 0 evidence remains partial; see `implementation-report.md`. Live profiles stay truthfully unavailable until safe image/context accounting and required policy evidence are validated.
- Protocol revision: [protocol-addendum.md](protocol-addendum.md) remains **User-approved** by “si”. Use isolated per-turn runtime sessions and bounded Kyrae-rehydrated latest-user envelopes. Session/large-image controls passed; output-cap observation timed out. G1 remains open for activation/release under the approved constraints amendment.

Implement the approved staged private uploads, atomic attachment/message/task commitment, persistent originals, bounded derivatives and isolated worker. Typed CHAT/image paths may be implemented and tested offline now; live activation requires validated profile evidence. Keep web/Flutter parity and existing text/voice paths.

**Current execution boundary:** implement T03 contracts → migration/storage/upload/worker → serializer/context/messages → Angular → Flutter → packaging/QA under `task-plan.md`. The approved envelope replaces the failed structured-history assumption. Current modern arm64 libheif **1.23.7**/libde265 **1.1.3** native/security/actual-original HEIC proof passed with localized QA acceptance; modern amd64 build is not completed. Runtime, target-host/resource and physical-gallery proofs remain activation/release gates. A mock/discovery result is not full acceptance; none of these residual proofs is a blanket code blocker.

## Evidence and Existing Behavior

Mandatory startup sources reviewed: `.sdd/README.md`, `.sdd/memory/project-rules.md`, `.sdd/memory/architecture-decisions.md`, `.sdd/memory/coding-preferences.md`, `docs/system-context.md`, `docs/source-of-truth.md`, the New Feature workflow, Architect role, technical-design template, and this feature's approved requirements/Business Analyst section. Current executable sources override older memory statements about mobile and voice scope.

| Concern | Narrow repository evidence and implication |
| --- | --- |
| Contracts | `packages/shared-contracts/src/index.ts`, `openclaw/openclaw.contracts.ts`, `agents/agent.contracts.ts`, `voice/voice.contracts.ts`, `audit/audit.contracts.ts`: message commands/history have no typed attachments; `AgentChatMessage.content` is a string; capabilities are an untyped map. Generic metadata is not an image transport. |
| Sync/async messages | `apps/backend/src/messages/messages.controller.ts`, `messages.service.ts`, `dto/send-message.dto.ts`: both `/messages` and `/messages/tasks` create a conversation/message before calling the agent. Async work is launched using `void processMessageTask`, not a durable queue. Current saves are not one transaction. Message text is limited to 4,000 characters; trim-aware nonempty validation is needed for the proposed attachment policy. |
| History | `MessagesService.findSessionMessages` returns all persisted messages in ascending order; `getConversationMessages` maps the whole conversation to role/string pairs without token budgeting. Attachment-aware history must cover DTO mapping in sync, task polling, and session history, not only the composer. |
| Provider | `apps/backend/src/agents/hermes-agent.provider.ts`, `agent-orchestrator.service.ts`, `openclaw-agent.provider.ts`: Hermes forwards string messages to `/v1/chat/completions`, offers discovery GETs, and selects a model from agent configuration or `HERMES_DEFAULT_MODEL`. OpenClaw forwards only the last message string. No attachment or verified vision implementation exists in these paths. |
| Persistence | `messages/message.entity.ts`, `conversation.entity.ts`, `assistant-message-task.entity.ts`: PostgreSQL metadata, conversation owner, agent/provider attribution, and message/task identity exist. Messages cascade from conversations; filesystem objects do not participate in that cascade. |
| Multipart precedent | `apps/backend/src/voice/voice.controller.ts` uses guarded `FileInterceptor('audio')` with a byte limit; web `AssistantService` uses FormData and mobile `AssistantRemoteDataSource` uses Dio multipart. Reuse authentication and transport conventions, not in-memory audio buffering for five large files. |
| Authorization | `auth/guards/permissions.guard.ts` checks permissions on `request.user`; it is not evidence of immediate live database revocation. Existing message ownership helpers can return 403 for another owner. Proposed attachment lookup/revocation behavior below requires explicit centralized integration. |
| Deployment | `docker-compose.yml` exposes backend/frontend on loopback and uses an external network/database deployment; this file does not define a PostgreSQL service, private file volume, worker, Redis, or object store. Backend Dockerfile is Node 24 Alpine. Frontend Dockerfile generates Nginx `/api/` proxy config without explicit body-size or long-upload settings. Deployment prose is broader than this executable setup. |
| Web | `apps/frontend/package.json` uses Angular 22 and Tailwind 4. Assistant `services/assistant.service.ts`, `pages/assistant.component.html/.css` use existing async/sync/history/voice APIs, rounded white panels, blue/slate bubbles, responsive composer, and small wrapping styles. `src/styles.css` defines brand/blue tokens. |
| Mobile | `apps/mobile/pubspec.yaml` includes Dio, Riverpod, GoRouter, path_provider, record, just_audio, Socket.IO, and flutter_markdown; no document/photo picker or save/share plugin is listed. Assistant remote datasource, page, and message bubble provide task/history/voice flows and blue/slate rounded styling. |
| Wiring | Backend `src/app.module.ts` already has TypeORM, ScheduleModule, MessagesModule, AgentsModule, VoiceModule, AuditModule. Web `src/app/app.routes.ts` and mobile `lib/app/router/app_router.dart` already route `/assistant`; no new top-level route is needed. |

Relevant architecture/standards: `docs/architecture/agent-providers.md`, `authorization.md`, `audit.md`, `deployment.md`, and `docs/standards/shared-contracts.md`. Application AGENTS and Angular/NestJS skills supplement these boundaries.

External read-only research:

- <https://sharp.pixelplumbing.com/api-output/#heif>: HEVC HEIC support requires an appropriately built global libvips/libheif codec stack; installing default sharp binaries is not proof of HEIC support.
- <https://github.com/strukturag/libheif>: HEIC decoding uses libde265 by default; codecs may be built in or shipped as plugins; newer tools include `heif-dec` and `heif-info`. Decoder presence, plugin loading, security limits, and sample conversion must be verified in the actual release image. HEIF is a container and not a promise that every possible codec is installed.

These references establish a dependency approach, not that Kyrae currently ships it. No local environment/secrets were inspected or disclosed.

## Architecture and Boundaries

Proposed bounded context: assistant message attachments, not general document management or a public file API.

1. **Shared contracts first:** add HTTP-safe attachment lifecycle, outcome, coverage, and capability DTOs; extend message/history shapes additively; then update backend, Angular, and explicitly mapped Dart models.
2. **New backend `AssistantAttachmentsModule`:** guarded HTTP controller; owner access policy; batch/upload lifecycle service; storage interface; processing job repository; metadata/derivative mapping. It exports commitment and content-read services to MessagesModule, without importing MessagesModule back.
3. **MessagesModule:** owns atomic conversation/message/task commitment and per-message context manifests; uses one unit of work for both sync and async entrypoints. No controller database access.
4. **AgentsModule:** owns provider resolution, model capability validation, request serialization, model token/image accounting, and provider errors. It receives prepared typed content, not client-supplied URLs, paths, or storage keys.
5. **New attachment worker application/entrypoint:** proposed deployment unit, not existing infrastructure. It claims PostgreSQL processing jobs, executes bounded parsers/converters outside the API process, stores derivatives, and updates outcomes. No Redis/BullMQ dependency is required for V1.
6. **Clients:** select/upload/observe/send/download through Kyrae only. Originals and derivatives never become public, and provider/storage credentials never reach clients.

Keep IAM services reusable. Add a centralized assistant access policy for live user/permission resolution and owned-resource lookup, used by attachment operations and attachment-bearing task dispatch. Do not scatter fresh permission queries across controllers or alter unrelated IAM flows.

## Product Defaults — Approved Design, Not Yet Implemented

These design defaults resolve the earlier Business Analyst questions under the user's design approval. They are not evidence of implementation or successful dependency tests.

| Item | Proposed default |
| --- | --- |
| Instruction | Require nonempty trimmed instruction, retaining the 4,000-character message ceiling. Attachment-only submission awaits a separate product decision. |
| Limits | Five originals, each at most 20,971,520 bytes; combined original bytes at most 104,857,600 (100 MiB). The aggregate is exactly the sum of five maximum originals, not a smaller hidden cap. |
| Send readiness | All selected uploads must be `ready` (complete durable original, integrity/initial classification checked), before send. Ready does **not** mean extraction or model use succeeded. Upload failures block send; user retries or explicitly removes a failed selection. |
| Processing | Full extraction/OCR/conversion occurs after atomic commitment. File failures stay attached and downloadable. Mixed usable results may produce a qualified answer with structured omissions; never silently submit/use a subset. All unusable files produce a failed task with file outcomes and no fabricated analysis. |
| Reuse | A staged original can be committed once, to one user message, in its batch's target session. No cross-session or cross-message reassignment. Later turns access existing attachments through owned session history; no repeated upload required. |
| Retention | Attached originals, useful derivatives, and outcome metadata have the same lifetime as the conversation; no independent expiry. Archive does not delete files. No new session/message deletion UI is introduced. |
| Abandoned staging | Uncommitted batches expire 24 hours after creation, without sliding extension. Explicit cancel can release them earlier. Active upload/commit leases prevent mid-operation deletion; committed objects never match this cleanup rule. |
| Client interruption | Resume metadata/status polling while batch is valid; interrupted byte transfer restarts that file using its upload key (no resumable-chunk protocol). Session switching explicitly cancels the old draft/batch; do not silently carry files into another session. |
| Revocation | Recheck current permission/account status before upload finalization, commitment, processing dispatch, provider dispatch, and every metadata/content read. Stop queued work on revocation, keep already committed history private, and do not erase originals merely because permission was revoked. |

## Shared Contracts and HTTP API

### Contract layout

Propose `packages/shared-contracts/src/attachments/attachment.contracts.ts`, exported by `src/index.ts`, with corresponding additions to `openclaw/openclaw.contracts.ts` and `agents/agent.contracts.ts`. No streams, Buffers, ORM types, Nest decorators, Angular File objects, or environment settings belong in this package.

- `CreateAssistantUploadBatchCommand`: optional `sessionId` (omit for new session), `channel: 'web' | 'mobile'`, `clientBatchId` UUID. New-session batches are draft targets, not pre-created conversations.
- `AssistantUploadBatchDto`: opaque id, nullable target session, state, expiry, policy limits, attachment descriptors, capability snapshot/version. Resolve the existing session's agent or read the default agent for a new draft without creating chat state.
- `AssistantAttachmentDto`: id, batch id while staged, nullable message/session ids, original filename, original byte count, detected media type/category, lifecycle, processing state, safe error code/action, download availability, derivative availability, extraction coverage, timestamps/version. Never expose object keys, hashes usable as global dedup identifiers, absolute paths, raw text, or data URLs.
- Separate lifecycle (`uploading | ready | attached | deleting | expired`) and processing (`pending | processing | usable | partial | failed`). A valid stored original with failed extraction is still `attached` and downloadable. Invalid/rejected upload is not a message attachment.
- `AttachmentCoverageDto`: attachment id, processing version, source locators, known total units or explicit unknown total, included/omitted ranges, reason codes, extraction/context bytes/tokens, downscale/frame notices. Represent unavailable/unknown separately from zero.
- `AssistantContextManifestDto`: included attachment ids and ranges, excluded ids/reasons, model/capability version, history omissions, budget and actual accounting. Usage states distinguish prepared/delivered/provider-failed; delivered content is not proof the model attended to every part.
- Extend `SendAssistantMessageCommand` with optional `uploadBatchId`, ordered unique `attachmentIds` (1–5 when present), and `clientMessageId` UUID for attachment sends. Reject incomplete combinations, duplicates, mismatched aliases, mixed batch ids, or attachment ids without a batch. Preserve existing text-only requests.
- Add optional `attachments` on `AssistantMessageDto` and optional `contextManifest` on assistant/task results; old rows map to empty lists and old clients can ignore fields. Persist manifests to survive reload. Realtime can signal an update and clients refetch canonical task/history; no binary content in Socket.IO.
- Add typed `AgentContentPart` (`text`, `image`) and allow user `AgentChatMessage.content` to be string or typed parts. Serializable internal image part carries bounded MIME/base64 bytes and a source attachment id, never an arbitrary fetch URL. Keep system/assistant strings. All provider consumers must handle the union explicitly, especially OpenClaw; do not coerce it to a string.
- Add a normalized assistant attachment-capability DTO: provider, resolved model, verified text-context and image-input status, supported transport, image limits/token rules, context window, evidence/config version, and unavailable reason. Do not reinterpret the existing generic discovery map as this contract without an explicit adapter.

### Proposed endpoints

All routes use JWT plus `ASSISTANT_CHAT_USE`, current access policy, and owner-scoped queries. `/api` is the deployment proxy prefix, not a new Nest global prefix.

| Method/path | Semantics |
| --- | --- |
| `GET /messages/attachment-capabilities?sessionId=…` | Resolve owned session or default draft provider/model; expose sanitized availability/limits, no credentials or internal addresses. |
| `POST /messages/upload-batches` | Idempotently reserve an owner draft batch. Existing-session ownership and provider support checked before reservation. |
| `POST /messages/upload-batches/:id/files` | One multipart `file` and bounded `clientFileId` UUID field per request; stage immutable bytes. Client uploads at most two concurrently. Same owner/batch/file key replays the existing descriptor; a conflicting payload is 409. |
| `GET /messages/upload-batches/:id` | Poll durable upload states; includes no extracted text. |
| `DELETE /messages/upload-batches/:id/files/:attachmentId` | Cancel/remove an uncommitted selection; cannot remove an attached original. |
| `DELETE /messages/upload-batches/:id` | Cancel uncommitted batch, enqueue physical cleanup. |
| Existing `POST /messages/tasks` | Preferred attachment submission: JSON instruction + ready ids + batch + idempotency key; returns current task DTO after commitment. |
| Existing `POST /messages` | Same attachment validation/commit path; for attachment-bearing calls waits at most 25 seconds for the durable task, returns existing sync response on completion or 504 with safe task/session identifiers for polling. It never creates a second message on retry. Text-only sync behavior remains compatible. |
| `GET /messages/attachments/:id` | Owned descriptor for committed or staged file; authorized status polling. |
| `GET /messages/attachments/:id/content` | Stream original bytes with safe attachment disposition. |
| `GET /messages/attachments/:id/thumbnail` | Stream only generated JPEG/PNG thumbnail, not HTML/SVG/raw document rendering. Missing/not-ready derivative returns explicit safe status. |
| Existing task/history GETs | Return attachment descriptors and final context manifests consistently. |

One-file multipart requests deliberately avoid a single 100 MiB upload body. Backend batch reservations and final commit still enforce five files/100 MiB across requests; five exact-limit originals must succeed. No unadvertised user quota may prevent the acceptance fixture. Capacity exhaustion is a visible retryable operational error, not a smaller product file limit.

Error envelope proposal: stable `code`, safe message, retryable flag, owner-visible attachment/client-file id where known, and optional task id. Use 400 malformed/count violations, 413 actual byte overflow, 415 unrecognized/unsupported category, 409 not-ready/consumed/provider mismatch/idempotency conflict, 422 recognized but unusable content when surfaced synchronously, 429 bounded admission pressure, 503 dependencies/storage unavailable. Use 401 missing/invalid auth, 403 missing permission, and indistinguishable 404 for absent/foreign attachment or batch. File-specific processing failures normally live in persisted descriptors rather than causing a successful HTTP poll to fail.

### Multipart and proxy alignment

- New attachment interceptor/storage engine streams to a private temporary object, with guards before multipart processing. Do not reuse default memory storage for 20 MiB files or hold five buffers in the API heap.
- Per request: exactly one file, at most one bounded form field, 20 MiB file bytes inclusive, 21 MiB whole-body ceiling (22,020,096 bytes) including multipart overhead, field value at most 128 bytes, bounded headers/filename (255 UTF-8 bytes), and finite part/header counts. Reject unexpected fields and huge filename/header overhead explicitly.
- A streaming whole-body counter is mandatory even for chunked transfer and false/missing Content-Length; Multer fileSize alone is not a complete HTTP-body limit. Abort, unlink temporary bytes, release reservations on every limit/connection/error path. Express JSON limits do not control multipart.
- Set Nginx body ceiling to `21m` on the batch-files location; preserve trailing-slash path rewriting. Configure the outer ingress/proxy/CDN to at least the same per-request ceiling; a deployment with a lower hard limit cannot satisfy this feature. Set request buffering off for upload streaming, bounded header sizes, upload idle timeout 60 seconds and total upload deadline 300 seconds; align Node request timeout and client Dio/Angular cancellation deadlines. Nginx `client_body_timeout` is idle, not total: implement total deadline in the API.
- Keep JSON message payload small (64 KiB route ceiling); do not increase global JSON limits to carry originals. Backend-to-Hermes base64 derivatives use the separate actual serialized **9,000,000-byte** ceiling; establish any lower deployment limit explicitly, not a 16 MiB assumption.
- Test through the actual frontend Nginx and external ingress, not only direct backend calls. Preserve Socket.IO forwarding requirements in deployed ingress; attachment work must not assume an unevidenced WebSocket proxy is already configured.

## Staging, Atomic Association, and Recovery

1. Resolve target owner/provider/model and attachment support **before mutation**. For OpenClaw reject attachment batch creation or submission with `ATTACHMENTS_UNSUPPORTED_PROVIDER`; do not create a session, message, task, trace, or execution. Audit of a denial is allowed. Text-only chat stays available. If provider configuration changes after upload, recheck at send before consuming files.
2. Reserve a batch slot and declared bytes in a short PostgreSQL transaction with a batch row lock. Count uploading and ready files, not just completed uploads, preventing concurrent sixth-file and aggregate races. Actual streamed bytes, not client declarations, determine acceptance. Release/adjust reservations on failure.
3. Write an opaque temporary object, compute SHA-256 while streaming, sniff bounded signatures/content, then atomically finalize immutable storage. Mark `ready` only after durable storage confirmation and actual-byte validation. Detailed extraction can still fail after commitment. A failed metadata write leaves a recoverable orphan; a missing object can never be ready.
4. Send performs live authorization, trim/count/bytes validation, provider capability checks, and storage existence/integrity availability checks. Obtain idempotency lock by `(ownerId, clientMessageId)` and compare canonical request fingerprint. A timeout/retry returns the existing result, not a duplicate. Reject key reuse with different content/target/ids.
5. In **one TypeORM transaction**, lock batch and selected rows, verify ownership/readiness/expiry and exact selected set, lock existing owned conversation or create a new conversation with the preflight agent/provider snapshot, insert user message, attach all selected originals in order, create task plus durable processing/dispatch jobs, consume batch, update conversation and idempotency result. Require the selected set to equal the batch's ready set after explicit removals. No file is silently left out. No network/provider call or conversion inside this transaction.
6. Only after commit emit message/task/session events. Rollback leaves no new conversation, message, task, or attachment association; ready originals remain in staging for retry until expiry. Objects need no move on commitment, avoiding a false filesystem/database distributed transaction.
7. Worker processes each attached file and persists outcomes. Wait for every file's terminal processing outcome before constructing context. Persist qualified exclusions for partial failures; fail the task without model analysis if all files are unusable. For a photo requiring vision, OCR text alone never makes it usable for visible-content questions.
8. Model dispatch rechecks current access, capability version, job lease, and manifest. After dispatch a provider timeout is **indeterminate**, not safe to automatically repeat. Mark visible failure/unknown delivery; preserve originals and manifest. Explicit user retry can create another turn. Do not claim exactly-once external execution without runtime idempotency evidence.

New durable PostgreSQL jobs use `FOR UPDATE SKIP LOCKED`, finite attempts (proposed two for local processing transient failures), lease/heartbeat, attempt id and generation fencing. Claim polling is proposed every two seconds; leases 60 seconds with 15-second heartbeat. Stale attempts cannot publish derivatives/results after a replacement claim or cancellation. Recovery resumes unprocessed committed files after restart; a stale model-dispatch lease requires reconciliation/failure, not blind resend. Attachment-bearing tasks must not also enter the current fire-and-forget path. Existing text-only processing need not be broadly replaced by this feature.

Serialize attachment-bearing dispatch per conversation and bound history to the committed user-message cutoff. Do not leak later concurrently created turns into an earlier request or mix stream results between tasks.

## Private Persistent Storage and Database Design

### Storage interface

Propose injected `AttachmentStorage` backend/worker interface with bounded streaming `putTemporary`, `finalizeImmutable`, `stat`, `openRead`, `delete`, and bounded administrative reconciliation listing. Keys are server-generated opaque identifiers and derivative versions. No path constructed from original filenames; reject traversal, symlinks, overwrite, and keys outside configured roots. No cross-user deduplication or hash-based public identifiers.

V1 implementation proposal: persistent local filesystem mounted into backend and worker on a **single storage host**, not container writable layers and not temporary OS directories. Private original/derivative roots have restrictive ownership/modes. Write temporary bytes, fsync file, atomic rename on the same filesystem, and fsync containing directory before marking durable. Preserve original bytes exactly; database stores internal hash/size for integrity, while derivatives are separate objects. Never serve this directory with Nginx/static middleware. Disk encryption/backup protection is a deployment responsibility to document and validate, not existing repository infrastructure.

The interface permits a later private S3-compatible implementation, but this design introduces no bucket or presigned/public download URL. Multi-host replicas require a shared durable implementation and coordination proof before scaling; local mounts on different hosts are not equivalent storage.

### Proposed migration

Add a new timestamped migration under `apps/backend/src/database/migrations/` and matching TypeORM entities; no `synchronize`, permission seed, or binary database column.

| Table | Principal columns/constraints |
| --- | --- |
| `assistant_upload_batches` | UUID, owner FK, nullable target conversation FK, channel, agent/provider/capability snapshot, client batch id, lifecycle, reserved counts/bytes, expiry and timestamps; unique `(owner_id, client_batch_id)`; checks count 0–5 and bytes 0–104857600. |
| `assistant_attachments` | UUID, owner, batch FK, nullable committed message/conversation FKs, ordinal, client file id, bounded original filename, declared/detected types, actual byte length, SHA-256, private original key, lifecycle, processing status/version, sanitized error code, coverage jsonb, timestamps. Unique `(batch_id, client_file_id)`, unique original key, unique `(message_id, ordinal)` when committed; byte check 0–20971520; ordinal 0–4; commitment requires both message and conversation ids. Empty original is eligible for explicit empty-content processing outcome, not meaningful-content success. |
| `assistant_attachment_derivatives` | Attachment FK, processing version/kind (text segments, normalized image, thumbnail), private immutable key, byte size/hash, media type, dimensions, locator/coverage metadata; unique `(attachment_id, version, kind, part_index)`. No extracted content inline in public metadata. |
| `assistant_attachment_jobs` | Kind/attachment/task id, state, attempts, next-run time, lease owner/until, generation, safe error, timestamps; unique logical job key; partial index on runnable state/time and lease expiry. Includes explicit object-delete work. |
| `assistant_message_submissions` | Owner/client-message UUID unique, request fingerprint, committed message/task/session references and result kind for retry recovery. Retain with the conversation; expired uncommitted records follow batch cleanup. |
| `assistant_message_contexts` | User message/task, resolved model/profile version, immutable per-invocation coverage manifest, dispatch state and timestamps; no base64 image or duplicated document text. |

Index attachment owner/batch, message ordering, conversation/message lookups, and uncommitted lifecycle/expiry. Enforce owner and conversation consistency with composite references where practical (including message/conversation pair uniqueness), plus locked service validation. Database checks/FKs cannot enforce cross-row count/sum alone: reservation and commitment locks remain mandatory. No public filename uniqueness or storage-key exposure.

History mapping batch-loads descriptors for returned message ids, avoiding N+1 and excluding extracted text/image bytes. Existing rows require no backfill other than empty attachment mapping. History currently returns all messages; do not multiply that response with derivative payloads. Large-history pagination is a future concern, while provider context is bounded here.

Use restrictive FKs for attachment-bearing message/conversation deletion until the lifecycle deletion service has recorded durable delete jobs. Adapt any relevant user/conversation cascade path to preserve cleanup identifiers; do not cascade metadata away and lose storage keys. Proposed deletion lifecycle marks inaccessible, inserts deletion jobs transactionally, deletes originals/derivatives idempotently, then removes dependent metadata. No new delete endpoint is implied. Rollback is destructive if attachment tables are dropped: export/preserve objects and metadata first; disabling feature UI is the safe application rollback.

### Cleanup and retention

Scheduled cleanup can reuse Nest ScheduleModule but must acquire a PostgreSQL claim/lease, not assume one API instance. Every 15 minutes claim expired uncommitted batches under row locks; skip active leases/committed rows, mark deleting, and enqueue idempotent deletes. Crashed uploads release slots after a proposed 10-minute stale-upload lease plus object reconciliation. Reconciliation deletes unreferenced temporary/final objects only after a 48-hour safety grace and an authoritative database recheck; it never age-deletes committed originals. Log safe ids/counts only.

Retain attached originals on processing/provider failure and archive. Regenerable derivatives can be replaced by version, not by overwriting original objects. Back up PostgreSQL plus the persistent volume as one recoverable set, reconcile after restore, and test hash-identical recovery. Low disk/capacity returns visible admission errors before accepting bytes; measure capacity as at least 100 MiB original per maximum-size message plus bounded derivatives and backups, with no invented unlimited storage promise.

## Processing Matrix, Real Dependencies, and Finite Bounds

### Worker dependency proposal

Use a separate Debian-based Python 3.12 worker image rather than adding native document tooling to the Node Alpine API. Pin base-image digest and exact patched package/library versions in the future lock/build artifacts after the dependency proof gate. Proposed libraries/tools: Poppler (`pdfinfo`, `pdftotext -bbox-layout`, `pdftoppm`), Tesseract with English and Spanish trained data, Pillow with JPEG/PNG/WebP support, `python-docx`/lxml, `openpyxl`, `defusedxml`, Python `csv`/`codecs`/`zipfile`, and libheif tools plus libde265. These are real proposed dependencies, none evidenced in the current backend package.

For HEIC/HEIF, build a pinned patched libheif with **libde265 decoding explicitly enabled and linked in** (`WITH_LIBDE265=ON`, plugin choice explicitly fixed), and install `heif-dec`/`heif-info` plus JPEG/PNG output support. Disable unused encoders/codecs/experimental features; x265 HEVC encoding is unnecessary because output is JPEG/PNG. Copy required shared libraries into runtime, verify loader dependencies on amd64 and arm64, retain libheif security limits, and decode real iPhone HEVC fixtures. A pinned distro package is acceptable only if it passes the same decoder/linkage/security proof; do not assume `libheif` presence means its HEVC plugin shipped. HEIF files using other codecs produce an explicit codec error until codec coverage is approved/proven. No sharp-default-build fallback is proposed.

Worker parsing never runs uploaded code, macros, formulas, document scripts, external relationships, linked images, URLs, shell fragments, or language package installation. Invoke tools using argument arrays with fixed options and opaque paths, never a shell string derived from a filename. OOXML/XML parsers disable network, DTD/entity expansion, and external resource resolution.

### Format routes

| Approved input | Proposed extraction/conversion and visible limits |
| --- | --- |
| PDF | Check signature/parser/encryption first. Enumerate page count, extract text and bounding boxes per page. Render each inspected page at bounded resolution to find image/scanned regions; OCR pages with empty/sparse text and raster regions on mixed pages. Merge OCR with selectable text by bounding-box overlap and preserve page/region provenance. This must detect scanned portions even when another region/page contains selectable text; a whole-document nonempty-text test is insufficient. Blank/unreadable pages remain explicit. Password protection/corruption produces file-specific failure, not empty success. |
| DOCX | Validate ZIP/OOXML content types, then python-docx/lxml iteration in document order for paragraphs/tables, headings and section/header/footer parts. Traverse supported text-bearing XML for footnotes/endnotes/text boxes; record section/paragraph/table locators rather than fictional stable page numbers. Report unsupported embedded objects, equations, charts, or image-only content; never claim these were read. Extracted text is not HTML rendering. |
| XLSX | Validate OOXML; openpyxl read-only iteration with explicit sheet/row/cell limits, not trusting enormous declared dimensions. Include sheet names, coordinates, values, types, formulas as literal text and cached values if present (separate data-only read); never calculate formulas or fetch links. Mark hidden sheet inclusion explicitly; proposed default includes hidden sheets as labeled content. Charts, embedded objects, absent formula caches, and omitted ranges are disclosed. |
| CSV/TSV | Python csv streaming, explicit comma/tab dialect with bounded quoted fields/rows/columns; preserve row/column locators. CSV is data, never spreadsheet-executed content. |
| TXT/MD/JSON/XML/YAML/YML/TOML/INI | Strict text decoding and line-preserving extraction; malformed syntax can be analyzed as text with a parse warning, not silently discarded. No YAML object construction or XML entity expansion. Source locators are line ranges. |
| `env.example` | Accept basename `env.example`, `.env.example`, and names ending `.env.example` (proposed compound-pattern interpretation); reject plain `.env` rather than treating it as an extensionless source file. No secrets inspection service or content logging is introduced. |
| Logs/source code | Design-approved broad matrix: textual `.log`, `.out`, `.err`, numbered/date log variants, and `.js/.jsx/.ts/.tsx/.mjs/.cjs/.py/.dart/.java/.kt/.kts/.swift/.c/.h/.cpp/.hpp/.cs/.go/.rs/.rb/.php/.sh/.bash/.zsh/.ps1/.sql/.html/.css/.scss/.vue/.svelte/.r/.R/.lua/.pl/.ex/.exs/.erl/.scala/.groovy/.gradle/.bat/.cmd/.proto/.graphql/.gql/.ipynb`; extensionless Dockerfile/Makefile/Jenkinsfile and shebang scripts. Additional unknown extensions/names can be explicitly classified as textual source/log after strict decoding and a user category choice; do not narrow the approved categories to this example list. No execution or notebook cell execution. Binary/mislabeled content is rejected. This matrix was accepted with the design; no repeat business approval is required. |
| JPG/JPEG/PNG/WebP | Pillow verifies/decompresses in sandbox, applies orientation and sRGB conversion, produces bounded JPEG/PNG model derivative plus thumbnail with metadata stripped. OCR is an optional supplementary text channel; visible-content understanding still requires real image-input model support. |
| HEIC/HEIF | libheif/libde265 decodes the primary image, then the same orientation/color/resize pipeline. Preserve original byte-for-byte. Additional image items/sequence frames are enumerated when possible and visibly marked omitted under proposed primary-image policy; never imply whole sequence analysis. Test portrait/rotation, 8/10-bit and HDR-to-SDR behavior; tone-map/derivative limitations are visible. |

Design-approved text encoding matrix: UTF-8 (with/without BOM), ASCII subset, UTF-16 LE/BE with BOM. Reject undecodable bytes with an actionable encoding error; do not guess legacy encodings or use replacement characters to imply successful decoding. Windows-1252 and BOM-less UTF-16 are explicit untested coverage, not additional business-approval prerequisites. Bound/control NULs except validated UTF-16 and treat unsafe control-heavy content as unrecognized. Extensions/MIME are hints; verify actual suitability. A text file named `.jpg` is not a valid photo.

### Resource and Coverage Defaults — Approved Design, Validation Pending

| Resource | Finite default and behavior |
| --- | --- |
| Jobs | One active parser job per worker, two workers maximum initially; one pending processing set per user admitted at a time with retryable backpressure, without reducing message/file eligibility. |
| Container | Each worker: 2 CPU, 2 GiB memory, 64 PIDs; parser child ceiling 1 GiB address space and one process group. Validate actual fixtures against these design-approved limits before closing the worker proof gate. |
| Time | 120-second per-file wall deadline, 60-second CPU budget, OCR at most 15 seconds per page within that file deadline. Kill entire child process group; preserve completed segments and mark remaining ranges/timeouts. |
| Scratch/output | 512 MiB scratch per worker, at most 256 MiB expanded OOXML data and 10,000 ZIP entries; compression ratio over 100:1 or actual expansion overflow fails safely. Streaming checks enforce actual expansion, not only ZIP headers. Text derivative at most 2 MiB UTF-8 per original. |
| PDF | Inspect/extract first 100 pages, render/OCR first 20 pages requiring raster analysis; 150 DPI maximum, reduced further to at most 8 megapixels/page. Report all omitted pages/regions and unknown totals if enumeration fails. Mixed-page image-region algorithm needs fixture proof. |
| XLSX/tabular | First 20 sheets, 10,000 rows/sheet, 100 columns and 100,000 visited nonempty cells/file total; 64 KiB field/cell text ceiling, with truncation locator. Stop before exceeding any bound and report actual visited extent and omitted/unknown range. |
| Images | Header-checked maximum decoded input 50 megapixels/16,384 pixels per side; decoder limits remain enabled. Larger image yields explicit processing-limit failure while retaining original. Model derivative at most 2,048 pixels long edge and 1 MiB encoded, thumbnail 320 pixels and 128 KiB. Preserve aspect ratio; no silent crop. Disclose resize/detail loss and primary-frame selection. |

Limits control processing, not original upload eligibility. A 20 MiB original remains attachable/downloadable even if processing is partial or fails. Reaching a bound never yields unqualified `usable/full`. Empty extraction has its own code. English+Spanish OCR defaults are accepted with the design; other languages remain explicit untested coverage, without another business-approval prerequisite for this implementation.

### Isolation and deployment footprint

Propose a new worker Dockerfile/application, durable PostgreSQL job polling, and explicit private persistent/scratch mounts in Compose. API remains lightweight Node Alpine. The worker coordinator alone receives narrowly scoped database credentials and access to relevant stored objects; parser children receive only a per-job scratch copy and allowlisted environment, no provider/JWT/database secrets.

Run parsers under a separate lower-privilege UID in a filesystem sandbox exposing only runtime tools and that job directory, using namespaces/rlimits/seccomp to deny network/ptrace and coordinator `/proc`, other jobs and persistent roots. The arm64 proof launcher exists; production coordinator integration and target-host acceptance remain pending. Worker container uses read-only root, restricted mounts, no public port/Docker socket, bounded scratch, no-new-privileges and coordinator DB-only network. No privileged workaround: target-host failure blocks affected deployment; revise the design only if required remediation changes its approved isolation policy. It does not block application implementation against the proven arm64 stack.

Container image/build feasibility is a gate: namespace/seccomp support, codec binaries and linking, native library patch versions, tool licensing/distribution, OCR trained-data size, UTF/font handling, amd64/arm64 behavior, and actual RSS/time must be measured. Expect a materially larger worker image (planning estimate hundreds of MiB, **unmeasured**), not a dependency-free addition to the current image. No GPU or local vision model is proposed. CPU/OCR load scales separately from API; document image size, RAM/disk reservation, language packs and security update procedure with measured release evidence. Native local development can use an equivalent isolated Linux worker; host macOS tools alone do not verify production codecs/sandboxing.

## Model Capabilities, Multimodal Delivery, and History Budgets

### Capability gate and provider compatibility

Introduce proposed backend-only model profile configuration (validated schema, e.g. `ASSISTANT_MODEL_PROFILES_JSON` or a mounted configuration file): exact provider/model id, `imageInputVerified` default false, transport (`inline-data-url` only if proven), maximum images/bytes/dimensions, context-window size, tokenizer or proven conservative estimator, image-token accounting, and validation evidence/version. Resolve the exact model from agent configuration then Hermes default; do not infer vision from model name, provider name, or health success.

Discovery from existing Hermes `/v1/models` and `/v1/capabilities` can corroborate the explicit profile. Unknown/ambiguous/contradictory capability is unavailable, not optimistic true. Expose the selected sanitized profile to clients. Health/readiness distinguishes text chat availability from attachment/vision availability. No automatic provider/model fallback or silent model switch is approved.

**Required activation/release external-runtime gate:** retain evidenced schema/session/PNG results and validate remaining live profile, safe image/context accounting, policy/privacy and grounding, including converted images, before activation/full release. Record runtime/model evidence level accurately; pinned-main source is not installed-source attestation. No more model calls are authorized under the exhausted 16/16 budget. Offline development proceeds with deterministic profiles/mocks; unknown image costs keep the live profile unavailable. A different runtime/model/adapter requires revised approval. OCR-only handling does not meet R3.

V1 proposal: **all OpenClaw attachment submissions unsupported**, including documents, because its adapter only forwards the last string and has no approved attachment/history protocol. Reject before conversation/message/task/trace/execution mutation, even if extraction could theoretically be appended to text. Apply the same guard inside provider dispatch as defense in depth. Existing text-only OpenClaw calls remain unchanged. Existing RUN endpoints do not gain attachments through this CHAT feature.

### Private byte transport

After owner/permission checks the backend reads normalized JPEG/PNG derivatives, not originals or client URLs, creates bounded base64 content parts in memory for that one request, and has the Hermes adapter serialize to the **verified** runtime schema. The candidate is OpenAI-compatible `text` and `image_url` parts with `data:image/jpeg;base64,…` values; this is a proposal, not an assertion that the current Hermes deployment accepts it. Never send backend download endpoints that require a user's JWT, filesystem paths, public/presigned URLs, arbitrary URLs, original HEIC, or storage credentials to the model.

Maximum current-turn images remain five ≤1 MiB derivatives. Enforce actual complete UTF-8 JSON ≤**9,000,000 bytes** before dispatch, plus each text part and combined normalized text/trusted system sections ≤**60,000 JavaScript UTF-16 units**, including wrappers/escaped records/locators/current instruction. Reject malformed surrogates; select/truncate at source boundaries before serialization and persist visible omissions. Any established lower deployment cap applies explicitly. Do not silently drop the fifth image. Originals remain five ×20 MiB/100 MiB aggregate; upload bodies remain 21 MiB. Redact base64/content-bearing echoes/tool arguments from telemetry; persist safe provenance/manifests, not serialized private context.

### Context builder and finite budgets

Add one attachment-aware context builder used by sync and async messaging, replacing unbounded history mapping for attachment-context turns. It reads persisted original associations and versioned segments on later turns; provider session memory is not the source of truth. Bind each invocation to a history cutoff and processing versions for reproducibility. No vector database/RAG service or automatic lossy summaries are assumed.

Keep **24,000 tokens as the Kyrae-supplied-input budget**, using verified tokenizer or documented conservative estimate with evidence-backed safe image costs, not byte-length image tokens. The baseline 32,768-context target, 4,096 output reserve and 4,672 safety reserve are planning assumptions, not guaranteed total Hermes internal context. Preserve input allocation (2,000 policy/manifest, 2,000 instruction, 4,000 history, 16,000 attachments/images); count all envelope overhead and enforce the combined text/serialized bounds. Unknown image/context estimates keep the live profile unavailable while development continues.

The approved backend answer guard is **4,096 tokens only with a verified serving-model tokenizer**, otherwise **16,000 UTF-16 text units**, cut at valid Unicode boundaries and labeled with accounting mode. The fallback is not a 4,096-token guarantee. Incrementally cap the raw response envelope at **256 KiB** and enforce an absolute **120-second** connection-through-full-body deadline, keeping cancellation active after headers. Valid bounded answers shortened by the guard persist **`partialOutput: true`**, a stable reason and visible partial-answer notice through task/history and both clients; contracts express these semantics first. Invalid/incomplete/oversize raw JSON fails unless a validated incremental decoder already produced safe usable content; raw fragments are never complete answers. Only supported/evidenced output parameters may be sent. These guards do **not** cap Hermes internal generation, tools, compute or cost; closing the connection does not prove remote cancellation. Indeterminate dispatch is never automatically retried.

Budget all parts together, not each file independently. Use the approved single latest-user envelope and fresh opaque runtime session per actual dispatch, with authoritative system policy separate and quoted history treated as untrusted provenance. Kyrae retains logical history; no fallback to retained runtime memory or another provider. Fresh headers do not establish global privacy/state erasure; required policy/privacy/state evidence remains an activation/release gate.

Selection proposal:

1. Keep policy and current instruction; reject visibly if mandatory content alone exceeds the profile budget.
2. Include new attachments first. Divide their available context budget fairly in upload order, then redistribute unused shares; cap each original at 8,000 text tokens. Reserve image costs before text allocation. Five-image acceptance requires the chosen profile to fit all five, not silently drop the fifth.
3. Select text segments in deterministic source order, keeping locators; no implied semantic search. Budget-limited files get explicit page/line/sheet/row omissions. A question about an omitted section cannot be represented as answered from that section; advise narrowing the file/question. Do not generate an automatic summary of unread content.
4. Include recent earlier attachment segments/images from this same owned session only if budget remains; rehydrate from private stored derivatives, not old data URLs. Earlier files remain listed with explicit context-excluded reasons when absent. Current-turn comparisons take precedence over unrelated old files.
5. Fit recent completed text history within 4,000 tokens; retain chronological order after selection and disclose omitted earlier turns. A text-only follow-up in a session with attachments still uses this builder. Store a per-turn manifest separately from extraction coverage: a file may be fully extracted yet only partially sent.
6. Before dispatch persist exact included/omitted locators and delivery status. Show a coverage panel on both clients independent of the model's prose, and instruct answers to cite filename/attachment id and source locator. Do not rely on the model to disclose omissions correctly. On provider failure, label the attempt failed rather than files successfully analyzed.

## Authorization, Downloads, and Audit

Every batch, descriptor, content, thumbnail, cancel, association, history inclusion, and processing/provider dispatch operation uses current `ASSISTANT_CHAT_USE` plus owner checks. A batch for a new session belongs to its uploader; an attached object must additionally match its owned message/conversation. Admin/organization/branch/auditor roles introduce no read override. Revalidate after long uploads before finalization and before dispatch; abort/unpublish if access changed. Already returned bytes cannot be recalled; revocation checks apply at read start and periodically to long streams, with best-effort cancellation rather than a false recall guarantee.

Downloads stream originals with safe UTF-8 `Content-Disposition: attachment`, sanitized fallback filename, content length, `X-Content-Type-Options: nosniff`, and `Cache-Control: private, no-store`; previews use only safe raster derivatives with the same access/cache checks. HTML/source/XML is never rendered inline. No bearer tokens in query strings, anchor URLs, image source URLs, or share links. Extend CORS exposed headers for safe download filename/length if web accesses a distinct API origin; current CORS config does not expose Content-Disposition.

- Angular: authenticated HttpClient GET as Blob through existing auth interceptor, create a temporary object URL for thumbnail/download, and revoke on unload/session change/logout/completion. Lazy-load thumbnails with bounded concurrency, no permanent browser cache or localStorage content.
- Flutter: authenticated Dio streaming GET to a temporary app-private path, then explicit native save/share action. Do not open a backend URL in an external browser that lacks the bearer header. Sanitize destination filename, clean temporary derivatives/downloads after completion/logout, and show save/cancel failures separately from backend download success. Retry after refresh by recreating consumed multipart/file streams; no blind replay of FormData or duplicate messages.

Proposed new audit action constants (not currently defined): `ASSISTANT_ATTACHMENT_UPLOADED`, `ASSISTANT_ATTACHMENTS_COMMITTED`, `ASSISTANT_ATTACHMENT_DOWNLOADED`, `ASSISTANT_ATTACHMENT_PROCESSING_FAILED`, `ASSISTANT_ATTACHMENT_REMOVED`; reuse `AUTHORIZATION_PERMISSION_DENIED` for permission denial and add `ASSISTANT_ATTACHMENT_ACCESS_DENIED` for owner mismatch if approved. Resource type proposal `assistant_attachment`/`assistant_upload_batch`, compatible with current string-capable audit API. Safe metadata allowlist: resource/task/session ids, operation, outcome, sanitized reason code, bytes count, processing version, and correlation id. No filenames, file bytes, hashes, extracted/OCR text, prompt/answer, base64, content-bearing provider errors, or credentials. Distinguish download started/completed/aborted; don't audit completion merely because headers were written. Audit read permission never grants file-content access.

Exact audit mapping, new constants and live-permission policy are covered by the recorded user approval of this design; they are not implied to exist today. Implementation and security validation remain pending.

## Frontend Design

Applies: Angular assistant feature only; retain `/assistant`, centralized permission handling, existing template-driven message form, Signals and service boundary. No new execution UI or unrelated form rewrite.

- Extend `AssistantService` or a focused `AssistantAttachmentsService` under `features/assistant/services` for batch/create/upload/poll/cancel/thumbnail/download and capability calls. Models import canonical shared types. API calls never move into components.
- Add standalone file-based `attachment-picker`, `attachment-list` and `attachment-coverage` components under `components/`, each with separate TS/HTML/CSS. Local selected files and transfer progress are client state, not shared HTTP contracts. Use XHR-backed HttpClient upload events where actual byte progress is required; if fetch transport is configured, show truthful indeterminate upload state rather than fake percentages.
- Multi-select file input plus keyboard-operable attach/remove controls; optional drag/drop feeds the same validation. Explicitly flag extra files and size overflow, never silently slice to five. Keep originals unmodified in browser; HEIC preview uses server derivative after commitment, with icon/filename fallback while pending.
- Composer holds draft and selected files until commit acknowledgement; disables send while any file is uploading/not ready or instruction is blank. Extraction then shows processing cards in the committed user bubble; partial/failed cards retain original download. Maintain idempotency key on ambiguous response and recover task state.
- Preserve white rounded cards, blue user bubbles, slate assistant bubbles, brand/blue tokens and wrapping/scroll patterns. Attachment chips wrap in narrow layouts; long filenames truncate visually with accessible full label, while size/state/action remain readable. No new palette or global styling overhaul.
- Provide named buttons, focus return after removal, per-file live status/error text, non-color-only states, accessible coverage summary and download feedback. Reconcile task/realtime updates by message/attachment id, and fetch history after reconnect. Do not interpret an optimistic card as committed history.
- Keep voice input/output behavior. Proposed V1 disallows sending voice and file draft together with an explicit composer explanation; existing independent voice workflow remains usable and cannot silently consume/discard staged files. Combined composition requires product confirmation.

## Mobile Design

Applies: current Flutter assistant beta; retain GoRouter route and clean data/domain/presentation layers. Map TypeScript wire contracts explicitly in Dart with parity fixtures; do not import TypeScript or duplicate backend authorization logic.

- Extend remote datasource/repository/domain models for batches, descriptors, coverage, downloads and optional command fields. Riverpod controller owns staged selections, two-transfer concurrency, cancellation, polling, stable retry keys and history reconciliation. Existing Socket.IO/polling fallback and best-effort response notifications remain.
- Proposed new Flutter dependencies: `file_picker` for original document/source selection, `image_picker` for explicit gallery selection with original/full metadata options, and `file_selector` for native save destination where supported; `share_plus` for Android/iOS native save/share of downloaded originals. Reuse Dio/path_provider for upload/download streams and temporary paths. Pin platform-compatible versions and update iOS/Android declarations only during approved implementation.
- **Native original-byte acceptance gate:** implement and then verify physical iPhone gallery behavior; OS/plugin APIs may transcode HEIC. Never resize/relabel converted bytes as originals. If needed, implement the already-designed native original-resource bridge/picker solution; validate gallery selection/upload/download integrity before claiming parity. Files-only evidence is insufficient. Device acceptance gates release, not writing the prototype; no repeat approval for this existing design. Server conversion cannot recover client-lost originals.
- Present attach action opening Files/Photos choice, wrapping file cards above composer, remove/retry state, per-file upload state and committed processing state; preserve `AppColors`, slate50 page, blue600 user bubbles, white/slate assistant cards, 18px radii, SafeArea and keyboard behavior. Keep attachment cards within available width rather than expanding the existing 310px message bubble offscreen.
- Stream from local file path rather than loading 100 MiB into Dart memory. Persist only safe draft ids in app-private storage if restoring an interrupted draft is implemented; tokens remain in secure storage. On restart retrieve committed history and batch state; inaccessible picker temp paths require reselect, not false upload success.
- Authenticated thumbnail bytes use bounded in-memory/app-private cache cleared on logout/session change, never unauthenticated Image.network URL assumptions. Native save/share cancellation is visible and does not change server retention. Test files with leading dots, compound filenames, non-ASCII names, HEIC and maximum original sizes on both platforms.

## Configuration and Deployment Changes Proposed for Later Implementation

All new names below are proposed and must be documented in `.env.example`/worker examples and validated at startup; none was read from local secrets.

- `ASSISTANT_ATTACHMENT_STORAGE_DRIVER=filesystem`, `ASSISTANT_ATTACHMENT_STORAGE_ROOT`, `ASSISTANT_ATTACHMENT_STAGING_TTL_HOURS=24`, `ASSISTANT_ATTACHMENT_UPLOAD_TIMEOUT_MS=300000`.
- `ASSISTANT_ATTACHMENT_WORKER_CONCURRENCY=1`, processing deadlines/lease/poll settings, OCR languages and documented processing budgets; cannot silently reduce approved five/20 MiB/100 MiB upload coverage.
- `ASSISTANT_MODEL_PROFILES_JSON` (or approved mounted equivalent), with verified model/vision/transport/token settings; provider secrets remain in existing backend-only settings.
- New worker image, sandbox launcher/dependencies, bounded scratch and persistent private volume; backend/migration image packaging for new entities/contracts; independent worker readiness checks for Poppler, Tesseract languages, Pillow features, libheif HEVC decode, storage and jobs.
- New route-specific frontend Nginx/outer proxy byte/deadline configuration; backup/restore, orphan reconciliation, capacity alerting, worker crash recovery and migration rollout procedure.

Readiness must make missing OCR/conversion/vision dependencies visible without pretending formats are supported. Roll out schema and persistent storage before clients; old clients remain text-capable. Attachment UI availability is controlled by truthful capability response; disabling the feature is not completion of the approved attachment/photo scope.

Future documentation impact after implementation: update `docs/system-context.md`, `docs/source-of-truth.md`, architecture overview/provider/deployment/audit/shared-contracts docs, API/Scalar documentation, worker runbook and application dependency docs. Do not rewrite current-state summaries to describe this proposal as shipped.

## Testing Design and Requirement Traceability

This is validation design for Tech Lead/QA, not an executed test report.

| Requirements | Required evidence |
| --- | --- |
| R1 / BR2, BR3 | Five exact-20-MiB originals (100 MiB) through web, mobile and real proxy; reject one-byte overflow, sixth/concurrent sixth file, chunked oversize, deceptive Content-Length, huge fields/headers, disconnects; upload/send recovery and no silent subset. |
| R2 | Representative valid fixture for every named extension, compound env pattern, confirmed encoding/source/log matrix; MIME spoof, invalid signatures, binary source, malformed OOXML, ZIP expansion, path traversal, external relationships and empty content. |
| R3 | Selectable/scanned/mixed-region PDFs including text plus embedded scan on the same page; DOCX paragraphs/tables/notes; XLSX formulas/caches/hidden sheets/limits; CSV quoted fields; real JPEG/PNG/WebP/HEIC/HEIF conversions. Photo understanding must pass the external model gate and grounded multi-image comparisons, not mocks or OCR-only answers. |
| R4 | Hash-identical original downloads after processing failures, HEIC conversion, reload/restart/cross-client access, backend/container restart and backup restore; missing objects show explicit error. Verify archive preservation and eventual deletion bookkeeping without losing keys. |
| R5 | Corrupt/encrypted/empty/undecodable files, failed/absent codec/OCR, sandbox OOM/timeouts, worker kills/restarts, storage write failure, unavailable model and provider timeout; precise file outcomes and incomplete comparisons. |
| R6 | Per-file/combined extraction and token bounds, image-token accounting, old attachment follow-ups, deterministic locators, history cutoff/omissions, no cumulative Hermes-memory overflow; manifest survives history reload. |
| R7 / BR1, BR5 | 401/403/foreign-id 404 for every metadata/content/thumbnail/cancel/associate/history path, foreign batch/session swaps, revoked permission during upload/queue/stream, admin/auditor isolation, no public paths/tokens, safe filenames and cache/CORS behavior; content-free audits/logs/traces. |
| Atomicity | Transaction failure after each insert, new-session rollback, simultaneous sends/cleanup races, idempotency after lost acknowledgement, storage/DB crash boundaries, stale lease fencing, no double dispatcher and no automatic duplicate provider attempt. |
| BR6 | Existing sync and async text chat, OpenClaw text-only, voice transcription/output, history ordering, realtime/polling and notifications remain functional. OpenClaw attachment rejection leaves no chat mutation. |

Later checks: shared-contract compilation, backend lint/build/focused unit and PostgreSQL e2e tests, worker parser/sandbox/container integration suite, frontend build plus behavior/e2e tests, `flutter analyze` and `flutter test`, physical Android/iPhone and external-runtime acceptance. Exact commands must follow repository scripts; database provisioning must reflect actual Compose configuration rather than assuming this Compose file contains PostgreSQL. No production tests/builds are necessary for this documentation-only artifact.

## Risks, Tradeoffs, and Approval Gates

| Gate | Current status / activation and release boundary |
| --- | --- |
| User architecture approval | **Approved by the user's “apruebo” response.** Defaults and architecture are accepted for task planning; runtime/dependency proof remains outstanding. |
| Hermes vision and runtime history | **G1 open for affected live activation/full release; implementation authorized.** Approved direct constraints replace the 12/16 MiB and runtime-output guarantees. Keep unknown live image/context profile unavailable. Sixteen/sixteen calls consumed; further calls need later explicit user authority. |
| Worker and HEIC deployability | **G2 partial; implementation authorized on modern arm64 stack.** libheif 1.23.7/libde265 1.1.3 native/security/actual-HEIC proof passed with localized QA acceptance. Modern amd64 build not completed; target-host/resource/broader native acceptance gates affected deployment/full release. |
| Native input/coverage | **G3 open for device/full-format release acceptance.** Accepted design matrix needs no repeat business approval; untested encodings/languages explicit. Physical gallery/upload/download integrity and Android checks follow implementation. |
| Security/access policy | Centralized assistant policy and owner-only revocation semantics are design-approved; tests must validate the behavior, including claims-only guard integration. |
| Retention/deletion operations | Same-conversation lifetime and deletion bookkeeping are design-approved; cascade/cleanup and backup recovery validation remain pending. |
| Storage hosting | Single-host persistent private filesystem is design-approved; measured capacity/backups remain deployment evidence, and multi-host/object storage needs a revised design. |
| Tech Lead / QA | Design approval precedes task/test-plan preparation; task approval precedes Developer changes; external proofs require separately authorized execution. No self-approval or successful acceptance claim is made here. |

Tradeoffs: staging adds HTTP round trips but enables byte-progress, pre-send validation and atomic association without a 100 MiB multipart message; PostgreSQL jobs avoid inventing Redis but require leases/reconciliation; local private storage is simple but constrains scaling; OCR/native tools require a heavier independently maintained worker; deterministic bounded context is auditable but may omit relevant content, so persistent locators/manifests and visible qualification are essential. These tradeoffs do not waive any approved format, client, original-preservation or photo-understanding acceptance requirement.
