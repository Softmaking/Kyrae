# Test Plan: OpenClaw Persistent Sessions

## Backend

- Verify migrations run successfully.
- Verify session list returns only the authenticated user's sessions.
- Verify session messages reject cross-user access.
- Verify sync message flow persists OpenClaw request traces.
- Verify async task flow persists completed and failed OpenClaw request traces.

## Frontend

- Verify a new message creates/uses a session.
- Verify selecting a previous session loads history.
- Verify processing and error messages remain visible.

## Mobile

- Verify existing async assistant flow still compiles and tests pass.

## Regression

- Existing auth, permission, and assistant chat flows must keep working.
