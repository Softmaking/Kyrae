// G1 live capability activation probes. New user authorization (2026-10-29): total 12 requests.
// No response bodies or fixtures are saved. Base URL locked to the approved origin.
// Usage: node test/g1-model-capability-proof.cjs --used-posts=N
// Emits one JSON line per probe. Exit 1 on any failed probe or budget violation.
const { randomUUID } = require('node:crypto');
const { deflateSync } = require('node:zlib');
const assert = require('node:assert/strict');

const ALLOWED = 'http://mac-mini-de-kyrae.tail1e9797.ts.net:8642';
const TOTAL = 12;

let budget = null;
function makeBudget(args) {
  const entries = args.filter((arg) => arg.startsWith('--used-posts'));
  assert(entries.length === 1 && /^--used-posts=(0|[1-9][0-9]*)$/.test(entries[0]),
    'EXPLICIT_VALID_USED_POSTS_REQUIRED');
  const consumedBefore = Number(entries[0].split('=')[1]);
  assert(Number.isSafeInteger(consumedBefore) && consumedBefore <= TOTAL, 'INVALID_USED_POSTS');
  return {
    consumedBefore, current: 0,
    limit: TOTAL - consumedBefore,
    claim() { assert(this.current < this.limit, 'POST_BUDGET_EXCEEDED'); this.current++; },
  };
}

// Minimal CRC32/deflate-based solid-color PNG builder.
function crc32(buf) {
  let t = crc32.table;
  if (!t) {
    t = crc32.table = Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function solidPng(w, h, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w * 3; x += 3) { row[1 + x] = rgb[0]; row[2 + x] = rgb[1]; row[3 + x] = rgb[2]; }
  const raw = Buffer.concat(Array(h).fill(row));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

let token;
let failedTest;
function loadEnv() {
  const fs = require('node:fs');
  const path = require('node:path');
  const envPath = path.join(__dirname, '..', '.env');
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  token = process.env.HERMES_API_KEY;
  assert(typeof token === 'string' && token.length > 0, 'HERMES_API_KEY_REQUIRED');
}
async function request(path, method, body) {
  budget.claim();
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${ALLOWED}${path}`, {
    method, headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  });
  const text = await response.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch { /* non-json tolerated for GET */ }
  return { ok: response.ok, status: response.status, payload };
}

function emit(object) { console.log(JSON.stringify(object)); }
const utf16Units = (s) => s.length;
const utf8Bytes = (s) => Buffer.byteLength(s, 'utf8');

async function probe(name, run) {
  const only = process.argv.find((arg) => arg.startsWith('--only='))?.split('=')[1];
  if (only && only !== name) return;
  try {
    const out = await run();
    emit({ probe: name, result: 'PASS', ...(out ?? {}) });
  } catch (error) {
    failedTest = name;
    process.exitCode = 1;
    emit({ probe: name, result: 'FAIL',
      error: error instanceof Error ? error.message : String(error) });
  }
}

async function chat(body, session) {
  return request('/v1/chat/completions', 'POST', { ...body, session });
}

function usageFacts(payload) {
  const u = payload?.usage ?? null;
  if (!u || typeof u !== 'object') return { usagePresent: false };
  return {
    usagePresent: true,
    promptTokens: typeof u.prompt_tokens === 'number' ? u.prompt_tokens : null,
    completionTokens: typeof u.completion_tokens === 'number' ? u.completion_tokens : null,
  };
}

async function main() {
  loadEnv();
  budget = makeBudget(process.argv);
  const model = process.env.HERMES_DEFAULT_MODEL || 'hermes-agent';

  await probe('identity_models_list', async () => {
    const r = await request('/v1/models', 'GET');
    assert.equal(r.ok, true, `status ${r.status}`);
    const data = r.payload?.data;
    const listed = Array.isArray(data) ? data.map((m) => m?.id).filter((x) => typeof x === 'string') : [];
    return { ok: true, modelsListed: listed.length, configuredModelListed: listed.includes(model) };
  });

  let identityAnswer;
  await probe('identity_question', async () => {
    const question = 'What exact system or model produced this answer? Answer strictly as JSON: {"identity":"..."}';
    const r = await chat({ model, messages: [{ role: 'user', content: question }], max_tokens: 96 });
    assert.equal(r.ok, true, `status ${r.status}`);
    const text = r.payload?.choices?.[0]?.message?.content;
    assert.equal(typeof text, 'string', 'no text content');
    try { identityAnswer = JSON.parse(text); } catch { identityAnswer = { raw: true }; }
    return { responseModel: typeof r.payload?.model === 'string' ? r.payload.model : null,
      usage: usageFacts(r.payload), identityAnswer };
  });

  await probe('image_input_red', async () => {
    const png = solidPng(96, 96, [235, 30, 30]);
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
    const question = 'Look at the image. What is the dominant color? Answer strictly as JSON: {"color":"red|green|blue|yellow|purple|orange|black|white"}';
    const r = await chat({ model, messages: [{ role: 'user',
      content: [{ type: 'text', text: question }, { type: 'image_url', image_url: { url: dataUrl } }] }],
      max_tokens: 96 });
    assert.equal(r.ok, true, `status ${r.status}`);
    const text = r.payload?.choices?.[0]?.message?.content;
    let answer = null;
    try { answer = JSON.parse(text); } catch { answer = { raw: true }; }
    const seen = answer?.color === 'red';
    assert.equal(seen, true, `image not recognized: ${JSON.stringify(answer)}`);
    return { imageBytes: png.length, dataUrlBytes: dataUrl.length, answer, usage: usageFacts(r.payload) };
  });

  let usageNoImage;
  await probe('image_accounting_baseline', async () => {
    const question = 'Answer strictly as JSON: {"color":"none"}';
    const r = await chat({ model, messages: [{ role: 'user', content: question }], max_tokens: 32 });
    assert.equal(r.ok, true, `status ${r.status}`);
    usageNoImage = usageFacts(r.payload);
    assert.equal(usageNoImage.usagePresent, true, 'usage not reported');
    assert.equal(typeof usageNoImage.promptTokens, 'number', 'prompt_tokens missing');
    return { usage: usageNoImage };
  });

  let imageDeltaTokens = null;
  await probe('image_accounting_delta', async () => {
    const png = solidPng(96, 96, [30, 30, 235]);
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
    const question = 'Look at the image. What is the dominant color? Answer strictly as JSON: {"color":"red|green|blue|yellow|purple|orange|black|white"}';
    const r = await chat({ model, messages: [{ role: 'user',
      content: [{ type: 'text', text: question }, { type: 'image_url', image_url: { url: dataUrl } }] }],
      max_tokens: 32 });
    assert.equal(r.ok, true, `status ${r.status}`);
    const usage = usageFacts(r.payload);
    const answer = (() => { try { return JSON.parse(r.payload?.choices?.[0]?.message?.content); } catch { return { raw: true }; } })();
    assert.equal(answer?.color, 'blue', `second image not recognized: ${JSON.stringify(answer)}`);
    assert.equal(usage.usagePresent, true, 'usage not reported');
    assert.equal(usageNoImage.usagePresent, true, 'baseline usage missing');
    imageDeltaTokens = Math.max(0, usage.promptTokens - usageNoImage.promptTokens);
    return { answer, promptTokens: usage.promptTokens,
      baselinePromptTokens: usageNoImage.promptTokens, imageDeltaTokens };
  });

  let textSampleBytes;
  await probe('text_accounting_usage', async () => {
    const filler = Array(1200).fill('palabra de prueba').join(' ');
    textSampleBytes = utf8Bytes(filler);
    const question = `Count the words roughly and answer strictly as JSON: {"approx":"..."} Text: ${filler}`;
    const r = await chat({ model, messages: [{ role: 'user', content: question }], max_tokens: 64 });
    assert.equal(r.ok, true, `status ${r.status}`);
    const usage = usageFacts(r.payload);
    assert.equal(usage.usagePresent, true, 'usage not reported');
    const promptTokens = Number.isSafeInteger(usage.promptTokens) ? usage.promptTokens : 0;
    const bytesPerToken = promptTokens > 0 ? Math.ceil(textSampleBytes / promptTokens) : null;
    return { textUtf8Bytes: textSampleBytes, textUtf16Units: utf16Units(filler),
      promptTokens, bytesPerToken, usage: { usagePresent: true, promptTokens: usage.promptTokens } };
  });

  await probe('large_prompt_near_constraint', async () => {
    const filler = Array(3000).fill('palabra de prueba').join(' ');
    const bytes = utf8Bytes(filler);
    assert.ok(utf16Units(filler) <= 60000, 'constraint setup error');
    const question = `Reply with exactly: OK. Text: ${filler}`;
    const r = await chat({ model, messages: [{ role: 'user', content: question }], max_tokens: 16 });
    assert.equal(r.ok, true, `status ${r.status}`);
    const text = r.payload?.choices?.[0]?.message?.content;
    assert.ok(/^OK\b/i.test(text?.trim() ?? ''), 'large prompt failed');
    return { promptUtf8Bytes: bytes, promptUtf16Units: utf16Units(filler),
      usage: usageFacts(r.payload) };
  });

let largeImageDeltaTokens = null;
  await probe('large_image_accounting', async () => {
    const baselineArg = process.argv.find((arg) => arg.startsWith('--baseline-prompt-tokens='));
    if (baselineArg) usageNoImage = { usagePresent: true,
      promptTokens: Number(baselineArg.split('=')[1]), completionTokens: null };
    const png = solidPng(2048, 1280, [30, 160, 30]);
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
    const question = 'Look at the image. What is the dominant color? Answer strictly as JSON: {"color":"red|green|blue|yellow|purple|orange|black|white"}';
    const r = await chat({ model, messages: [{ role: 'user',
      content: [{ type: 'text', text: question }, { type: 'image_url', image_url: { url: dataUrl } }] }],
      max_tokens: 32 });
    assert.equal(r.ok, true, `status ${r.status}`);
    const usage = usageFacts(r.payload);
    const answer = (() => { try { return JSON.parse(r.payload?.choices?.[0]?.message?.content); } catch { return { raw: true }; } })();
    assert.equal(answer?.color, 'green', `large image not recognized: ${JSON.stringify(answer)}`);
    assert.equal(usage.usagePresent, true, 'usage not reported');
    assert.equal(usageNoImage.usagePresent, true, 'baseline usage missing');
    largeImageDeltaTokens = Math.max(0, usage.promptTokens - usageNoImage.promptTokens);
    return { imageBytes: png.length, dataUrlBytes: dataUrl.length, answer,
      promptTokens: usage.promptTokens, largeImageDeltaTokens };
  });

  await probe('prompt_edge_below_constraint', async () => {
    const filler = Array(3317).fill('palabra de prueba').join(' ');
    const bytes = utf8Bytes(filler);
    assert.ok(utf16Units(filler) <= 60000 && utf16Units(filler) >= 59000, 'constraint setup error');
    const question = `Reply with exactly: OK. Text: ${filler}`;
    const r = await chat({ model, messages: [{ role: 'user', content: question }], max_tokens: 16 });
    assert.equal(r.ok, true, `status ${r.status}`);
    const text = r.payload?.choices?.[0]?.message?.content;
    assert.ok(/^OK\b/i.test(text?.trim() ?? ''), 'edge prompt failed');
    return { promptUtf8Bytes: bytes, promptUtf16Units: utf16Units(filler),
      usage: usageFacts(r.payload) };
  });

  emit({ summary: true, usedThisRun: budget.current, totalAuthorized: TOTAL,
    failedTest, imageDeltaTokens, largeImageDeltaTokens });
}

main();
