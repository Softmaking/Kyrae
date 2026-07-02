# Task Plan: Assistant Voice Message

## Contracts

- Add voice contracts under `packages/shared-contracts/src/voice`.
- Export voice contracts from `packages/shared-contracts/src/index.ts`.

## Backend

- Add `VoiceModule` to `AppModule`.
- Add `VoiceEvent` entity.
- Add TypeORM migration for `voice_events` and `ASSISTANT_VOICE_USE` seed permission.
- Add `VoiceSttService` with `mock` and `http` modes.
- Add `VoiceService` orchestration.
- Add `VoiceController` with `POST /voice/messages`.
- Export `MessagesService` from `MessagesModule` for reuse.
- Update `.env.example`.

## STT Gateway

- Add `apps/stt-gateway` Nest app.
- Add `POST /transcribe` endpoint.
- Add OpenAI transcription provider.
- Add root workspace scripts for gateway development, build, and lint.

## Frontend

- Add voice upload method to assistant service.
- Add microphone recording controls to assistant page.
- Add voice status UI.
- Reuse existing assistant task/realtime/polling flow after the voice endpoint returns a task.

## Mobile

- Add recording dependencies.
- Add native microphone permissions.
- Add voice message method in assistant data/domain layers.
- Add voice state and microphone action in assistant provider/page.
- Reuse existing task/realtime/polling flow after the voice endpoint returns a task.

## Documentation

- Update `docs/system-context.md`.
- Update `docs/source-of-truth.md`.

## Validation

- `pnpm backend:lint`
- `pnpm backend:build`
- `pnpm backend:test`
- `pnpm frontend:build`
- `pnpm stt-gateway:build`
- `pnpm stt-gateway:lint`
- `flutter analyze`
- `flutter test`
