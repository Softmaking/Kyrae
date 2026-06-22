# Personal Assistant OpenClaw Roadmap Checklist

## Objective

Build a Jarvis-style personal assistant that supports text, voice, web, mobile, and external channels such as WhatsApp, using OpenClaw as the agent engine and the Kyrae backend as the control layer.

## Architecture Principle

- [ ] Keep every client behind the Kyrae backend.
- [ ] Do not allow web, mobile, WhatsApp, Telegram, or local voice clients to call OpenClaw directly.
- [ ] Centralize authentication, permissions, sessions, history, logs, audit, and channel control in the backend.
- [ ] Keep OpenClaw focused on agent orchestration, skills, tools, memory, and task execution.

## Stage 1: Project Base

- [x] Use existing pnpm workspace.
- [x] Use existing NestJS backend.
- [x] Use existing Angular frontend.
- [x] Use existing Flutter mobile beta.
- [x] Use existing PostgreSQL and TypeORM setup.
- [x] Add assistant feature documentation.
- [x] Add OpenClaw integration configuration.

## Stage 2: Backend Orchestrator

- [x] Reuse existing auth module.
- [x] Reuse existing users module.
- [x] Create conversations persistence.
- [x] Create messages persistence.
- [x] Create OpenClaw service adapter.
- [x] Create `POST /messages` endpoint.
- [ ] Create endpoint to obtain conversation history.
- [x] Store user and assistant messages in PostgreSQL.
- [x] Register basic technical audit events.
- [x] Handle backend errors clearly.

## Stage 3: Backend To OpenClaw Contract

- [x] Define shared request contract.
- [x] Define shared response contract.
- [x] Implement `OpenClawService`.
- [x] Support mock mode for local development.
- [x] Support real OpenClaw HTTP endpoint configuration.
- [x] Handle timeout.
- [x] Handle unavailable OpenClaw service errors.
- [x] Register each request and response.

## Stage 4: Simple Web Chat

- [x] Create assistant route in Angular.
- [x] Create simple chat page.
- [x] Create text input.
- [x] Create send button.
- [x] Show user messages.
- [x] Show assistant responses.
- [x] Connect frontend to backend API.
- [x] Show loading state.
- [x] Show clear error messages.
- [ ] Load initial conversation history.

## Stage 5: WebSocket

- [ ] Create NestJS WebSocket gateway.
- [ ] Connect frontend by WebSocket.
- [ ] Emit message events.
- [ ] Emit response events.
- [ ] Show thinking state.
- [ ] Support streaming when OpenClaw supports it.
- [ ] Register realtime events.

## Stage 6: STT Voice Input

- [ ] Add browser recording button.
- [ ] Capture browser audio.
- [ ] Send audio to backend.
- [ ] Integrate Whisper, faster-whisper, or whisper.cpp.
- [ ] Convert audio to text.
- [ ] Show transcription in the UI.
- [ ] Send transcription to OpenClaw.
- [ ] Store voice event.

## Stage 7: TTS Voice Output

- [ ] Integrate TTS engine.
- [ ] Convert assistant response text to audio.
- [ ] Send audio to frontend.
- [ ] Play audio in browser.
- [ ] Allow voice output on/off.
- [ ] Store generated audio event.

## Stage 8: Jarvis-Style Interface

- [ ] Create dark base design.
- [ ] Create central orb or nucleus.
- [ ] Animate listening state.
- [ ] Animate thinking state.
- [ ] Animate responding state.
- [ ] Create tasks panel.
- [ ] Create agent status panel.
- [ ] Create history panel.
- [ ] Create basic logs panel.
- [ ] Optimize visual experience.

## Stage 9: Mobile App

- [x] Reuse existing Flutter mobile beta base.
- [ ] Add mobile assistant chat.
- [ ] Connect mobile chat with backend.
- [ ] Add mobile voice recording.
- [ ] Add assistant response playback.
- [ ] Add notifications.
- [ ] Add conversation history.
- [ ] Add quick commands.

## Stage 10: Integrations

- [ ] Integrate WhatsApp.
- [ ] Integrate Telegram.
- [ ] Integrate Gmail.
- [ ] Integrate Google Calendar.
- [ ] Integrate local files.
- [ ] Integrate custom APIs.
- [ ] Create integration permissions.
- [ ] Audit integration actions.
- [ ] Require confirmation before sensitive actions.

## Stage 11: Local Models

- [ ] Install Ollama, LM Studio, or vLLM.
- [ ] Test local model.
- [ ] Connect backend with local model.
- [ ] Define local versus cloud routing.
- [ ] Measure latency.
- [ ] Measure RAM usage.
- [ ] Create local model fallback.

## Stage 12: Security And Control

- [x] Reuse JWT login.
- [x] Reuse roles.
- [x] Reuse permissions.
- [x] Add assistant channel permissions.
- [ ] Add integration permissions.
- [ ] Add action logs.
- [ ] Add confirmation for sensitive actions.
- [ ] Add agent execution limits.
- [ ] Block dangerous actions.
- [ ] Encrypt integration secrets.
- [ ] Keep secure variables in `.env`.

## Current User Story: HU-001

- [x] Reuse existing NestJS backend.
- [x] Create `POST /messages` endpoint.
- [x] Create `OpenClawService`.
- [x] Create simple web input.
- [x] Send message to backend.
- [x] Backend sends message to OpenClaw adapter.
- [x] Show response on screen.
- [x] Store message and response in PostgreSQL.

## Advancement Rule

Before moving to a new stage, validate:

- [ ] Does it work?
- [ ] Is it connected through the correct layer?
- [ ] Is it registered or documented?
