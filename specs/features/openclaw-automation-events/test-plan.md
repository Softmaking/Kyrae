# Test Plan: OpenClaw Automation Events

## Backend

- Build backend.
- Lint backend.
- Verify DTO validation through compile-time integration.
- Verify duplicate events are handled by unique `eventId` service logic.

## Frontend

- Build frontend.
- Verify automation channel label renders as `Automatización`.
- Verify realtime event registration compiles.

## Mobile

- Run `flutter analyze`.
- Run `flutter test`.
- Verify mobile accepts `automation` channel values.

## Manual Validation

- Start backend.
- Call `POST /openclaw/events` with a valid bearer token and payload.
- Confirm assistant session and message are created.
- Repeat same `eventId`; confirm no duplicate message is created.
