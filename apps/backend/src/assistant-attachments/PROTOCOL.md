# Backend / Python attachment protocol

Canonical HTTP DTOs: `packages/shared-contracts/src/attachments/attachment.contracts.ts`.
Schema: migration `1716090000000-add-assistant-attachments.ts`; the six agreed
snake_case tables are unchanged. Backend-only attachment columns added:
`upload_lease_until timestamptz`, `upload_generation uuid`. All new timestamps
use `timestamptz`. Original and derivative keys are flat, lowercase UUID strings
with no extension, relative to `ASSISTANT_ATTACHMENT_STORAGE_ROOT`. Temporary
backend writers use `<UUID>.upload`. Never use filenames as keys. Shared backend
and coordinator filesystem credentials must permit private reads/writes; parsers
must not receive root access. Root and ancestors must not be symlinks.

Worker claims **process only**; backend claims **dispatch/delete only**. Claim
under `FOR UPDATE SKIP LOCKED`, increment `generation` and `attempts`, set a
60-second lease, heartbeat every 15 seconds. Every publish transaction must
check running state, generation, lease owner and unexpired lease before writing
derivatives/outcomes and completing the job. Check fresh owner permission/account
before processing/publishing; stop on revocation without deleting originals.
At most two local transient attempts; never retry possible model receipt.
Backend dispatch waits for all cutoff files to have terminal processing states.

Processing must leave `lifecycle=attached`. Set `processing_status` to
`usable|partial|failed`, `coverage` to canonical `AttachmentCoverageDto`, and
only safe error codes/messages. Derivative text is UTF-8 JSON
`[{"locator": <canonical AttachmentSourceLocator>, "text": "..."}]`, at most
2 MiB per original. `kind=image` is normalized JPEG/PNG <=1 MiB, long edge <=2048;
`metadata.width` and `metadata.height` are positive integers. Thumbnail <=128 KiB,
JPEG/PNG. Derivative rows use the current `processing_version`, `part_index`,
opaque immutable storage key, actual byte size and private SHA-256. Originals
are never overwritten. A general image without a normalized image derivative
is not usable on the strength of OCR alone. No raw content in telemetry.

Backend delete leaves an `expired` attachment tombstone and completed delete
job after physical deletion. FKs restrict deletion of attachment-bearing
conversations/users/messages: metadata cannot cascade away and strand objects.
No new conversation-deletion API is introduced. Attached originals have no
age expiry. Staging expires after 24 hours. Active upload lease is ten minutes;
request maximum is 300 seconds. Delete waits 310 seconds after cancellation to
avoid racing a bounded writer. Orphan reconciliation uses 48-hour grace and
authoritative database reference checks. Back up database and storage together.

## Model profile activation

`ASSISTANT_MODEL_PROFILES_JSON` is an array of backend-private objects:

```json
{
  "provider": "HERMES",
  "model": "exact-configured-model",
  "version": "profile-version",
  "evidenceVersion": "validation-evidence-version",
  "modelIdentityVerified": false,
  "imageInputVerified": false,
  "policyValidated": false,
  "privacyValidated": false,
  "deploymentValidated": false,
  "textAccounting": "utf8_bytes_upper_bound",
  "textAccountingEvidence": "evidence-for-serving-tokenizer-byte-upper-bound",
  "imageTokenUpperBound": 1,
  "imageAccountingEvidence": "replace-with-validated-safe-image-cost-evidence",
  "contextWindowTokens": 32768
}
```

This example is **unavailable**, not an approved profile or a real image cost.
All validation booleans must be explicitly true with real corresponding evidence;
safe per-image upper bound must fit five images in 16000 supplied-input tokens.
The implemented text accounting mode conservatively counts actual UTF-8 bytes
of policy and escaped envelope records, contingent on the documented serving
tokenizer upper-bound evidence. It does not pretend to be a serving tokenizer.
Unknown/invalid configuration is unavailable. Model resolves from agent config,
then `HERMES_DEFAULT_MODEL`. No discovery/model call is made for capabilities.
`ASSISTANT_ATTACHMENT_WORKER_VALIDATED=true` is also required for activation.
Output always reports the honest 16000-UTF-16-unit guard; no verified tokenizer
has been installed and no runtime `max_tokens` parameter is invented.

Invocation uses a single typed latest-user envelope plus authoritative system
policy, `stream:false`, fresh identical opaque session headers, <=9000000
serialized bytes, <=60000 combined text UTF-16 units and <=24000 accounted
supplied tokens. Raw JSON is read incrementally <=262144 bytes, with a 120-second
deadline remaining active through body completion. Invalid/oversize/incomplete
JSON fails; guarded valid partial answers persist output accounting/notice.
Stale `dispatching` leases become indeterminate failures, never automatic sends.
Neither backend guards nor abort establish remote generation/cost cancellation.
