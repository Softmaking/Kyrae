const http = require('node:http');
const { execFile } = require('node:child_process');
const { randomUUID, timingSafeEqual } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

loadEnvFile(path.join(__dirname, '..', '.env'));
loadEnvFile(path.join(process.cwd(), '.env'));

const HOST = process.env.OPENCLAW_HTTP_HOST || '127.0.0.1';
const PORT = Number.parseInt(process.env.OPENCLAW_HTTP_PORT || '3100', 10);
const AGENT_NAME = process.env.OPENCLAW_AGENT_NAME || 'main';
const OPENCLAW_BIN = process.env.OPENCLAW_BIN || 'openclaw';
const REQUIRE_API_KEY = process.env.OPENCLAW_HTTP_REQUIRE_API_KEY !== 'false';
const API_KEY = process.env.OPENCLAW_HTTP_API_KEY || '';
const ALLOWED_CHANNELS = new Set(['web', 'mobile', 'whatsapp', 'telegram', 'local_voice']);

const AGENT_TIMEOUT_SECONDS = Number.parseInt(
  process.env.OPENCLAW_AGENT_TIMEOUT_SECONDS || '600',
  10
);

const MAX_BODY_BYTES = Number.parseInt(
  process.env.OPENCLAW_HTTP_MAX_BODY_BYTES || String(1024 * 1024),
  10
);

const MAX_CONCURRENT_REQUESTS = Number.parseInt(
  process.env.OPENCLAW_HTTP_MAX_CONCURRENT_REQUESTS || '2',
  10
);

let activeOpenClawRequests = 0;

const server = http.createServer(async (req, res) => {
  const startedAt = Date.now();
  const requestId = randomUUID();

  let logContext = {
    requestId,
    sessionId: undefined,
    userId: undefined,
    channel: undefined,
    durationMs: undefined,
  };
  let acquiredOpenClawSlot = false;

  try {
    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, {
        status: 'ok',
        agent: AGENT_NAME,
        activeOpenClawRequests,
      });
      return;
    }

    if (req.method !== 'POST' || req.url !== '/messages') {
      sendJson(res, 404, {
        success: false,
        message: 'Not found',
        requestId,
        metadata: {},
      });
      return;
    }

    const authError = validateApiKey(req);
    if (authError) {
      sendJson(res, authError.statusCode, {
        success: false,
        message: authError.message,
        requestId,
        metadata: {},
      });
      return;
    }

    if (activeOpenClawRequests >= MAX_CONCURRENT_REQUESTS) {
      sendJson(res, 429, {
        success: false,
        message: 'OpenClaw adapter is busy',
        requestId,
        metadata: {},
      });
      return;
    }

    const body = await readJsonBody(req);
    const validationError = validateMessageBody(body);

    logContext = {
      ...logContext,
      sessionId: body && body.sessionId,
      userId: body && body.metadata && body.metadata.userId,
      channel: body && body.channel,
    };

    if (validationError) {
      sendJson(res, 400, {
        success: false,
        message: validationError,
        requestId,
        sessionId: body && body.sessionId,
        metadata: {},
      });
      return;
    }

    activeOpenClawRequests += 1;
    acquiredOpenClawSlot = true;
    const openclawResult = await sendToOpenClaw({
      agentName: AGENT_NAME,
      sessionId: body.sessionId,
      userId: body.metadata.userId,
      message: body.message.trim(),
    });
    activeOpenClawRequests -= 1;
    acquiredOpenClawSlot = false;

    const durationMs = Date.now() - startedAt;

    sendJson(res, 200, {
      success: true,
      message: openclawResult.message,
      requestId: openclawResult.requestId || requestId,
      sessionId: body.sessionId,
      metadata: {
        agent: AGENT_NAME,
        userId: body.metadata.userId,
        channel: body.channel || 'web',
        durationMs,
        sessionKey: openclawResult.sessionKey,
      },
    });
  } catch (error) {
    if (acquiredOpenClawSlot) activeOpenClawRequests -= 1;

    const durationMs = Date.now() - startedAt;
    const statusCode = error && error.statusCode === 400 ? 400 : 500;
    const message = statusCode === 400 ? error.message : 'OpenClaw failed to process the message';

    sendJson(res, statusCode, {
      success: false,
      message,
      requestId,
      sessionId: logContext.sessionId,
      metadata: {
        agent: AGENT_NAME,
        userId: logContext.userId,
        channel: logContext.channel,
        durationMs,
      },
    });

    if (statusCode === 500) {
      console.error('[openclaw-http] error', {
        ...logContext,
        durationMs,
        error: error && error.message,
      });
    }
  } finally {
    logContext.durationMs = Date.now() - startedAt;
    console.log('[openclaw-http] request', logContext);
  }
});

server.listen(PORT, HOST, () => {
  console.log('[openclaw-http] listening', {
    host: HOST,
    port: PORT,
    agent: AGENT_NAME,
    requireApiKey: REQUIRE_API_KEY,
  });
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
  console.log('[openclaw-http] shutting down');
  server.close(() => process.exit(0));
}

function validateApiKey(req) {
  if (!REQUIRE_API_KEY) return null;

  if (!API_KEY) {
    return { statusCode: 503, message: 'OpenClaw adapter API key is not configured' };
  }

  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    return { statusCode: 401, message: 'Missing OpenClaw adapter credentials' };
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!safeEquals(token, API_KEY)) {
    return { statusCode: 401, message: 'Invalid OpenClaw adapter credentials' };
  }

  return null;
}

function safeEquals(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let rawBody = '';

    req.setEncoding('utf8');

    req.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);

      if (size > MAX_BODY_BYTES) {
        reject(badRequest('Request body is too large'));
        req.destroy();
        return;
      }

      rawBody += chunk;
    });

    req.on('end', () => {
      if (!rawBody.trim()) {
        reject(badRequest('Request body must be valid JSON'));
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch (_error) {
        reject(badRequest('Request body must be valid JSON'));
      }
    });

    req.on('error', reject);
  });
}

function validateMessageBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }

  if (!isNonEmptyString(body.sessionId)) {
    return 'Missing required field: sessionId';
  }

  if (!isNonEmptyString(body.message)) {
    return 'Missing required field: message';
  }

  if (!body.metadata || typeof body.metadata !== 'object') {
    return 'Missing required field: metadata.userId';
  }

  if (!isNonEmptyString(body.metadata.userId)) {
    return 'Missing required field: metadata.userId';
  }

  if (body.channel !== undefined) {
    if (!isNonEmptyString(body.channel)) {
      return 'Field channel must be a non-empty string';
    }

    if (!ALLOWED_CHANNELS.has(body.channel)) {
      return 'Field channel is not supported';
    }
  }

  return null;
}

function sendToOpenClaw({ agentName, sessionId, userId, message }) {
  const sessionKey = buildSessionKey({
    agentName,
    userId,
    sessionId,
  });

  const args = [
    'agent',
    '--agent',
    agentName,
    '--session-key',
    sessionKey,
    '--message',
    message,
    '--json',
    '--timeout',
    String(AGENT_TIMEOUT_SECONDS),
  ];

  return new Promise((resolve, reject) => {
    execFile(
      OPENCLAW_BIN,
      args,
      {
        timeout: (AGENT_TIMEOUT_SECONDS + 15) * 1000,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          const details = stderr || stdout || error.message;
          reject(new Error(`OpenClaw CLI failed: ${details}`));
          return;
        }

        let parsed;

        try {
          parsed = JSON.parse(stdout);
        } catch (_error) {
          reject(new Error('OpenClaw CLI returned invalid JSON'));
          return;
        }

        if (parsed.status && parsed.status !== 'ok') {
          reject(new Error(`OpenClaw returned status ${parsed.status}`));
          return;
        }

        const responseMessage = extractAssistantMessage(parsed);

        if (!responseMessage) {
          reject(new Error('OpenClaw returned an empty assistant message'));
          return;
        }

        resolve({
          message: responseMessage,
          requestId: parsed.runId,
          sessionKey,
        });
      }
    );
  });
}

function extractAssistantMessage(openclawJson) {
  const meta = openclawJson && openclawJson.result && openclawJson.result.meta;

  if (isNonEmptyString(meta && meta.finalAssistantVisibleText)) {
    return meta.finalAssistantVisibleText;
  }

  if (isNonEmptyString(meta && meta.finalAssistantRawText)) {
    return meta.finalAssistantRawText;
  }

  const payloads =
    openclawJson && openclawJson.result && Array.isArray(openclawJson.result.payloads)
      ? openclawJson.result.payloads
      : [];

  return payloads
    .map((payload) => payload && payload.text)
    .filter(isNonEmptyString)
    .join('\n')
    .trim();
}

function buildSessionKey({ agentName, userId, sessionId }) {
  return `agent:${agentName}:http:${base64Url(userId)}:${base64Url(sessionId)}`;
}

function base64Url(value) {
  return Buffer.from(String(value), 'utf8').toString('base64url');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function sendJson(res, statusCode, payload) {
  if (res.writableEnded) return;

  const body = JSON.stringify(payload);

  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });

  res.end(body);
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (!key || process.env[key] !== undefined) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}
