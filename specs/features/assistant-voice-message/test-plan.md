# Test Plan: Assistant Voice Message

## Backend

- Verify backend lint and build.
- Verify existing backend tests pass.
- Verify the voice endpoint compiles with multipart upload handling.
- Verify `VOICE_STT_MODE=mock` returns a deterministic transcript and creates an assistant task.

## Frontend

- Verify frontend build.
- Manually verify microphone permission prompt.
- Manually verify recording start/stop behavior.
- Manually verify voice upload creates a user message from the transcript.
- Manually verify assistant response appears through existing realtime/polling flow.

## Security

- Verify the endpoint requires authentication.
- Verify the endpoint requires `ASSISTANT_VOICE_USE`.
- Verify unsupported or missing audio is rejected.
