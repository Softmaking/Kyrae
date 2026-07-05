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
```

`OPENCLAW_API_KEY` in Kyrae backend must match `OPENCLAW_HTTP_API_KEY` in this adapter.

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
