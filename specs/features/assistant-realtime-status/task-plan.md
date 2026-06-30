# Task Plan: Assistant Realtime Status

## Backend

- Add Socket.IO dependencies.
- Add shared realtime contracts.
- Add `MessagesGateway`.
- Emit events from assistant task lifecycle.

## Frontend

- Add Socket.IO client dependency.
- Add realtime service.
- Join sessions and update chat state from events.

## Mobile

- Add `socket_io_client` dependency.
- Add realtime service and controller integration.
- Keep polling fallback.

## Validation

- `pnpm backend:lint`
- `pnpm backend:build`
- `pnpm frontend:build`
- `flutter analyze`
- `flutter test`
