# Implementation Report: OpenClaw Web Message

## Status

Implemented and validated.

## Scope

HU-001: send text messages from web to OpenClaw through the Kyrae backend.

## Implemented Changes

- Added roadmap checklist at `docs/roadmap/personal-assistant-openclaw-checklist.md`.
- Added shared OpenClaw assistant contracts.
- Added backend `messages` module with `POST /messages`.
- Added backend `OpenClawService` adapter with mock and HTTP modes.
- Added `conversations` and `messages` entities.
- Added TypeORM migration for assistant messages.
- Added `ASSISTANT_CHAT_USE` permission to seed.
- Added OpenClaw adapter environment variables.
- Added Angular assistant feature at `/assistant`.
- Added sidebar entry gated by `ASSISTANT_CHAT_USE`.
- Added mobile assistant chat using asynchronous message tasks and polling.
- Added mobile local best-effort notifications for completed assistant responses while the app is inactive.
- Updated system context and source-of-truth documentation.

## Validation Evidence

- `pnpm backend:lint` passed.
- `pnpm backend:test` passed.
- `pnpm backend:build` passed.
- `pnpm frontend:test` passed.
- `pnpm frontend:build` passed with an existing initial bundle budget warning: 559.74 kB versus 500.00 kB.
- `flutter analyze` passed.
- `flutter test` passed.
- `pnpm --dir apps/backend migration:run` executed `AddAssistantMessageTasks1716010000000` successfully.

## Notes

- Real OpenClaw runtime is not evidenced in this repository.
- Mock mode is used as the default adapter behavior for local development.
- Real mobile push delivery through FCM/APNs remains out of scope; local notifications only work while the app process can poll the backend task.
