import type {
  AssistantChannel,
  AssistantMessageTaskDto,
  AssistantMessageDto,
  OpenClawRequest,
  SendAssistantMessageResponse,
} from '@kyrae/shared-contracts';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { OpenClawService } from '../openclaw/openclaw.service';
import { AssistantMessageTask } from './assistant-message-task.entity';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(AssistantMessageTask)
    private readonly taskRepository: Repository<AssistantMessageTask>,
    private readonly openClawService: OpenClawService,
    private readonly auditService: AuditService
  ) {}

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
      conversationId: params.dto.conversationId,
      titleSeed: content,
    });

    const userMessage = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: conversation.id,
        role: 'user',
        content,
        channel,
        metadata: null,
      })
    );

    const task = await this.taskRepository.save(
      this.taskRepository.create({
        userId: params.userId,
        conversationId: conversation.id,
        userMessageId: userMessage.id,
        status: 'pending',
        channel,
      })
    );

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
    if (!task) throw new NotFoundException('Assistant task not found');
    if (task.userId !== userId) {
      throw new ForbiddenException('Assistant task does not belong to the current user');
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
      conversationId: params.dto.conversationId,
      titleSeed: content,
    });

    const userMessage = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: conversation.id,
        role: 'user',
        content,
        channel,
        metadata: null,
      })
    );

    const openClawRequest: OpenClawRequest = {
      sessionId: conversation.id,
      channel,
      message: content,
      metadata: {
        userId: params.userId,
        conversationId: conversation.id,
      },
    };

    const openClawResponse = await this.openClawService.sendMessage(openClawRequest);

    const assistantMessage = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: conversation.id,
        role: 'assistant',
        content: openClawResponse.message,
        channel,
        metadata: {
          openClawRequestId: openClawResponse.requestId ?? null,
          ...(openClawResponse.metadata ?? {}),
        },
      })
    );

    await this.auditService.log({
      action: 'ASSISTANT_MESSAGE_SENT',
      actorUserId: params.userId,
      resourceType: 'conversation',
      resourceId: conversation.id,
      metadata: {
        channel,
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
        openClawRequestId: openClawResponse.requestId ?? null,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      severity: 'INFO',
    });

    return {
      conversationId: conversation.id,
      userMessage: this.toDto(userMessage, channel),
      assistantMessage: this.toDto(assistantMessage, channel),
      openClawRequestId: openClawResponse.requestId ?? null,
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

    try {
      task.status = 'running';
      await this.taskRepository.save(task);

      const openClawResponse = await this.openClawService.sendMessage({
        sessionId: task.conversationId,
        channel,
        message: content,
        metadata: {
          userId,
          conversationId: task.conversationId,
        },
      });

      const assistantMessage = await this.messageRepository.save(
        this.messageRepository.create({
          conversationId: task.conversationId,
          role: 'assistant',
          content: openClawResponse.message,
          channel,
          metadata: {
            openClawRequestId: openClawResponse.requestId ?? null,
            ...(openClawResponse.metadata ?? {}),
          },
        })
      );

      task.status = 'completed';
      task.assistantMessageId = assistantMessage.id;
      task.completedAt = new Date();
      await this.taskRepository.save(task);

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
          openClawRequestId: openClawResponse.requestId ?? null,
        },
        ipAddress,
        userAgent,
        severity: 'INFO',
      });
    } catch (error) {
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : 'Assistant task failed';
      task.completedAt = new Date();
      await this.taskRepository.save(task);

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
  }): Promise<Conversation> {
    if (!params.conversationId) {
      return this.conversationRepository.save(
        this.conversationRepository.create({
          userId: params.userId,
          title: params.titleSeed.slice(0, 80),
        })
      );
    }

    const conversation = await this.conversationRepository.findOne({
      where: { id: params.conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.userId !== params.userId) {
      throw new ForbiddenException('Conversation does not belong to the current user');
    }

    return conversation;
  }

  private toDto(message: Message, fallbackChannel: AssistantChannel): AssistantMessageDto {
    return {
      id: message.id,
      conversationId: message.conversationId,
      role: message.role,
      content: message.content,
      channel: message.channel ?? fallbackChannel,
      metadata: message.metadata ?? null,
      createdAt: message.createdAt.toISOString(),
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
