# OpenClaw HTTP Adapter

This adapter exposes the OpenClaw CLI through an internal HTTP endpoint consumed by the Kyrae backend.

It is intended to run next to the OpenClaw runtime. Web and mobile clients must never call this adapter directly.

## Endpoints

- `GET /health`
- `POST /messages`

`POST /messages` requires an internal bearer token when `OPENCLAW_HTTP_REQUIRE_API_KEY=true`.

## Request

```json
{
  "sessionId": "assistant-session-id",
  "channel": "web",
  "message": "Hola",
  "metadata": {
    "userId": "user-id",
    "conversationId": "assistant-session-id"
  }
}
```

## Response

```json
{
  "success": true,
  "message": "Respuesta visible del asistente",
  "requestId": "openclaw-run-id",
  "sessionId": "assistant-session-id",
  "metadata": {
    "agent": "main",
    "userId": "user-id",
    "channel": "web",
    "durationMs": 1234,
    "sessionKey": "agent:main:http:..."
  }
}
```

## Environment

```env
OPENCLAW_HTTP_HOST=127.0.0.1
OPENCLAW_HTTP_PORT=3100
OPENCLAW_HTTP_API_KEY=change-me
OPENCLAW_HTTP_REQUIRE_API_KEY=true
OPENCLAW_HTTP_MAX_BODY_BYTES=1048576
OPENCLAW_HTTP_MAX_CONCURRENT_REQUESTS=2
OPENCLAW_AGENT_NAME=main
OPENCLAW_BIN=openclaw
OPENCLAW_AGENT_TIMEOUT_SECONDS=600
```

## Kyrae Backend Configuration

```env
OPENCLAW_MODE=http
OPENCLAW_BASE_URL=http://127.0.0.1:3100
OPENCLAW_TIMEOUT_MS=0
OPENCLAW_API_KEY=change-me
OPENCLAW_EVENTS_API_KEY=change-me-events
```

`OPENCLAW_API_KEY` in Kyrae backend must match `OPENCLAW_HTTP_API_KEY` in this adapter.

## Automation Cron Events

OpenClaw cron jobs can notify Kyrae through the backend webhook:

```txt
POST /openclaw/events
Authorization: Bearer {OPENCLAW_EVENTS_API_KEY}
```

Example payload:

```json
{
  "eventId": "daily-review-2026-07-04T09:00:00Z",
  "type": "automation.completed",
  "userId": "kyrae-user-id",
  "automationKey": "daily-review",
  "title": "Revisión diaria",
  "message": "Encontré 3 tareas importantes para hoy.",
  "severity": "INFO",
  "sessionStrategy": "user_automation_inbox",
  "externalRunId": "optional-openclaw-run-id",
  "metadata": {},
  "createdAt": "2026-07-04T09:00:00.000Z"
}
```

Kyrae stores these events in the user's `Automatizaciones de Kyrae` assistant session using `channel=automation`. The `automationKey` is always stored in metadata so a future version can split automation history into one session per automation.

### OS Cron (send-event.js)

Since OpenClaw's internal cron does not know the Kyrae `userId`, use `send-event.js` with an OS-level cron instead.

**Usage:**

```bash
node src/send-event.js \
  --userId "<kyrae-user-uuid>" \
  --automationKey "clima-santiago" \
  --title "Clima en Santiago" \
  --message "¿Cómo está el clima hoy en Santiago?"
```

**Environment variables:**

```env
KYRAE_BACKEND_URL=http://localhost:3000
OPENCLAW_EVENTS_API_KEY=change-me-events
OPENCLAW_BIN=openclaw
OPENCLAW_AGENT_NAME=main
OPENCLAW_AGENT_TIMEOUT_SECONDS=600
```

**Flow:**

1. Generates a unique `eventId` (UUID v4).
2. Executes the `openclaw agent` CLI with the given instruction (`--message`).
3. Captures the assistant response or error.
4. POSTs to Kyrae backend at `POST /openclaw/events` with `Authorization: Bearer {OPENCLAW_EVENTS_API_KEY}`.
5. Logs the result to stdout (redirect to a file in crontab).

**Crontab example:**

```cron
0 8 * * * cd /path/apps/openclaw-http-adapter && \
  node src/send-event.js \
    --userId "a1b2c3d4-..." \
    --automationKey "clima-santiago" \
    --title "Clima en Santiago" \
    --message "¿Cómo está el clima hoy en Santiago?" \
    >> /var/log/kyrae-automations.log 2>&1
```

## Run

From the repository root:

```bash
pnpm openclaw-adapter:start
```

Or from this directory:

```bash
pnpm start
```

## Security Notes

- Keep `OPENCLAW_HTTP_REQUIRE_API_KEY=true` outside local throwaway development.
- Keep `OPENCLAW_HTTP_HOST=127.0.0.1` unless the adapter is behind a private network, firewall, tunnel, or reverse proxy.
- Do not expose this adapter directly to frontend or mobile clients.
- The adapter logs internal CLI failures server-side and returns sanitized errors to callers.
