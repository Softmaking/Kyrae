# Technical Design: Assistant Voice Output

## Backend

Extend the existing `voice` NestJS module with:

- `TtsService`
- `POST /voice/speak`
- `SendVoiceSpeakDto`

The endpoint accepts JSON:

- `text`: assistant response text to synthesize
- `sessionId`: optional assistant session id for realtime event routing
- `messageId`: optional assistant message id for traceability
- `channel`: optional, defaults to `web`

The endpoint is protected by `JwtAuthGuard`, `PermissionsGuard`, and `ASSISTANT_VOICE_OUTPUT_USE`.

## TTS Adapter

The TTS adapter supports:

- `VOICE_TTS_MODE=mock`: generates a deterministic local WAV buffer.
- `VOICE_TTS_MODE=elevenlabs`: calls ElevenLabs text-to-speech and returns `audio/mpeg`.

Future modes can add HTTP/local providers behind `TtsService` without changing frontend or mobile clients.

## Realtime Events

Backend emits events to the assistant session room when `sessionId` is present:

- `voice.synthesizing`
- `voice.ready`
- `voice.failed`

The events reuse the current authenticated Socket.IO gateway and session room model.

## Persistence

Voice output attempts are saved in `voice_events` without a schema change for MVP:

- `status`: `synthesizing`, `ready`, or `failed`
- `transcript`: text that was synthesized
- `audioMimeType`: generated audio MIME type
- `audioSizeBytes`: generated audio size
- `channel`: request channel
- `metadata.direction`: `output`
- `metadata.kind`: `tts`
- `metadata.ttsProvider`: selected TTS mode/provider
- `metadata.messageId`: optional assistant message id

## Frontend Web

The Angular assistant page adds:

- a spoken response toggle gated by `ASSISTANT_VOICE_OUTPUT_USE`
- TTS request on assistant completion when enabled
- blob playback through `HTMLAudioElement`
- generating, playing, paused, stopped, and failed local states
- single-audio enforcement by stopping current playback before starting another

## Mobile

The Flutter assistant page uses `just_audio` to play voice output returned by `POST /voice/speak`. The mobile client requests audio bytes from Kyrae backend, writes them to a temporary file, and plays the file locally.

The mobile client adds:

- a spoken response toggle gated by `ASSISTANT_VOICE_OUTPUT_USE`
- TTS request on assistant completion when enabled
- temporary-file playback through `AudioPlayer`
- generating, playing, paused, stopped, and failed local states
- single-audio enforcement by stopping current playback before starting another

## Security

- Web and mobile clients call only Kyrae backend.
- `POST /voice/speak` requires JWT authentication and `ASSISTANT_VOICE_OUTPUT_USE`.
- The TTS text payload is size-limited by DTO validation.
- ElevenLabs API keys are backend-only environment variables and are never exposed to web or mobile clients.
- The MVP returns a direct audio response without public storage URLs.
