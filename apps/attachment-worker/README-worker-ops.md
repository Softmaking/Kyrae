# Attachment worker operations

Internal attachment processing worker (coordinator + parsers). Claims ONLY
`kind='process'` jobs from `assistant_attachment_jobs`; backend owns
dispatch/delete/queue-failure cleanup.

## Runtime contract

- PostgreSQL job queue: `SELECT ... FOR UPDATE SKIP LOCKED`, 60 s lease,
  15 s heartbeat, generation fencing, max 2 transient attempts, `next_run_at`
  backoff for requeues.
- Every publish is one DB transaction: derivative rows + `processing_status`'
  `coverage` + job completion; fenced on `state='running'`, `lease_owner`,
  `generation`, unexpired lease, `lifecycle='attached'` and matching
  `processing_version`.
- Derivative objects are written to the derivatives root BEFORE the publish
  transaction (opaque lowercase UUID keys, exactly one `.upload` staging name
  pattern, fsync + hard link finalize). Failed publishes leave orphan objects
  for backend reconciliation; originals are never modified or removed.
- No database schema provisioning. Startup polls until the migrated schema is
  present, then refuses to start forever with a single noisy exit if it never
  appears (see `src/attachment_worker/db.py`).
- Access re-check joins the seeded IAM schema only (`users`, `users_roles`,
  `roles_permissions`, `permissions` with `ASSISTANT_CHAT_USE`) and refuses to
  publish for revoked owners without deleting data.
- No providers, no model or Hermes calls, no network from the worker itself.

## Environment variables

| Variable | Meaning | Default |
| --- | --- | --- |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASS` | Same names as `apps/backend/.env.example`. `DB_PASS`, NOT `DB_PASSWORD`. | required |
| `ASSISTANT_ATTACHMENT_STORAGE_ROOT` | Backend-staged originals root; derivative keys are also published flat inside it. | required |
| `WORKER_POLL_SECONDS` | Idle poll interval. | `2` |
| `WORKER_LEASE_SECONDS` | Job lease. | `60` |
| `WORKER_HEARTBEAT_SECONDS` | Lease heartbeat. | `15` |
| `WORKER_MAX_TRANSIENT_ATTEMPTS` | Cap for transient retries (max 2). | `2` |
| `WORKER_JOB_DEADLINE_SECONDS` | Overall processing soft deadline. | `120` |
| `WORKER_CPU_SECONDS` | Reserved for per-file CPU guard tuning. | `60` |

Secret handling: only the five `DB_*` variables above are read plus the two
`ASSISTANT_ATTACHMENT_*` roots and the `WORKER_*` tuning variables. Nothing
else is read from the environment or from secret files.

## Telemetry

JSON lines on stderr: `job_id`, `state`, `attempts`, `code`, `duration_ms`.
Never filenames, content, hashes, URLs, tokens or raw DB errors.

## Image

`apps/attachment-worker/Dockerfile`
- multi-stage, pinned base `python:3.12-slim-bookworm@sha256:6dd8b6da...`
- runtime apt pins: poppler 22.12.0-2+deb12u3, tesseract 5.3.0-2 (+eng/spa data),
  libjpeg62-turbo 1:2.1.5-2, libseccomp2 2.5.4-1+deb12u1, dejavu fonts
- libheif 1.23.7 + libde265 1.1.3 are source-built in the `codec-builder`
  stage with SHA-verified release assets (`apps/attachment-worker/build/codecs.py`)
- runtime python deps pinned in `apps/attachment-worker/requirements.txt`
  (`psycopg[binary,pool]==3.2.13`, `Pillow==11.3.0`); DOCX/XLSX intake is
  stdlib `zipfile` + expat only, so no python-docx/openpyxl/lxml at runtime
- nonroot `65534:65534`, read-only-friendly, no published ports, no socket

BUILD ARGUMENTS: `CODEC_BUILD_JOBS` (1-8, default 2).

## Local deployment (root docker-compose)

The `attachment-worker` service depends on the already existing
`kyrae-network` external network and `kyrae-postgres` service names, mounts two
persistent volumes:

- `attachments-storage` → `/srv/attachments` (rw for backend and worker; derivative keys are flat inside it)

Compose hardening: `read_only: true`, tmpfs `/tmp` 512 MiB, `cap_drop: ALL`,
`no-new-privileges`, `pids_limit 64`, `mem_limit 2g`, `cpus 2`, restart
`unless-stopped`, `depends_on backend: service_healthy`. `DB_*` values come
from the same `${SERVER_ROOT}/secrets/kyrae/backend.env` env_file that the
backend consumes, so no secrets are committed here.

One-time boot sequence after first provisioning:

```bash
docker compose run --rm backend-migrate   # backend-owned migrations
docker compose run --rm backend-seed
docker compose up -d backend
docker compose up -d attachment-worker    # readiness-polls until schema lands
```

`ASSISTANT_ATTACHMENT_WORKER_VALIDATED` stays backend-owned (backend env file;
the worker does not read it) and gates feature activation per PROTOCOL.

## Local e2e (no backend needed)

Build the image, then run the self-contained harness on ephemeral
postgres:18:

```bash
docker build --target test -t kyrae-attachment-e2e:local apps/attachment-worker/
apps/attachment-worker/tools/run_local_e2e.sh kyrae-attachment-e2e:local
```

Pure unit tests (stdlib only, no DB):

```bash
docker run --rm kyrae-attachment-e2e:local
```

Status (arm64, local): unit 21/21 passed; e2e 13/13 expectations green
(`.env` → `ATTACHMENT_UNSUPPORTED_CONTENT`, corrupt HEIC →
`ATTACHMENT_CORRUPT`, revoked owner → `ATTACHMENT_ACCESS_REVOKED`,
oversized text → `partial` + truncated, unattached draft job never claimed).

Covered e2e flow: batch → attachment row + real file → `process` job → claim →
derivatives → coverage JSON → `processing_status` update → completed job, plus
explicit `failed` outcomes (`.env` rename, corrupt HEIC header, revoked
access) and a `lifecycle='ready'` guard job that must stay unclaimed.

## Known scope gaps (deliberate, tracked)

- Real HEIC decode evidence is the T01 proof chain (real-photo arm64 pass);
  the e2e harness covers header-corrupt rejection only, actual HEIC decoding
  is not rerun here. HEVC family support comes from heif-dec/libde265.
- Native amd64 production image build still unexecuted; the arm64 image is the
  current release candidate (runtime target builds clean in ~6 min with
  `--build-arg CODEC_BUILD_JOBS=4`). Use `CODEC_BUILD_JOBS=8` and a long build
  timeout for the first amd64 attempt; the codec build is cacheable so
  subsequent builds are fast.
- Worker-side seccomp profile is not finalized; the compose posture is
  `no-new-privileges` + cap drop + read-only fs, and G1-G3 residual gates stay
  backend/release owned.
