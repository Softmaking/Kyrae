# Feature Spec: OpenClaw Web Message

## Overview

Implement the first usable assistant interaction path: an authenticated web user writes a text message, the frontend sends it to the Kyrae backend, the backend persists the user message, forwards the instruction to the OpenClaw adapter, persists the assistant response, and returns the response to the browser.

## Classification

New Feature.

## Goals

- Provide `HU-001`: send a web text message to OpenClaw through the backend.
- Preserve the rule that clients never call OpenClaw directly.
- Persist conversation and message history in PostgreSQL.
- Keep the first increment text-only.
- Keep voice, WebSocket, WhatsApp, Telegram, integrations, and Jarvis visual design out of this increment.

## Out Of Scope

- Real voice input or output.
- WebSocket or streaming responses.
- WhatsApp, Telegram, Gmail, Calendar, Drive, or custom integrations.
- Agent task execution beyond a basic OpenClaw adapter call.
- Mobile assistant UI.
- Runtime OpenClaw agent implementation inside this repository.

## User Story

As a user, I want to write a message in a web interface so that the backend sends it to OpenClaw and returns a response.

## Functional Requirements

- The user must be authenticated.
- The user must have `ASSISTANT_CHAT_USE` permission.
- The frontend must expose a simple assistant chat page.
- The frontend must send messages only to the Kyrae backend.
- The backend must expose `POST /messages`.
- The backend must validate the message payload.
- The backend must create or reuse a conversation.
- The backend must persist the user message.
- The backend must send the normalized request to `OpenClawService`.
- The backend must persist the assistant response.
- The backend must return the assistant response and message metadata.
- The backend must log basic audit events for message processing.

## Permissions

Required permission:

- `ASSISTANT_CHAT_USE`

Rules:

- The endpoint must use `JwtAuthGuard` and `PermissionsGuard`.
- The frontend route must use the existing `authGuard` and `permissionGuard`.

## Frontend Behavior

- Add `/assistant` route under the authenticated dashboard layout.
- Add a menu entry visible only to users with `ASSISTANT_CHAT_USE`.
- Show a simple chat page with an input and send button.
- Show sent user messages and assistant responses.
- Show loading state while the backend processes the message.
- Show a readable error message when the request fails.

## Backend Behavior

- Add a messages module with controller, service, DTO, entities, and TypeORM migration.
- Add an OpenClaw adapter service.
- Use mock mode by default so local development works before real OpenClaw runtime exists.
- Configure real OpenClaw calls through environment variables.
- Keep controllers lightweight and business logic in services.
- Keep DTO validation explicit.

## Data Model

- `conversations`: stores per-user conversation sessions.
- `messages`: stores user and assistant messages.

## Acceptance Criteria

- An authenticated user with `ASSISTANT_CHAT_USE` can open `/assistant`.
- The user can type and submit a message.
- The backend receives the message through `POST /messages`.
- The user and assistant messages are persisted.
- The backend returns an assistant response.
- The frontend displays the assistant response.
- Users without permission are blocked by frontend route guard and backend guard.
- OpenClaw direct frontend calls are not introduced.
