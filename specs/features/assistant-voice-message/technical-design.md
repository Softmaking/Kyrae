# Technical Design: Assistant Voice Message

## Backend

Add a `voice` NestJS module with:

- `VoiceController`
- `VoiceService`
- `VoiceSttService`
- `VoiceEvent` entity

The controller accepts `multipart/form-data` at `POST /voice/messages` with:

- `audio`: recorded browser audio file
- `sessionId`: optional assistant session id
- `channel`: optional, defaults to `web`

The endpoint is protected by `JwtAuthGuard`, `PermissionsGuard`, and `ASSISTANT_VOICE_USE`.

## STT Adapter

The STT adapter supports:

- `VOICE_STT_MODE=mock`: deterministic local transcription for development.
- `VOICE_STT_MODE=http`: POSTs audio from the Kyrae backend to an internal STT-compatible service using an internal bearer token.

The HTTP adapter sends `multipart/form-data` with `audio` and expects a JSON response containing `transcript` or `text`.

## STT Gateway

The monorepo includes `apps/stt-gateway` as the first HTTP STT provider.

- `POST /transcribe` accepts multipart audio.
- `POST /transcribe` requires `Authorization: Bearer <STT_GATEWAY_API_KEY>`.
- The gateway defaults to `HOST=127.0.0.1` and is an internal backend dependency, not a public client API.

Current provider:

- `STT_PROVIDER=openai`
- OpenAI audio transcription API

Future local providers can be added behind the same internal `POST /transcribe` contract without changing Kyrae backend, frontend, or mobile clients.

## Persistence

Persist voice processing attempts in `voice_events` with:

- user id
- session id
- task id
- status
- transcript
- error message
- audio metadata
- STT provider metadata
- duration

Audio files are written to OS temp storage during processing and removed afterwards.

## Message Flow

After transcription succeeds, `VoiceService` calls `MessagesService.createMessageTask()` with the transcript and existing session context. This preserves current message persistence, OpenClaw adapter behavior, realtime events, and polling fallback.

## Frontend

The Angular assistant page uses `MediaRecorder` to record audio. It sends the resulting `Blob` to `POST /voice/messages` using `FormData`.

The web client shows local voice states:

- recording
- transcribing
- sending
- failed

The returned task is added to the same chat state used by text messages.

## Mobile

The Flutter assistant page uses the `record` package to capture audio locally and `path_provider` for a temporary file path. The mobile client sends the recorded audio to `POST /voice/messages` with `channel=mobile` and reuses the existing assistant task, realtime, polling, and local notification behavior.

Native permissions:

- Android: `android.permission.RECORD_AUDIO`
- iOS: `NSMicrophoneUsageDescription`

## Security

- Voice requires a dedicated `ASSISTANT_VOICE_USE` permission.
- Web and mobile clients send audio only to Kyrae backend.
- Kyrae backend authenticates to the STT Gateway with `VOICE_STT_API_KEY`.
- STT Gateway validates `STT_GATEWAY_API_KEY` before accepting transcription requests.
- Backend validates file presence, size, and supported MIME type.
- Temporary audio files are deleted after processing.
