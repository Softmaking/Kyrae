# Implementation Report: Assistant Chat Attachments

## Status and Authority

- Requirements, technical design and implementation task plan: **User-approved**. The final plan approval explicitly included synthetic nonsensitive-file tests against the configured Hermes service.
- Implementation state (2026-10-28): **T03–T11 implemented; T12 partially done (packaging/docs yes, amd64/seccomp/live-validation no); T13 partially executed** (backend e2e run; independent QA decision still pending). All offline unit/build/e2e evidence listed below has been executed; **live Hermes validated, mobile physical-gallery original retention, modern amd64 worker build and production deployment remain unproven**.
- Gates: **G1 open** (no live model budget remains; live profile `available=false` until validated), **G2 open except QA-accepted modern arm64 codec proof** (amd64/seccomp open), **G3 open** (physical gallery/Android device evidence), **G4 not closed**.
- Historical Phase 0 proofs (T00 16/16 live calls consumed, T01 native arm64 proof, T02 device preflight) recorded below unchanged.

## Changes Implemented

Added `apps/backend/test/hermes-attachments-proof.cjs`:

- Read-only discovery by default; model calls require explicit `--live`, `--continue-t00`, `--history-recheck`, `--context-envelope-recheck`, `--protocol-proof` or `--resume-protocol-proof`.
- Loads existing backend configuration without printing credentials; no implicit destination fallback. Explicit override is origin-allowlisted.
- Generates nonsensitive PNG shapes in memory. Reports bounded sanitized facts and semantic assertion results, not raw provider messages, base64 or secrets.
- Each live phase requires explicit consumed-budget input (`--used-posts=N`), enforces its phase limit and cumulative ceiling (original modes ten; explicitly approved protocol extension sixteen), counts uncertain dispatched requests, and has a 90-second request timeout. Stops on HTTP or semantic failure with nonzero exit status. The supplied count is operator-maintained, not a cross-process persistent ledger; repeated runs must use the recorded cumulative count. All sixteen approved attempts have now been consumed.
- No-network self-test checks generated PNG chunks/CRCs, decompression, corruption detection and positive/negative response assertions.

## Proof and Approval Ledger

| Gate | Result | Evidence / limitation |
| --- | --- | --- |
| G0 Task approval | Approved | User's “apruebo” to the task-plan and synthetic Hermes-test approval request |
| Protocol addendum | User-approved | User's “si” to the revised context protocol and up to six additional synthetic attempts; cumulative allowance sixteen |
| Constraints amendment / task alignment | **User-approved; T03 onward authorized** | Latest “apruebo” and current explicit user instruction approve amendment and task alignment; no repeat approval for this scope |
| G1 Runtime/model | **Open / affected live activation and full release gated** | Positive envelope/system/session/five-image transport; strict shape assertion failure retained. Safe image/context accounting and policy/privacy/live acceptance remain; offline implementation proceeds |
| G2 Native worker | **Open, localized modern-arm64 codec fix QA-accepted** | Minimal libheif 1.23.7/libde265 1.1.3 source build passed native/security/regression checks and decoded the supplied original; modern amd64/target-host/adversarial proofs remain |
| G3 Native input/coverage | **Open / device and full-format release gated** | Design matrix accepted without repeat business approval; untested encodings/languages explicit. Original HEIC conversion/integrity passed locally; gallery selection/upload retention and Android parity follow implementation |
| G4 Release/QA | Not accepted | Full feature and required acceptance tests are not implemented/executed |

## T00: Actual Hermes Results

Configured/tested service: `http://mac-mini-de-kyrae.tail1e9797.ts.net:8642`. No `.env` changes. Tests used existing server-side credentials without writing them into artifacts.

The user clarified that port 8642 is Hermes directly, rather than a separate middleware service. That clarification adds no model requests and does not imply a requirement for the user to supply another repository. Runtime budget/context details still require evidence from supported interfaces or documentation.

Discovery GETs returned HTTP 200 for `/health`, `/v1/models`, `/v1/capabilities`, `/health/detailed` and `/api/model/options`. Runtime version reported `0.21.2`; public model alias `hermes-agent`; model-options discovery reported provider `openai-codex` and configured model `gpt-5.6-sol`. Completion responses only identified `hermes-agent`, so discovery is not exact per-request serving-model attestation. `/openapi.json` and `/v1/openapi.json` returned HTTP 404.

Sixteen authenticated model POST attempts were executed in total: ten under the original allowance and six under the approved protocol extension. After an initial failed-assertion stop, the user's subsequent “continua” authorized resuming the four remaining independent diagnostics, not repeating or reclassifying the failed shape case. The total allowance is now **16/16 exhausted**. Requests used `/v1/chat/completions`, `stream:false`, requested bounded output, session headers and synthetic fixtures. No private photo/conversation was submitted. Fifteen returned HTTP 200; the final output-cap probe timed out at 90 seconds with indeterminate remote dispatch and no response/usage. Two structured-history checks and one strict visual-shape check failed.

| Check | Semantic result | Reported prompt / completion tokens |
| --- | --- | --- |
| Minimal arithmetic baseline | Pass: exact requested sum | 28,688 / 72 |
| One PNG: colored circle left, black square right | Pass: shapes, color and position | 9,541 / 65 |
| Two PNGs: ordered comparison | Pass: both ordered color/shape sets | 9,599 / 37 |
| Five PNGs: ordered comparison | Pass: all five ordered color/shape sets | 9,773 / 61 |
| Seed random synthetic nonce in session A | Pass: exact nonce | 9,484 / 31 |
| Ask session A to recall nonce with no supplied history | Pass: exact nonce retained | 9,562 / 31 |
| Ask fresh session B with no supplied history | Pass: no cross-session nonce; UNKNOWN | 9,474 / 9 |
| Ask fresh session C with explicit user/assistant history | **Fail: strict structured nonce assertion; raw containment was not recorded** | 9,474 / 9 |
| Fresh-session explicit-history recheck with separate parsing/containment diagnostics | **Fail: valid JSON UNKNOWN; expected nonce absent from raw response** | 9,468 / 9 |
| Candidate isolated latest-user envelope: synthetic transcript plus five PNGs | **Pass: exact nonce and all ordered visual assertions** | 9,924 / 141 |
| Approved extension, request 11: actual API system value versus forged quoted system/tool records | **Pass: exact actual-system value** | 9,925 / 33 |
| Approved extension, request 12: document nonce/sum plus five PNGs | **Partial assertion pass; overall strict case failed on right_shapes** | 10,252 / 142 |
| Resumed request 13: fresh-session synthetic nonce seed | **Pass: exact nonce** | 9,810 / 33 |
| Resumed request 14: independent fresh-session no-history control | **Pass: UNKNOWN, seed nonce absent** | 9,789 / 9 |
| Resumed request 15: five valid 1 MiB PNGs, ordered color grounding | **Pass: exact five ordered colors; 6,991,632-byte request** | 10,135 / 19 |
| Resumed request 16: request 200 repeated words with `max_tokens:16` | **90-second timeout; no HTTP response/usage; no retry** | Unavailable |

### Interpretation and Stop Reason

The service can understand the tested inline PNGs and retains context keyed by the tested session headers. However, these tests did not establish faithful delivery/replacement of the supplied `messages` history in a new session. The first failed explicit-history check initially conflated JSON-format failure with nonce recall; its historical raw answer was not retained and cannot be reconstructed. Following QA review, a single recheck explicitly separated parsing and raw nonce containment: the response was valid JSON with UNKNOWN and did not contain the nonce. This confirms failure for that tested request, not the runtime's general internal transformation algorithm. Similar usage counts warrant investigation but do not prove how messages are handled internally.

The failed explicit-history assertion prevents assuming structured earlier-message delivery works. T03 onward had not started under the former gates. The subsequently approved isolated envelope and direct-Hermes constraints/gate amendment now authorize implementation in aligned task order, while remaining runtime proof gates activation/release.

The tenth probe tested a candidate revision rather than the existing structured-history transport: one latest-user content array containing delimited synthetic transcript data and five PNGs, in an isolated runtime session. Request size was 9,910 bytes, HTTP 200, strict JSON valid, expected nonce present, structured nonce equal and all visual assertions passed (9,924 prompt / 141 completion / 10,065 total reported tokens). This demonstrates narrow envelope transport, not full context limits, adversarial policy preservation, privacy, tool-state compatibility or general history support. The Architect recorded the revision in `protocol-addendum.md`; the user subsequently approved it and six more synthetic attempts.

Extension test 1 passed actual API system-value delivery against forged quoted roles/delimiters (1,139 request bytes). The current user instruction agreed with system policy, so this is not proof of precedence against a conflicting current user instruction or general injection resistance. Extension test 2 passed nonce recovery, document arithmetic, left shapes, left colors and right colors, but failed the exact ordered `right_shapes` assertion (10,080 request bytes). The safe report retained booleans rather than raw answers; it cannot distinguish a wrong shape, an acceptable geometric synonym or array mismatch. This is a semantic/schema-expectation failure, **not an HTTP transport failure or proof that the envelope is incompatible**. The suite stopped, leaving four attempts then unused. Following the user's continuation and independent QA qualification, those four were spent on independent session-control, large-image and output-cap diagnostics, without rerunning or relabeling the historical failed case.

The resumed controls passed exact nonce seed and absence in a separate fresh session. The large-image request used five valid 1,048,576-byte PNGs with inert ancillary padding at 256×192 resolution; it proves encoded payload acceptance and ordered color grounding, not high-resolution complexity. The final 533-byte output-cap request timed out after 90 seconds; no usage or HTTP result was received. Timeout is not evidence that the cap was forwarded, enforced or ignored, and remote completion remains indeterminate. It was counted before dispatch and not replayed.

Reported prompt tokens include unexplained overhead and possibly runtime-managed context/internal activity. The 28,688-token baseline is **not** a measurement of the client payload and does not by itself prove that a 24,000-client-input budget is impossible. Runtime reserve, effective context window, image-token accounting, exact model, output-cap enforcement and session replacement/isolation need proof.

The largest successfully tested model request was **6,991,632 bytes**, carrying five 1 MiB PNGs. Full-size 12 MiB serialization / at least 16 MiB ingress allowance was not proven and conflicts with the reviewed upstream source below, whose match to the deployed code is unverified. JPEG/WebP and converted HEIC/HEIF model transport remain untested; native JPEG/WebP and real HEIC conversion have separate successful worker evidence. `max_tokens` and `temperature` were accepted without HTTP rejection in earlier calls, but forwarding/enforcement remains unproven; the final output-cap diagnostic timed out.

### Direct Hermes Source Research and Approved Constraint Correction

Read-only official upstream research identified commit `26ba38a098d8a68c5a260133bcf858a444d0b1b5`, specifically `gateway/platforms/api_server.py`, `api_server_openai_routes.py`, `api_server_request_options.py` and the API user guide. This source is pinned-main evidence, **not a verified source identity for the installed 0.21.2**; no matching `v0.21.2` tag was established.

- Reviewed-source request cap: decimal **10,000,000 bytes**, so the existing 12 MiB outgoing/16 MiB runtime allowance assumption is incompatible with that source; the actual deployed cap has not been independently established.
- Reviewed normalized text cap: **65,536 Python characters** per part, with possible silent truncation; a token estimate alone cannot guarantee full supplied-context delivery.
- With an explicit session id, reviewed CHAT code replaces supplied earlier body turns with runtime database history, consistent with the observed structured-history failures.
- Reviewed `_create_agent` consumes reasoning/service-tier options, not request `max_tokens` or temperature. Blindly moving a cap into `model_options` is not an evidenced fix. Internal Python `AIAgent(max_tokens=...)` does not imply HTTP exposure or a whole-agent-turn generation/cost budget.

The user approved `direct-hermes-constraints-addendum.md` with the latest **“apruebo”**, explicitly confirmed in the current instruction, and authorized Tech Lead task alignment. Enforce actual **9,000,000-byte UTF-8 JSON / 60,000 combined JavaScript UTF-16 text-unit** request bounds, including trusted system/wrappers/escaped records/locators/instruction. Keep **24,000 Kyrae-supplied input tokens** with evidenced safe image costs; unknown costs keep the live profile unavailable. Guard visible output at **4,096 tokens only with verified serving-model tokenizer**, otherwise **16,000 UTF-16 units**, raw response at **256 KiB** incrementally and invocation at **120 seconds through the full body**. Persist partial-output/reason/accounting disclosures. These do not cap internal Hermes generation/tools/compute/cost; no automatic retry after indeterminate dispatch. Retain the approved isolated current-turn envelope. Five ×20 MiB originals, both clients and all-format scope remain unchanged. **T03 onward is authorized**; residual live/native/device acceptance gates activation/release. **16/16 live calls remain exhausted**, with later explicit user authorization needed for more; offline development/tests need no new model-call approval.

## T01: Linux Worker Preflight

Initial Docker CLI checks failed because the daemon was stopped. Docker Desktop was then started using `open -a Docker`; `docker info` reported Linux, aarch64, server 28.1.1. This is Docker Desktop's VM, not evidence of the eventual production host.

Minimal probes used existing `postgres:18-alpine` (arm64 image `sha256:96d56f7f57c6aacd1fcb908bc83b345ec5f83231ee486dd66a1baadce274db88`) as an empty shell, bypassing the PostgreSQL entrypoint. Flags: `--rm --pull=never --read-only --security-opt=no-new-privileges:true --cap-drop=ALL --network=none --pids-limit=64 --memory=2g --cpus=2 --user=65534:65534 --entrypoint=/bin/sh`; no volumes, ports, Docker socket or privileged mode.

- User and mount namespace probes succeeded (`unshare -Ur`, `unshare -Urm`). Combined user/mount/network/PID namespace probe created a child reporting PID 1.
- Fresh `/proc` mounting failed: `unshare: can't mount proc on /proc (flags:0xe): Operation not permitted`. Explicit proc mount also failed. The exact kernel restriction was not established.
- Capability sets were zero and NoNewPrivs was 1, but the daemon/container reported seccomp unconfined / Seccomp 0. These tests do not establish behavior under a standard or proposed parser seccomp filter.
- No image pulls, image builds or codec/package installations were performed. No namespace, codec, OCR or resource-compliance gate is closed.

The initial macOS tool absence did not establish Linux infeasibility. The Developer subsequently added a standalone **proof-only** application under `apps/attachment-worker/`: `Dockerfile.proof`, pinned Python proof requirements, native fixtures/tests, sandbox launcher/path regressions, `.dockerignore`, README and measured `proof-evidence.json`. There is still no production job coordinator, storage integration or message-processing worker.

### Native image and parser results

Both Linux arm64 and amd64 images built. Actual dependencies included Python 3.12.16, Poppler 22.12.0-2+deb12u3, Tesseract 5.3.0-2 with English/Spanish data, libheif 1.15.1-1+deb12u1, libde265 1.0.11-1+deb12u3, bubblewrap 0.8.0-2+deb12u1 and libseccomp 2.5.4-1+deb12u1. Base digest and direct dependencies are pinned; transitive apt versions are inventoried, not snapshot-locked. See the worker README/evidence for full versions and reproduction commands.

- Actual HEVC fixture generated with a build-stage-only encoder, then decoded through explicitly selected distro libde265 to PNG and JPEG. Original hash remained unchanged. The `.heif` variant uses the same actual container bytes, not an independently sourced iPhone fixture.
- Native JPEG/PNG/WebP processing, scanned-PDF English/Spanish OCR, same-page selectable text plus automatically discovered raster-region OCR, DOCX/XLSX parsing and XML external-entity rejection passed.
- A no-proc bubblewrap sandbox on arm64 successfully ran native parsers with read-only runtime, cleared environment, nonroot UID, seccomp-denied sockets/ptrace/unshare, absent coordinator/persistent/other-job paths, finite address-space/CPU/file limits and bounded scratch.
- QA identified missing bind-source alias checks. The Developer added canonical private-root/directory/path-component validation and twelve path regression cases, including a job/tmp alias targeting an existing coordinator sentinel and asserting no subprocess launched. Path checks remain subject to TOCTOU under a hostile concurrent shared UID; they are not descriptor-pinned production storage proof.
- Updated arm64 image `sha256:91c22e3df05ff58124779d16f2cb762341f2b1eaeb5cf49957e5055329574bb4` exited 0: nine top-level cases, twelve path regressions, seven sandboxed native cases, original hashes unchanged.
- Historical amd64-emulated image built and passed seven native cases but its sandbox failed `prctl(PR_SET_SECCOMP)` with EINVAL. It was not rebuilt after the path fix; no native-amd64 target acceptance is claimed.

No privilege increase or filter bypass was used. The outer Docker Desktop seccomp profile remains unconfined; production-host/standard-outer-filter behavior is unproven. The initial Bookworm stack above used `heif-convert` and linked unused x265/AV1 dependencies; it is historical proof, not the current codec implementation. The minimal modern source build below supersedes that codec limitation. Adversarial budgets, complex overlap deduplication, broader orientation/10-bit/HDR/sequence behavior and physical gallery retention remain open. Small-fixture timing/RSS/disk observations in `proof-evidence.json` are not aggregate worst-case capacity or release acceptance.

### Modern Minimal Codec Build and Actual iPhone Original

The user supplied a local original HEIC for compatibility validation. The photo was mounted as a single read-only file in a constrained Linux container with networking disabled. No image was sent to Hermes, and no photo/derivative, identifying path, EXIF/GPS/timestamp or original hash was added to the repository.

The initial libheif 1.15.1 reader failed at header parsing with `Invalid_input` (error 2, subcode 0). This did not establish corruption of the original. Following the approved minimal source-build design, the Developer upgraded to libheif 1.23.7 and libde265 1.1.3. Official release archives were pinned and SHA-256 verified before extraction:

- libheif 1.23.7: `f7483e818503ea6224c8863e4a56ac02c7089021a98472c811c12aa19faf2475`.
- libde265 1.1.3: `554228bd17788c99a7e63b37ab5634722190e6e2bf60c1dcb01cef328e133905`.

The new build explicitly enables built-in libde265 decoding, disables plugin loading/optional encoders/other codecs/experimental features, and retains upstream security limits. Actual tools are `heif-dec`/`heif-info`; loader and ctypes header tests use `/usr/local` modern libraries, not distro fallbacks. `ldd` verifies no x265/AOM/dav1d/x264/FFmpeg linkage. A compiled security probe tightens the pixel limit to 100 and observes `Security_limit_exceeded` on a synthetic fixture both outside and inside the sandbox; limits are not disabled to make the personal original pass.

Observed actual-original results:

| Property / check | Result |
| --- | --- |
| Original bytes | 751,347; eligible under 20 MiB |
| Decoder / depth | HEVC via libde265; 8-bit luma/chroma |
| Coded / transformed dimensions | 4032 × 3024 / 3024 × 4032 |
| Temporary PNG | 6,666,399 bytes; 3.672 seconds |
| Temporary JPEG | 1,180,517 bytes; 0.513 seconds |
| Model JPEG | 1536 × 2048; 395,097 bytes; within derivative bounds |
| Thumbnail | 240 × 320; 20,585 bytes; within thumbnail bounds |
| Original integrity | Unchanged, in-memory digest comparison |
| Full compatibility probe | Exit 0; 6.218 seconds |

Decoded ICC was transformed to sRGB. New model/thumbnail JPEGs preserve aspect ratio without cropping and pass EXIF/XMP/ICC/comment-removal checks. Intermediate decoded outputs remain temporary, not guaranteed metadata-stripped. Matching transformed/decoded dimensions is not a visual-orientation, colorimetric-fidelity or HDR acceptance claim.

Current arm64 proof image: `kyrae-attachment-worker:t01-modern-arm64`, id `sha256:24e5433ce99764fac016482dbf17d5b16fb56d95846fbaaf83ce7f099747d895`. The Developer and independent QA observed nine native top-level cases, seven sandboxed native cases and eighteen unit regressions passing. QA accepted the localized compatibility fix, not full G2/G3 or the feature. Modern amd64 build attempts at two/six compile jobs exceeded terminal time limits; no completed modern amd64 image is claimed.

Added source-build/security-probe files and a reusable real-HEIC probe/unit suite under `apps/attachment-worker/build/` and `tests/`. README reproduction and anonymous `proof-evidence.json` record old failures and modern results distinctly. No production API, persistent storage, contract, web or mobile integration is introduced by this proof.

## T02: Physical Input Preflight

Flutter 3.44.0, Dart 3.12.0 and Xcode 27.1 were available. One supported physical iPhone was discovered; device names/identifiers are omitted. No Android device was discovered and adb was not on PATH.

Picker/save/share dependencies are not yet present. The supplied local original has now passed the modern Linux compatibility probe described above. No app was installed or gallery accessed, and no selected/uploaded/downloaded physical-device byte comparison was performed. Local original conversion is not successful gallery-original-retention proof.

## Validation Commands Actually Executed

From `apps/backend`:

```sh
node --check test/hermes-attachments-proof.cjs
node test/hermes-attachments-proof.cjs --self-test
node test/hermes-attachments-proof.cjs --live
node test/hermes-attachments-proof.cjs --continue-t00
node test/hermes-attachments-proof.cjs --history-recheck --used-posts=8
node test/hermes-attachments-proof.cjs --context-envelope-recheck --used-posts=9
node test/hermes-attachments-proof.cjs --protocol-proof --used-posts=10 --authorized-total=16
node test/hermes-attachments-proof.cjs --resume-protocol-proof --used-posts=12 --authorized-total=16
```

- Syntax and no-network self-tests passed.
- Initial live visual suite passed; continuation exited nonzero at the explicit-history semantic failure, as intended.
- The first two live commands above were run before the QA budget fix. The current harness requires `--used-posts=N` for every live mode. Original modes retain ceiling ten; the explicitly approved protocol phase permits ceiling sixteen. **Current cumulative count is sixteen; no approved attempt remains.** Do not repeat a phase with a stale count or treat the timed-out dispatch as unused.
- After QA fixes, no-network self-tests additionally passed budget/uncertain-dispatch and JSON/prose/UNKNOWN/missing-response cases. The single history recheck failed semantically with separate valid-JSON and missing-nonce observations. Output-cap tests reject empty/zero/negative/invalid usage and cannot claim enforcement from an observation alone.
- `pnpm backend:lint` passed after harness changes. That lint script covers TypeScript; CJS received its own syntax/self-test checks.
- Docker native proof builds/runs and QA's independent arm64 run were executed as described above; the updated arm64 image was rebuilt and rerun after path hardening. No production build, schema migration, frontend/mobile behavior suite or full Q00–Q14 acceptance pass is claimed.

## Implementation Deliverables and Test Evidence (T03–T13)

All facts below verified against current repository source (2026-10-28).

**T03 — Contracts: DONE.** `packages/shared-contracts/src/attachments/attachment.contracts.ts` defines canonical batch/idempotency, lifecycle, sanitized errors, capability snapshot, locators/coverage, context manifests, additive history/task fields and exported `ASSISTANT_ATTACHMENT_CONSTRAINTS` (`maxSerializedRequestBytes: 9_000_000`, `maxCombinedTextUtf16Units: 60_000`, `maxOutputUtf16Units: 16_000`, `maxRawResponseBytes: 262_144`, `invocationDeadlineMs: 120_000`, `maxImageBytes: 1_048_576`). `src/index.ts` re-exports; `openclaw`/`agents` contracts carry additive `uploadBatchId`/`attachmentIds`/`clientMessageId`/`attachments`/typed-part fields. Shared-contracts build passes. No overwrite of unrelated contracts.

**T04 — Migration: DONE.** `apps/backend/src/database/migrations/1716090000000-add-assistant-attachments.ts` creates the six agreed tables (`assistant_upload_batches`, `assistant_attachments`, `assistant_attachment_derivatives`, `assistant_attachment_jobs`, `assistant_message_submissions`, `assistant_message_contexts`) with owner/session/message consistency, unique idempotency/logical-job keys and runnable/expiry indexes. Object keys are flat UUIDs per `PROTOCOL.md`; no binary columns, no permission seeds, no `synchronize` change.

**T05 — Storage: DONE.** `apps/backend/src/assistant-attachments/filesystem-attachment-storage.service.ts` implements flat UUID keys under `ASSISTANT_ATTACHMENT_STORAGE_ROOT`, key validation (path/symlink-safe components), restrictive mode writes without overwrite (`O_EXCL` link discipline), SHA-256/size tagging and original hash-identical verification. Dedicated covered specs exist.

**T06 — Access/uploads: DONE.** `assistant-attachments.controller.ts` exposes exactly 9 endpoints: `GET attachment-capabilities`, `POST upload-batches`, `GET upload-batches/:id`, `POST upload-batches/:id/files`, `DELETE upload-batches/:id`, `DELETE upload-batches/:id/files/:attachmentId`, `GET attachments/:id`, `GET attachments/:id/content`, `GET attachments/:id/thumbnail`; all under `JwtAuthGuard`/`PermissionsGuard`/`ASSISTANT_CHAT_USE`. `attachment-multipart.service.ts` verifies limits: body > 22,020,096 bytes rejected (header and streamed), per-file `fileSize: 20_971_521`, `files: 1`, `fields: 1`, `fieldSize: 128`, `parts: 3`, 300,000 ms deadline and 60,000 ms idle, single field name `clientFileId` plus file field; `ATTACHMENT_IDEMPOTENCY_CONFLICT` raised on key collision with differing file payload; post-pipeline parser/request `destroy` handling treats cancellation deterministically.

**T07 — Worker: DONE.** `apps/attachment-worker/` production coordinator/DB/lease/storage/parsers in `src/attachment_worker/`: claims `kind='process'` jobs only (`FOR UPDATE SKIP LOCKED`, 60 s lease, 15 s heartbeat, generation fencing), writes derivative objects flat inside `ASSISTANT_ATTACHMENT_STORAGE_ROOT` before fenced publish, no provider/network calls. Production `Dockerfile`, compose `attachment-worker` service hardened (read-only root, tmpfs scratch, `cap_drop: ALL`, `security_opt: no-new-privileges`, bounded resources) sharing the single named rw volume `attachments-storage` with the backend. Env naming uses `DB_PASS` (not `DB_PASSWORD`) in `config.py` and compose. Test status recorded in `README-worker-ops.md`: **unit 21/21 passed; local e2e 13/13 green, 0 failures** via `apps/attachment-worker/tools/run_local_e2e.sh`.

**T08 — Envelope/capabilities: DONE.** `apps/backend/src/agents/attachment-hermes.protocol.ts`: `kyrae-attachment-envelope-v1`, single current user turn plus trusted `ATTACHMENT_SYSTEM_POLICY` system message, data-URL JPEG/PNG derivatives ≤1,048,576 bytes each, serialized-request ≤9,000,000 bytes, text ≤ `maxCombinedTextUtf16Units`, response read incrementally ≤262,144 bytes with a 120,000 ms full-body deadline; malformed/oversize and abort map to `ATTACHMENTS_DISPATCH_INDETERMINATE`/`ATTACHMENTS_RESPONSE_TOO_LARGE` with **no partial output persisted from timed-out/indeterminate responses**; bounded `guardAttachmentAnswer` cuts at 16,000 UTF-16 units back one byte on a trailing surrogate, emitting `partialOutput`/`partialOutputReason`/notice plus honest UTF-16 accounting mode. `attachment-model-profile.service.ts` composes the backend-private `ASSISTANT_MODEL_PROFILES_JSON` profile plus worker-validated/storage evidence into the sanitized capability projection with `unavailableReasons`; `available=false` on default `.env.example`. Separate conservative text estimation is implemented backend-side. OpenClaw provider rejects typed content parts (`ATTACHMENTS_UNSUPPORTED_PROVIDER`), and the runtime path rejects typed parts on RUN/streaming lifecycles.

**T09 — Messages/submissions: DONE.** `apps/backend/src/messages/attachment-submissions.service.ts`: `validateAttachmentSubmission` enforces nonempty well-formed trimmed message ≤4,000 UTF-16 units, `sessionId`/`conversationId` alias equality, exact ready set of 1–5 unique UUID attachment ids with required batch + client message id; submission fingerprint is sha256; `pg_advisory_xact_lock` idempotency replays the same result or issues 409 on conflicting fingerprint. Commit associates the exact file set with explicit ordinal/`attached` lifecycle, enqueues `process` jobs and a `dispatch` job and creates pending `AssistantMessageContext`; legacy text follow-ups get a durable task without retry semantics. `messages.service.ts` uses a 25 s synchronous wait then returns 504-safe task identifiers for polling. History/manifests map attachment descriptors, context manifests and partial-output metadata additively.

**T10 — Web frontend: DONE.** `apps/frontend/src/app/features/assistant/`: `services/assistant-attachments.service.ts` (+ spec), attachment models, standalone complete-file components `components/attachment-picker`, `attachment-list`, `attachment-coverage`. Playwright suite `apps/frontend/e2e/assistant-attachments.spec.ts` passes 2/2. Frontend build passes and unit suite runs green (recorded count 219).

**T11 — Mobile: DONE.** `apps/mobile/lib/features/assistant/`: repositories/use cases/models with tolerant parse, `attachment_local_datasource.dart`/`attachment_remote_datasource.dart` (multipart upload rebuilding the body on token refresh via `rebuildBody`, 5-minute transfer timeouts), presentation provider/widgets using stable `clientMessageId`. iOS bridge: `ios/Runner/AppDelegate.swift` `AttachmentBridge` over `PHPickerViewController` on channel `cl.softmaking.kyrae/attachments` preserving original resource bytes (20 MiB/255-byte-name guard, no blanket Photos authorization). Android: `MainActivity.kt` original-bytes save bridge with distinct `SAVE_BUSY`/`SAVE_FAILED` errors. `flutter analyze` clean; Flutter test suite green (recorded 96 tests, 87 new). A prior Riverpod dispose crash in `attachment_provider.dart` was fixed: `onDispose` now mirrors reads into an epoch instead of asserting access to `state`.

**T12 — Packaging/docs: PARTIAL.** Verified: compose single shared `attachments-storage` volume between backend and worker (env-file `SERVER_ROOT` pattern intact; compose validation recorded as `COMPOSE_VALID`); `README-worker-ops.md` updated with ops/e2e commands. NOT done, still required before activation/release: modern amd64 worker build, worker seccomp profile finalization (currently documented as open), live model profile validation, nginx proxy-path e2e, physical HEIC gallery device proof.

### QA evidence and bugs fixed (T13, partial)

- `apps/backend/test/assistant-attachments.e2e-spec.ts` runs against an ephemeral `postgres:18` **without touching the configured DB**; env helper contract `KYRAE_ATTACH_E2E_DB_{HOST,PORT,NAME,USER,PASS}`; suite skips cleanly when unset. Suite recorded **9/9 passing** (9 focused `it()` cases: auth, truthful unavailable capabilities, batch idempotency, staging/replay/conflict + owner-only bytes, selection validation, atomic commit/retained downloads, removal/cancellation, runtime revocation, relative-root 503).
- Two real product bugs found and fixed via this e2e, verified in current source: (1) `attachment-multipart.service.ts` busboy `parts` limit raised 2→3 to permit the actual one-field-plus-file part sequence; (2) post-multipart-pipeline `destroy` error listeners so abort/cleanup paths are deterministic instead of late-crash. Also fixed `test/helpers.ts` to default-import supertest and switching e2e specs to import-star/default usage accordingly (verified current file).

### Executed unit totals

Backend unit 65 pass (11 suites, incl. the QA-driven audit regression test; the 65th pre-QA count was an obsolete debug harness removed before QA); frontend unit 219 pass + attachment Playwright e2e 2 pass; mobile 96 pass (87 new); worker 21/21 unit + 13/13 local e2e checks, 0 failures. Backend `assistant-attachments.e2e-spec.ts` 9/9. Hermes live budget 16/16 consumed; **no model calls during implementation**.

### QA decisions and follow-ups (2026-10-28, post-implementation)

- Independent QA verdict: **ACCEPT** of this feature (all clusters PASS; worker CONDITIONAL-PASS pending budget alignment, now resolved). QA used 0 live model calls.
- QA finding R1 (pre-existing `GET /audit-events` 500 via Non-column `fullname` select) fixed as a separate user-approved bugfix: `apps/backend/src/audit/audit.service.ts` `getUserMap` selects real columns and composes the display name; artifact `specs/bugs/audit-events-native-fullname-500/bugfix-spec.md`. Evidence: audit e2e 10/10, auth 9/9, users 7/7, unit 65/65, lint+build clean.
- QA finding R3 resolved by aligning worker budgets to the approved Q07 values: `WORKER_JOB_DEADLINE_SECONDS` 600→120, `WORKER_CPU_SECONDS` 120→60 (compose + config defaults) and OCR per-page timeout 20→15 in `parsers/pdf.py`. Evidence: worker unit 21/21 and local e2e 13/13, 0 failures; slowest job 221 ms. `WORKER_CPU_SECONDS` remains reserved/test-and-doc-aligned; no new enforcement invented.
- QA finding R2 (count drift) and R4 (pre-existing Angular bundle budget warning) acknowledged; R4 remains tracked, non-blocking.

### Truthful residual gaps vs approved design (open, block G1–G3/G4)

- Mobile physical-device gallery original-hash retention and Android parity (G3).
- Modern amd64 worker image build; worker seccomp profile not finalized; target-host isolation proofs (G2).
- Live Hermes profile validation (grounding/policy/privacy/accounting) with the consumed 16/16 live budget (G1); capability remains `available=false`.
- nginx proxy-path e2e (upload ceiling/deadlines/Socket.IO under real proxy) not run.
- Worker-side derivative cleanup granularity and restore/proxy release rehearsal remain release evidence, not implementation blockers.
- Independent QA acceptance decision (G4) pending.

## Remaining Work and Authorized Handoff (historical, pre-implementation)

Independent QA reviewed the Phase 0 evidence and correctly did not accept the full feature. It identified proof-harness issues (cumulative budgeting, a weak unexecuted output-cap probe, conflated format/recall diagnostics) and a stale test-plan status. Follow-up QA confirmed those fixes. Later QA reproduced the arm64 native proof, qualified the semantic shape failure/system-policy observation, and requested bind-path hardening; the Developer added twelve regression tests and reran the updated arm64 proof. None closes G1–G3 or establishes full feature acceptance.

T00 remains incomplete; T01 has QA-accepted localized modern-arm64 libheif **1.23.7**/libde265 **1.1.3** actual-HEIC compatibility and partial native proof (nine native, seven sandboxed, eighteen unit cases). Modern amd64 build is **not completed**. T02 lacks physical-gallery retention/Android proof. The remainder of this historical section is superseded by "Implementation Deliverables and Test Evidence (T03–T13)" above; **T03–T11 are now implemented and T12/T13 are partially executed**. Remaining live profile/context/privacy/grounding, target-host/resources and physical-original evidence still gate affected activation/full release. The accepted source/log/encoding/English+Spanish OCR matrix requires no additional business approval; untested encodings/languages are explicit coverage. No full-feature QA acceptance is inferred.

Historical order recorded for reference: **T03 contracts → T04 migration → T05 storage → T06 access/uploads → T07 worker → T08 envelope/context/output guards → T09 messaging/history → T10 Angular → T11 Flutter → T12 packaging/activation evidence → T13 independent QA** — this order was followed during implementation. Activation waits for applicable residual proofs. No build below is being rerun, and **no live Hermes validation, physical gallery proof or production deployment is claimed**.
