# Feature Specification: Assistant Chat Attachments

## Current Execution Status

**Requirements/design/task plan and direct-Hermes constraints amendment: User-approved. T03 onward: AUTHORIZED in aligned task dependency order.** Approval evidence: the latest “apruebo” for `direct-hermes-constraints-addendum.md`, explicitly confirmed by the current user instruction, also authorizes Tech Lead task alignment. Remaining G1–G3 runtime/native/device proofs gate affected activation/full release, not all code. Full-feature QA remains pending. **Live calls: 16/16 exhausted**; later explicit user authorization is required for more model calls, not compilation/mocks/offline tests.

The amendment preserves five originals ×20 MiB (100 MiB aggregate), all approved formats and both clients. It bounds backend-to-Hermes JSON to 9,000,000 bytes and combined supplied text to 60,000 JavaScript UTF-16 units; visible output to 4,096 tokens only with verified serving-model tokenizer, otherwise 16,000 UTF-16 units, raw response to 256 KiB and full-body invocation to 120 seconds. Persist partial-output/accounting disclosures. These guards do not promise internal Hermes generation/compute/cost control; no automatic retry after indeterminate dispatch. The isolated current-turn envelope remains approved. Accepted design source/log/encoding and English+Spanish OCR defaults require no repeat business approval; untested encodings/languages remain explicit coverage.

## Feature Name

`assistant-chat-attachments`

## Objective

Allow authenticated assistant users on web and Flutter mobile to attach documents, source code, and photos to chat messages and ask the assistant to analyze, review, summarize, or compare their contents. Preserve the original files, their association with chat history, and authorized downloads while making processing failures and context limitations visible.

## Context

- Classification: **New Feature**.
- Selected workflow: `.sdd/workflows/new-feature.md`.
- Current role and artifact: Product Owner requirements specification, following `.sdd/agents/product-owner.md` and `.sdd/templates/feature-spec.md`.
- Evidence sources: the user's current instruction and its supplied account of the preceding approval; `AGENTS.md`; `.sdd/README.md`; `.sdd/memory/project-rules.md`; `.sdd/memory/architecture-decisions.md`; `.sdd/memory/coding-preferences.md`; `docs/system-context.md`; `docs/source-of-truth.md`; `specs/product/vision.md`; `specs/product/modules.md`; `specs/features/README.md`.
- Related modules: assistant web and mobile chat, backend messages and agents, authentication, permissions, audit, and shared contracts.
- Current context documents identify persisted assistant sessions/messages, web/mobile chat, `ASSISTANT_CHAT_USE`, backend-authoritative authorization, and Hermes as the default provider with OpenClaw as a secondary provider. Older product/memory summaries describe a narrower mobile scope; the current context/source-of-truth and explicit user scope establish mobile assistant chat relevance here.
- Existing attachment ingestion, extraction, OCR, HEIC conversion, original-file storage, and provider image-understanding support are **Pending / Not evidenced** by the context reviewed. This specification defines required outcomes, not existing implementation claims.

### Approval Evidence and Status

- **Product scope and requirements: user-approved.** The current user instruction explicitly confirms approval for chat attachments only, including both clients, file limits, formats, processing outcomes, history, and downloads.
- The user confirmed the attachment scope and limits, then requested **“aplica”** to proceed with the documented SDD stages.
- The user subsequently replied **“apruebo”** to the technical-design approval request. This approves the recorded design; it does not approve an implementation task plan that has not yet been presented.
- This document records those approved requirements and makes their acceptance outcomes explicit. Any new product decisions arising from the pending items require user confirmation; they are not approved by this document's author.
- **Technical design/task plan/constraints amendment: User-approved; implementation T03 onward authorized in aligned order.** Test plan is aligned, not passed; Phase 0 evidence is recorded in `implementation-report.md`. Production feature remains unimplemented; residual proofs gate activation/release. Modern arm64 libheif 1.23.7/libde265 1.1.3 and actual HEIC proof passed with localized QA acceptance; modern amd64 build is not completed.
- Implementation is not authorized by this Product Owner artifact alone. Required Business Analyst, Architect, Tech Lead, approval, Developer, and QA stages remain governed by the selected workflow.

Approval update: the approved technical design resolves the earlier product-analysis questions below using its recorded defaults, including a nonempty instruction, 24-hour staging expiry, same-conversation retention, readiness rules, processing budgets, and owner-only access. Earlier references to pending technical decisions are historical analysis and must be read with that design. External Hermes vision, native codecs, and deployment compatibility remain unverified; user approval is not runtime validation.

## Scope

Mandatory:

- In scope: attachments in existing assistant chat on Angular web and Flutter mobile; up to five files per message; original-file preservation and downloads; persistent attachment history; document/text extraction; scanned-PDF OCR; HEIC/HEIF conversion; photo understanding; assistant analysis, review, summarization, and comparison; explicit error and context-limit reporting; existing IAM and ownership boundaries.
- Out of scope: execution board, execution-board UI or workflows, new business modules, a general-purpose document-management product, public file sharing, and execution of uploaded source code or instructions as a consequence of attachment processing.

Recommended:

- Future extensions: none committed by this scope. Further formats, limits, or workflows require separate approval.

Implementation / validation pending:

- Processing/provider/storage/lifecycle/context design choices are resolved by the approved design and constraints amendment; implementation and remaining acceptance evidence are pending. Untested text-language/encoding cases remain explicit coverage. Do not silently reduce approved formats or either client.

## Requirements

### R1. Chat Composition and Client Parity

- Both clients must let users select supported files, see each selected filename and size, remove a selected file before submission, and submit attachments with a chat request.
- A message may contain **at most five files**, with each original file **at most 20 MiB (20,971,520 bytes)**. A file exactly at that limit is eligible; a larger file is rejected. Five files of the maximum allowed size must not be rejected by an undisclosed smaller aggregate attachment limit.
- Show validation errors identifying the affected file and limit. Do not silently drop files beyond the count limit or report rejected files as attached. Enforce limits authoritatively in the backend as well as providing client feedback.
- Existing text-only chat remains usable. Both clients must expose equivalent attachment submission, processing outcome, history, and original-download behavior.

### R2. Supported Formats

Required coverage:

| Category | Formats |
| --- | --- |
| Documents | `pdf`, `docx` |
| Images/photos | `jpg`, `jpeg`, `png`, `webp`, `heic`, `heif` |
| Spreadsheets and tabular text | `xlsx`, `csv`, `tsv` |
| Text and structured configuration | `txt`, `md`, `json`, `xml`, `yaml`, `yml`, `toml`, `ini`, `env.example` |
| Logs | Textual log files |
| Source code | Textual source-code languages |

- Treat `env.example` as a compound filename pattern, including `.env.example`; do not infer approval for all `.env` files from that entry alone. Logs and textual source code are approved categories, not a restriction to a single extension.
- The detailed source/log/encoding matrix in the user-approved technical design is accepted for implementation and explicit validation; no additional business approval is needed for that same matrix. Untested encodings/languages remain disclosed coverage, not implied support or permission to narrow approved categories.
- Validate actual content suitability rather than trusting a filename alone. Files outside the approved categories and files whose content cannot be safely recognized or decoded must produce an explicit validation/processing outcome rather than silent acceptance as usable content.

### R3. Content Processing and Assistant Use

- Make readable document content, spreadsheet/tabular content, structured text, logs, and source code available for the requested analysis, review, summary, or comparison. Preserve enough source structure to distinguish files and relevant pages, sheets, rows, or code locations where available.
- PDFs must support selectable text and scanned content through OCR, including scanned portions of mixed PDFs. An image-only PDF must not be reported as successfully read merely because text extraction returned empty content.
- Convert HEIC/HEIF images to JPEG or PNG for processing or display compatibility. Conversion is a derivative: retain the uploaded HEIC/HEIF original unchanged and downloadable.
- Photos must support questions about visible content, including comparisons. OCR alone is not evidence of general photo understanding. The eventual technical design must establish how the required image-understanding outcome is delivered.
- **Hermes vision/image-understanding capability is Not evidenced.** Neither provider names nor generic capability endpoints establish that images can be understood. Do not present mock responses, metadata-only processing, or unverified provider behavior as successful attachment analysis.
- Responses must make clear which files informed the answer and must not claim to have read unavailable or omitted content. Comparison results must identify the compared sources.

### R4. Original Files and Persistent History

- Preserve the original uploaded bytes and original filename association for every successfully attached file. Extraction, conversion, OCR, and context reduction must not replace the downloadable original.
- Persist attachment-to-message/session associations so authorized users can reopen chat history after reload, app restart, or use of the other client and see the files and their processing outcomes.
- Provide original-file downloads from attachment history on both clients. A download must return the original bytes, including for HEIC/HEIF and files only partially processed.
- If an original is unavailable or a download fails, show an explicit error rather than supplying extracted text or a converted image labeled as the original.
- Do not introduce an arbitrary expiry or retention period. Retention/deletion interactions with existing chat lifecycle require clarification before technical approval.

### R5. Processing and Failure Transparency

- Show file-level upload/processing progress or state and a final usable, partially usable, or failed outcome. Users must be able to distinguish an attachment still being processed from one used in an answer.
- Unsupported content, corrupt/password-protected files, decoding failures, OCR failures or no readable text, conversion failures, upload/storage failures, provider incompatibility, provider failure, and processing timeout must produce an explicit file-specific explanation and a meaningful next action where possible.
- Empty content must be distinguished from a successful extraction of meaningful content. If the question cannot be answered from the available content, state that limitation rather than inventing a result.
- If only some files or portions are usable, visibly identify omissions and limit the answer accordingly. A comparison requiring unavailable sources must be identified as incomplete, not reported as a complete comparison.
- An unavailable conversion/OCR/image-understanding dependency is a visible failure condition, not permission to silently remove that approved capability. Such failures do not satisfy successful-format acceptance criteria.
- Failed or interrupted submission must not be displayed as successful. Preserve a clear distinction between files rejected before attachment and files attached successfully but failing later processing.

### R6. Bounded and Transparent Large-Context Handling

- Bound the attachment content used in each assistant request to the approved processing/context budget. Exact budgets and selection behavior are **Pending technical approval**; no numeric token, page, row, or character limit is invented here.
- When any file or combined set exceeds that budget, visibly report partial coverage and identify the affected files and omitted ranges/sections where determinable. The assistant must not imply that an entire file or all compared files were reviewed when only a subset was used.
- Keep the originals and history intact regardless of context reduction. Tell the user how to narrow the question or input when coverage is insufficient.
- The technical design must document finite, testable bounds and observable truncation behavior for both single-file and combined-file cases before implementation approval.

### R7. Ownership, Permissions, and Platform Boundaries

- Require authenticated access under the existing **`ASSISTANT_CHAT_USE`** permission foundation for attachment submission, processing use, history access, and downloads. This specification introduces no new permission codes or business roles.
- The backend must enforce ownership of the associated session/message and attachment for every operation. Knowing or substituting another user's file/session identifier must not allow reading metadata, downloading bytes, attaching their file, or using its extracted content.
- Permission-based UI behavior supports backend enforcement; it must not replace it. Web and mobile consume Kyrae backend APIs and do not obtain internal storage/provider credentials or directly call agent/processing dependencies.
- Apply the existing centralized authorization and security-sensitive audit foundation. Exact audit event mapping remains pending Business Analyst/design review; this document does not invent event codes.

## Backend Impact

- Applies: Yes.
- Modules: existing messages, agents, authentication/permissions, and audit concerns are relevant; any additional module boundary is Pending technical approval.
- Controllers / Services / DTOs: attachment validation, processing outcomes, history association, and authorized downloads are required outcomes. Endpoint shapes, class names, and processing architecture are Pending technical approval.
- Authorization: existing `ASSISTANT_CHAT_USE` and backend-enforced ownership, as specified in R7.
- Audit: reuse existing security-sensitive audit conventions; event details Pending / Not evidenced.

## Frontend Impact

- Applies: Yes.
- Routes / Pages: existing assistant chat composer and session history; no execution board.
- Services / Models: attachment submission, processing outcomes, history, and downloads; detailed changes Pending technical approval.
- Guards: retain centralized permission-based access and backend authority.
- Shared components: reuse opportunities Pending; no component architecture selected here.

## Mobile Impact

- Applies: Yes.
- Within beta scope: Yes, extending the current assistant chat capability identified in current system context.
- Features: Flutter assistant composer, attachment outcomes, session history, and original-file downloads.
- Providers / Router: changes Pending technical approval; no new routing or state-management design selected here.

## Shared Contracts

- Applies: Yes, consistent attachment metadata, associations, processing outcomes, and error/context-coverage information are needed across clients and backend.
- Contract files: `packages/shared-contracts/src/` is canonical; exact files and API shapes Pending technical approval.
- Breaking changes: Pending compatibility assessment; preserve existing text-only behavior. No contracts are changed by this artifact.

## Database Impact

- Applies: Pending technical design; durable attachment/history associations and processing outcomes are required.
- Entities: Pending; no entity or storage layout selected.
- Migrations: required if schema changes are selected, per repository standards; exact migration scope Pending.
- Seed data: no new permissions or seed requirements established by this specification.

## Testing

- Backend: acceptance evidence for limits, content validation, all processing branches, original-byte integrity, bounded context, permissions, and cross-user ownership denial.
- Frontend: composer validation, file outcomes, partial-coverage disclosure, history reload, and original-download behavior.
- Mobile: equivalent Flutter outcomes, history after restart, and download handling.
- E2E: both clients against the backend; representative fixtures across every approved format/category, scanned/mixed PDFs, HEIC/HEIF, photo questions, multiple-file comparison, cross-client history, and failure/limit cases.
- These are product validation outcomes, not a completed test report. The detailed test plan is prepared in `test-plan.md`; execution evidence remains pending.

## Risks

- Risk: provider image support is unverified. Mitigation: require capability evidence and real photo-question acceptance results; report incompatibility explicitly.
- Risk: extraction/OCR or large-context reduction omits relevant information. Mitigation: file/source attribution, visible partial coverage, and no unsupported completeness claims.
- Risk: derived processing loses originals or exposes another user's files. Mitigation: original-byte integrity and ownership acceptance checks for all file operations.
- Risk: broad text-language and document variations conceal unsupported cases. Mitigation: an explicit coverage matrix and observable per-file failures; do not silently narrow approved scope.

## Dependencies

| Dependency / unknown | Status |
| --- | --- |
| Existing chat, authenticated sessions, permission foundation, and provider orchestration | Documented in current context/source-of-truth; attachment-specific integration Pending |
| Source-language, textual log naming, encoding, and representative format coverage matrix | Design matrix accepted; fixture validation pending; untested encodings explicit, no repeat business approval |
| OCR, HEIC/HEIF conversion, extraction, and photo-understanding capabilities | Technical selection approved; partial arm64 native/actual-HEIC and synthetic PNG proof recorded; full acceptance pending |
| Hermes vision support | Narrow synthetic PNG evidence exists; full live-profile/grounding acceptance not established |
| Finite context/processing budgets, coverage selection, and timeout behavior | Approved design as amended by direct-Hermes constraints; implementation/validation pending |
| Durable original storage, lifecycle/retention/deletion behavior, and incomplete-upload handling | Approved design; implementation/validation pending; original/history preservation required |
| Attachment-only submission without accompanying message text | Approved design requires nonempty trimmed instruction; attachment-only is outside this implementation |
| Detailed audit mapping, contracts, database impact, and backward compatibility | Design-approved; implementation and validation pending |
| Technical design, task plan, test plan, implementation, and QA evidence | Design/plan/amendment approved; T03 onward authorized in aligned order; tests/full QA not completed |

## Acceptance Criteria

1. **Both clients:** an authenticated owner with `ASSISTANT_CHAT_USE` can select, inspect, remove, and submit attachments in assistant chat; existing text-only messaging still works.
2. **Limits:** five valid files of 20,971,520 bytes each are accepted for attachment; a sixth file or any file of 20,971,521 bytes is explicitly rejected without silently dropping files. Direct backend submissions enforce the same bounds.
3. **Format coverage:** valid representative fixtures for every listed extension, `env.example` filename pattern, and the confirmed log/source-language matrix can be attached and processed for the requested content-based task. Invalid content disguised by a supported extension receives an explicit outcome.
4. **User value:** representative document, code, and photo requests produce grounded analysis, review, summary, and cross-file comparison, with source-file attribution. Passing photo tests requires visible-content understanding, not only metadata or OCR.
5. **PDF OCR:** a scanned PDF and a mixed text/scanned PDF yield usable content from scanned portions; OCR failure or unreadable pages are disclosed and are not represented as fully read.
6. **HEIC/HEIF:** both formats yield a usable JPEG/PNG derivative for the relevant experience, while an authorized original download is byte-identical to the uploaded file.
7. **History and downloads:** after web reload, mobile restart, and opening the same session in the other client, attachment associations and processing outcomes remain visible and originals remain downloadable byte-for-byte.
8. **Failure cases:** fixtures for corruption, password protection, decoding failure, empty content, OCR/conversion failure, unavailable provider capability, upload/storage/download failure, and timeout show explicit outcomes. Mixed-success requests identify excluded sources and do not claim a complete comparison.
9. **Large context:** inputs exceeding the subsequently approved single-file and combined context bounds produce bounded processing and a visible partial-coverage explanation identifying affected files and omitted portions where determinable; the original download remains complete.
10. **Access control:** unauthenticated users, users lacking `ASSISTANT_CHAT_USE`, and another authenticated user substituting file/session identifiers cannot access or use attachments, metadata, or downloads. Authorized owners retain access according to the same permission foundation.
11. **Scope and approval:** the delivered feature is assistant chat attachments on web and Flutter mobile; no execution board is included. Technical design and task approval are evidenced separately before code implementation, and QA acceptance is evidenced before completion is claimed.

## Business Rules

Business Analyst review under `.sdd/agents/business-analyst.md` and the existing New Feature workflow. **Approved** below means requirements already recorded in this specification's Approval Evidence and Status, not a new approval by the analyst. **Proposed / Pending approval** identifies additional behavior requiring confirmation. No technical design or task approval is granted.

### Approved Requirements and Existing Baseline

- **BR1 — Actors and access (R7):** authenticated session owners with `ASSISTANT_CHAT_USE` may submit attachments, use their content, inspect history/outcomes, and download originals on either client. Enforce both ownership and current permission on every operation; possessing an identifier or previously uploading a file does not grant continuing access. Another user's metadata, originals, derivatives, and extracted content must remain inaccessible. Shared organization/branch membership, an administrator role, or `AUDIT_READ` alone does not override owner-only access. No attachment-specific permission or privileged-reader exception is approved.
- **BR2 — Client parity and iPhone photos (R1–R4):** web and Flutter mobile have equivalent selection, removal, validation, outcomes, history, and original downloads. iPhone HEIC/HEIF photos are included in approved image coverage; conversion must retain the original unchanged. Five files per message and 20 MiB per original remain the approved limits. Native preview limitations must not silently remove HEIC/HEIF submission or original-download support.
- **BR3 — Staging and failed files (R1, R4–R5):** selected or uploading files are not evidence of successful message attachment or assistant use. Distinguish selection/upload, successful attachment, and later processing failure. Rejected files must not appear successfully attached; successfully attached files retain their history, original downloads, and visible processing outcomes even if extraction, OCR, conversion, or provider use fails. Failed downloads must not substitute a derivative for the original.
- **BR4 — Grounded answers (R3, R5–R6):** name the files actually used, disclose unusable files and partial coverage, and identify incomplete comparisons. Empty extraction, OCR-only photo handling, or unavailable provider capability must not be represented as successful full-content understanding.
- **BR5 — Sensitive-operation audit (R7 and current user instruction):** audit security-sensitive attachment operations without recording file bytes, extracted/OCR text, image contents, chat prompts/answers, secrets, or credentials. Audit access does not confer attachment-content access. Exact operation/event mapping and safe metadata remain pending below; no new event codes are asserted as existing.
- **BR6 — Existing chat compatibility (R1 and current user instruction):** preserve existing text-only chat, voice input/transcription, voice output, task status, realtime/polling, and session-history behavior on both clients. Existing voice permission requirements remain applicable; attachment permission coverage does not replace them. Combined voice-plus-attachment composition is not established by compatibility alone.

### Historical Analyst Questions — Resolved by Subsequent Approved Design

The questions below preserve the earlier analysis, not current approval blockers. The subsequent approved technical design resolves these rules; the approved constraints amendment/task alignment governs current execution. Only a genuinely new scope/design change needs new approval.

- **Attachment-only messages:** explicitly **Pending product clarification** per Dependencies. The required `message: string` in `SendAssistantMessageCommand` does not establish whether blank text is acceptable. Neither allowing attachment-only requests nor imposing mandatory accompanying text is approved here.
- **Staged uploads:** proposed rule: any server-held staged original, metadata, derivative, or extracted content is accessible only to its uploader under `ASSISTANT_CHAT_USE`, and may be committed only to a session that user owns. Confirm when attachment becomes durable history, whether staged files can be reused across the owner's sessions/messages, and how cancellation, interruption, session switching, permission loss, and abandoned uploads are handled. No staging expiry or cleanup period is approved.
- **Mixed-success submission:** approved outcomes require per-file transparency and qualified answers, but do not settle whether sending waits for every file, blocks on upload failure, or proceeds with usable files. Confirm that policy, the all-files-failed outcome, and whether retry/resubmission is offered without duplicating messages or attachment associations. No automatic retry or partial-submit policy is approved here.
- **Lifecycle:** confirm attachment/original/derivative handling when messages or sessions are deleted or archived, and any retry/removal rights after submission. Do not infer a new deletion feature, retention period, or loss of approved original/history availability.
- **Audit mapping:** proposed coverage includes upload/attachment commitment, original downloads, denied ownership/permission attempts, sensitive processing failures, and removal/cleanup if subsequently approved. Proposed minimal metadata: actor, resource identifiers, operation/outcome, timestamp, and sanitized reason codes; omit filenames and content-bearing provider errors by default. Confirm coverage, safe metadata, and mapping to existing or explicitly approved new audit actions before technical approval.
- **Authorization response and asynchronous work:** confirm safe denial behavior without leaking another owner's resource existence, and handling of permission revocation during staged upload, processing, or download. These choices must preserve R7; public links, shared-session access, or administrator content access would change approved scope and need explicit user approval.

## Functional Impact

- **Web and mobile users:** existing assistant composition/history gains file-level progress, usable/partial/failed outcomes, source attribution, context-limit notices, and original downloads. Mobile beta applies because current system context includes assistant chat; iPhone HEIC/HEIF is an explicit acceptance case. Picker, preview, save/share destination, interruption recovery, and staged-file UX details await design/approval without reducing parity.
- **Backend and authorization:** messages/sessions, processing use, history, download access, and any proposed staging must preserve owner isolation and the existing permission foundation. Both clients use Kyrae APIs only. Organizations/branches gain no attachment-sharing rights, membership rules, or active tenant scope from this feature. Seeded `ASSISTANT_CHAT_USE`, `ASSISTANT_VOICE_USE`, `ASSISTANT_VOICE_OUTPUT_USE`, and `AUDIT_READ` remain distinct; no seed change is established.
- **Contracts and compatibility:** reviewed `packages/shared-contracts/src/index.ts`, `openclaw/openclaw.contracts.ts`, `agents/agent.contracts.ts`, `voice/voice.contracts.ts`, and `audit/audit.contracts.ts`. Current message/agent request contracts are text-oriented and define no typed attachment lifecycle/download contract; generic metadata and provider capability maps are not proof of attachment or vision support. Future shared-contract work must express file outcomes/history consistently while preserving existing text and voice consumers. Endpoint shapes and contract changes are outside this analysis.
- **Audit and configuration:** existing audit contracts provide action/resource identifiers and metadata but no defined attachment action constants; mapping remains pending. Content-free audit traceability is separate from owner-only attachment history. Existing audit-view permissions remain unchanged. No new configuration UI, feature flag, provider selection, or storage/retention setting is approved; configurable limits must not silently narrow approved limits or formats.
- **Evidence and handoff:** rules trace to R1–R7, Dependencies, the current user instruction, `docs/system-context.md`, `docs/source-of-truth.md`, `docs/architecture/authorization.md`, `docs/architecture/organizations-and-branches.md`, `docs/architecture/audit.md`, the reviewed contracts, and permission entries in `apps/backend/src/database/seed.ts`. Resolve the pending product/authorization choices before their dependent design decisions; format/provider proof, budgets, storage, contracts, migration impact, and design/task approval remain outstanding as already recorded. This review changes documentation only.
