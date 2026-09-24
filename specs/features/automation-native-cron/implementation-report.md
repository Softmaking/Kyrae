# Implementation Report: Automation Native Cron & Notify Mode

## Summary

Replaced the external `send-event.js` + OS cron scheduling with a backend-native NestJS cron process (`@nestjs/schedule`). Added `notifyMode` (`always | on_content | silent`) to automation schedules.

## Changes Made

### Shared Contracts
- Added `NotifyMode` type and updated `AutomationScheduleDto`, `CreateAutomationScheduleCommand`.

### Backend
- Installed `@nestjs/schedule` and `cron-parser`.
- Added `notifyMode` column to `AutomationSchedule` entity.
- Created migration `1716070000000-add-notify-mode.ts`.
- Updated `CreateAutomationScheduleDto` with `notifyMode` validation.
- Updated `AutomationSchedulesService.toDto()` and `create()`.
- Created `AutomationCronService` with `@Cron(EVERY_MINUTE)` — checks due schedules via `cron-parser`, executes via `OpenClawService`, persists via `OpenClawEventsService.processScheduleExecution()`.
- Updated `AutomationSchedulesModule` to import `ScheduleModule.forRoot()`, `OpenClawModule`, `OpenClawEventsModule`.
- Added `OpenClawEventsService.processScheduleExecution()` for internal cron execution.
- Added `notifyMode` filtering in `receiveEvent()` and `processScheduleExecution()`.
- Refactored `getOrCreateAutomationSession()` into shared `findOrCreateAutomationSession()`.
- Deprecated `send-event.js` with comment header.

### Frontend
- Added `notifyMode` `<select>` in create and edit modals.
- Added notify mode column to schedules table.
- Updated component form types to use `NotifyMode` from shared contracts.

### Docs
- Updated `docs/system-context.md` automation scheduling section.

## Validation

- `pnpm backend:lint` — clean
- `pnpm backend:build` — clean
- `pnpm backend:test` — 2 suites, 11 tests passed
- `pnpm frontend:build` — builds (budget warning pre-existing, 671 kB vs 500 kB)

## Known Issues

- Frontend bundle budget warning persists (671 kB vs 500 kB limit) — pre-existing, not introduced by this change.
- `pnpm frontend:build` requires Node >=24.15.0 (local v24.13.0 needs NVM workaround).
