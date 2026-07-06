# Technical Design: OpenClaw Automation Events

## Architecture

OpenClaw cron automation -> Kyrae backend webhook -> PostgreSQL persistence -> Socket.IO realtime -> web/mobile clients.

Kyrae remains the only public client-facing API. The webhook is an internal backend integration protected by a shared secret.

## Endpoint

`POST /openclaw/events`

Authentication:

- Internal bearer token from `OPENCLAW_EVENTS_API_KEY`.

Request:

```json
{
  "eventId": "daily-review-2026-07-04T09:00:00Z",
  "type": "automation.completed",
  "userId": "uuid",
  "automationKey": "daily-review",
  "title": "Revisión diaria",
  "message": "Encontré 3 tareas importantes para hoy.",
  "severity": "INFO",
  "sessionStrategy": "user_automation_inbox",
  "externalRunId": "optional-run-id",
  "metadata": {},
  "createdAt": "2026-07-04T09:00:00.000Z"
}
```

## Shared Contracts

Extend assistant contracts with:

- `AssistantChannel` adds `automation`.
- `AssistantRealtimeEventName` adds `assistant.automation.received`.
- `OpenClawAutomationEventCommand`.
- `OpenClawAutomationEventResponse`.

## Backend

Add `openclaw-events` module with:

- `openclaw-events.controller.ts`
- `openclaw-events.service.ts`
- `openclaw-event.entity.ts`
- `dto/openclaw-automation-event.dto.ts`
- `guards/openclaw-events-api-key.guard.ts`

Persist idempotency and trace data in `openclaw_events`.

## Session Strategy

V1 uses `user_automation_inbox`, one session per user:

- `channel=automation`
- `title=Automatizaciones de Kyrae`
- `metadata.kind=automation_inbox`

The event stores `automationKey` so V2 can switch to one session per automation key without losing classification.

## Realtime

Emit:

- `assistant.automation.received`
- `assistant.session.updated`

Web and mobile clients must subscribe to `assistant.automation.received`.

## Database

Add `openclaw_events` table with unique `event_id` and references to user, session and message IDs.

## Risks

- If OpenClaw sends wrong `userId`, Kyrae rejects the event.
- Local mobile notifications remain best-effort only while the app process is alive.
