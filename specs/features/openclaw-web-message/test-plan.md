# Test Plan: OpenClaw Web Message

## Backend Validation

- Run `pnpm backend:lint`.
- Run `pnpm backend:test`.

## Frontend Validation

- Run `pnpm frontend:build`.
- Run `pnpm frontend:test`.

## Manual Acceptance Checks

- Log in as an admin seeded with all permissions.
- Open `/assistant`.
- Type a message and submit it.
- Verify the user message appears in the chat.
- Verify the assistant response appears in the chat.
- Verify browser network calls only target the backend API.
- Verify `POST /messages` rejects unauthenticated requests.
- Verify `POST /messages` rejects users without `ASSISTANT_CHAT_USE`.

## Deferred Tests

- Real OpenClaw HTTP integration tests are deferred until a runtime endpoint is available.
- WebSocket and voice tests are out of scope for HU-001.
