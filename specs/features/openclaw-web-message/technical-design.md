# Technical Design: OpenClaw Web Message

## Architecture

The interaction path is:

Web frontend -> Kyrae backend -> OpenClaw adapter -> OpenClaw runtime or mock response.

The frontend does not call OpenClaw directly. The backend remains responsible for authentication, authorization, validation, persistence, audit, and OpenClaw request normalization.

## Shared Contracts

Add `packages/shared-contracts/src/openclaw/openclaw.contracts.ts` with:

- `AssistantChannel`
- `AssistantMessageRole`
- `SendAssistantMessageCommand`
- `AssistantMessageDto`
- `SendAssistantMessageResponse`
- `OpenClawRequest`
- `OpenClawResponse`

## Backend Modules

Add:

- `messages/messages.module.ts`
- `messages/messages.controller.ts`
- `messages/messages.service.ts`
- `messages/conversation.entity.ts`
- `messages/message.entity.ts`
- `messages/dto/send-message.dto.ts`
- `openclaw/openclaw.module.ts`
- `openclaw/openclaw.service.ts`

## Endpoint

`POST /messages`

Authentication:

- JWT required.

Authorization:

- `ASSISTANT_CHAT_USE` required.

Request:

```json
{
  "message": "Review my pending tasks",
  "conversationId": "optional-uuid",
  "channel": "web"
}
```

Response:

```json
{
  "conversationId": "uuid",
  "userMessage": {},
  "assistantMessage": {},
  "openClawRequestId": "optional-id"
}
```

## OpenClaw Adapter

Environment variables:

- `OPENCLAW_MODE=mock|http`
- `OPENCLAW_BASE_URL=`
- `OPENCLAW_TIMEOUT_MS=10000`

Mock mode returns a deterministic response for local development.

HTTP mode sends the normalized request to `POST {OPENCLAW_BASE_URL}/messages` with timeout handling.

## Database

Add tables:

- `conversations`
- `messages`

Indexes:

- `conversations.user_id`
- `messages.conversation_id`
- `messages.created_at`

## Frontend

Add feature folder:

- `features/assistant/assistant.routes.ts`
- `features/assistant/pages/assistant.component.ts`
- `features/assistant/pages/assistant.component.html`
- `features/assistant/pages/assistant.component.css`
- `features/assistant/services/assistant.service.ts`
- `features/assistant/models/assistant.model.ts`

The component uses Signals for local UI state and delegates HTTP communication to the service.

## Risks

- Real OpenClaw runtime is not evidenced in this repository, so mock mode is required for the first increment.
- HTTP mode depends on an external OpenClaw-compatible endpoint.
