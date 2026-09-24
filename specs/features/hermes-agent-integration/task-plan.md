# Task Plan: Hermes Agent Multi-Provider Integration

## Contracts and Configuration

- Add provider, execution mode/status, normalized chat/run/event, capability, and execution API contracts.
- Add Hermes and default-provider environment variables.

## Backend

- Add agent entities, provider interface, factory, Hermes provider, OpenClaw provider, and orchestrator.
- Add execution and event repositories/entities/controllers/DTOs.
- Route messages and automation through the orchestrator.
- Add migrations and TypeORM registration.
- Preserve existing OpenClaw behavior and public compatibility fields.

## Frontend

- Consume normalized execution/realtime contracts.
- Display streaming assistant content and execution status.
- Add stop, steer, and approval service calls without exposing provider identifiers.

## Validation

- Unit test both providers, factory, orchestrator, stream parsing, lifecycle operations, ownership, and sanitized failures.
- Run backend lint/build/tests and frontend build/tests.
- Run the TypeORM migration command against the configured database when available.

## Approval

Approved by direct user request. The Developer may implement this plan.
