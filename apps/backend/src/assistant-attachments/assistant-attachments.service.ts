import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { randomUUID } from 'node:crypto';
import type {
  AssistantAttachmentDto,
  AssistantUploadBatchDto,
  CreateAssistantUploadBatchCommand,
} from '@kyrae/shared-contracts';
import { ASSISTANT_ATTACHMENT_POLICY as P } from '@kyrae/shared-contracts';
import { AgentOrchestratorService } from '../agents/agent-orchestrator.service';
import { AttachmentModelProfiles } from '../agents/attachment-model-profile.service';
import { AssistantAccessPolicy } from './assistant-access-policy.service';
import {
  AssistantAttachment,
  AssistantAttachmentDerivative,
  AssistantUploadBatch,
} from './attachment.entities';
import {
  FilesystemAttachmentStorage,
  StoredOriginal,
} from './filesystem-attachment-storage.service';
import {
  classifyOriginal,
  hasRestrictedControlChar,
  validateOriginalFilename,
} from './attachment-classification';
import { attachmentError } from './attachment.errors';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AssistantAttachmentsService {
  constructor(
    readonly db: DataSource,
    readonly access: AssistantAccessPolicy,
    readonly storage: FilesystemAttachmentStorage,
    private readonly agents: AgentOrchestratorService,
    private readonly profiles: AttachmentModelProfiles,
    private readonly audit: AuditService
  ) {}

  async resolve(owner: string, sessionId?: string) {
    await this.access.assertCurrent(owner);
    const conversation = sessionId ? await this.access.conversation(sessionId, owner) : null;
    const agent = await this.agents.resolveAgent(conversation?.agentId ?? undefined);
    return { agent, conversation, capabilities: this.profiles.capabilities(agent) };
  }

  async createBatch(
    owner: string,
    dto: CreateAssistantUploadBatchCommand
  ): Promise<AssistantUploadBatchDto> {
    const { agent, capabilities } = await this.resolve(owner, dto.sessionId);
    this.profiles.assertProvider(agent);
    const batch = await this.db.transaction(async (em) => {
      await em.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        `batch:${owner}:${dto.clientBatchId}`,
      ]);
      const repo = em.getRepository(AssistantUploadBatch);
      const existing = await repo.findOne({
        where: { owner_id: owner, client_batch_id: dto.clientBatchId },
      });
      if (existing) {
        if (
          existing.target_conversation_id !== (dto.sessionId ?? null) ||
          existing.channel !== dto.channel
        )
          throw attachmentError('ATTACHMENT_IDEMPOTENCY_CONFLICT');
        return existing;
      }
      return repo.save(
        repo.create({
          owner_id: owner,
          target_conversation_id: dto.sessionId ?? null,
          client_batch_id: dto.clientBatchId,
          channel: dto.channel,
          agent_id: agent.id,
          provider: agent.provider,
          profile_version: capabilities.profileVersion,
          state: 'open',
          expires_at: new Date(Date.now() + 86_400_000),
          reserved_count: 0,
          reserved_bytes: '0',
        })
      );
    });
    return this.batchDto(batch, owner);
  }

  async ownedBatch(
    id: string,
    owner: string,
    em = this.db.manager,
    lock = false
  ): Promise<AssistantUploadBatch> {
    await this.access.assertCurrent(owner, em);
    const row = await em.getRepository(AssistantUploadBatch).findOne({
      where: { id, owner_id: owner },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!row) throw new NotFoundException();
    return row;
  }

  assertOpen(batch: AssistantUploadBatch): void {
    if (batch.state !== 'open' || batch.expires_at.getTime() <= Date.now())
      throw attachmentError('ATTACHMENT_BATCH_UNAVAILABLE');
  }

  async getBatch(id: string, owner: string): Promise<AssistantUploadBatchDto> {
    return this.batchDto(await this.ownedBatch(id, owner), owner);
  }

  private async batchDto(
    batch: AssistantUploadBatch,
    owner: string
  ): Promise<AssistantUploadBatchDto> {
    const agent = await this.agents.resolveAgent(batch.agent_id);
    const files = await this.db.getRepository(AssistantAttachment).find({
      where: {
        batch_id: batch.id,
        owner_id: owner,
        lifecycle: In(['uploading', 'ready', 'attached']),
      },
      order: { created_at: 'ASC' },
    });
    const mapped = await this.map(files);
    return {
      id: batch.id,
      sessionId: batch.target_conversation_id,
      channel: batch.channel,
      state: batch.state,
      expiresAt: batch.expires_at.toISOString(),
      limits: P,
      capabilities: this.profiles.capabilities(agent),
      attachments: mapped,
    };
  }

  async beginUpload(
    batchId: string,
    owner: string,
    filename: string,
    knownClientId?: string
  ): Promise<AssistantAttachment> {
    validateOriginalFilename(filename);
    return this.db.transaction(async (em) => {
      const batch = await this.ownedBatch(batchId, owner, em, true);
      this.assertOpen(batch);
      const repo = em.getRepository(AssistantAttachment);
      if (knownClientId) {
        const existing = await repo.findOne({
          where: { batch_id: batchId, client_file_id: knownClientId },
        });
        if (existing) {
          if (existing.original_filename !== filename)
            throw attachmentError('ATTACHMENT_IDEMPOTENCY_CONFLICT');
          if (existing.lifecycle === 'ready') return existing;
          throw attachmentError('ATTACHMENT_NOT_READY');
        }
      }
      if (batch.reserved_count >= P.maxFiles) {
        // File may precede clientFileId in FormData. At capacity only an immutable
        // existing filename can enter replay verification; it cannot add a slot.
        if (!knownClientId) {
          const replay = await repo.findOne({
            where: { batch_id: batchId, original_filename: filename, lifecycle: 'ready' },
          });
          if (replay) return replay;
        }
        throw attachmentError('ATTACHMENT_COUNT_EXCEEDED', 400);
      }
      if (Number(batch.reserved_bytes) + P.maxFileBytes > P.maxBatchBytes)
        throw attachmentError('ATTACHMENT_BATCH_TOO_LARGE', 413);
      batch.reserved_count++;
      batch.reserved_bytes = String(Number(batch.reserved_bytes) + P.maxFileBytes);
      await em.save(batch);
      return repo.save(
        repo.create({
          owner_id: owner,
          batch_id: batchId,
          client_file_id: knownClientId ?? randomUUID(),
          original_filename: filename,
          byte_size: '0',
          original_key: randomUUID(),
          lifecycle: 'uploading',
          processing_status: 'pending',
          processing_version: 1,
          upload_generation: randomUUID(),
          upload_lease_until: new Date(Date.now() + 600_000),
        })
      );
    });
  }

  async finishUpload(
    row: AssistantAttachment,
    owner: string,
    clientId: string,
    stored: StoredOriginal
  ): Promise<AssistantAttachmentDto> {
    const classification = classifyOriginal(
      row.original_filename,
      stored.prefix,
      stored.byteSize <= stored.prefix.length
    );
    // Strictly decode all text without accumulating a 20 MiB original in memory.
    if (classification.mediaType.startsWith('text/')) {
      const encoding =
        stored.prefix[0] === 255 && stored.prefix[1] === 254
          ? 'utf-16le'
          : stored.prefix[0] === 254 && stored.prefix[1] === 255
            ? 'utf-16be'
            : 'utf-8';
      const decoder = new TextDecoder(encoding, { fatal: true });
      const file = await this.storage.open(stored.key);
      try {
        for await (const chunk of file.createReadStream({ autoClose: false })) {
          if (hasRestrictedControlChar(decoder.decode(chunk as Buffer, { stream: true })))
            throw new Error();
        }
        decoder.decode();
      } catch {
        throw attachmentError('ATTACHMENT_DECODING_FAILED', 415);
      } finally {
        await file.close();
      }
    }
    const result = await this.db.transaction(async (em) => {
      const batch = await this.ownedBatch(row.batch_id, owner, em, true);
      this.assertOpen(batch);
      const repo = em.getRepository(AssistantAttachment);
      const current = await repo.findOne({
        where: { id: row.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !current ||
        current.upload_generation !== row.upload_generation ||
        current.lifecycle !== 'uploading'
      )
        throw attachmentError('ATTACHMENT_NOT_READY');
      const existing = await repo.findOne({
        where: { batch_id: batch.id, client_file_id: clientId },
      });
      if (existing && existing.id !== current.id) {
        if (
          existing.lifecycle !== 'ready' ||
          existing.original_filename !== row.original_filename ||
          existing.sha256 !== stored.sha256 ||
          Number(existing.byte_size) !== stored.byteSize
        )
          throw attachmentError('ATTACHMENT_IDEMPOTENCY_CONFLICT');
        await this.markDelete(em, current);
        batch.reserved_count--;
        batch.reserved_bytes = String(Number(batch.reserved_bytes) - P.maxFileBytes);
        await em.save(batch);
        return existing;
      }
      batch.reserved_bytes = String(
        Number(batch.reserved_bytes) - P.maxFileBytes + stored.byteSize
      );
      await em.save(batch);
      Object.assign(current, {
        client_file_id: clientId,
        byte_size: String(stored.byteSize),
        sha256: stored.sha256,
        media_type: classification.mediaType,
        category: classification.category,
        lifecycle: 'ready',
        upload_lease_until: null,
        upload_generation: null,
      });
      return em.save(current);
    });
    await this.auditEvent('ASSISTANT_ATTACHMENT_UPLOADED', owner, result.id);
    return (await this.map([result]))[0];
  }

  async abandonUpload(row: AssistantAttachment): Promise<void> {
    if (row.lifecycle !== 'uploading') return;
    await this.db.transaction(async (em) => {
      const batch = await em
        .getRepository(AssistantUploadBatch)
        .findOne({ where: { id: row.batch_id }, lock: { mode: 'pessimistic_write' } });
      const current = await em
        .getRepository(AssistantAttachment)
        .findOne({ where: { id: row.id }, lock: { mode: 'pessimistic_write' } });
      if (
        !batch ||
        !current ||
        current.lifecycle !== 'uploading' ||
        current.upload_generation !== row.upload_generation
      )
        return;
      await this.markDelete(em, current);
      batch.reserved_count--;
      batch.reserved_bytes = String(Number(batch.reserved_bytes) - P.maxFileBytes);
      await em.save(batch);
    });
    await this.auditEvent('ASSISTANT_ATTACHMENT_UPLOAD_FAILED', row.owner_id, row.id);
  }

  async remove(batchId: string, owner: string, attachmentId?: string): Promise<{ success: true }> {
    await this.db.transaction(async (em) => {
      const batch = await this.ownedBatch(batchId, owner, em, true);
      this.assertOpen(batch);
      const files = await em.getRepository(AssistantAttachment).find({
        where: {
          batch_id: batchId,
          owner_id: owner,
          ...(attachmentId ? { id: attachmentId } : {}),
          lifecycle: In(['ready', 'uploading']),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (attachmentId && !files.length) throw new NotFoundException();
      for (const f of files) {
        batch.reserved_count--;
        batch.reserved_bytes = String(
          Number(batch.reserved_bytes) -
            (f.lifecycle === 'uploading' ? P.maxFileBytes : Number(f.byte_size))
        );
        await this.markDelete(em, f);
      }
      if (!attachmentId) batch.state = 'cancelled';
      await em.save(batch);
    });
    await this.auditEvent('ASSISTANT_ATTACHMENT_REMOVED', owner, attachmentId ?? batchId);
    return { success: true };
  }

  async markDelete(em: EntityManager, f: AssistantAttachment): Promise<void> {
    f.lifecycle = 'deleting';
    f.upload_generation = null;
    f.upload_lease_until = null;
    await em.save(f);
    await em.query(
      `INSERT INTO assistant_attachment_jobs(kind,attachment_id) VALUES ('delete',$1) ON CONFLICT DO NOTHING`,
      [f.id]
    );
  }

  async owned(id: string, owner: string): Promise<AssistantAttachment> {
    await this.access.assertCurrent(owner);
    const row = await this.db.getRepository(AssistantAttachment).findOne({
      where: { id, owner_id: owner, lifecycle: In(['ready', 'attached', 'uploading']) },
    });
    if (!row) throw new NotFoundException();
    if (row.conversation_id) await this.access.conversation(row.conversation_id, owner);
    else this.assertOpen(await this.ownedBatch(row.batch_id, owner));
    return row;
  }

  async descriptor(id: string, owner: string): Promise<AssistantAttachmentDto> {
    return (await this.map([await this.owned(id, owner)]))[0];
  }

  async map(files: AssistantAttachment[]): Promise<AssistantAttachmentDto[]> {
    if (!files.length) return [];
    const thumbnails = await this.db
      .getRepository(AssistantAttachmentDerivative)
      .find({ where: { attachment_id: In(files.map((f) => f.id)), kind: 'thumbnail' } });
    return files.map((f) => ({
      id: f.id,
      batchId: f.batch_id,
      sessionId: f.conversation_id,
      messageId: f.message_id,
      clientFileId: f.client_file_id,
      originalFilename: f.original_filename,
      byteSize: Number(f.byte_size),
      mediaType: f.media_type,
      category: f.category,
      lifecycle: f.lifecycle,
      processingStatus: f.processing_status,
      processingVersion: f.processing_version,
      errorCode: f.error_code,
      errorMessage: f.error_code ? 'El archivo no se pudo procesar completamente.' : null,
      ...(f.error_code
        ? { suggestedAction: 'Descarga el original o vuelve a enviarlo en un nuevo turno.' }
        : {}),
      downloadAvailable: ['ready', 'attached'].includes(f.lifecycle),
      thumbnailAvailable: thumbnails.some(
        (t) => t.attachment_id === f.id && t.processing_version === f.processing_version
      ),
      coverage: f.coverage,
      createdAt: f.created_at.toISOString(),
      updatedAt: f.updated_at.toISOString(),
    }));
  }

  async auditEvent(action: string, owner: string, id: string): Promise<void> {
    await this.audit.log({
      action,
      actorUserId: owner,
      resourceType: 'assistant_attachment',
      resourceId: id,
      severity: 'INFO',
    });
  }
}
