# Task Plan: Assistant Voice Output

## Contracts

- Extend voice contracts with TTS command/metadata types.
- Extend realtime event names with voice synthesis events.

## Permissions

- Add `ASSISTANT_VOICE_OUTPUT_USE` to seed permissions.
- Add a TypeORM migration to insert `ASSISTANT_VOICE_OUTPUT_USE` and assign it to the admin role.

## Backend

- Add `SendVoiceSpeakDto`.
- Add `TtsService` with `VOICE_TTS_MODE=mock|elevenlabs`.
- Add `POST /voice/speak` endpoint.
- Persist TTS attempts in `voice_events`.
- Emit `voice.synthesizing`, `voice.ready`, and `voice.failed` events.
- Add TTS env vars to backend `.env.example`.

## Frontend Web

- Add `speak()` method to assistant service.
- Add spoken response toggle gated by `ASSISTANT_VOICE_OUTPUT_USE`.
- Request TTS when assistant message completes and spoken response is enabled.
- Play returned audio blob.
- Add pause/stop playback controls.
- Prevent overlapping audio playback.

## Mobile

- Add `just_audio` dependency.
- Add voice output method in assistant data/domain layers.
- Add voice output state and controls in assistant provider/page.
- Reproduce returned audio bytes from a temporary file.
- Prevent overlapping audio playback.

## Documentation

- Update `docs/system-context.md`.
- Update `docs/source-of-truth.md`.

## Validation

- `pnpm backend:lint`
- `pnpm backend:build`
- relevant backend tests
- `pnpm frontend:build`
- `flutter analyze`
- `flutter test`
