# Feature Spec: Hermes Agent Multi-Provider Integration

## Status

Approved by direct user request on 2026-09-14.

## Goal

Make Kyrae runtime-independent by introducing a provider-neutral agent orchestration layer. Hermes is the default provider and OpenClaw remains available as an explicitly selectable secondary provider.

## Functional Requirements

- Resolve an agent provider from the agent definition, then `DEFAULT_AGENT_PROVIDER`.
- Support Hermes CHAT through its OpenAI-compatible API with SSE streaming.
- Support Hermes RUN creation, status, event streaming, stop, steer, and approval.
- Persist agents, executions, and normalized execution events.
- Keep conversation ownership and backend authorization authoritative.
- Expose only Kyrae identifiers and normalized events to clients.
- Keep OpenClaw HTTP Adapter and existing message/session endpoints operational.
- Do not implement automatic Hermes-to-OpenClaw fallback.
- Provide Hermes capability, skill, toolset, and model discovery services.

## Security Requirements

- Hermes and OpenClaw credentials remain backend-only environment variables.
- Execution and conversation ownership must be checked using the authenticated user.
- Provider errors returned to clients must be sanitized.
- Sensitive provider payloads must not be logged.
- Approval audit events must use the authenticated actor.

## Compatibility

- Preserve `/messages`, `/messages/tasks`, `/sessions`, voice flows, and Socket.IO authentication.
- Preserve `sessionId` and deprecated `conversationId` compatibility.
- Preserve the OpenClaw adapter contract and automation webhook.
- Existing OpenClaw conversations remain attributed to OpenClaw during migration.

## Non-Goals

- Automatic provider fallback.
- LLM-based CHAT/RUN classification.
- Provider marketplace, distributed workers, or new microservices.
- Full agent administration UI.
