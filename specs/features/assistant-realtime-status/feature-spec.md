# Feature Spec: Assistant Realtime Status

## Status

Approved by direct user request.

## User Story

HU-003: As a user, I want to see assistant processing status in real time so I know when my message was received, when Kyrae is processing, and when the response arrives.

## Goals

- Add realtime assistant status events for web and mobile.
- Keep HTTP message/task endpoints compatible.
- Keep visible user-facing text branded as Kyrae or assistant, not OpenClaw.
- Preserve existing async polling behavior as a mobile fallback when realtime is unavailable.

## Functional Requirements

- Backend emits message received, processing, completed, failed, and session updated events.
- Web can join an active assistant session and update chat state from realtime events.
- Mobile can join an active assistant session and update chat state from realtime events.
- Clients rejoin the active session after reconnecting.
- Backend verifies socket identity and session ownership before joining a room.

## Non-Goals

- Replacing the persisted task system.
- Replacing mobile fallback polling.
- Implementing OpenClaw runtime behavior inside this repository.
