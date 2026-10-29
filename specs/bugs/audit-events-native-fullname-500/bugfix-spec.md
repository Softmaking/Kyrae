# Bugfix Spec: `GET /audit-events` 500 on actor/target user id filters

## Status

- Approved by user (direct lightweight execution, no Orchestrator — user-selected "Sí (Recomendado)").
- Date: 2026-10-28.

## Bug Summary

- Symptom: `GET /audit-events` returns HTTP 500 `EntityPropertyNotFoundError: Property "fullName" was not found in "User"` whenever an actor or target user id filter resolves a user into the display-name map (also affects single-event `GET /audit-events/:id` that references such users).
- Output shape, permissions and query semantics of the audit list flow are unaffected; only the user-join display map path is broken.

## Root Cause

- `apps/backend/src/audit/audit.service.ts` `getUserMap` issues `userRepository.find({ select: { id, email, fullName } })`, but `User.fullName` is a computed property populated by `@AfterLoad()` (`apps/backend/src/users/user.entity.ts`), not a database column. TypeORM rejects unknown properties in `select` with `EntityPropertyNotFoundError`.
- Evidence: QA finding R1.

## Expected Behavior

- `GET /audit-events` (with or without actor/target filters) returns 200 and composes `actorUserName` / `targetUserName` exactly like the rest of the codebase: `[firstName, firstSurname, secondSurname].filter(Boolean).join(' ')` (entity `computeFullName()` semantics, nullable `secondSurname` filtered out).

## Fix

- `getUserMap` selects only real columns (`id`, `email`, `firstName`, `firstSurname`, `secondSurname`) and composes the display name in code using the entity's exact composition semantics (no shared helper exists; `UsersService` loads full entities and relies on `@AfterLoad`).
- Query shape for the audit list/DTO mapping remains identical. No business logic changes, no schema changes, no contract changes.

## Task Plan

1. Confirm root cause in `audit.service.ts` and `user.entity.ts`. (done)
2. Apply `getUserMap` fix in `audit.service.ts`. (done)
3. Add minimal unit regression coverage for select shape + composed names in `audit.service.spec.ts`. (done)
4. Run audit/auth/users e2e on isolated ephemeral Postgres (container `kyrae-audit-fix-pg`, network `kyrae-audit-net`, port 5434), plus backend unit, lint, build. (done)
5. Cleanup container/network. (done)

## Test Plan

- Unit: `pnpm --dir apps/backend test` (existing audit service spec + new regression assertions).
- E2E: `GET /audit-events` suite (`audit.e2e-spec.ts`), plus `auth.e2e-spec.ts` and `users.e2e-spec.ts` (closest specs exercising user joins), run with `--runInBand` against the isolated postgres:18 container; DB reached via standard `DB_*` env overrides (this suite shares no `KYRAE_ATTACH_E2E_DB_*` helper).
- Static: `pnpm --dir apps/backend lint`, `pnpm backend:build`.

## Implementation Report

- `apps/backend/src/audit/audit.service.ts`: `getUserMap` now selects `id/email/firstName/firstSurname/secondSurname` only and composes `fullName` with the entity composition semantics before returning the map.
- `apps/backend/src/audit/audit.service.spec.ts`: added `getUserMap` regression test (select contains only real columns — no `fullName` — and actor/target display names are composed from name columns with nullable `secondSurname` filtering).
- Validation evidence (all green):
  - E2E on isolated ephemeral postgres:18 (`kyrae-audit-fix-pg` / `kyrae-audit-net` / 5434, migrations + seed applied, `DB_*` env overrides, `--runInBand`): audit 10/10 pass, auth 9/9 pass, users 7/7 pass (26/26 total).
  - Backend unit (`pnpm --dir apps/backend test`): 11 suites passed / 65 tests passed (includes the new regression test).
  - `pnpm --dir apps/backend lint`: exit 0, no errors/warnings.
  - `pnpm backend:build`: exit 0.
- QA self-check: fix is minimal and scoped; audit list query shape, cursor pagination and DTO mapping unchanged; no business logic changes; no unrelated refactors; no commits made; no `KYRAE_ATTACH_E2E_DB_*` helper needed (suite does not share it).
- Note: did not encounter the out-of-scope supertest-related compile import issue in the audit/auth/users suites.

## Scope Notes

- Any supertest-related compile import issue in other suites is explicitly out of scope (handled by other agents).
