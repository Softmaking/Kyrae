# Feature Spec: OpenClaw Automation Events

## Overview

Allow external OpenClaw cron automations to notify Kyrae when an automation produces a result. Kyrae persists the result as an assistant message, exposes it in web and mobile assistant history, and emits realtime updates when the user is connected.

## Classification

New Feature.

## Goals

- Provide a secure backend webhook for OpenClaw automation events.
- Persist automation results in assistant history.
- Use `automation` as the assistant channel for cron-generated messages.
- Use one automation inbox session per user for V1.
- Store `automationKey` and event metadata so future versions can split sessions by automation.
- Support web and mobile assistant clients.

## Out Of Scope

- Real push notifications through FCM/APNs.
- A dedicated notification center.
- One session per automation key in V1.
- OpenClaw tool execution redesign.

## Functional Requirements

- OpenClaw or the OpenClaw HTTP adapter can call `POST /openclaw/events` with an internal bearer token.
- The endpoint must reject missing or invalid internal credentials.
- The endpoint must validate event payloads.
- The endpoint must reject unknown users.
- The endpoint must be idempotent by `eventId`.
- Kyrae must create or reuse a per-user automation inbox session titled `Automatizaciones de Kyrae`.
- Kyrae must persist event output as an assistant message with `channel=automation`.
- Kyrae must store event metadata, including `eventId`, `eventType`, `automationKey`, `automationTitle`, `sessionStrategy`, and optional `externalRunId`.
- Kyrae must emit realtime events for web and mobile clients.
- Kyrae must audit processed and failed automation events.

## Security Requirements

- The webhook is internal only and must require `Authorization: Bearer {OPENCLAW_EVENTS_API_KEY}`.
- Clients must never call this endpoint directly.
- Payloads must not be trusted without validation.
- Duplicate event delivery must not create duplicate assistant messages.

## Acceptance Criteria

- A valid automation event creates or reuses the user's automation inbox session.
- A valid automation event creates one assistant message.
- Reposting the same `eventId` returns the existing processed result without duplicating the message.
- Invalid API key returns unauthorized.
- Invalid payload returns bad request.
- Web session list shows automation sessions with a friendly automation label.
- Mobile session history shows automation sessions and can open their messages.
