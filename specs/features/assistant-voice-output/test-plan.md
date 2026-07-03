# Test Plan: Assistant Voice Output

## Backend

- Verify backend lint and build.
- Verify `POST /voice/speak` requires authentication.
- Verify `POST /voice/speak` requires `ASSISTANT_VOICE_OUTPUT_USE`.
- Verify missing or empty text is rejected.
- Verify `VOICE_TTS_MODE=mock` returns an audio response.
- Verify `VOICE_TTS_MODE=elevenlabs` returns an `audio/mpeg` response when API key and voice id are configured.
- Verify TTS attempts are persisted in `voice_events`.

## Frontend Web

- Verify frontend build.
- Verify the spoken response toggle is visible only with `ASSISTANT_VOICE_OUTPUT_USE`.
- Manually verify a completed assistant response triggers TTS when enabled.
- Manually verify generated audio plays.
- Manually verify pause/stop controls.
- Manually verify a new audio response stops previous playback.

## Mobile

- Verify `flutter analyze` and `flutter test` pass.
- Verify the spoken response toggle is visible only with `ASSISTANT_VOICE_OUTPUT_USE`.
- Manually verify a completed assistant response triggers TTS when enabled.
- Manually verify generated audio plays.
- Manually verify pause/resume/stop controls.
- Manually verify a new audio response stops previous playback.

## Security

- Verify web and mobile clients call Kyrae backend only.
- Verify ElevenLabs API key is not exposed to frontend or mobile clients.
- Verify no public TTS audio URL is exposed in the MVP.
