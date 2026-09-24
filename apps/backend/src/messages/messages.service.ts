import type {
  AgentChatMessage,
  AssistantChannel,
  AssistantMessageDto,
  AssistantMessageTaskDto,
  AssistantRealtimeEvent,
  AssistantRealtimeEventName,
  AssistantRealtimeStatus,
  AgentStreamEvent,
  AssistantSessionDto,
  ListAssistantSessionMessagesResponse,
  ListAssistantSessionsResponse,
  OpenClawRequest,
  OpenClawResponse,
  SendAssistantMessageResponse,
} from '@kyrae/shared-contracts';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AgentOrchestratorService } from '../agents/agent-orchestrator.service';
import { AssistantMessageTask } from './assistant-message-task.entity';
import { Conversation } from './conversation.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { Message } from './message.entity';
import { MessagesGateway } from './messages.gateway';
import { OpenClawRequestTrace } from './openclaw-request.entity';

@Injectable()
export class MessagesService {
  private readonly defaultSessionPageSize = 10;
  private readonly maxSessionPageSize = 25;

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(AssistantMessageTask)
    private readonly taskRepository: Repository<AssistantMessageTask>,
    @InjectRepository(OpenClawRequestTrace)
    private readonly openClawRequestRepository: Repository<OpenClawRequestTrace>,
    private readonly agentOrchestrator: AgentOrchestratorService,
    private readonly auditService: AuditService,
    private readonly messagesGateway: MessagesGateway
  ) {}

  async findSessions(
    userId: string,
    options: { limit?: string; cursor?: string } = {}
  ): Promise<ListAssistantSessionsResponse> {
    const limit = this.parseSessionLimit(options.limit);
    const cursor = this.decodeSessionCursor(options.cursor);
    const query = this.conversationRepository
      .createQueryBuilder('conversation')
      .where('conversation.userId = :userId', { userId })
      .orderBy('conversation.updatedAt', 'DESC')
      .addOrderBy('conversation.id', 'DESC')
      .take(limit + 1);

    if (cursor) {
      query.andWhere(
        '(conversation.updatedAt < :cursorUpdatedAt OR (conversation.updatedAt = :cursorUpdatedAt AND conversation.id < :cursorId))',
        { cursorUpdatedAt: cursor.updatedAt, cursorId: cursor.id }
      );
    }

    const conversations = await query.getMany();
    const page = conversations.slice(0, limit);
    const statsByConversationId = await this.findSessionStats(
      page.map((conversation) => conversation.id)
    );
    const nextConversation = conversations.length > limit ? page.at(-1) : null;

    return {
      sessions: page.map((conversation) => {
        const stats = statsByConversationId.get(conversation.id);
        return this.toSessionDto(
          conversation,
          stats?.messageCount ?? 0,
          stats?.lastMessageAt ?? null
        );
      }),
      nextCursor: nextConversation ? this.encodeSessionCursor(nextConversation) : null,
    };
  }

  async findSessionMessages(
    sessionId: string,
    userId: string
  ): Promise<ListAssistantSessionMessagesResponse> {
    const conversation = await this.findOwnedConversation(sessionId, userId);
    const messages = await this.messageRepository.find({
      where: { conversationId: sessionId },
      order: { createdAt: 'ASC' },
    });

    return {
      session: this.toSessionDto(conversation, messages.length, messages.at(-1)?.createdAt ?? null),
      messages: messages.map((message) => this.toDto(message, conversation.channel)),
    };
  }

  async createMessageTask(params: {
    userId: string;
    dto: SendMessageDto;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AssistantMessageTaskDto> {
    const channel = params.dto.channel ?? 'web';
    const content = params.dto.message.trim();
    const conversation = await this.getOrCreateConversation({
      userId: params.userId,
      conversationId: params.dto.sessionId ?? params.dto.conversationId,
      titleSeed: content,
      channel,
    });

    const userMessage = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: conversation.id,
        role: 'user',
        content,
        status: 'completed',
        metadata: null,
      })
    );
    await this.touchConversation(conversation.id);
    this.emitRealtime('assistant.message.received', {
      sessionId: conversation.id,
      taskId: null,
      messageId: userMessage.id,
      role: 'user',
      status: 'received',
      content: userMessage.content,
      errorMessage: null,
      channel,
    });

    const task = await this.taskRepository.save(
      this.taskRepository.create({
        userId: params.userId,
        conversationId: conversation.id,
        userMessageId: userMessage.id,
        status: 'pending',
        channel,
      })
    );
    this.emitRealtime('assistant.agent.processing', {
      sessionId: conversation.id,
      taskId: task.id,
      messageId: userMessage.id,
      role: 'assistant',
      status: 'processing',
      content: null,
      errorMessage: null,
      channel,
    });

    void this.processMessageTask(
      task.id,
      params.userId,
      content,
      channel,
      params.ipAddress,
      params.userAgent
    );

    return this.toTaskDto(task, userMessage, null);
  }

  async findMessageTask(id: string, userId: string): Promise<AssistantMessageTaskDto> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException('No se encontró la tarea del asistente.');
    if (task.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta tarea del asistente.');
    }

    const userMessage = await this.messageRepository.findOneOrFail({
      where: { id: task.userMessageId },
    });
    const assistantMessage = task.assistantMessageId
      ? await this.messageRepository.findOne({ where: { id: task.assistantMessageId } })
      : null;

    return this.toTaskDto(task, userMessage, assistantMessage);
  }

  async sendMessage(params: {
    userId: string;
    dto: SendMessageDto;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<SendAssistantMessageResponse> {
    const channel = params.dto.channel ?? 'web';
    const content = params.dto.message.trim();
    const conversation = await this.getOrCreateConversation({
      userId: params.userId,
      conversationId: params.dto.sessionId ?? params.dto.conversationId,
      titleSeed: content,
      channel,
    });

    const userMessage = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: conversation.id,
        role: 'user',
        content,
        status: 'completed',
        channel,
        metadata: null,
      })
    );
    await this.touchConversation(conversation.id);
    this.emitRealtime('assistant.message.received', {
      sessionId: conversation.id,
      taskId: null,
      messageId: userMessage.id,
      role: 'user',
      status: 'received',
      content: userMessage.content,
      errorMessage: null,
      channel,
    });
    this.emitRealtime('assistant.agent.processing', {
      sessionId: conversation.id,
      taskId: null,
      messageId: userMessage.id,
      role: 'assistant',
      status: 'processing',
      content: null,
      errorMessage: null,
      channel,
    });

    const openClawRequest: OpenClawRequest = {
      sessionId: conversation.id,
      channel,
      message: content,
      metadata: {
        userId: params.userId,
        conversationId: conversation.id,
      },
    };
    const requestTrace = await this.createOpenClawRequestTrace(
      conversation.id,
      userMessage.id,
      openClawRequest
    );
    const startedAt = Date.now();
    let openClawResponse: OpenClawResponse;

    try {
      const result = await this.agentOrchestrator.sendChat({
        userId: params.userId,
        conversationId: conversation.id,
        channel,
        agentId: conversation.agentId ?? undefined,
        sessionKey: this.buildAgentSessionKey(
          conversation.agentId ?? 'default',
          params.userId,
          conversation.id
        ),
        messages: await this.getConversationMessages(conversation.id),
        onEvent: (event, execution) =>
          this.emitAgentStream(conversation.id, event, channel, null, execution.id),
      });
      const executionId = result.execution.id;
      openClawResponse = {
        message: result.response.message,
        requestId: result.response.providerRequestId,
        metadata: {
          ...(result.response.metadata ?? {}),
          provider: result.execution.provider,
          executionId,
        },
      };
      await this.completeOpenClawRequestTrace(requestTrace, openClawResponse, startedAt);
    } catch (error) {
      await this.failOpenClawRequestTrace(requestTrace, error, startedAt);
      await this.conversationRepository.update(conversation.id, { status: 'failed' });
      this.emitRealtime('assistant.agent.failed', {
        sessionId: conversation.id,
        taskId: null,
        messageId: userMessage.id,
        role: 'assistant',
        status: 'failed',
        content: null,
        errorMessage:
          error instanceof Error ? error.message : 'Kyrae no pudo procesar la solicitud.',
        channel,
      });
      throw error;
    }

    const assistantMessage = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: conversation.id,
        role: 'assistant',
        content: openClawResponse.message,
        status: 'completed',
        channel,
        metadata: {
          openClawRequestId: requestTrace.id,
          openClawExternalRequestId: openClawResponse.requestId ?? null,
          ...(openClawResponse.metadata ?? {}),
        },
      })
    );
    await this.touchConversation(conversation.id);
    this.emitRealtime('assistant.agent.completed', {
      sessionId: conversation.id,
      taskId: null,
      messageId: assistantMessage.id,
      role: 'assistant',
      status: 'completed',
      content: assistantMessage.content,
      errorMessage: null,
      channel,
    });
    this.emitSessionUpdated(conversation.id, channel);

    await this.auditService.log({
      action: 'ASSISTANT_MESSAGE_SENT',
      actorUserId: params.userId,
      resourceType: 'conversation',
      resourceId: conversation.id,
      metadata: {
        channel,
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
        openClawRequestId: requestTrace.id,
        openClawExternalRequestId: openClawResponse.requestId ?? null,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      severity: 'INFO',
    });

    return {
      sessionId: conversation.id,
      conversationId: conversation.id,
      userMessage: this.toDto(userMessage, channel),
      assistantMessage: this.toDto(assistantMessage, channel),
      openClawRequestId: requestTrace.id,
    };
  }

  private async processMessageTask(
    taskId: string,
    userId: string,
    content: string,
    channel: AssistantChannel,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) return;

    const openClawRequest: OpenClawRequest = {
      sessionId: task.conversationId,
      channel,
      message: content,
      metadata: {
        userId,
        conversationId: task.conversationId,
      },
    };
    const requestTrace = await this.createOpenClawRequestTrace(
      task.conversationId,
      task.userMessageId,
      openClawRequest
    );
    const startedAt = Date.now();

    try {
      task.status = 'running';
      await this.taskRepository.save(task);
      this.emitRealtime('assistant.agent.processing', {
        sessionId: task.conversationId,
        taskId: task.id,
        messageId: task.userMessageId,
        role: 'assistant',
        status: 'processing',
        content: null,
        errorMessage: null,
        channel,
      });

      const result = await this.agentOrchestrator.sendChat({
        userId,
        conversationId: task.conversationId,
        channel,
        agentId:
          (await this.findOwnedConversation(task.conversationId, userId)).agentId ?? undefined,
        sessionKey: this.buildAgentSessionKey('default', userId, task.conversationId),
        messages: await this.getConversationMessages(task.conversationId),
        onEvent: (event, execution) =>
          this.emitAgentStream(task.conversationId, event, channel, task.id, execution.id),
      });
      const openClawResponse: OpenClawResponse = {
        message: result.response.message,
        requestId: result.response.providerRequestId,
        metadata: {
          ...(result.response.metadata ?? {}),
          provider: result.execution.provider,
          executionId: result.execution.id,
        },
      };
      await this.completeOpenClawRequestTrace(requestTrace, openClawResponse, startedAt);

      const assistantMessage = await this.messageRepository.save(
        this.messageRepository.create({
          conversationId: task.conversationId,
          role: 'assistant',
          content: openClawResponse.message,
          status: 'completed',
          channel,
          metadata: {
            openClawRequestId: requestTrace.id,
            openClawExternalRequestId: openClawResponse.requestId ?? null,
            executionId: result.execution.id,
            ...(openClawResponse.metadata ?? {}),
          },
        })
      );
      await this.touchConversation(task.conversationId);

      task.status = 'completed';
      task.assistantMessageId = assistantMessage.id;
      task.completedAt = new Date();
      await this.taskRepository.save(task);
      this.emitRealtime('assistant.agent.completed', {
        sessionId: task.conversationId,
        taskId: task.id,
        messageId: assistantMessage.id,
        role: 'assistant',
        status: 'completed',
        content: assistantMessage.content,
        errorMessage: null,
        channel,
      });
      this.emitSessionUpdated(task.conversationId, channel);

      await this.auditService.log({
        action: 'ASSISTANT_MESSAGE_TASK_COMPLETED',
        actorUserId: userId,
        resourceType: 'conversation',
        resourceId: task.conversationId,
        metadata: {
          channel,
          taskId: task.id,
          userMessageId: task.userMessageId,
          assistantMessageId: assistantMessage.id,
          openClawRequestId: requestTrace.id,
          openClawExternalRequestId: openClawResponse.requestId ?? null,
        },
        ipAddress,
        userAgent,
        severity: 'INFO',
      });
    } catch (error) {
      await this.failOpenClawRequestTrace(requestTrace, error, startedAt);
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : 'La tarea del asistente falló.';
      task.completedAt = new Date();
      await this.taskRepository.save(task);
      await this.conversationRepository.update(task.conversationId, { status: 'failed' });
      this.emitRealtime('assistant.agent.failed', {
        sessionId: task.conversationId,
        taskId: task.id,
        messageId: task.userMessageId,
        role: 'assistant',
        status: 'failed',
        content: null,
        errorMessage: task.errorMessage ?? 'Kyrae no pudo procesar la solicitud.',
        channel,
      });
      this.emitSessionUpdated(task.conversationId, channel);

      await this.auditService.log({
        action: 'ASSISTANT_MESSAGE_TASK_FAILED',
        actorUserId: userId,
        resourceType: 'conversation',
        resourceId: task.conversationId,
        metadata: { channel, taskId: task.id, errorMessage: task.errorMessage },
        ipAddress,
        userAgent,
        severity: 'ERROR',
      });
    }
  }

  private async getOrCreateConversation(params: {
    userId: string;
    conversationId?: string;
    titleSeed: string;
    channel: AssistantChannel;
  }): Promise<Conversation> {
    if (!params.conversationId) {
      const agent = await this.agentOrchestrator.resolveAgent();
      return this.conversationRepository.save(
        this.conversationRepository.create({
          userId: params.userId,
          title: params.titleSeed.slice(0, 80),
          channel: params.channel,
          status: 'active',
          agentId: agent.id,
          provider: agent.provider,
        })
      );
    }

    return this.findOwnedConversation(params.conversationId, params.userId);
  }

  private async findOwnedConversation(id: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({ where: { id } });

    if (!conversation) {
      throw new NotFoundException('No se encontró la conversación.');
    }
    if (conversation.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta conversación.');
    }

    return conversation;
  }

  private async findSessionStats(
    conversationIds: string[]
  ): Promise<Map<string, { messageCount: number; lastMessageAt: Date | null }>> {
    if (!conversationIds.length) return new Map();

    const rows = await this.messageRepository
      .createQueryBuilder('message')
      .select('message.conversationId', 'conversation_id')
      .addSelect('COUNT(message.id)', 'message_count')
      .addSelect('MAX(message.created_at)', 'last_message_at')
      .where('message.conversationId IN (:...conversationIds)', { conversationIds })
      .groupBy('message.conversationId')
      .getRawMany<{
        conversation_id: string;
        message_count: string;
        last_message_at: Date | string | null;
      }>();

    return new Map(
      rows.map((row) => [
        row.conversation_id,
        {
          messageCount: Number(row.message_count ?? 0),
          lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
        },
      ])
    );
  }

  private parseSessionLimit(limit?: string): number {
    const parsed = Number(limit ?? this.defaultSessionPageSize);
    if (!Number.isFinite(parsed) || parsed < 1) return this.defaultSessionPageSize;

    return Math.min(Math.floor(parsed), this.maxSessionPageSize);
  }

  private encodeSessionCursor(conversation: Conversation): string {
    return Buffer.from(
      JSON.stringify({ id: conversation.id, updatedAt: conversation.updatedAt.toISOString() }),
      'utf8'
    ).toString('base64url');
  }

  private decodeSessionCursor(cursor?: string): { id: string; updatedAt: string } | null {
    if (!cursor) return null;

    try {
      const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
        id?: unknown;
        updatedAt?: unknown;
      };

      if (typeof value.id !== 'string' || typeof value.updatedAt !== 'string') return null;
      if (Number.isNaN(Date.parse(value.updatedAt))) return null;

      return { id: value.id, updatedAt: value.updatedAt };
    } catch {
      return null;
    }
  }

  private async touchConversation(id: string): Promise<void> {
    await this.conversationRepository
      .createQueryBuilder()
      .update(Conversation)
      .set({ updatedAt: () => 'now()', status: 'active' })
      .where('id = :id', { id })
      .execute();
  }

  private async getConversationMessages(conversationId: string): Promise<AgentChatMessage[]> {
    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
    return messages
      .filter(
        (message) =>
          message.role === 'user' || message.role === 'assistant' || message.role === 'system'
      )
      .map((message) => ({ role: message.role, content: message.content }));
  }

  private buildAgentSessionKey(agentId: string, userId: string, conversationId: string): string {
    return `agent:${agentId}:user:${userId}:conversation:${conversationId}`;
  }

  private emitAgentStream(
    sessionId: string,
    event: AgentStreamEvent,
    channel: AssistantChannel,
    taskId: string | null = null,
    executionId: string | null = null
  ): void {
    const data =
      event.data && typeof event.data === 'object' ? (event.data as Record<string, unknown>) : {};
    this.emitRealtime('assistant.agent.stream', {
      sessionId,
      taskId,
      messageId: null,
      role: 'assistant',
      status: event.type === 'ERROR' ? 'failed' : 'processing',
      content: typeof data.text === 'string' ? data.text : null,
      errorMessage: null,
      channel,
      eventType: event.type,
      sequence: event.sequence ?? null,
      delta: typeof data.text === 'string' ? data.text : null,
      executionId,
    });
  }

  private emitRealtime(
    eventName: AssistantRealtimeEventName,
    params: {
      sessionId: string;
      taskId: string | null;
      messageId: string | null;
      role: AssistantRealtimeEvent['role'];
      status: AssistantRealtimeStatus;
      content: string | null;
      errorMessage: string | null;
      channel: AssistantChannel;
      executionId?: string | null;
      eventType?: string | null;
      sequence?: number | null;
      delta?: string | null;
    }
  ): void {
    this.messagesGateway.emitToSession(eventName, {
      sessionId: params.sessionId,
      taskId: params.taskId,
      messageId: params.messageId,
      role: params.role,
      status: params.status,
      content: params.content,
      errorMessage: params.errorMessage,
      metadata: { channel: params.channel, agent: 'main' },
      executionId: params.executionId ?? null,
      eventType: params.eventType ?? null,
      sequence: params.sequence ?? null,
      delta: params.delta ?? null,
      createdAt: new Date().toISOString(),
    });
  }

  private emitSessionUpdated(sessionId: string, channel: AssistantChannel): void {
    this.emitRealtime('assistant.session.updated', {
      sessionId,
      taskId: null,
      messageId: null,
      role: null,
      status: 'completed',
      content: null,
      errorMessage: null,
      channel,
    });
  }

  private async createOpenClawRequestTrace(
    sessionId: string,
    messageId: string,
    requestPayload: OpenClawRequest
  ): Promise<OpenClawRequestTrace> {
    return this.openClawRequestRepository.save(
      this.openClawRequestRepository.create({
        sessionId,
        messageId,
        requestPayload,
        status: 'pending',
      })
    );
  }

  private async completeOpenClawRequestTrace(
    trace: OpenClawRequestTrace,
    responsePayload: OpenClawResponse,
    startedAt: number
  ): Promise<void> {
    trace.status = 'completed';
    trace.responsePayload = responsePayload;
    trace.durationMs = Date.now() - startedAt;
    await this.openClawRequestRepository.save(trace);
  }

  private async failOpenClawRequestTrace(
    trace: OpenClawRequestTrace,
    error: unknown,
    startedAt: number
  ): Promise<void> {
    trace.status = 'failed';
    trace.errorMessage =
      error instanceof Error ? error.message : 'Kyrae no pudo procesar la solicitud.';
    trace.durationMs = Date.now() - startedAt;
    await this.openClawRequestRepository.save(trace);
  }

  private toDto(message: Message, fallbackChannel: AssistantChannel): AssistantMessageDto {
    return {
      id: message.id,
      sessionId: message.conversationId,
      conversationId: message.conversationId,
      role: message.role,
      content: message.content,
      status: message.status,
      channel: message.channel ?? fallbackChannel,
      metadata: message.metadata ?? null,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt?.toISOString() ?? null,
    };
  }

  private toSessionDto(
    conversation: Conversation,
    messageCount: number,
    lastMessageAt: Date | null
  ): AssistantSessionDto {
    return {
      id: conversation.id,
      title: conversation.title ?? null,
      channel: conversation.channel,
      status: conversation.status,
      messageCount,
      lastMessageAt: lastMessageAt?.toISOString() ?? null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  private toTaskDto(
    task: AssistantMessageTask,
    userMessage: Message,
    assistantMessage: Message | null
  ): AssistantMessageTaskDto {
    return {
      id: task.id,
      status: task.status,
      sessionId: task.conversationId,
      conversationId: task.conversationId,
      userMessage: this.toDto(userMessage, task.channel),
      assistantMessage: assistantMessage ? this.toDto(assistantMessage, task.channel) : null,
      errorMessage: task.errorMessage ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      completedAt: task.completedAt?.toISOString() ?? null,
    };
  }
}
