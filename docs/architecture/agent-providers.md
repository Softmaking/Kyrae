# Agent Providers

Kyrae owns agent domain state, authorization, persistence, audit, sessions, and client-facing events. Runtime-specific behavior is isolated behind `AgentProvider` implementations selected by `AgentProviderFactory` and coordinated by `AgentOrchestratorService`.

## Providers

- `HERMES` is the default provider selected by `DEFAULT_AGENT_PROVIDER=HERMES`.
- `OPENCLAW` remains available through `OpenClawAgentProvider` and the existing internal OpenClaw HTTP Adapter.
- Provider selection is explicit per `Agent`; there is no automatic Hermes-to-OpenClaw fallback.

## Persistence

- `agents` stores provider selection and functional agent configuration.
- `agent_executions` stores Kyrae execution identity, provider snapshot, provider run ID, lifecycle status, and sanitized errors.
- `agent_execution_events` stores normalized sequenced events for UI, audit, approvals, and debugging.
- Existing conversations remain the public session abstraction and retain provider attribution.

## Hermes Integration

Hermes is accessed only by the backend using its API Server:

- `POST /v1/chat/completions` for CHAT and SSE token streaming.
- `POST /v1/runs` and run lifecycle endpoints for RUN.
- `GET /v1/capabilities`, `/v1/skills`, `/v1/toolsets`, and `/v1/models` for discovery.

Kyrae sends deterministic session headers derived from agent, user, and conversation identifiers. Hermes credentials never reach web or mobile clients.

## Extension

Adding a provider requires implementing `AgentProvider`, registering it in `AgentsModule`, and adding its provider type to the normalized contract. Conversation, execution, audit, and frontend layers remain provider-neutral.
