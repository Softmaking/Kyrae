# Feature Spec: Assistant Voice Message

## Status

Approved by direct user request.

## User Story

HU-004: As a user, I want to speak to the assistant from web and mobile so the system converts my voice into text and sends that transcription to OpenClaw as a normal assistant message.

## Goal

Add web and mobile voice input without breaking the existing assistant text flow:

Voice -> audio -> backend -> STT -> text -> existing message task flow -> Socket.IO -> OpenClaw response.

## Functional Requirements

- The web assistant must expose a microphone action.
- The mobile assistant must expose a microphone action.
- The browser must request microphone permission before recording.
- The mobile client must request microphone permission before recording.
- The web client must record audio and send it to the Kyrae backend.
- The mobile client must record audio and send it to the Kyrae backend.
- The backend must expose `POST /voice/messages` for authenticated voice messages.
- The endpoint must require `ASSISTANT_VOICE_USE`.
- The backend must transcribe the audio through a configurable STT adapter.
- The backend must create an assistant message task using the existing message flow after transcription.
- The frontend must show recording, transcribing, and sending states.
- The mobile client must show recording, transcribing, and sending states.
- The assistant response must appear through the current realtime/polling behavior.
- Voice activity must be persisted in `voice_events`.

## Non-Goals

- Voice output or text-to-speech.
- Wake-word detection.
- Streaming STT.
- Direct frontend calls to OpenClaw or STT providers.
- Implementing an in-repository OpenClaw runtime.

## Decisions

- STT mode is configurable as `mock` or `http`.
- The MVP sends the transcription automatically to the assistant message task flow.
- Permission is `ASSISTANT_VOICE_USE`.
