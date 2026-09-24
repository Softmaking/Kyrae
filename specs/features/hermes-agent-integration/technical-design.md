# Technical Design: Hermes Agent Multi-Provider Integration

## Architecture

Clients call Kyrae controllers. `AgentOrchestratorService` resolves an `AgentProvider` through `AgentProviderFactory`. Providers normalize their native protocols into Kyrae agent contracts.

```text
Kyrae clients -> NestJS controllers -> AgentOrchestratorService -> AgentProviderFactory
                                                               -> HermesAgentProvider
                                                               -> OpenClawAgentProvider
```

## Backend Modules

- `agents`: agent definitions, provider contracts, factory, orchestrator, provider adapters, executions, and execution events.
- `messages`: delegates assistant provider calls to the orchestrator while preserving existing endpoints.
- `automation-schedules`: delegates scheduled assistant work to the orchestrator.

## Provider Protocols

- Hermes CHAT: `POST /v1/chat/completions`, `X-Hermes-Session-Id`, `X-Hermes-Session-Key`, SSE parsing.
- Hermes RUN: `/v1/runs` lifecycle endpoints and SSE event normalization.
- OpenClaw: existing `POST /messages` adapter contract.

## Persistence

- `agents` stores provider, provider agent identifier, execution mode, functional JSON configuration, and enabled state.
- `agent_executions` stores user/session/agent/provider snapshots, execution mode, provider run identifier, status, lifecycle timestamps, and sanitized error metadata.
- `agent_execution_events` stores normalized, sequenced, bounded event payloads.
- Existing conversations receive provider and agent attribution without renaming the physical table.

## Realtime

Reuse the authenticated Socket.IO gateway. Add normalized execution events while preserving existing assistant event names for compatibility. Streaming token deltas are emitted to the owned session room.

## Authorization and Audit

Existing `ASSISTANT_CHAT_USE` gates chat and execution actions. Ownership is checked in the orchestrator. Start, completion, failure, stop, steer, and approval actions use the existing `AuditService`.

## Error Handling

Provider exceptions are mapped to internal error codes such as `AGENT_PROVIDER_UNAVAILABLE`, `AGENT_TIMEOUT`, `AGENT_STREAM_ERROR`, and `AGENT_PROVIDER_ERROR`. Technical details remain in server logs and sanitized execution records.
