# Feature Spec: Assistant Voice Output

## Status

Approved by direct user request.

## User Story

HU-005: As a user, I want the assistant to convert its responses into audio so I can listen to the response without depending only on text.

## Goal

Add web and mobile voice output without changing the main assistant text flow:

OpenClaw text response -> Kyrae backend receives response -> TTS generates audio -> Web frontend plays audio -> Socket.IO emits synthesis states.

## Functional Requirements

- The web assistant must expose a spoken response option.
- The option must be visible only to users with `ASSISTANT_VOICE_OUTPUT_USE`.
- The backend must expose `POST /voice/speak` for authenticated TTS requests.
- The endpoint must require `ASSISTANT_VOICE_OUTPUT_USE`.
- The backend must receive text to convert into audio.
- The backend must support `VOICE_TTS_MODE=mock` for MVP validation.
- The backend must return audio as an immediate blob/buffer response.
- The backend must not expose public audio URLs in the MVP.
- Voice output activity must be persisted in `voice_events`.
- The backend must emit `voice.synthesizing`, `voice.ready`, and `voice.failed` events.
- The frontend must reproduce the returned audio.
- The mobile client must reproduce the returned audio.
- The frontend must show a generating voice state.
- The frontend must allow pausing or stopping audio playback.
- The frontend must allow enabling or disabling spoken responses.
- The frontend must prevent overlapping assistant response audio playback.

## Non-Goals

- Persisting generated audio files for later playback.
- Public audio URLs.
- Streaming TTS.
- Wake-word detection.
- Direct frontend calls to TTS providers.

## Decisions

- Use a dedicated permission: `ASSISTANT_VOICE_OUTPUT_USE`.
- Initial TTS provider mode is `mock`.
- Audio is returned as an immediate blob from `POST /voice/speak`.
- `voice.playing` and `voice.stopped` are client-local playback states, not backend events for the MVP.
