# Technical Design: OpenClaw Persistent Sessions

## Approach

Expose sessions as the canonical API concept while retaining `conversations` as the internal persistence table for this iteration.

## Data Model

- `conversations` remains the internal session table.
- `messages` gains `status` and `updated_at`.
- `assistant_message_tasks` remains the async task table.
- `openclaw_requests` is added to persist request/response trace data.

## API

- `GET /sessions` lists the current user's assistant sessions with cursor pagination. The default page size is 10 and the backend caps requested limits defensively.
- `GET /sessions/:id/messages` lists messages for one session owned by the current user.
- `POST /messages` accepts `sessionId` and returns `sessionId`.
- `POST /messages/tasks` accepts `sessionId` and returns task data with `sessionId`.
- Existing `conversationId` remains temporarily supported for current clients.

## Contracts

Shared contracts define `AssistantSessionDto`, `AssistantMessageDto`, `AssistantMessageTaskDto`, and OpenClaw request trace types.

## Security

Every read/write operation checks session ownership and requires `ASSISTANT_CHAT_USE`.

## Audit

Existing audit events remain. OpenClaw request trace is persisted separately for operational review.
