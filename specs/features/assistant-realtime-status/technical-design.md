# Technical Design: Assistant Realtime Status

## Transport

Use Socket.IO through NestJS WebSocket gateways. Socket.IO is selected for room support and client reconnection behavior.

## Events

- `assistant.session.join`
- `assistant.message.received`
- `assistant.agent.processing`
- `assistant.agent.completed`
- `assistant.agent.failed`
- `assistant.session.updated`

## Rooms

Each assistant session maps to `session:<sessionId>`.

## Authentication

Clients send the JWT access token in Socket.IO auth payload. The gateway verifies it with `JwtService`.

## Backend Integration

`MessagesService` emits events through `MessagesGateway` while preserving existing HTTP endpoints.

## Client Integration

Web and mobile call `POST /messages/tasks` for asynchronous submission and use realtime events to update UI state. Mobile keeps existing polling as fallback.
