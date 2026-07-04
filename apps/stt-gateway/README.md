# Kyrae STT Gateway

Small HTTP gateway for speech-to-text providers.

Kyrae backend calls this service through `VOICE_STT_BASE_URL` and expects `POST /transcribe` with `multipart/form-data` field `audio`.

## Development

```bash
pnpm stt-gateway:dev
```

## Environment

See `.env.example`.

For the current cloud MVP:

```env
STT_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_TRANSCRIPTION_MODEL=whisper-1
```

Kyrae backend should use:

```env
VOICE_STT_MODE=http
VOICE_STT_BASE_URL=http://localhost:3101
VOICE_STT_TIMEOUT_MS=60000
```
