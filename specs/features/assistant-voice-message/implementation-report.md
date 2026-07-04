# Implementation Report: Assistant Voice Message

## Status

Implemented.

## Summary

HU-004 adds web voice input for assistant messages using a backend-owned transcription adapter and the existing assistant message task flow.

Implemented scope:

- Shared voice contracts.
- Backend `voice` module.
- `POST /voice/messages` endpoint.
- `ASSISTANT_VOICE_USE` permission.
- `voice_events` persistence.
- Configurable `VOICE_STT_MODE=mock|http` adapter.
- `apps/stt-gateway` with OpenAI transcription provider for the HTTP STT adapter.
- Internal STT Gateway protection with localhost binding and bearer API key validation.
- Web microphone recording and automatic voice-message submission.
- Mobile microphone recording and automatic voice-message submission.
- Reuse of existing assistant task, realtime, and polling behavior.

## Validation

- `pnpm backend:lint` passed.
- `pnpm backend:build` passed.
- `pnpm backend:test` passed.
- `pnpm frontend:build` passed with the existing bundle budget warning.
- `pnpm stt-gateway:build` passed.
- `pnpm stt-gateway:lint` passed.
- `flutter analyze` passed.
- `flutter test` passed.
