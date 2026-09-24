# Task Plan: Automation Native Cron & Notify Mode

## Task 1 — Shared Contracts: Add NotifyMode

**Files:**
- `packages/shared-contracts/src/automation/automation.contracts.ts`

**Changes:**
1. Add `export type NotifyMode = 'always' | 'on_content' | 'silent';`
2. Add `notifyMode: NotifyMode` to `AutomationScheduleDto`
3. Add `notifyMode?: NotifyMode` to `CreateAutomationScheduleCommand`

## Task 2 — Backend Dependencies

**Files:**
- `apps/backend/package.json`

**Changes:**
1. Add `"@nestjs/schedule": "^11.1.27"` to dependencies
2. Add `"cron-parser": "^5.1.0"` to dependencies

## Task 3 — Backend Entity: notifyMode Column

**Files:**
- `apps/backend/src/automation-schedules/automation-schedule.entity.ts`

**Changes:**
1. Import `NotifyMode` from shared contracts
2. Add `@Column({ name: 'notify_mode', type: 'varchar', length: 20, default: 'always' }) notifyMode!: NotifyMode;`

## Task 4 — Backend Migration: Add notifyMode

**Files:**
- `apps/backend/src/database/migrations/1716070000000-add-notify-mode.ts`

**Changes:**
1. New migration file
2. `ALTER TABLE automation_schedules ADD COLUMN notify_mode VARCHAR(20) NOT NULL DEFAULT 'always';`

## Task 5 — Backend DTOs: notifyMode

**Files:**
- `apps/backend/src/automation-schedules/dto/create-automation-schedule.dto.ts`

**Changes:**
1. Import `NotifyMode` type
2. Add `@IsOptional() @IsString() @IsIn(['always', 'on_content', 'silent']) notifyMode?: NotifyMode;`

No changes to `update-automation-schedule.dto.ts` (inherits via `PartialType`).

## Task 6 — Backend Service: Update toDto and create

**Files:**
- `apps/backend/src/automation-schedules/automation-schedules.service.ts`

**Changes:**
1. In `toDto()`, add `notifyMode: schedule.notifyMode`
2. In `create()`, use `dto.notifyMode ?? 'always'` when saving

## Task 7 — Backend: AutomationCronService (New)

**Files:**
- `apps/backend/src/automation-schedules/automation-cron.service.ts`

**Changes:**
1. New service with `@Cron('*/1 * * * *')`
2. Fetch active schedules
3. Use `cron-parser` to determine due schedules
4. Call `OpenClawService.sendMessage()` with instruction
5. Persist via `OpenClawEventsService.processScheduleExecution()`
6. Update `lastRunAt`
7. Error handling per-schedule, log + audit failures
8. Import `Logger` from `@nestjs/common`

## Task 8 — Backend Module: Add ScheduleModule and CronService

**Files:**
- `apps/backend/src/automation-schedules/automation-schedules.module.ts`

**Changes:**
1. Import `ScheduleModule.forRoot()` from `@nestjs/schedule`
2. Add `AutomationCronService` to providers

## Task 9 — Backend: OpenClawEventsService.processScheduleExecution()

**Files:**
- `apps/backend/src/openclaw-events/openclaw-events.service.ts`

**Changes:**
1. Add `processScheduleExecution()` method
2. Reuse existing private method for getting/creating automation session
3. Persist assistant message
4. Emit realtime events respecting `notifyMode`
5. Audit

## Task 10 — Backend: NotifyMode Filtering in Webhook

**Files:**
- `apps/backend/src/openclaw-events/openclaw-events.service.ts`

**Changes:**
1. In `receiveEvent()`, after processing, look up schedule by `userId + automationKey`
2. If `notifyMode === 'silent'`, skip notification emission
3. If `notifyMode === 'on_content'` and content is not substantive, skip notification emission
4. Add `hasSubstantiveContent()` helper

## Task 11 — Frontend Model: notifyMode

**Files:**
- `apps/frontend/src/app/features/automation-schedules/models/automation-schedules.model.ts`

**Changes:**
1. Add `notifyMode: string` to the interface

## Task 12 — Frontend Service: notifyMode in create/update

**Files:**
- `apps/frontend/src/app/features/automation-schedules/services/automation-schedules.service.ts`

**Changes:**
1. Include `notifyMode` in create and update payloads

## Task 13 — Frontend Component: Form notifyMode Selector

**Files:**
- `apps/frontend/src/app/features/automation-schedules/pages/automation-schedules.component.ts`
- `apps/frontend/src/app/features/automation-schedules/pages/automation-schedules.component.html`

**Changes:**
1. In component TS, add `notifyMode` to `ScheduleForm` type and `formData`
2. In HTML, add notifyMode `<select>` in create and edit modals
3. Add column in table for notifyMode display

## Task 14 — Deprecate send-event.js

**Files:**
- `apps/openclaw-http-adapter/src/send-event.js`

**Changes:**
1. Add deprecation notice comment at top

## Task 15 — Documentation

**Files:**
- `docs/system-context.md`

**Changes:**
1. Update automation scheduling section to mention backend-native cron

## Task 16 — Validation

**Commands:**
1. `pnpm backend:lint`
2. `pnpm backend:build`
3. `pnpm backend:test`
4. `pnpm frontend:build`
5. `pnpm --dir apps/backend migration:run`
