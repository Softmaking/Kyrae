# Technical Design: Automation Native Cron & Notify Mode

## Overview

Replace the external `send-event.js` + OS cron scheduling with a native NestJS `@nestjs/schedule` cron service. Add `notifyMode` to automation schedules for notification control.

## Architecture Changes

### New Dependencies

- `@nestjs/schedule` — NestJS cron/scheduling module (add to `apps/backend/package.json`)

### New Backend Module

No new module; the cron service lives inside `automation-schedules` module. We import `ScheduleModule` globally and add `AutomationCronService` as a provider.

### Module Changes

**`AutomationSchedulesModule`** — imports `ScheduleModule.forRoot()`, adds `AutomationCronService` provider, keeps existing exports.

**`OpenClawEventsService`** — new method `processScheduleExecution()` for internal cron execution (avoids coupling to webhook DTOs).

**`AppModule`** — no changes needed (AutomationSchedulesModule already imported).

## Backend: AutomationCronService

### Location

`apps/backend/src/automation-schedules/automation-cron.service.ts`

### Behavior

```typescript
@Injectable()
export class AutomationCronService {
  @Cron('*/1 * * * *')  // every minute
  async tickSchedules(): Promise<void> { ... }
}
```

On each tick:

1. Query `automation_schedules WHERE isActive = true` with their full details.
2. For each schedule, determine if it's due by computing `lastRunAt + cronExpression` against current time. Use `cron-parser` (already a dependency in `openclaw-http-adapter`) or a lightweight approach.
3. For each due schedule:
   a. Call `OpenClawService.sendMessage()` with the schedule's `instruction`.
   b. Call `OpenClawEventsService.processScheduleExecution()` to persist the result.
   c. Update `lastRunAt` on the schedule.
   d. Handle errors per-schedule without crashing the loop.
4. Log errors and audit failures per schedule.

### Due Schedule Detection

Use `cron-parser` (already in workspace dependency tree via `openclaw-http-adapter`). Parse the schedule's `cronExpression` and check if the next occurrence is before or equal to `now`. Skip if `lastRunAt` is already after the next occurrence.

Alternatively, a simpler approach: fetch schedules where `lastRunAt IS NULL OR lastRunAt < now() - interval based on cron`. But cron-parser is more precise.

Decision: Use `cron-parser` npm package directly in backend (add to `apps/backend/package.json`).

### Error Handling

- Each schedule execution is wrapped in try/catch.
- Errors are logged via `Logger`.
- Failed executions are audited with `action: 'AUTOMATION_CRON_FAILED'`.
- The loop continues to the next schedule.

## Backend: OpenClawEventsService.processScheduleExecution()

### Location

`apps/backend/src/openclaw-events/openclaw-events.service.ts`

### Signature

```typescript
async processScheduleExecution(params: {
  schedule: AutomationSchedule;
  instruction: string;
  assistantResponse: string;
  userId: string;
}): Promise<{ sessionId: string; messageId: string }>
```

### Behavior

1. Get or create automation inbox session for the user (reuse existing private method).
2. Save assistant message with `channel='automation'`, `role='assistant'`, status `'completed'`.
3. Emit realtime events to user room (`assistant.automation.received`, `assistant.session.updated`).
4. Audit with action `'AUTOMATION_CRON_EXECUTED'`.
5. Return `{ sessionId, messageId }`.

## Backend: notifyMode

### Shared Contracts — `automation.contracts.ts`

Add:

```typescript
export type NotifyMode = 'always' | 'on_content' | 'silent';
```

Update `AutomationScheduleDto`:

```typescript
export interface AutomationScheduleDto {
  // ... existing fields
  notifyMode: NotifyMode;
}
```

Update `CreateAutomationScheduleCommand`:

```typescript
export interface CreateAutomationScheduleCommand {
  // ... existing fields
  notifyMode?: NotifyMode;
}
```

`UpdateAutomationScheduleCommand` already extends `Partial<CreateAutomationScheduleCommand>`, so it inherits `notifyMode`.

### Entity — `automation-schedule.entity.ts`

Add column:

```typescript
@Column({ name: 'notify_mode', type: 'varchar', length: 20, default: 'always' })
notifyMode!: NotifyMode;
```

### Migration

Create migration `1716070000000-add-notify-mode.ts`:

```sql
ALTER TABLE automation_schedules ADD COLUMN notify_mode VARCHAR(20) NOT NULL DEFAULT 'always';
```

### DTOs

`CreateAutomationScheduleDto` — add:

```typescript
@IsOptional()
@IsString()
@IsIn(['always', 'on_content', 'silent'])
notifyMode?: NotifyMode;
```

`UpdateAutomationScheduleDto` — inherits via `PartialType`.

### Service

`AutomationSchedulesService.toDto()` — include `notifyMode` field.

`AutomationSchedulesService.create()` — apply `dto.notifyMode ?? 'always'`.

### Frontend — Form

In `automation-schedules.component.html`, add a select/radio after the cron expression field:

```html
<div>
  <label class="...">Notificar cuando</label>
  <select [(ngModel)]="formData.notifyMode" name="notifyMode" class="...">
    <option value="always">Siempre</option>
    <option value="on_content">Solo si hay contenido relevante</option>
    <option value="silent">Silencioso (sin notificacion)</option>
  </select>
</div>
```

### Frontend — Model

Update `apps/frontend/src/app/features/automation-schedules/models/automation-schedules.model.ts` to include `notifyMode: string`.

### Frontend — Service

Update `create()` and `update()` calls to include `notifyMode`.

## Frontend: Notification Filtering

### `OpenClawEventsService` — notification emission

In `emitAutomationReceived()`, before emitting to user room, check the schedule's `notifyMode`:

```typescript
// Lookup schedule to get notifyMode
const schedule = scheduleNotifyModeCache.get(userId + ':' + automationKey);
if (schedule?.notifyMode === 'silent') return; // don't emit
if (schedule?.notifyMode === 'on_content' && !hasSubstantiveContent(content)) return;
```

Alternatively, pass `notifyMode` from the calling context:

For `processScheduleExecution()`, the `schedule` is available directly, so we can check before emitting.

For `receiveEvent()` (external webhook), we need to look up the schedule. Add a repository query:

```typescript
const schedule = await this.scheduleRepository.findOne({
  where: { userId, automationKey, isActive: true },
});
const notifyMode = schedule?.notifyMode ?? 'always';
```

### Content Check for `on_content`

A helper method:

```typescript
private hasSubstantiveContent(content: string): boolean {
  const stripped = content.replace(/\*+/g, '').replace(/\n+/g, ' ').trim();
  return stripped.length > 20; // more than just a title
}
```

## Deprecation of send-event.js

Add a deprecation notice comment at the top of `apps/openclaw-http-adapter/src/send-event.js`. The file is kept for fallback but the recommended approach becomes the backend cron.

## Documentation Updates

- `docs/system-context.md`: update automation scheduling section to mention the backend-native cron.

## Files Changed

### Shared Contracts

- `packages/shared-contracts/src/automation/automation.contracts.ts` — add `NotifyMode`, update interfaces

### Backend

- `apps/backend/package.json` — add `@nestjs/schedule` and `cron-parser`
- `apps/backend/src/automation-schedules/automation-schedule.entity.ts` — add `notifyMode` column
- `apps/backend/src/automation-schedules/automation-cron.service.ts` — **new file**
- `apps/backend/src/automation-schedules/automation-schedules.module.ts` — import `ScheduleModule`, add provider
- `apps/backend/src/automation-schedules/dto/create-automation-schedule.dto.ts` — add `notifyMode`
- `apps/backend/src/automation-schedules/automation-schedules.service.ts` — update `toDto()`, `create()`
- `apps/backend/src/automation-schedules/dto/update-automation-schedule.dto.ts` — no change (inherits)
- `apps/backend/src/openclaw-events/openclaw-events.service.ts` — add `processScheduleExecution()`, add `notifyMode` filtering
- `apps/backend/src/openclaw-events/openclaw-events.module.ts` — add `ScheduleModule` if not already imported
- `apps/backend/src/database/migrations/1716070000000-add-notify-mode.ts` — **new migration file**
- `apps/openclaw-http-adapter/src/send-event.js` — add deprecation notice

### Frontend

- `apps/frontend/src/app/features/automation-schedules/models/automation-schedules.model.ts` — add `notifyMode`
- `apps/frontend/src/app/features/automation-schedules/services/automation-schedules.service.ts` — include `notifyMode`
- `apps/frontend/src/app/features/automation-schedules/pages/automation-schedules.component.ts` — form data include `notifyMode`
- `apps/frontend/src/app/features/automation-schedules/pages/automation-schedules.component.html` — add notifyMode selector, display column

### Docs

- `docs/system-context.md` — update automation scheduling section
