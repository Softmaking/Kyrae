# Feature Spec: Automation Native Cron & Notify Mode

## Overview

Replace the external OS cron + `send-event.js` scheduling approach with a native NestJS cron scheduler using `@nestjs/schedule`. Add a `notifyMode` flag to automation schedules so users control when they receive notifications.

## Classification

New Feature.

## Goals

- Migrate automation schedule execution from `send-event.js` + OS cron to a backend-native cron process using `@nestjs/schedule`.
- Unify the execution pipeline: automation schedules use `OpenClawService` (same as web/mobile chat), removing the separate `openclaw agent` CLI call path.
- Add `notifyMode` (`always | on_content | silent`) to automation schedules so users control notification behavior.
- Deprecate `send-event.js` as the primary scheduler (keep file but mark as legacy).

## Out Of Scope

- Real push notifications through FCM/APNs.
- A dedicated notification center UI.
- Split sessions by automation key (V1 uses one inbox session per user).
- Opción A improvements (keep OS cron).
- OpenClaw tool execution redesign.

## Functional Requirements

### Backend Native Cron

- Install `@nestjs/schedule` in the backend.
- Create `AutomationCronService` with a `@Cron('*/1 * * * *')` method that runs every minute.
- On each tick, query `automation_schedules` for active schedules where `lastRunAt + cronExpression` indicates the schedule is due.
- For each due schedule, call `OpenClawService.sendMessage()` with the schedule's `instruction` as the message.
- Use the user's automation inbox session (existing `Automatizaciones de Kyrae` session) as the context.
- Persist the assistant response as an automation message (same flow as `POST /openclaw/events`).
- Update `lastRunAt` after successful execution.
- Handle errors gracefully: log, audit, do not crash the cron loop.
- Emit realtime events for connected clients (user room).

### notifyMode

- Add `notifyMode` column to `automation_schedules` table.
- Three modes:
  - `always`: always show toast + browser notification (current behavior).
  - `on_content`: only notify if the assistant response has substantive content (non-empty, non-trivial).
  - `silent`: execute silently, persist message only, no notification.
- Backend filters notification emission based on `notifyMode`.
- Shared contracts: add `NotifyMode` type to `automation.contracts.ts`.
- Frontend: add radio/select in the automation schedule create/edit form.
- Default value: `always` (backward compatible).

## Security Requirements

- Cron runs within NestJS application context; no external API exposure needed.
- The cron service must respect existing permissions (no direct user invocation).
- notifyMode is a user preference, not a security control.

## Acceptance Criteria

- `@nestjs/schedule` is installed and configured.
- `AutomationCronService` runs every minute and executes due schedules.
- Due schedules produce assistant messages through the same pipeline as chat.
- `lastRunAt` is updated after each successful execution.
- Failed schedules are logged and audited without crashing the cron loop.
- `notifyMode` is persisted, editable from frontend, and respected during notification emission.
- Default `notifyMode` for existing schedules is `always`.
- `send-event.js` still works but is marked as legacy.
- Frontend build passes without budget errors.
