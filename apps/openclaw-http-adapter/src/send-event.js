const { execFile } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const cronParser = require('cron-parser');

loadEnvFile(path.join(__dirname, '..', '.env'));
loadEnvFile(path.join(process.cwd(), '.env'));

const AGENT_NAME = process.env.OPENCLAW_AGENT_NAME || 'main';
const OPENCLAW_BIN = process.env.OPENCLAW_BIN || 'openclaw';
const AGENT_TIMEOUT_SECONDS = Number.parseInt(
  process.env.OPENCLAW_AGENT_TIMEOUT_SECONDS || '600',
  10
);
const KYRAE_BACKEND_URL = (process.env.KYRAE_BACKEND_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);
const EVENTS_API_KEY = process.env.OPENCLAW_EVENTS_API_KEY;

if (!EVENTS_API_KEY) {
  console.error('[send-event] OPENCLAW_EVENTS_API_KEY is not configured');
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));

if (args.batch) {
  await runBatch();
} else {
  await runSingle();
}

async function runBatch() {
  console.log('[send-event] batch starting');

  let schedules;

  try {
    const response = await fetch(
      `${KYRAE_BACKEND_URL}/automation-schedules?isActive=true&pageSize=100`,
      {
        headers: { authorization: `Bearer ${EVENTS_API_KEY}` },
      }
    );

    if (!response.ok) {
      console.error('[send-event] batch: failed to fetch schedules', {
        statusCode: response.status,
      });
      process.exit(1);
    }

    const body = await response.json();
    schedules = body.data || [];
  } catch (error) {
    console.error('[send-event] batch: request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }

  console.log('[send-event] batch: loaded schedules', { count: schedules.length });

  const now = new Date();
  let executed = 0;
  let skipped = 0;

  for (const schedule of schedules) {
    const due = isCronDue(schedule.cronExpression, schedule.lastRunAt, now);

    if (!due) {
      skipped++;
      continue;
    }

    console.log('[send-event] batch: executing', {
      automationKey: schedule.automationKey,
      title: schedule.title,
    });

    const eventId = randomUUID();
    const startedAt = Date.now();

    let responseMessage;
    let failed = false;

    try {
      const result = await sendToOpenClaw({
        agentName: AGENT_NAME,
        sessionId: eventId,
        userId: schedule.userId,
        message: schedule.instruction.trim(),
      });

      responseMessage = result.message;

      await sendToKyrae({
        eventId,
        type: 'automation.completed',
        userId: schedule.userId,
        automationKey: schedule.automationKey,
        title: schedule.title,
        message: responseMessage,
        severity: 'INFO',
        startedAt,
      });

      console.log('[send-event] batch: completed', {
        automationKey: schedule.automationKey,
        eventId,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      responseMessage = error instanceof Error ? error.message : 'OpenClaw execution failed';

      await sendToKyrae({
        eventId,
        type: 'automation.failed',
        userId: schedule.userId,
        automationKey: schedule.automationKey,
        title: schedule.title,
        message: responseMessage,
        severity: 'ERROR',
        startedAt,
      });

      console.error('[send-event] batch: failed', {
        automationKey: schedule.automationKey,
        eventId,
        error: responseMessage,
        durationMs: Date.now() - startedAt,
      });
    }

    executed++;
  }

  console.log('[send-event] batch finished', { executed, skipped, total: schedules.length });
  process.exit(0);
}

async function runSingle() {
  const REQUIRED_ARGS = ['userId', 'automationKey', 'title', 'message'];
  const missing = REQUIRED_ARGS.filter((key) => !args[key]);

  if (missing.length > 0) {
    console.error(
      '[send-event] Missing required arguments:',
      missing.map((k) => `--${k}`).join(', ')
    );
    process.exit(1);
  }

  const userId = args.userId;
  const eventId = randomUUID();
  const startedAt = Date.now();

  console.log('[send-event] starting', {
    eventId,
    userId,
    automationKey: args.automationKey,
    title: args.title,
  });

  let responseMessage;
  let failed = false;

  try {
    const result = await sendToOpenClaw({
      agentName: AGENT_NAME,
      sessionId: eventId,
      userId,
      message: args.message.trim(),
    });

    responseMessage = result.message;
    console.log('[send-event] openclaw completed', {
      eventId,
      requestId: result.requestId,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    failed = true;
    responseMessage = error instanceof Error ? error.message : 'OpenClaw execution failed';
    console.error('[send-event] openclaw failed', {
      eventId,
      error: responseMessage,
      durationMs: Date.now() - startedAt,
    });
  }

  await sendToKyrae({
    eventId,
    type: failed ? 'automation.failed' : 'automation.completed',
    userId,
    automationKey: args.automationKey,
    title: args.title,
    message: responseMessage,
    severity: failed ? 'ERROR' : 'INFO',
    startedAt,
  });

  process.exit(failed ? 1 : 0);
}

async function sendToKyrae({ eventId, type, userId, automationKey, title, message, severity, startedAt }) {
  const payload = {
    eventId,
    type,
    userId,
    automationKey,
    title,
    message,
    severity,
    sessionStrategy: 'user_automation_inbox',
    externalRunId: eventId,
    createdAt: new Date(startedAt).toISOString(),
  };

  try {
    const response = await fetch(`${KYRAE_BACKEND_URL}/openclaw/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${EVENTS_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[send-event] kyrae rejected', {
        eventId,
        statusCode: response.status,
        result,
      });
      return;
    }

    console.log('[send-event] kyrae accepted', {
      eventId,
      status: result.status,
      sessionId: result.sessionId,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('[send-event] kyrae request failed', {
      eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function isCronDue(cronExpression, lastRunAtIso, now) {
  try {
    const interval = cronParser.parseExpression(cronExpression);
    const prev = interval.prev().toDate();

    if (!lastRunAtIso) return true;

    const lastRun = new Date(lastRunAtIso);
    return prev > lastRun;
  } catch (_error) {
    console.error('[send-event] invalid cron expression:', cronExpression);
    return false;
  }
}

function sendToOpenClaw({ agentName, sessionId, userId, message }) {
  const sessionKey = buildSessionKey({ agentName, userId, sessionId });

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

function parseArgs(argv) {
  const result = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      result[key] = value;
    }
  }

  return result;
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
