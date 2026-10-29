# Test Plan: Assistant Chat Attachments

## Objective and Status

Validate the complete approved attachment experience without confusing mocked logic, native processing, real model understanding or deployment proof.

- Role/workflow: Tech Lead, New Feature. Companion implementation plan: `task-plan.md` (**User-approved**, including synthetic live Hermes tests).
- Test plan: **Aligned with the user-approved direct-Hermes constraints amendment and explicit task-alignment instruction**. **T03 onward AUTHORIZED in dependency order**; residual G1–G3 proofs gate affected activation/full release, not offline code/tests. Execution: **Partial Phase 0 checks executed; see `implementation-report.md`**. Full-feature QA: **Pending**; the suite has not passed.
- Scope: backend, frontend, Flutter mobile, shared contracts, PostgreSQL, worker/sandbox, storage, proxies and real runtime all apply.
- Approved requirements/design remain authoritative. Tests may not silently remove scanned OCR, photo understanding, HEIC/HEIF, either client, original integrity or durability.
- Live model budget is **16/16 exhausted**. No further model calls without later explicit user authorization. Compilation, deterministic mocks and offline tests can proceed without new model-call approval. Current modern arm64 libheif 1.23.7/libde265 1.1.3 native/security/actual-HEIC proof passed with localized QA acceptance; modern amd64 build not completed, target-host/device acceptance pending.

## Evidence Levels and Environments

| Level | What it proves | What it cannot prove |
| --- | --- | --- |
| Unit/mocked | Validators, state transitions, serialization, budgeting, policy branch/error/redaction behavior | Real OCR/HEVC decode, PostgreSQL locking, durable fsync, photo understanding, actual ingress or gallery bytes |
| Real local integration | Migrated isolated PostgreSQL, actual private volume, release parser/codecs/sandbox, crash injection | External model grounding or physical photo API behavior |
| Proxy/client E2E | Real backend/worker behind built Nginx and named outer ingress; web/mobile lifecycle | Model semantics if provider is mocked; physical gallery retention if simulated |
| Authorized live model | Exact deployed runtime/model/schema, nonsensitive visible-content questions and multi-image comparisons | Untested models/versions/contexts; complete reading of omitted content |
| Physical device/recovery | Original-resource gallery selection, native save/share, restart and paired backup restore | A simulator/mock cannot stand in for this evidence |

Use deterministic synthetic/non-sensitive fixtures with manifest filename, category, byte length, expected content/locators, SHA-256, dimensions/pages/sheets and expected coverage/outcome. Hashes are internal integrity test evidence, never public attachment identifiers. Keep credentials, original sensitive photos, base64 and content-bearing provider responses out of SDD/telemetry. Record safe fixture IDs, result assertions, versions and redacted evidence links. Do not commit captured tokens or Playwright traces containing secrets.

## Required Test Cases and Traceability

### Q00 — External Runtime and Genuine Image Understanding

- Requirements: R3/R5/R6; tasks T00/T08/T13; **G1 activation/release gate, not implementation blocker**.
- Later explicit authorization is required for more live calls. Record runtime/model/profile evidence level, redacted schema/transport and supported images. Verify ≤9,000,000 actual UTF-8 JSON bytes and ≤60,000 combined JavaScript UTF-16 text units (including trusted system sections/wrappers/escaped records/locators/instruction), rejecting malformed surrogates. Test the 24,000 supplied-input budget and safe evidence-backed image costs; unknown costs keep the live profile unavailable. Do not present planning reserves as total internal-context control. Test the approved backend output/response/deadline guard in Q10; do not require or claim an unevidenced Hermes generation/cost cap.
- Use JPEG, PNG, WebP and JPEG/PNG derivatives of real HEIC/HEIF fixtures. Ask about visible objects, spatial layout and colors with no embedded text, then two- and five-image differences/comparisons. Require grounded fixture-specific answers naming the correct files; metadata, OCR, generic responses and mocks fail acceptance. Exercise analysis/summary/review/comparison across image/document/source fixtures.
- Prove supplied history replaces/is isolated from runtime memory; repeat long owned-session requests and concurrent turns to detect cumulative context or cross-task contamination. Test unavailable/contradictory capability, wrong model, image rejection and provider timeout.
- Live acceptance requires redacted real model evidence and no unsupported full-read claim. Offline implementation continues within the approved envelope/constraints; changing the protocol/model design still requires revised approval.

### Q01 — Release Worker and Native Dependency Proof

- Requirements: R2/R3/R5; T01/T07; **G2 affected-deployment/full-release gate**, not a blanket implementation blocker.
- Build/run release Linux images on amd64/arm64 and target sandbox host, not only macOS. Verify pinned patched libheif, libde265 enabled/linkage/plugin availability, `heif-info`/`heif-dec`, JPEG/PNG output, security limits and real HEVC iPhone fixtures. Verify Poppler/Tesseract English+Spanish/Pillow capabilities and XML/OOXML/XLSX tooling.
- Demonstrate selectable/scanned/mixed-region PDF content and actual HEIC/HEIF conversion. Cover portrait/rotation, color, 8/10-bit, HDR-to-SDR and multiple items/frames; disclose primary-image/other-frame omissions.
- Measure image size, RSS/CPU/wall/scratch, decoder/plugin loading and library/runtime licensing/security-update footprint. Failed codecs or sandbox are failed gates, not accepted supported-format success.

### Q02 — Full Format, Filename and Encoding Matrix

- Requirements: R2/R3; T02/T07; design matrix accepted for implementation. **G3** retains full-format/device acceptance evidence, not another business approval for this matrix.

| Category | Required successful representative fixtures / assertions |
| --- | --- |
| PDF | `pdf`: selectable text, image-only scanned, different scanned/text pages and **text plus embedded scan on the same page**; page/region provenance, deduped overlap, empty versus meaningful content |
| DOCX | `docx`: ordered paragraphs/tables/headings/header/footer/notes/text boxes, source locators; explicit unsupported embedded object/chart/image-only notices |
| Images | Each of `jpg`, `jpeg`, `png`, `webp`, `heic`, `heif`: actual decoding/normalization, correct orientation/aspect, real photo gate Q00 and byte-identical original Q06 |
| Spreadsheet/tabular | `xlsx`, `csv`, `tsv`: sheets/coordinates/rows, hidden sheets labeled, literal formulas and cached/missing values, quoted delimiters/newlines and bounded fields; no evaluation |
| Text/config | Each of `txt`, `md`, `json`, `xml`, `yaml`, `yml`, `toml`, `ini`: strict decoding/line locators; malformed syntax retained as analyzable text with warning, no unsafe object/entity construction |
| Compound env | `env.example`, `.env.example`, `service.env.example`: accept compound patterns; plain `.env` rejected rather than treated as extensionless source |
| Logs | `.log`, `.out`, `.err`, numbered/date variants and additional textual log names with explicit category selection; not a single-extension whitelist |
| Source | Every example extension in design's source matrix, extensionless Dockerfile/Makefile/Jenkinsfile and shebang scripts; additional textual language/name via category choice. Include JS/TS/Dart/Python plus remaining listed language fixtures, not just these four |
| Encoding | UTF-8 with/without BOM, ASCII subset, UTF-16 LE/BE with BOM; undecodable/control-heavy/binary inputs fail explicitly. Windows-1252/BOM-less UTF-16 are explicit untested coverage, not repeat business-approval prerequisites or implied support |

- The exhaustive source examples to enumerate in the fixture manifest are `.js/.jsx/.ts/.tsx/.mjs/.cjs/.py/.dart/.java/.kt/.kts/.swift/.c/.h/.cpp/.hpp/.cs/.go/.rs/.rb/.php/.sh/.bash/.zsh/.ps1/.sql/.html/.css/.scss/.vue/.svelte/.r/.R/.lua/.pl/.ex/.exs/.erl/.scala/.groovy/.gradle/.bat/.cmd/.proto/.graphql/.gql/.ipynb`.
- Use the source/log/encoding matrix and English+Spanish OCR defaults accepted with the design; no repeat business approval is needed. Other untested encodings/languages remain explicit. Fixture success means requested content use, not just HTTP upload. Never execute content or fetch document relationships.

### Q03 — Contracts, Validation and Backward Wire Compatibility

- Requirements: R1/R4/R5/R7/BR6; T03/T06/T09/T11.
- Compile public exports and both TypeScript consumers. Compare Dart decode/encode fixtures for batches, descriptors, lifecycle/processing separation, errors, source locators/unknown totals, context manifests and optional fields. Old rows map empty attachments; old clients/text commands remain valid.
- Validate message ≤4,000 characters and trim-aware nonempty instruction. Reject partial batch/id/idempotency combinations, duplicates, >5 ids, mixed/foreign batches, alias mismatches, wrong selected set, consumed/expired/not-ready files and conflicting request fingerprints.
- Verify every typed content union consumer including OpenClaw/RUN compatibility; no `[object Object]` coercion. Stable safe HTTP codes and file-specific outcomes survive sync/task/history mapping. No framework/raw extraction/storage keys/private paths or hashes in public descriptors.

### Q04 — Processing Accuracy and Failure Transparency

- Requirements: R2/R3/R5; T07.
- Real parser integration asserts known text and locators from all Q02 fixtures. Same-page OCR must recover text in scanned regions despite selectable text elsewhere. Check English/Spanish, blank pages, low-quality scans, duplicate overlap and unreadable/unknown pages.
- Fail corrupt/encrypted/password-protected PDF/OOXML, bad signatures, MIME/extension spoof, binary disguised source, empty extraction, invalid encoding and unsupported HEIF codec explicitly. Treat empty originals as eligible uploads but not meaningful extraction success.
- Inject absent/failing OCR/decoder, conversion failure, storage error, parser crash/OOM/timeout and unavailable provider. Attached originals remain downloadable. All unusable files fail task without model analysis; mixed success names omitted files and incomplete comparisons. Missing capability is visible failure, never format acceptance.

### Q05 — PostgreSQL Migration, Atomicity and Races

- Requirements: R1/R4/R7; T04/T06/T09. **Use real isolated PostgreSQL**, not repository/SQLite mocks.
- Migrate fresh DB and legacy populated chat DB; inspect checks/unique indexes/FKs/ownership and message-conversation consistency; revert/reapply on disposable data, seed compatibility without new permissions and production migration packaging.
- Barrier-controlled simultaneous uploads reserve counts/actual bytes including in-flight rows: concurrent sixth file, canceled/retried slot, 100 MiB aggregate and finalization against cancel/expiry. Simultaneous send/same batch/different keys yields one consumption; same key/same fingerprint yields same task; changed payload/target/ids gives 409.
- Inject transaction failure after every conversation/message/association/task/job/submission write: no partial new session/message/task/association or precommit realtime event. Ready originals remain staged until expiry. Send lost acknowledgement/retry must not duplicate history or jobs.
- Race cleanup/commit, worker claim/cancel, permission changes and cascade deletion. Restrictive lifecycle paths retain keys until durable delete jobs; no orphaning by metadata cascade. Concurrent tasks respect per-conversation dispatch and committed-history cutoff.

### Q06 — Streaming Limits, Original Integrity and Private Storage

- Requirements: R1/R4/R5; T05/T06/T09/T12.
- Accept 0-byte originals with later explicit empty outcome, exactly **20,971,520 bytes/file**, and **five such files = 104,857,600 bytes** through backend, web and mobile/proxy. Use valid eligible content fixtures; processing may truthfully be partial. Reject **20,971,521 bytes** and sixth file; never silently slice/drop a file or impose a smaller aggregate.
- Multipart: one file, one ≤128-byte field, bounded parts/headers, filename ≤255 UTF-8 bytes and whole body ≤**22,020,096 bytes (21 MiB)**. Check exact boundary and +1, false/missing Content-Length, chunked overflow, huge filename/header/field, unexpected parts, disconnect/cancel and 60-second idle/300-second total deadline. Verify unlink/released reservations and no API heap buffering of five files.
- Compare uploaded/downloaded SHA-256+length for every format after extraction, OCR/conversion, partial/failed processing/provider, web reload, mobile restart, cross-client reopen and API/worker/container restart. HEIC/HEIF originals stay untouched; missing original gives explicit error, never derivative substitution.
- Crash/fsync/rename/metadata-write injection demonstrates ready implies durable object, orphan recovery and immutable no-overwrite storage. Reject traversal/symlink/key escape; safe original filename remains associated. ENOSPC/admission pressure is retryable operational error, not lower product limits.

### Q07 — Resource Budgets and Honest Coverage

- Requirements: R3/R5/R6; T01/T07/T08/T12. Exercise at bound and just beyond where applicable, measuring actual execution and visible locators/status.

| Budget | Required assertions |
| --- | --- |
| Admission | One parser job/worker; initially ≤2 workers; one pending processing set/user with visible retryable backpressure, not reduced file eligibility |
| Isolation | 2 CPU, 2 GiB memory, 64 PIDs/worker; 1 GiB parser address space; no network/ptrace/coordinator `/proc`/persistent root/other job/secret access; no privileged workaround |
| Deadlines | 120 seconds wall/file, 60 seconds CPU, ≤15 seconds OCR/page within total; kill full process group, fence stale results, preserve useful completed segments with omissions |
| Scratch/archive | 512 MiB scratch/worker; ≤256 MiB actual expanded OOXML, ≤10,000 ZIP entries, ≤100:1 expansion ratio; enforce streaming actual bytes, not trusted headers |
| Text | ≤2 MiB UTF-8 derivative/original; truncated content is partial with locators |
| PDF | First 100 pages inspected, first 20 raster-needed pages OCR; ≤150 DPI and ≤8 MP/page; disclose uninspected/unreadable regions and unknown totals |
| Tables | First 20 sheets, 10,000 rows/sheet, 100 columns, 100,000 visited nonempty cells/file; 64 KiB field/cell, label omitted/unknown ranges and formula cache gaps |
| Images | Input ≤50 MP and ≤16,384 px/side; explicit processing failure above bounds while retaining original. Derivative ≤2,048 long edge/1 MiB, thumbnail ≤320 px/128 KiB, aspect retained, no silent crop; disclose resize/frame/tone-map limitations |

- Validate ZIP bombs/forged dimensions/XML entities/external relationships/decompression bombs and child environment isolation. Native failure does not become usable/full. Measure worker image size/RSS/CPU/scratch and API/Dart streaming memory; do not invent unmeasured throughput guarantees.

### Q08 — Durable Jobs, Leases, Cleanup and Recovery

- Requirements: R4/R5/R7; T05/T07/T09.
- Multiple PostgreSQL coordinators use `FOR UPDATE SKIP LOCKED`, logical-job uniqueness, 2-second poll, 60-second lease/15-second heartbeat and attempt/generation fencing. Kill coordinator/parser before/after derivative write and outcome persistence; replacement resumes pending work, stale attempts cannot publish or overwrite. Local transient retries stop at two attempts.
- Restart after committed task but before dispatch; attachment tasks never also launch fire-and-forget. Kill during model dispatch/timeout: reconcile/fail indeterminate attempt, never automatically resend or claim exactly-once provider execution.
- Fixed 24-hour staging expiry with non-sliding clock, 15-minute cleanup, 10-minute stale-upload lease and 48-hour orphan grace; race active upload/commit/reconciliation and ensure authoritative DB recheck. Committed originals never match age cleanup. Cancel/revocation blocks dispatch/results appropriately without deleting committed originals.
- Validate idempotent physical deletion jobs and bookkeeping across crashes; archive preserves history. No new delete UI is required to test internal cascade/lifecycle safety.

### Q09 — Authorization, Audit and Content Containment

- Requirements: R7/BR1/BR5; T06/T08/T09/T12.
- For capability/session queries, create/upload/poll/cancel/remove, descriptors, original/thumbnail streams, commit, task/history/context reads and dispatch: missing auth 401, missing permission 403, foreign/absent attachment or batch indistinguishable 404. Swap owner/batch/session/message ids and try admin/auditor/org/branch peer access; no metadata/extracted content/byte use override.
- Revoke permission/deactivate account during upload, queue, finalization, provider dispatch and long stream. Fresh centralized policy blocks new publication/use; periodic stream cancellation is best effort, not recall of delivered bytes. Permission restoration does not depend on destroyed originals.
- Safe UTF-8/fallback Content-Disposition, length, private/no-store, nosniff and CORS exposed download headers; source/XML/HTML never inline-rendered. No bearer query/anchor/image URLs, public files, provider/storage credentials, raw private paths or arbitrary fetch URLs.
- Assert allowlisted audit actions/ids/counts/reasons only, including denied and download start/complete/abort. Scan logs/traces/execution events/tool echoes/telemetry for fixture markers/base64, prompts, filenames, raw OCR, provider errors and credentials; content-bearing payloads must be redacted. `AUDIT_READ` grants no attachment read.

### Q10 — Model Context, Later Turns and Manifest Persistence

- Requirements: R3/R5/R6; T08/T09.
- Deterministic tokenizer/profile/provider mocks prove allocation/composition; Q00 retains live evidence. Supplied input ≤24,000 tokens with planning reserves, not total Hermes internal-context guarantees; preserve approved input allocations and count envelope overhead. Unknown image/context costs keep live dispatch unavailable with a specific reason.
- Per-file text ≤8,000 tokens; reserve images first, fairly share source-order text, then earlier owned attachments/history. Five ≤1 MiB derivatives must fit the profile, ≤9,000,000 actual serialized UTF-8 bytes and ≤60,000 combined UTF-16 text units. Test exact bounds/+1, multi-part aggregate (not just per-part), escaping, non-BMP characters, malformed surrogates, mandatory-content failure and source-boundary omissions before serialization. No byte-length image-token shortcut or silent fifth-image drop; five ×20 MiB original eligibility is independent.
- Output: enforce ≤4,096 tokens only with verified serving-model tokenizer; otherwise ≤16,000 UTF-16 units with safe Unicode cut, not a token guarantee. Test bound/+1 in both modes, accounting provenance, persisted `partialOutput: true`/stable reason and visible partial notice through sync/task/history/both clients. Bound the entire raw response incrementally to 256 KiB; test chunked overflow, invalid/incomplete JSON and safe-decoder behavior. Raw fragments never count as complete answers.
- Deadline: absolute 120 seconds includes connection, headers and full body; test delayed headers, slow/chunked body and post-header cancellation. Byte overflow/deadline abort reads. An indeterminate dispatch is counted and never automatically retried. Do not infer remote cancellation or an internal Hermes generation/tool/compute/cost cap from these guards. These deterministic tests do not need more live calls.
- Text-only follow-up rehydrates old attachments from private versioned derivatives; do not depend on provider memory or old data URLs. Later concurrent turn cannot leak into earlier cutoff. Test omitted-section question, missing earlier source and partial comparison: visible panel identifies omissions/ranges independent of model claims and advises narrowing.
- Persist versioned manifest after reload/cross-client history with unknown totals distinct from zero and extraction coverage distinct from context use; prepared/delivered/provider-failed are not universal model-attention claims. Provider failure never says successfully analyzed.

### Q11 — Web and Mobile Behavior / Physical Originals

- Requirements: R1/R4/R5/R6/BR2; T02/T10/T11.
- Both clients: select supported files, inspect name/size, remove/focus return/retry, reject sixth/oversize explicitly, two streaming transfers, block until exact ready set and nonblank instruction, preserve draft until acknowledgement and stable keys on ambiguity. Session switch cancels old batch; no carryover/silent subset. Processing cards distinguish attached from used, retain partial/failed download and show context panels.
- Web unit/service tests cover validation/cancel/status/error/object URL lifecycle and permission integration; Playwright covers composer, history reload, reconnect, downloads, keyboard named controls/non-color status/live announcements and narrow-screen wrapping. Keep service-only HTTP, complete standalone components and current styles. Truthful indeterminate progress if transport lacks byte events.
- Flutter unit/widget tests cover wire parity, Riverpod cancellation/state, retry/refresh with recreated multipart streams, temp-path loss/reselect and save/share cancel/failure. No 100 MiB buffer. Test restart, both platform filename patterns/non-ASCII names, download authorization and temp/cache cleanup on logout/session change.
- **Physical iPhone gallery proof:** use a known original HEIC exported through an original-resource path as baseline; compare gallery-selected bytes, backend original and downloaded/saved original hash/length/container/name. Include Photos rather than only Files; simulator/plugin mocks cannot pass this test. No resize/quality options/transcode. If API changes bytes, block gallery acceptance pending approved original-resource bridge/solution. Test real HEIF resource and physical Android original selection/save-share separately.
- Open same session on other client, compare associations/outcomes/manifests and original hashes. Original download success and native save/share cancellation are separate outcomes.

### Q12 — Real Proxy, Request Caps and Deployment Paths

- Requirements: R1/R4/R7; T06/T10/T11/T12.
- Test built frontend Nginx and actual named outer ingress, not only Angular dev server/direct backend. Route upload cap `21m`, outer ingress ≥same; exactly 20 MiB file + valid overhead succeeds, >21 MiB body and chunked abuse fail safely. Five sequential/two-concurrent exact-limit uploads succeed through both clients; no accidental 1 MiB/default ingress limit.
- Verify request buffering off, bounded headers, 60-second idle/300-second total upload, Node/client cancellation alignment and 64 KiB message JSON route ceiling. Runtime path supports selected requests ≤9,000,000 bytes with any established lower deployment cap applied explicitly; no 16 MiB assumption. Verify independent 120-second full-body invocation and 256 KiB raw-response guards. Validate `/api/` rewriting, CORS/disposition, safe downloads and Socket.IO.
- Current Playwright config launches Chromium/dev server only: T12 must document distinct proxy runner/base URL/environment and bootstrap without real secrets. Report dev-server passes separately from ingress evidence.

### Q13 — Deployment Resource, Persistence and Rollback Rehearsal

- Requirements: R4/R5/R7; T05/T12/T13.
- Actual constrained release images: readonly root, restricted mounts, no public worker ports/Docker socket/privileged mode, coordinator DB-only network, private same-host persistent objects and bounded scratch. Missing OCR/HEVC/vision readiness is explicit, not a false ready claim.
- Restart/recreate API/worker containers without losing originals; disk failure/backpressure emits clear errors. Capacity reserves at least 100 MiB originals per maximum-size message plus bounded derivatives and backups; record measured worker image/RAM/disk reservations and alert behavior.
- Back up and restore PostgreSQL plus volume as a consistent recoverable set, reconcile and compare all original hashes/associations. Include processing failures, archive and pending jobs. Rehearse application rollback stopping admission/fencing jobs while retaining compatible authorized history/downloads and schema/objects. Migration revert/data-loss drill only on disposable data with preserved export; no production volume purge.

### Q14 — Existing Messaging, Voice and Provider Regressions

- Requirements: R1/BR6; T09–T13.
- Existing text-only sync response, async status/polling, realtime stream/task updates, notifications and ordered session history remain compatible in web/mobile. Attachment sync completes within 25 seconds or returns safe 504 polling ids; retry reaches same committed task, not second turn.
- Text-only OpenClaw remains functional. Every OpenClaw attachment request rejects before conversation/message/task/trace/execution mutation (denial audit allowed); recheck changed provider at send/dispatch. RUN endpoints gain no attachment execution.
- Preserve STT voice input/transcription/task/history, TTS audio and their distinct permissions. Draft attachments cannot be silently sent/lost through voice; explicit explanation for unsupported combined composition. Test token refresh/logout, old clients/rows and Socket.IO disconnect with polling fallback.

## Commands and Harness Prerequisites

Commands are planned from actual scripts, not executed by this documentation task. Repository-root unless stated otherwise:

| Area | Required check |
| --- | --- |
| Shared contracts | `pnpm --filter @kyrae/shared-contracts build`; then compile both TS consumers and Dart wire fixtures |
| Backend | `pnpm backend:lint`; `pnpm backend:build`; focused `pnpm --dir apps/backend test --runInBand --testPathPatterns='assistant-attachments|messages|agents|voice'` after tests exist; confirm selected test counts |
| Backend/DB E2E | `pnpm backend:test:e2e --runInBand` using real isolated PostgreSQL, including new attachment concurrency/lease/crash suite; do not substitute mocked repositories |
| Migration | `pnpm --dir apps/backend migration:run`, `pnpm --dir apps/backend migration:revert`, `pnpm --dir apps/backend migration:run`; isolated legacy seed compatibility via `pnpm --dir apps/backend seed`; test production migration packaging too |
| Frontend | `pnpm frontend:build`; `pnpm frontend:test --watch=false`; `pnpm frontend:e2e` plus separately configured actual proxy acceptance |
| Mobile | From `apps/mobile`: `flutter analyze`; `flutter test`; add physical iPhone/Android manual/native evidence |
| Worker/live/proxy | Existing proof-only commands/results are in the report and worker README/evidence; production coordinator/proxy/release commands remain pending. Record actual commands/digests/architectures/hosts; later explicit user authorization required for more live model calls |

**Database provisioning:** root `docker:db` is `docker compose up -d postgres`, but inspected `docker-compose.yml` has no postgres service. It expects external `kyrae-postgres`, an external network and `SERVER_ROOT` secrets. Provision/document a disposable PostgreSQL environment explicitly; verify injected DB target before migrations/seeds/tests. Never use production or assume existing data. `data-source.ts` explicitly registers entities and uses `synchronize: false`; T04 must update registration as well as migration files. Test isolation/cleanup must be part of the new suite.

Inspected script/config sources: root `package.json`, backend/frontend/shared-contract package files, backend Jest E2E config/data source, frontend Playwright config/Dockerfile, mobile pubspec and Compose. Follow testing/security/database/shared-contract standards. Older mobile-scope prose does not override current context and approved feature scope.

## Risks and Exit Criteria

- Environment dependencies still unproved: exact external model behavior, target rootless sandbox, amd64/arm64 HEVC stack, physical gallery resource APIs, ingress caps, isolated DB provisioning and measured resource/capacity/restore behavior.
- Unit mocks are expected for deterministic failure/selection tests but leave these dependencies untested. Record level and environment for each result; a truthful error path alone is not successful OCR/photo/format delivery.
- Each Q00–Q14 case must link to actual evidence. Missing G1–G3 proof gates affected activation/full release, not authorized implementation/offline tests. Byte mismatch, unauthorized access, unsafe sandbox, duplicate dispatch or overrun blocks affected unsafe operations and acceptance. Matrix is design-accepted; revised approval is needed only for genuinely changed design/scope, not repeated approval of this work.
- QA approves/rejects only after actual implementation and checks; no dates or approvals are inferred here.

## QA Decision

- Approved: **Full feature not accepted**.
- Rejected: **Full feature acceptance withheld**; this alignment does not issue a new QA decision or self-approve future implementation.
- Reason: Production attachments are unimplemented; residual G1–G3 activation/release proofs remain. Historical localized QA accepted modern-arm64/actual-HEIC compatibility (nine native, seven sandboxed, eighteen unit cases), not the full feature. All sixteen model attempts are consumed; output-cap observation timed out. The user-approved constraints amendment resolves design/gate conflicts and authorizes T03 onward in aligned order. Full-feature QA acceptance still requires actual implementation and evidence.
- Evidence ledger: maintain case ID, task ID, fixture ID, evidence level, environment/version, actual command/action, expected/observed result, artifact link and remaining blocker in `implementation-report.md` during execution.
