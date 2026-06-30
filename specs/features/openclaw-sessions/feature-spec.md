# Feature Spec: OpenClaw Persistent Sessions

## Status

Approved by direct user request.

## User Story

HU-002: As a user, I want each conversation to have a persistent session so I can resume context, review history, and audit what was sent to OpenClaw.

## Goals

- Convert the assistant chat from a simple request/response flow into a controlled session system.
- Persist user messages, assistant responses, OpenClaw request/response payloads, statuses, errors, channels, and timing.
- Expose session list and session message history to authenticated users.
- Keep the current `conversations` table as the internal implementation for sessions to reduce migration risk.

## Functional Requirements

- Users can list their assistant sessions.
- Users can open a previous session and load its message history.
- Sending a new message creates a session when no `sessionId` is provided.
- Sending a message with an existing `sessionId` reuses the same context.
- Backend stores user messages and assistant responses.
- Backend stores OpenClaw request payload, response payload, status, error message, and duration.
- Backend stores message status: `pending`, `completed`, or `failed`.
- Backend rejects access to sessions owned by another user.

## Non-Goals

- Rename the physical `conversations` table to `sessions` in this iteration.
- Implement real mobile push notifications.
- Implement OpenClaw runtime behavior inside this repository.
- Implement voice features.

## Permissions

- Existing `ASSISTANT_CHAT_USE` permission gates all session and message endpoints.
