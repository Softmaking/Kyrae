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
- `VOICE_STT_MODE=http`: POSTs audio to an external STT-compatible service.

The HTTP adapter sends `multipart/form-data` with `audio` and expects a JSON response containing `transcript` or `text`.

## STT Gateway

The monorepo includes `apps/stt-gateway` as the first HTTP STT provider.

Current provider:

- `STT_PROVIDER=openai`
- OpenAI audio transcription API

Future local providers can be added behind the same `POST /transcribe` contract without changing Kyrae backend or frontend.

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

## Security

- Voice requires a dedicated `ASSISTANT_VOICE_USE` permission.
- Audio is sent only to Kyrae backend.
- Backend validates file presence, size, and supported MIME type.
- Temporary audio files are deleted after processing.
