import type {
  AssistantChannel,
  AssistantMessageDto,
  OpenClawRequest,
  SendAssistantMessageResponse,
} from '@kyrae/shared-contracts';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { OpenClawService } from '../openclaw/openclaw.service';
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
    private readonly openClawService: OpenClawService,
    private readonly auditService: AuditService
  ) {}

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
}
