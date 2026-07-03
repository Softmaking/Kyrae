# Implementation Report: Assistant Voice Output

## Status

Implemented.

## Summary

Implemented scope:

- Dedicated `ASSISTANT_VOICE_OUTPUT_USE` permission.
- `POST /voice/speak` backend endpoint.
- `TtsService` with `VOICE_TTS_MODE=mock|elevenlabs`.
- Immediate `audio/wav` blob response.
- Voice output events persisted in `voice_events`.
- Socket.IO synthesis events: `voice.synthesizing`, `voice.ready`, and `voice.failed`.
- Web spoken response toggle gated by permission.
- Web audio playback with pause, resume, and stop controls.
- Mobile spoken response toggle gated by permission.
- Mobile audio playback with pause, resume, and stop controls.
- Single-audio playback enforcement.

## Validation

- `pnpm backend:lint` passed.
- `pnpm backend:build` passed.
- `pnpm backend:test` passed.
- `pnpm frontend:build` passed with the existing bundle budget warning.
- `flutter analyze` passed.
- `flutter test` passed.
