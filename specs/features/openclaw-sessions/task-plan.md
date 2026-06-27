# Task Plan: OpenClaw Persistent Sessions

## Backend

- Add `openclaw_requests` entity and migration.
- Add message status persistence.
- Add session list and message history endpoints.
- Persist OpenClaw request/response lifecycle for sync and async flows.

## Frontend

- Add session list UI.
- Load previous session messages.
- Maintain active `sessionId`.
- Show processing/error states.

## Mobile

- Accept `sessionId` in addition to existing conversation-compatible fields.

## Documentation

- Update system context and source-of-truth.
- Update implementation report.

## Validation

- `pnpm backend:lint`
- `pnpm backend:build`
- `pnpm frontend:build`
- `flutter analyze`
- `flutter test`
