import type {
  AssistantRealtimeEvent,
  OpenClawAutomationEventResponse,
  OpenClawAutomationSeverity,
  OpenClawAutomationSessionStrategy,
} from '@kyrae/shared-contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Conversation } from '../messages/conversation.entity';
import { Message } from '../messages/message.entity';
import { MessagesGateway } from '../messages/messages.gateway';
import { User } from '../users/user.entity';
import { OpenClawAutomationEventDto } from './dto/openclaw-automation-event.dto';
import { OpenClawEvent } from './openclaw-event.entity';

@Injectable()
export class OpenClawEventsService {
  private readonly automationInboxTitle = 'Automatizaciones de Kyrae';

  constructor(
    @InjectRepository(OpenClawEvent)
    private readonly openClawEventRepository: Repository<OpenClawEvent>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly messagesGateway: MessagesGateway,
    private readonly auditService: AuditService
  ) {}

  async receiveEvent(dto: OpenClawAutomationEventDto): Promise<OpenClawAutomationEventResponse> {
    const existing = await this.openClawEventRepository.findOne({
      where: { eventId: dto.eventId },
    });

    if (existing) {
      return {
        eventId: existing.eventId,
        status: 'duplicate',
        sessionId: existing.sessionId,
        messageId: existing.messageId,
      };
    }

    const user = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('No se encontró el usuario del evento OpenClaw.');

    const sessionStrategy = dto.sessionStrategy ?? 'user_automation_inbox';
    const severity = dto.severity ?? this.defaultSeverity(dto.type);
    const occurredAt = dto.createdAt ? new Date(dto.createdAt) : new Date();
    const session = await this.getOrCreateAutomationSession(dto.userId, sessionStrategy, dto);
    const content = this.formatAutomationMessage(dto);

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: session.id,
        role: 'assistant',
        content,
        status: dto.type === 'automation.failed' ? 'failed' : 'completed',
        channel: 'automation',
        metadata: {
          eventId: dto.eventId,
          eventType: dto.type,
          automationKey: dto.automationKey,
          automationTitle: dto.title,
          sessionStrategy,
          severity,
          externalRunId: dto.externalRunId ?? null,
          source: 'openclaw_cron',
          payloadMetadata: dto.metadata ?? {},
        },
      })
    );

    await this.touchSession(session.id);

    const event = await this.openClawEventRepository.save(
      this.openClawEventRepository.create({
        eventId: dto.eventId,
        userId: dto.userId,
        sessionId: session.id,
        messageId: message.id,
        type: dto.type,
        automationKey: dto.automationKey,
        automationTitle: dto.title,
        severity,
        sessionStrategy,
        externalRunId: dto.externalRunId ?? null,
        payload: dto as unknown as Record<string, unknown>,
        occurredAt,
        processedAt: new Date(),
      })
    );

    this.emitAutomationReceived(session.id, message, dto, severity, sessionStrategy, dto.userId);
    this.emitSessionUpdated(session.id, dto, dto.userId);

    await this.auditService.log({
      action: 'OPENCLAW_AUTOMATION_EVENT_PROCESSED',
      actorUserId: dto.userId,
      resourceType: 'openclaw_event',
      resourceId: event.id,
      metadata: {
        eventId: dto.eventId,
        eventType: dto.type,
        automationKey: dto.automationKey,
        sessionId: session.id,
        messageId: message.id,
        sessionStrategy,
      },
      severity: this.toAuditSeverity(severity),
    });

    return {
      eventId: dto.eventId,
      status: 'processed',
      sessionId: session.id,
      messageId: message.id,
    };
  }

  private async getOrCreateAutomationSession(
    userId: string,
    sessionStrategy: OpenClawAutomationSessionStrategy,
    dto: OpenClawAutomationEventDto
  ): Promise<Conversation> {
    const title =
      sessionStrategy === 'automation_key' ? dto.title.trim() : this.automationInboxTitle;
    const existing = await this.conversationRepository.findOne({
      where: { userId, channel: 'automation', title },
    });

    if (existing) return existing;

    return this.conversationRepository.save(
      this.conversationRepository.create({ userId, title, channel: 'automation', status: 'active' })
    );
  }

  private async touchSession(sessionId: string): Promise<void> {
    await this.conversationRepository.update(sessionId, {
      status: 'active',
      updatedAt: new Date(),
    });
  }

  private formatAutomationMessage(dto: OpenClawAutomationEventDto): string {
    return `**${dto.title.trim()}**\n\n${dto.message.trim()}`;
  }

  private defaultSeverity(type: OpenClawAutomationEventDto['type']): OpenClawAutomationSeverity {
    return type === 'automation.failed' ? 'ERROR' : 'INFO';
  }

  private toAuditSeverity(severity: OpenClawAutomationSeverity): 'INFO' | 'WARNING' | 'ERROR' {
    return severity === 'WARN' ? 'WARNING' : severity;
  }

  private emitAutomationReceived(
    sessionId: string,
    message: Message,
    dto: OpenClawAutomationEventDto,
    severity: OpenClawAutomationSeverity,
    sessionStrategy: OpenClawAutomationSessionStrategy,
    userId: string
  ): void {
    const event: AssistantRealtimeEvent = {
      sessionId,
      taskId: null,
      messageId: message.id,
      role: 'assistant',
      status: 'automation_received',
      content: message.content,
      errorMessage: null,
      metadata: {
        channel: 'automation',
        agent: 'main',
        eventId: dto.eventId,
        eventType: dto.type,
        automationKey: dto.automationKey,
        automationTitle: dto.title,
        sessionStrategy,
        severity,
        externalRunId: dto.externalRunId ?? null,
      },
      createdAt: message.createdAt.toISOString(),
    };

    this.messagesGateway.emitToSession('assistant.automation.received', event);
    this.messagesGateway.emitToUser(userId, 'assistant.automation.received', event);
  }

  private emitSessionUpdated(
    sessionId: string,
    dto: OpenClawAutomationEventDto,
    userId: string
  ): void {
    const event: AssistantRealtimeEvent = {
      sessionId,
      taskId: null,
      messageId: null,
      role: null,
      status: 'automation_received',
      content: null,
      errorMessage: null,
      metadata: {
        channel: 'automation',
        agent: 'main',
        eventId: dto.eventId,
        automationKey: dto.automationKey,
      },
      createdAt: new Date().toISOString(),
    };

    this.messagesGateway.emitToSession('assistant.session.updated', event);
    this.messagesGateway.emitToUser(userId, 'assistant.session.updated', event);
  }
}
