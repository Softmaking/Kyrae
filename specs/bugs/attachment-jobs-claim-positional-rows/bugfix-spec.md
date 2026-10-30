# Bugfix spec: attachment-jobs-claim-positional-rows

## Context
- Found on a local native run (no Docker) after the G1 activation while an
  attachment send (`POST /messages` with `uploadBatchId`) repeteadly requeued
  its `dispatch` job: `assistant_message_tasks.id='25f0ce7f...'` stayed
  `pending` and `assistant_attachment_jobs.kind='dispatch'` cycled
  `pending -> running -> pending` with attempts climbing, no Hermes request
  traceback and no context-manifest write.
- With ~20 reuse attempts stacked the dispatch loop never progressed past
  `AttachmentDispatcher.dispatch` because `job` property access returned
  `undefined` for every field.

## Root cause
- `AttachmentJobsService.claim()` executed
  `em.query('UPDATE ... RETURNING *')`.
- On the workspace's TypeORM 1.0 raw-query path, `UPDATE ... RETURNING *`
  results are **positional** rows (`[ ['uuid', ...] ]`) while `SELECT` raw
  results are named-keyed objects. The service typed the result as an entity
  array, so every read `job.id / job.task_id / job.generation` was undefined.
- Downstream effect: `findOneByOrFail({ id: undefined })` raised
  `TypeORMError`; `fenced()` compared `undefined` values; recovery loops
  requeued without progress. `ASSISTANT_MESSAGE_TASKS` rows of affected
  conversation stuck pending; audit showed no failure because the catch path
  never hydrated a task.

## Fix
- Drop `RETURNING *` from the claim update; claim with the existing SELECT row
  (`rows[0].id`) and re-read the claimed job through
  `em.findOneBy(AssistantAttachmentJob, { id })` so downstream code receives a
  fully hydrated entity with correct snake-case property mapping.
- No contract, entity, table or env change; behavior equals the intended one
  under the previous TypeORM version.

## Validation
- Repro: `em.query('UPDATE ... RETURNING *')` confirmed positional
  (`typeof first === 'object'`, `Object.keys(first) === ['0']`) while
  `SELECT` returns named keys — recorded during diagnosis.
- After fix: two cycles dispatched historical pending dispatch jobs
  `e7256a89`, `ee131633`, `84988588`; task `25f0ce7f` progressed to
  `completed` with an assistant reply synthesized from the PDF's extracted
  text (`comprobante-4.pdf`, page 1) — honest quote in the feature log.
- Backend lint clean after removing diagnostic logging; unit suites green.

## Follow-ups
- Sweep for other `em.query('UPDATE/DELETE ... RETURNING')` (none found outside
  `attachment-jobs.service.ts`).
- Two historical tasks (`68402f19`, `d8342946`) reached gated dispatch once the
  fix landed; their associated stale HEIC batches may complete or fail by
  TTL (24 h). Verify in the historical log before marking them.
