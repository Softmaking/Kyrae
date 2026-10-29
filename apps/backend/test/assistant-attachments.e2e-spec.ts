import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppModule } from '../src/app.module';
import { Agent } from '../src/agents/agent.entity';
import { User } from '../src/users/user.entity';
import { applyGlobalPipes, getAdminToken } from './helpers';

const REQUIRED_ENV_VARS = [
  'KYRAE_ATTACH_E2E_DB_HOST',
  'KYRAE_ATTACH_E2E_DB_PORT',
  'KYRAE_ATTACH_E2E_DB_NAME',
  'KYRAE_ATTACH_E2E_DB_USER',
  'KYRAE_ATTACH_E2E_DB_PASS',
] as const;

const REQUIRED_REASON_UNIVERSE = [
  'unsupported_provider',
  'profile_unverified',
  'model_identity_unverified',
  'text_accounting_unavailable',
  'image_input_unverified',
  'image_accounting_unavailable',
  'policy_validation_pending',
  'privacy_validation_pending',
  'worker_unavailable',
  'storage_unavailable',
  'deployment_validation_pending',
];

const ACCEPTABLE_TIMEOUT_CODES = ['ATTACHMENT_NOT_READY', 'ATTACHMENTS_PROVIDER_FAILED'];

interface EnvRuntime {
  ready: boolean;
  missing: string[];
  tokenAdmin: string;
  tokenA: string;
  tokenB: string;
  userA: string;
  chatRoleId: string;
  stagingBatchId: string;
  consumedBatchId: string;
  uploadedAttachmentId: string;
}

const runtime: EnvRuntime = {
  ready: false,
  missing: [],
  tokenAdmin: '',
  tokenA: '',
  tokenB: '',
  userA: '',
  chatRoleId: '',
  stagingBatchId: '',
  consumedBatchId: '',
  uploadedAttachmentId: '',
};

function applyAttachmentE2EEnv(): void {
  runtime.missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  runtime.ready = runtime.missing.length === 0;
  if (!runtime.ready) return;
  process.env.DB_HOST = process.env.KYRAE_ATTACH_E2E_DB_HOST;
  process.env.DB_PORT = process.env.KYRAE_ATTACH_E2E_DB_PORT;
  process.env.DB_NAME = process.env.KYRAE_ATTACH_E2E_DB_NAME;
  process.env.DB_USER = process.env.KYRAE_ATTACH_E2E_DB_USER;
  process.env.DB_PASS = process.env.KYRAE_ATTACH_E2E_DB_PASS;
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'dev_jwt_secret_change_me';
  process.env.DEFAULT_AGENT_PROVIDER = 'HERMES';
  process.env.ASSISTANT_MODEL_PROFILES_JSON = '[]';
  process.env.ASSISTANT_ATTACHMENT_WORKER_VALIDATED = 'false';
}

function printEnvHelperSummary(): void {
  const lines = [
    '=== Assistant attachments e2e env helper summary (persistent contract) ===',
    'The whole spec runs only when ALL of these are provided; without them every test is skipped on purpose so CI can reproduce the skip:',
    ...REQUIRED_ENV_VARS.map((name) => `  ${name}`),
    'Inside the spec (process.env overrides dotenv/.env): DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS from KYRAE_ATTACH_E2E_*;',
    "  JWT_SECRET falls back to documented dev default 'dev_jwt_secret_change_me' from apps/backend/.env.example;",
    "  DEFAULT_AGENT_PROVIDER='HERMES'; ASSISTANT_MODEL_PROFILES_JSON='[]';",
    "  ASSISTANT_ATTACHMENT_WORKER_VALIDATED='false' (mirrors .env.example defaults: capability stays honestly unavailable; no live Hermes/model calls ever);",
    '  ASSISTANT_ATTACHMENT_STORAGE_ROOT is a mkdtemp directory under os.tmpdir(), realpath-resolved because the product rejects symlinked ancestors; the test creates it.',
    'Reproduce locally/CI: ephemeral postgres:18 container + mapped port, TypeORM migrations + seed against it, then:',
    '  pnpm --dir apps/backend test:e2e --runInBand test/assistant-attachments.e2e-spec.ts',
    'with the KYRAE_ATTACH_E2E_DB_* variables exported to the jest process.',
  ];
  if (runtime.missing.length)
    lines.push(
      `  SKIP REASON (this run): missing ${runtime.missing.join(', ')}; all tests skipped by design.`
    );
  console.log(lines.join('\n'));
}

jest.setTimeout(120_000);
applyAttachmentE2EEnv();

if (!runtime.ready)
  console.warn(
    `Assistant attachments e2e SKIPPED: missing env ${runtime.missing.join(', ')} ` +
      '(provide KYRAE_ATTACH_E2E_DB_* plus an isolated PostgreSQL to run; see env helper summary).'
  );

const registerSuites = runtime.ready ? describe : describe.skip;
let storageRoot = '';

async function createApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication();
  applyGlobalPipes(app);
  await app.init();
  return app;
}

async function permissionId(db: DataSource, name: string): Promise<string> {
  const rows: { id: string }[] = await db.query(`SELECT id FROM permissions WHERE name=$1`, [name]);
  if (!rows.length) throw new Error(`permission ${name} missing`);
  return rows[0].id;
}

interface Descriptor {
  id: string;
  batchId: string;
  sessionId: string | null;
  messageId: string | null;
  clientFileId: string;
  originalFilename: string;
  byteSize: number;
  mediaType: string | null;
  category: string | null;
  lifecycle: string;
  processingStatus: string;
  processingVersion: number;
  errorCode: string | null;
  errorMessage: string | null;
  downloadAvailable: boolean;
  thumbnailAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

const HELLO_WORLD = Buffer.from('hello world', 'utf8');

registerSuites('Assistant attachments e2e (contract-facing PostgreSQL flows)', () => {
  let app: INestApplication;
  let db: DataSource;

  beforeAll(async () => {
    const raw = await mkdtemp(join(tmpdir(), 'kyrae-attach-e2e-root-'));
    storageRoot = await realpath(raw);
    process.env.ASSISTANT_ATTACHMENT_STORAGE_ROOT = storageRoot;

    app = await createApp();
    db = app.get(DataSource);
    if (!(await db.getRepository(Agent).findOneBy({ provider: 'HERMES' }))) {
      await db.getRepository(Agent).save({
        name: `e2e-hermes-${randomUUID()}`,
        provider: 'HERMES',
        defaultExecutionMode: 'CHAT',
        configuration: { model: 'hermes-agent' },
        enabled: true,
      });
    }

    runtime.tokenAdmin = await getAdminToken(app);
    const seeds = [randomUUID(), randomUUID()];
    const permissionList = await request(app.getHttpServer())
      .get('/permissions')
      .set('Authorization', `Bearer ${runtime.tokenAdmin}`)
      .expect(200);
    const chatPermissionId = (permissionList.body as { id: string; name: string }[]).find(
      (p) => p.name === 'ASSISTANT_CHAT_USE'
    )?.id;
    expect(chatPermissionId).toBeTruthy();
    const role = await request(app.getHttpServer())
      .post('/roles')
      .set('Authorization', `Bearer ${runtime.tokenAdmin}`)
      .send({ name: `attach-e2e-chat-${seeds[0]}`, permissionIds: [chatPermissionId] })
      .expect(201);
    runtime.chatRoleId = (role.body as { id: string }).id;

    const users = await Promise.all(
      seeds.map(async (seed) => {
        const email = `attach-e2e-${seed}@test.cl`;
        const created = await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${runtime.tokenAdmin}`)
          .send({
            email,
            firstName: 'Attach',
            firstSurname: 'E2E',
            password: 'ChangeMe123!',
            roleIds: [runtime.chatRoleId],
          })
          .expect(201);
        const login = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email, password: 'ChangeMe123!' })
          .expect(201);
        expect((login.body as { user: { permissions: string[] } }).user.permissions).toEqual(
          expect.arrayContaining(['ASSISTANT_CHAT_USE'])
        );
        return {
          id: (created.body as { id: string }).id,
          token: (login.body as { accessToken: string }).accessToken,
        };
      })
    );
    runtime.userA = users[0].id;
    runtime.tokenA = users[0].token;
    runtime.tokenB = users[1].token;
  }, 90_000);

  afterAll(async () => {
    await app?.close();
    if (storageRoot) await rm(storageRoot, { recursive: true, force: true });
    if (runtime.ready) delete process.env.ASSISTANT_ATTACHMENT_STORAGE_ROOT;
  }, 30_000);

  it('rejects attachment capabilities without auth (401)', async () => {
    await request(app.getHttpServer()).get('/messages/attachment-capabilities').expect(401);
  }, 20_000);

  it('returns truthfully unavailable capabilities with the exact constraint numbers', async () => {
    const res = await request(app.getHttpServer())
      .get('/messages/attachment-capabilities')
      .set('Authorization', `Bearer ${runtime.tokenA}`)
      .expect(200);
    const body = res.body as {
      provider: string;
      resolvedModel: string | null;
      available: boolean;
      imageInputAvailable: boolean;
      imageTransport: string | null;
      contextWindowTokens: number | null;
      imageTokenUpperBound?: number;
      imageInputAccounting: string;
      textInputAccounting: string;
      outputAccountingMode: string;
      unavailableReasons: string[];
      limits: {
        maxFiles: number;
        maxFileBytes: number;
        maxBatchBytes: number;
        maxFilenameBytes: number;
      };
      constraints: Record<string, number>;
    };
    expect(body.available).toBe(false);
    expect(body.imageInputAvailable).toBe(false);
    expect(body.imageTransport).toBeNull();
    expect(body.contextWindowTokens).toBeNull();
    expect(body.imageTokenUpperBound).toBeUndefined();
    expect(body.provider).toBe('HERMES');
    expect(body.resolvedModel).toBe('hermes-agent');
    expect(body.textInputAccounting).toBe('unavailable');
    expect(body.imageInputAccounting).toBe('unavailable');
    expect(body.outputAccountingMode).toBe('utf16_units');
    expect(Array.isArray(body.unavailableReasons)).toBe(true);
    for (const reason of body.unavailableReasons)
      expect(REQUIRED_REASON_UNIVERSE).toContain(reason);
    expect(body.unavailableReasons).toContain('worker_unavailable');
    expect(body.unavailableReasons).not.toContain('storage_unavailable');
    expect(body.limits).toEqual({
      maxFiles: 5,
      maxFileBytes: 20_971_520,
      maxBatchBytes: 104_857_600,
      maxFilenameBytes: 255,
    });
    expect(body.constraints).toEqual({
      maxSerializedRequestBytes: 9_000_000,
      maxCombinedTextUtf16Units: 60_000,
      maxSuppliedInputTokens: 24_000,
      maxOutputTokens: 4_096,
      maxOutputUtf16Units: 16_000,
      maxRawResponseBytes: 262_144,
      invocationDeadlineMs: 120_000,
      maxImages: 5,
      maxImageBytes: 1_048_576,
      maxImageLongEdgePixels: 2_048,
    });
  }, 25_000);

  it('reserves owner-scoped upload batches with ~24h expiry and idempotent replay', async () => {
    const hdr = { Authorization: `Bearer ${runtime.tokenA}` };
    await request(app.getHttpServer()).post('/messages/upload-batches').set(hdr).expect(400);
    await request(app.getHttpServer())
      .post('/messages/upload-batches')
      .set(hdr)
      .send({ clientBatchId: 'not-a-uuid', channel: 'web' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/messages/upload-batches')
      .set(hdr)
      .send({ clientBatchId: randomUUID(), sessionId: randomUUID(), channel: 'web' })
      .expect(404);

    const clientBatchId = randomUUID();
    const created = await request(app.getHttpServer())
      .post('/messages/upload-batches')
      .set(hdr)
      .send({ clientBatchId, channel: 'web' })
      .expect(201);
    const batch = created.body as {
      id: string;
      sessionId: string | null;
      state: string;
      channel: string;
      expiresAt: string;
      attachments: unknown[];
      capabilities: unknown;
      limits: { maxFiles: number };
    };
    expect(batch.state).toBe('open');
    expect(batch.sessionId).toBeNull();
    expect(batch.channel).toBe('web');
    expect(batch.attachments).toEqual([]);
    expect(batch.capabilities).toBeTruthy();
    expect(batch.limits.maxFiles).toBe(5);
    const drift = new Date(batch.expiresAt).getTime() - Date.now();
    expect(Math.abs(drift - 86_400_000)).toBeLessThan(120_000);

    const replay = await request(app.getHttpServer())
      .post('/messages/upload-batches')
      .set(hdr)
      .send({ clientBatchId, channel: 'web' })
      .expect(201);
    expect((replay.body as { id: string }).id).toBe(batch.id);

    const conflict = await request(app.getHttpServer())
      .post('/messages/upload-batches')
      .set(hdr)
      .send({ clientBatchId, channel: 'mobile' })
      .expect(409);
    expect((conflict.body as { code: string }).code).toBe('ATTACHMENT_IDEMPOTENCY_CONFLICT');

    runtime.stagingBatchId = batch.id;
  }, 30_000);

  it('stages, replays and conflicts one file, then serves exact original bytes owner-only', async () => {
    const hdr = { Authorization: `Bearer ${runtime.tokenA}` };
    const clientFileId = randomUUID();

    const upload = await request(app.getHttpServer())
      .post(`/messages/upload-batches/${runtime.stagingBatchId}/files`)
      .set(hdr)
      .field('clientFileId', clientFileId)
      .attach('file', HELLO_WORLD, { filename: 'notes.txt', contentType: 'text/plain' })
      .expect(201);
    const desc = upload.body as Descriptor;
    runtime.uploadedAttachmentId = desc.id;
    expect(desc.batchId).toBe(runtime.stagingBatchId);
    expect(desc.sessionId).toBeNull();
    expect(desc.messageId).toBeNull();
    expect(desc.clientFileId).toBe(clientFileId);
    expect(desc.originalFilename).toBe('notes.txt');
    expect(desc.byteSize).toBe(11);
    expect(desc.mediaType).toBe('text/plain');
    expect(desc.category).toBe('text');
    expect(desc.lifecycle).toBe('ready');
    expect(desc.processingStatus).toBe('pending');
    expect(desc.errorCode).toBeNull();
    expect(desc.downloadAvailable).toBe(true);
    expect(desc.thumbnailAvailable).toBe(false);

    const replay = await request(app.getHttpServer())
      .post(`/messages/upload-batches/${runtime.stagingBatchId}/files`)
      .set(hdr)
      .field('clientFileId', clientFileId)
      .attach('file', HELLO_WORLD, { filename: 'notes.txt', contentType: 'text/plain' })
      .expect(201);
    expect((replay.body as { id: string }).id).toBe(desc.id);

    const conflict = await request(app.getHttpServer())
      .post(`/messages/upload-batches/${runtime.stagingBatchId}/files`)
      .set(hdr)
      .field('clientFileId', clientFileId)
      .attach('file', Buffer.from('different content here', 'utf8'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
      .expect(409);
    expect((conflict.body as { code: string }).code).toBe('ATTACHMENT_IDEMPOTENCY_CONFLICT');

    const batch = await request(app.getHttpServer())
      .get(`/messages/upload-batches/${runtime.stagingBatchId}`)
      .set(hdr)
      .expect(200);
    expect(
      (batch.body as { attachments: { id: string; lifecycle: string }[] }).attachments
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: desc.id, lifecycle: 'ready' })])
    );

    await request(app.getHttpServer())
      .delete(`/messages/upload-batches/${runtime.stagingBatchId}/files/${desc.id}`)
      .set({ Authorization: `Bearer ${runtime.tokenB}` })
      .expect(404);
    await request(app.getHttpServer())
      .get(`/messages/attachments/${desc.id}`)
      .set({ Authorization: `Bearer ${runtime.tokenB}` })
      .expect(404);
    await request(app.getHttpServer())
      .get(`/messages/attachments/${desc.id}/content`)
      .set({ Authorization: `Bearer ${runtime.tokenB}` })
      .expect(404);
    await request(app.getHttpServer())
      .get(`/messages/upload-batches/${runtime.stagingBatchId}`)
      .set({ Authorization: `Bearer ${runtime.tokenB}` })
      .expect(404);

    const content = await request(app.getHttpServer())
      .get(`/messages/attachments/${desc.id}/content`)
      .set(hdr)
      .expect(200);
    expect(content.body).toEqual(HELLO_WORLD);
    expect(content.headers['content-length']).toBe('11');
    expect(content.headers['x-content-type-options']).toBe('nosniff');
    expect(content.headers['cache-control']).toBe('private, no-store');
    expect(content.headers['content-disposition']).toContain('attachment');
    expect(content.headers['content-disposition']).toContain('notes.txt');

    await request(app.getHttpServer())
      .get(`/messages/attachments/${randomUUID()}/content`)
      .set(hdr)
      .expect(404);
  }, 45_000);

  it('rejects incomplete, duplicate, oversized and empty attachment selections (400)', async () => {
    const hdr = { Authorization: `Bearer ${runtime.tokenA}` };
    const base = {
      message: 'Analiza los archivos adjuntos',
      uploadBatchId: runtime.stagingBatchId,
      clientMessageId: randomUUID(),
    };
    await request(app.getHttpServer())
      .post('/messages')
      .set(hdr)
      .send({ ...base, message: '   ' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/messages')
      .set(hdr)
      .send({
        message: 'ids sin lote',
        attachmentIds: [runtime.uploadedAttachmentId],
        clientMessageId: base.clientMessageId,
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/messages')
      .set(hdr)
      .send({
        ...base,
        attachmentIds: [runtime.uploadedAttachmentId, runtime.uploadedAttachmentId],
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/messages')
      .set(hdr)
      .send({ ...base, attachmentIds: Array.from({ length: 6 }, () => randomUUID()) })
      .expect(400);
  }, 30_000);

  it('commits attachment sends atomically: durable task, retained downloads, stable consumed-state deletes', async () => {
    const hdr = { Authorization: `Bearer ${runtime.tokenA}` };
    const send = await request(app.getHttpServer())
      .post('/messages')
      .set(hdr)
      .send({
        message: 'Resumen el contenido de notes.txt',
        uploadBatchId: runtime.stagingBatchId,
        attachmentIds: [runtime.uploadedAttachmentId],
        clientMessageId: randomUUID(),
      })
      .expect(504);
    const timeout = send.body as { code: string; taskId: string; sessionId: string };
    expect(timeout.taskId).toBeTruthy();
    expect(timeout.sessionId).toBeTruthy();
    expect(ACCEPTABLE_TIMEOUT_CODES).toContain(timeout.code);
    runtime.consumedBatchId = runtime.stagingBatchId;

    const task = await request(app.getHttpServer())
      .get(`/messages/tasks/${timeout.taskId}`)
      .set(hdr)
      .expect(200);
    const taskBody = task.body as {
      id: string;
      status: string;
      sessionId: string;
      userMessage: {
        id: string;
        attachments: { id: string; lifecycle: string; messageId: string | null }[];
      };
    };
    expect(taskBody.id).toBe(timeout.taskId);
    expect(taskBody.sessionId).toBe(timeout.sessionId);
    expect(['pending', 'running', 'failed']).toContain(taskBody.status);
    expect(taskBody.userMessage.attachments).toHaveLength(1);
    expect(taskBody.userMessage.attachments[0].id).toBe(runtime.uploadedAttachmentId);
    expect(taskBody.userMessage.attachments[0].lifecycle).toBe('attached');
    expect(taskBody.userMessage.attachments[0].messageId).toBe(taskBody.userMessage.id);

    const history = await request(app.getHttpServer())
      .get(`/sessions/${timeout.sessionId}/messages`)
      .set(hdr)
      .expect(200);
    const messages = (
      history.body as {
        messages: { role: string; attachments: { id: string }[] }[];
      }
    ).messages;
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage?.attachments).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: runtime.uploadedAttachmentId })])
    );

    const retained = await request(app.getHttpServer())
      .get(`/messages/attachments/${runtime.uploadedAttachmentId}/content`)
      .set(hdr)
      .expect(200);
    expect(retained.body).toEqual(HELLO_WORLD);

    const consumed = await request(app.getHttpServer())
      .delete(`/messages/upload-batches/${runtime.consumedBatchId}`)
      .set(hdr)
      .expect(409);
    expect((consumed.body as { code: string }).code).toBe('ATTACHMENT_BATCH_UNAVAILABLE');
    const consumedAgain = await request(app.getHttpServer())
      .delete(`/messages/upload-batches/${runtime.consumedBatchId}`)
      .set(hdr)
      .expect(409);
    expect((consumedAgain.body as { code: string }).code).toBe('ATTACHMENT_BATCH_UNAVAILABLE');
  }, 60_000);

  it('supports staged-file removal and batch cancellation with stable second attempts', async () => {
    const hdr = { Authorization: `Bearer ${runtime.tokenA}` };
    const clientBatchId = randomUUID();
    const created = await request(app.getHttpServer())
      .post('/messages/upload-batches')
      .set(hdr)
      .send({ clientBatchId, channel: 'web' })
      .expect(201);
    const batchId = (created.body as { id: string }).id;
    const staged = await request(app.getHttpServer())
      .post(`/messages/upload-batches/${batchId}/files`)
      .set(hdr)
      .field('clientFileId', randomUUID())
      .attach('file', Buffer.from('hello staging', 'utf8'), {
        filename: 'staging-notes.txt',
        contentType: 'text/plain',
      })
      .expect(201);
    expect((staged.body as { byteSize: number }).byteSize).toBe(13);
    const stagedId = (staged.body as { id: string }).id;

    const removed = await request(app.getHttpServer())
      .delete(`/messages/upload-batches/${batchId}/files/${stagedId}`)
      .set(hdr)
      .expect(200);
    expect((removed.body as { success: boolean }).success).toBe(true);
    await request(app.getHttpServer())
      .delete(`/messages/upload-batches/${batchId}/files/${stagedId}`)
      .set(hdr)
      .expect(404);

    const cancelled = await request(app.getHttpServer())
      .delete(`/messages/upload-batches/${batchId}`)
      .set(hdr)
      .expect(200);
    expect((cancelled.body as { success: boolean }).success).toBe(true);
    const cancelledAgain = await request(app.getHttpServer())
      .delete(`/messages/upload-batches/${batchId}`)
      .set(hdr)
      .expect(409);
    expect((cancelledAgain.body as { code: string }).code).toBe('ATTACHMENT_BATCH_UNAVAILABLE');
  }, 40_000);

  it('enforces runtime revocation for deactivated accounts and revoked permissions (never 500)', async () => {
    const hdr = { Authorization: `Bearer ${runtime.tokenA}` };
    const chatPermId = await permissionId(db, 'ASSISTANT_CHAT_USE');
    try {
      await db.query(`DELETE FROM roles_permissions WHERE "roleId"=$1 AND "permissionId"=$2`, [
        runtime.chatRoleId,
        chatPermId,
      ]);
      const revoked = await request(app.getHttpServer())
        .get(`/messages/attachments/${runtime.uploadedAttachmentId}`)
        .set(hdr)
        .expect(403);
      expect((revoked.body as { code: string }).code).toBe('ATTACHMENT_ACCESS_REVOKED');
    } finally {
      await db.getRepository(User).update(runtime.userA, { isActive: true });
      await db.query(
        `INSERT INTO roles_permissions ("roleId","permissionId") VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [runtime.chatRoleId, chatPermId]
      );
    }

    try {
      await db.getRepository(User).update(runtime.userA, { isActive: false });
      const deactivated = await request(app.getHttpServer())
        .get(`/messages/attachments/${runtime.uploadedAttachmentId}/content`)
        .set(hdr);
      expect([401, 403]).toContain(deactivated.status);
      expect(deactivated.status).not.toBe(500);
      expect(deactivated.status).not.toBeGreaterThanOrEqual(500);
      if (deactivated.status === 403)
        expect((deactivated.body as { code?: string }).code).toBe('ATTACHMENT_ACCESS_REVOKED');
    } finally {
      await db.getRepository(User).update(runtime.userA, { isActive: true });
    }

    await request(app.getHttpServer())
      .get(`/messages/attachments/${runtime.uploadedAttachmentId}/content`)
      .set(hdr)
      .expect(200);
  }, 40_000);
});

registerSuites('Assistant attachments storage-root validation (relative root)', () => {
  let app2: INestApplication;
  let originalRoot: string | undefined;

  beforeAll(async () => {
    originalRoot = process.env.ASSISTANT_ATTACHMENT_STORAGE_ROOT;
    process.env.ASSISTANT_ATTACHMENT_STORAGE_ROOT = `kyrae-attach-e2e-relative-${Date.now()}`;
    app2 = await createApp();
  }, 60_000);

  afterAll(async () => {
    await app2?.close();
    await rm(join(process.cwd(), process.env.ASSISTANT_ATTACHMENT_STORAGE_ROOT ?? ''), {
      recursive: true,
      force: true,
    });
    if (originalRoot === undefined) delete process.env.ASSISTANT_ATTACHMENT_STORAGE_ROOT;
    else process.env.ASSISTANT_ATTACHMENT_STORAGE_ROOT = originalRoot;
  }, 30_000);

  it('keeps batch creation possible and rejects uploads with 503 ATTACHMENT_STORAGE_UNAVAILABLE for a relative root', async () => {
    const headers = { Authorization: `Bearer ${runtime.tokenAdmin}` };
    const caps = await request(app2.getHttpServer())
      .get('/messages/attachment-capabilities')
      .set(headers)
      .expect(200);
    expect((caps.body as { available: boolean }).available).toBe(false);
    const batch = await request(app2.getHttpServer())
      .post('/messages/upload-batches')
      .set(headers)
      .send({ clientBatchId: randomUUID(), channel: 'web' })
      .expect(201);
    const batchId = (batch.body as { id: string }).id;
    const failed = await request(app2.getHttpServer())
      .post(`/messages/upload-batches/${batchId}/files`)
      .set(headers)
      .field('clientFileId', randomUUID())
      .attach('file', Buffer.from('x', 'utf8'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
      .expect(503);
    expect((failed.body as { code: string }).code).toBe('ATTACHMENT_STORAGE_UNAVAILABLE');
  }, 40_000);
});

afterAll(printEnvHelperSummary);
