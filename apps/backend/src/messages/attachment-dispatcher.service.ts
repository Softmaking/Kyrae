import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import type { AgentChatResponse, AssistantOutputMetadata } from '@kyrae/shared-contracts';
import { AttachmentJobsService } from '../assistant-attachments/attachment-jobs.service';
import {
  AssistantAttachment,
  AssistantAttachmentJob,
  AssistantMessageContext,
} from '../assistant-attachments/attachment.entities';
import { AssistantAccessPolicy } from '../assistant-attachments/assistant-access-policy.service';
import { AgentOrchestratorService } from '../agents/agent-orchestrator.service';
import { AttachmentModelProfiles } from '../agents/attachment-model-profile.service';
import { AssistantContextBuilder } from './assistant-context-builder.service';
import { AssistantMessageTask } from './assistant-message-task.entity';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { MessagesGateway } from './messages.gateway';
import { attachmentError } from '../assistant-attachments/attachment.errors';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AttachmentDispatcher {
  private pumping = false;
  constructor(
    private readonly db: DataSource,
    private readonly jobs: AttachmentJobsService,
    private readonly access: AssistantAccessPolicy,
    private readonly agents: AgentOrchestratorService,
    private readonly profiles: AttachmentModelProfiles,
    private readonly builder: AssistantContextBuilder,
    private readonly gateway: MessagesGateway,
    private readonly audit: AuditService
  ) {}

  @Cron('*/2 * * * * *')
  async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    try {
      await this.recover();
      const job = await this.jobs.claim('dispatch');
      if (job) await this.dispatch(job);
    } finally {
      this.pumping = false;
    }
  }

  private async recover(): Promise<void> {
    await this.db.transaction(async (em) => {
      const stale: AssistantAttachmentJob[] = await em.query(
        `SELECT * FROM assistant_attachment_jobs WHERE kind='dispatch' AND state='running' AND lease_until<now() FOR UPDATE SKIP LOCKED LIMIT 50`
      );
      for (const job of stale) {
        const context = await em
          .getRepository(AssistantMessageContext)
          .findOneByOrFail({ task_id: job.task_id! });
        const uncertain = ['dispatching', 'indeterminate'].includes(context.state);
        if (!uncertain) {
          await em.query(
            `UPDATE assistant_attachment_jobs SET state='pending',lease_owner=NULL,lease_until=NULL,generation=generation+1,updated_at=now() WHERE id=$1`,
            [job.id]
          );
          continue;
        }
        context.state = 'indeterminate';
        if (context.manifest) context.manifest.status = 'indeterminate';
        await em.save(context);
        await em.update(AssistantMessageTask, job.task_id!, {
          status: 'failed',
          completedAt: new Date(),
          errorMessage:
            'ATTACHMENTS_DISPATCH_INDETERMINATE: No se conoce el resultado del proveedor. Los originales se conservaron; consulta el historial o envía un nuevo turno explícitamente.',
        });
        await em.query(
          `UPDATE assistant_attachment_jobs SET state='failed',error_code='ATTACHMENTS_DISPATCH_INDETERMINATE',generation=generation+1,lease_until=NULL,lease_owner=NULL,updated_at=now() WHERE id=$1`,
          [job.id]
        );
      }
    });
  }

  private async dispatch(job: AssistantAttachmentJob): Promise<void> {
    const timer = setInterval(() => {
      void this.jobs.heartbeat(job).catch(() => false);
    }, 15_000);
    let handedOff = false;
    let task: AssistantMessageTask | undefined;
    try {
      task = await this.db
        .getRepository(AssistantMessageTask)
        .findOneByOrFail({ id: job.task_id! });
      await this.access.assertCurrent(task.userId);
      const conversation = await this.access.conversation(task.conversationId, task.userId);
      const files: AssistantAttachment[] = await this.db.query(
        `SELECT a.* FROM assistant_attachments a JOIN messages m ON m.id=a.message_id WHERE a.conversation_id=$1 AND a.lifecycle='attached' AND (m.created_at,m.id)<=(SELECT created_at,id FROM messages WHERE id=$2)`,
        [task.conversationId, task.userMessageId]
      );
      if (files.some((f) => ['pending', 'processing'].includes(f.processing_status))) {
        await this.db.transaction(async (em) => {
          if (await this.jobs.fenced(em, job)) await this.jobs.finish(em, job, 'pending');
        });
        return;
      }
      const currentFiles = files.filter((f) => f.message_id === task!.userMessageId);
      if (
        (currentFiles.length ? currentFiles : files).every(
          (f) => !['usable', 'partial'].includes(f.processing_status)
        )
      )
        throw attachmentError('ATTACHMENT_PROCESSING_FAILED', 422);
      const agent = await this.agents.resolveAgent(conversation.agentId ?? undefined);
      const profile = this.profiles.requireAvailable(agent);
      const { messages, manifest } = await this.builder.build(
        task.userId,
        task.conversationId,
        task.userMessageId,
        profile
      );
      const allowed = await this.db.transaction(async (em) => {
        if (!(await this.jobs.fenced(em, job))) return false;
        await this.access.assertCurrent(task!.userId, em);
        const context = await em
          .getRepository(AssistantMessageContext)
          .findOneByOrFail({ task_id: task!.id });
        if (!['pending', 'prepared'].includes(context.state)) return false;
        context.manifest = manifest;
        context.state = 'dispatching';
        await em.save(context);
        await em.update(AssistantMessageTask, task!.id, { status: 'running' });
        return true;
      });
      if (!allowed) return;
      handedOff = true;
      const { response } = await this.agents.sendChat({
        userId: task.userId,
        conversationId: task.conversationId,
        agentId: agent.id,
        sessionKey: '',
        channel: task.channel,
        messages,
        metadata: { protocolVersion: manifest.protocolVersion, profileVersion: profile.version },
      });
      await this.complete(job, task, response);
    } catch (e) {
      if (!task) return;
      const response =
        e && typeof e === 'object' && 'getResponse' in e
          ? ((e as { getResponse(): unknown }).getResponse() as { code?: string })
          : null;
      const code =
        typeof response?.code === 'string'
          ? response.code
          : handedOff
            ? 'ATTACHMENTS_DISPATCH_INDETERMINATE'
            : 'ATTACHMENTS_CAPABILITY_UNAVAILABLE';
      await this.db.transaction(async (em) => {
        if (!(await this.jobs.fenced(em, job))) return;
        const uncertain =
          handedOff &&
          ![
            'ATTACHMENTS_PROVIDER_FAILED',
            'ATTACHMENTS_RESPONSE_INVALID',
            'ATTACHMENTS_RESPONSE_TOO_LARGE',
          ].includes(code);
        const context = await em
          .getRepository(AssistantMessageContext)
          .findOneByOrFail({ task_id: task!.id });
        context.state = uncertain ? 'indeterminate' : 'failed';
        if (context.manifest)
          context.manifest.status = uncertain ? 'indeterminate' : 'provider_failed';
        await em.save(context);
        await em.update(AssistantMessageTask, task!.id, {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: `${code}: No se pudo analizar el contenido. Los originales se conservaron. Descárgalos o intenta un nuevo turno cuando el servicio esté disponible.`,
        });
        await this.jobs.finish(em, job, 'failed', code);
      });
      await this.audit.log({
        action: 'ASSISTANT_ATTACHMENT_DISPATCH_FAILED',
        actorUserId: task.userId,
        resourceType: 'assistant_message_task',
        resourceId: task.id,
        metadata: { code },
        severity: 'WARNING',
      });
      this.notify(task, 'failed');
    } finally {
      clearInterval(timer);
    }
  }

  private async complete(
    job: AssistantAttachmentJob,
    task: AssistantMessageTask,
    response: AgentChatResponse
  ): Promise<void> {
    await this.db.transaction(async (em) => {
      if (!(await this.jobs.fenced(em, job))) return;
      const output: AssistantOutputMetadata = {
        partialOutput: response.partialOutput,
        partialOutputReason: response.partialOutputReason,
        partialOutputNotice: response.partialOutputNotice,
        outputAccounting: response.outputAccounting,
      };
      const context = await em
        .getRepository(AssistantMessageContext)
        .findOneByOrFail({ task_id: task.id });
      if (context.state !== 'dispatching') return;
      context.state = 'delivered';
      context.output_metadata = output;
      if (context.manifest) context.manifest.status = 'delivered';
      await em.save(context);
      const message = await em.getRepository(Message).save(
        em.getRepository(Message).create({
          conversationId: task.conversationId,
          role: 'assistant',
          content: response.message,
          status: 'completed',
          channel: task.channel,
          metadata: { attachmentTaskId: task.id, ...output },
        })
      );
      await em.update(AssistantMessageTask, task.id, {
        status: 'completed',
        assistantMessageId: message.id,
        completedAt: new Date(),
      });
      await em.update(Conversation, task.conversationId, {
        status: 'active',
        updatedAt: new Date(),
      });
      await this.jobs.finish(em, job, 'completed');
    });
    this.notify(task, 'completed');
  }

  private notify(task: AssistantMessageTask, status: 'completed' | 'failed'): void {
    this.gateway.emitToSession(
      status === 'completed' ? 'assistant.agent.completed' : 'assistant.agent.failed',
      {
        sessionId: task.conversationId,
        taskId: task.id,
        messageId: null,
        role: 'assistant',
        status,
        content: null,
        errorMessage: null,
        metadata: { channel: task.channel, refetch: true },
        createdAt: new Date().toISOString(),
      }
    );
  }
}
