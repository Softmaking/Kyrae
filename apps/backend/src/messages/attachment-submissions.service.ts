import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { createHash } from 'node:crypto';
import { isUUID } from 'class-validator';
import { AssistantAttachmentsService } from '../assistant-attachments/assistant-attachments.service';
import {
  AssistantAttachment,
  AssistantMessageContext,
  AssistantMessageSubmission,
  AssistantUploadBatch,
} from '../assistant-attachments/attachment.entities';
import { AttachmentModelProfiles } from '../agents/attachment-model-profile.service';
import { AgentOrchestratorService } from '../agents/agent-orchestrator.service';
import { attachmentError } from '../assistant-attachments/attachment.errors';
import { SendMessageDto } from './dto/send-message.dto';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { AssistantMessageTask } from './assistant-message-task.entity';

export function validateAttachmentSubmission(dto: SendMessageDto): void {
  if (
    !dto.message?.trim() ||
    dto.message.length > 4000 ||
    !dto.message.isWellFormed() ||
    (dto.sessionId && dto.conversationId && dto.sessionId !== dto.conversationId)
  )
    throw attachmentError('ATTACHMENT_SELECTION_MISMATCH', 400);
  const any = dto.uploadBatchId !== undefined || dto.attachmentIds !== undefined;
  if (
    any &&
    (!dto.uploadBatchId ||
      !isUUID(dto.uploadBatchId) ||
      !dto.clientMessageId ||
      !isUUID(dto.clientMessageId) ||
      !Array.isArray(dto.attachmentIds) ||
      dto.attachmentIds.length < 1 ||
      dto.attachmentIds.length > 5 ||
      new Set(dto.attachmentIds).size !== dto.attachmentIds.length ||
      !dto.attachmentIds.every((id) => isUUID(id)))
  )
    throw attachmentError('ATTACHMENT_SELECTION_MISMATCH', 400);
}

@Injectable()
export class AttachmentSubmissions {
  constructor(
    private readonly db: DataSource,
    private readonly attachments: AssistantAttachmentsService,
    private readonly agents: AgentOrchestratorService,
    private readonly profiles: AttachmentModelProfiles
  ) {}

  async applies(dto: SendMessageDto, owner: string): Promise<boolean> {
    validateAttachmentSubmission(dto);
    if (dto.uploadBatchId || dto.attachmentIds) return true;
    const session = dto.sessionId ?? dto.conversationId;
    if (!session) return false;
    const count = await this.db
      .getRepository(AssistantAttachment)
      .countBy({ conversation_id: session, owner_id: owner, lifecycle: 'attached' });
    return count > 0;
  }

  async commit(owner: string, dto: SendMessageDto): Promise<AssistantMessageTask> {
    validateAttachmentSubmission(dto);
    await this.attachments.access.assertCurrent(owner);
    if (!dto.clientMessageId || !isUUID(dto.clientMessageId)) {
      // Follow-ups from legacy text clients still receive a durable task, without retry semantics.
      const { randomUUID } = await import('node:crypto');
      dto = { ...dto, clientMessageId: randomUUID() };
    }
    const session = dto.sessionId ?? dto.conversationId;
    const preflight = await this.attachments.resolve(owner, session);
    const batch = dto.uploadBatchId
      ? await this.attachments.ownedBatch(dto.uploadBatchId, owner)
      : null;
    const agent = batch ? await this.agents.resolveAgent(batch.agent_id) : preflight.agent;
    this.profiles.assertProvider(agent);
    if (session && agent.id !== preflight.agent.id)
      throw attachmentError('ATTACHMENTS_UNSUPPORTED_PROVIDER');
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          message: dto.message.trim(),
          session: session ?? null,
          channel: dto.channel ?? 'web',
          batch: dto.uploadBatchId ?? null,
          ids: dto.attachmentIds ?? [],
        })
      )
      .digest('hex');
    if (batch) {
      const files = await this.db
        .getRepository(AssistantAttachment)
        .findBy({ batch_id: batch.id, owner_id: owner, lifecycle: 'ready' });
      for (const f of files)
        await this.attachments.storage.verify(f.original_key, Number(f.byte_size), f.sha256);
    }
    const task = await this.db.transaction(async (em) => {
      await em.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        `submission:${owner}:${dto.clientMessageId}`,
      ]);
      const replay = await em
        .getRepository(AssistantMessageSubmission)
        .findOneBy({ owner_id: owner, client_message_id: dto.clientMessageId! });
      if (replay) {
        if (replay.fingerprint !== fingerprint)
          throw attachmentError('ATTACHMENT_IDEMPOTENCY_CONFLICT');
        return em.getRepository(AssistantMessageTask).findOneByOrFail({ id: replay.task_id });
      }
      await this.attachments.access.assertCurrent(owner, em);
      let locked: AssistantUploadBatch | null = null;
      let files: AssistantAttachment[] = [];
      if (batch) {
        locked = await this.attachments.ownedBatch(batch.id, owner, em, true);
        this.attachments.assertOpen(locked);
        if (
          locked.target_conversation_id !== (session ?? null) ||
          locked.channel !== (dto.channel ?? 'web') ||
          locked.agent_id !== agent.id ||
          locked.provider !== agent.provider
        )
          throw attachmentError('ATTACHMENT_SELECTION_MISMATCH');
        files = await em.getRepository(AssistantAttachment).find({
          where: { batch_id: locked.id, lifecycle: In(['uploading', 'ready']) },
          lock: { mode: 'pessimistic_write' },
        });
        if (
          files.length !== dto.attachmentIds!.length ||
          files.some((f) => f.lifecycle !== 'ready' || !dto.attachmentIds!.includes(f.id))
        )
          throw attachmentError('ATTACHMENT_NOT_READY');
        if (files.length > 5 || files.reduce((n, f) => n + Number(f.byte_size), 0) > 104_857_600)
          throw attachmentError('ATTACHMENT_BATCH_TOO_LARGE', 413);
      }
      const conversations = em.getRepository(Conversation);
      const conversation = session
        ? await conversations.findOne({
            where: { id: session, userId: owner },
            lock: { mode: 'pessimistic_write' },
          })
        : await conversations.save(
            conversations.create({
              userId: owner,
              title: dto.message.trim().slice(0, 80),
              channel: dto.channel ?? 'web',
              agentId: agent.id,
              provider: agent.provider,
              status: 'active',
            })
          );
      if (!conversation || (conversation.agentId && conversation.agentId !== agent.id))
        throw attachmentError('ATTACHMENT_SELECTION_MISMATCH');
      const message = await em.getRepository(Message).save(
        em.getRepository(Message).create({
          conversationId: conversation.id,
          role: 'user',
          content: dto.message.trim(),
          channel: dto.channel ?? 'web',
          status: 'completed',
          metadata: null,
        })
      );
      const task = await em.getRepository(AssistantMessageTask).save(
        em.getRepository(AssistantMessageTask).create({
          userId: owner,
          conversationId: conversation.id,
          userMessageId: message.id,
          status: 'pending',
          channel: dto.channel ?? 'web',
        })
      );
      for (const f of files) {
        f.conversation_id = conversation.id;
        f.message_id = message.id;
        f.ordinal = dto.attachmentIds!.indexOf(f.id);
        f.lifecycle = 'attached';
        await em.save(f);
        await em.query(
          `INSERT INTO assistant_attachment_jobs(kind,attachment_id,task_id) VALUES ('process',$1,$2)`,
          [f.id, task.id]
        );
      }
      await em.query(`INSERT INTO assistant_attachment_jobs(kind,task_id) VALUES ('dispatch',$1)`, [
        task.id,
      ]);
      await em
        .getRepository(AssistantMessageContext)
        .save({ task_id: task.id, message_id: message.id, state: 'pending' });
      if (locked) {
        locked.state = 'consumed';
        locked.target_conversation_id = conversation.id;
        await em.save(locked);
      }
      await em.getRepository(AssistantMessageSubmission).save({
        owner_id: owner,
        client_message_id: dto.clientMessageId!,
        fingerprint,
        conversation_id: conversation.id,
        message_id: message.id,
        task_id: task.id,
      });
      await conversations.update(conversation.id, { updatedAt: new Date(), status: 'active' });
      return task;
    });
    await this.attachments.auditEvent('ASSISTANT_ATTACHMENTS_COMMITTED', owner, task.userMessageId);
    return task;
  }
}
