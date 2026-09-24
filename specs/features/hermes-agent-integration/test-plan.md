# Test Plan: Hermes Agent Multi-Provider Integration

## Unit Tests

- Hermes chat success, SSE delta parsing, timeout, authentication failure, provider failure, and closed streams.
- Hermes run creation, status mapping, event mapping, stop, steer, and approval.
- OpenClaw provider compatibility and health check.
- Factory default, explicit agent provider, disabled agent, and unknown provider.
- Orchestrator ownership, state transitions, no fallback, audit calls, and sanitized errors.

## Integration Tests

- Authenticated chat preserves conversation ownership.
- Run lifecycle endpoints reject another user's execution.
- Socket.IO events contain normalized fields and no provider secrets.
- Existing OpenClaw message and automation flows remain operational.

## Verification Commands

```bash
pnpm backend:lint
pnpm backend:build
pnpm backend:test
pnpm frontend:build
pnpm frontend:test
```
