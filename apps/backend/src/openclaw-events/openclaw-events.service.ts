import type {
  AssistantRealtimeEvent,
  NotifyMode,
  OpenClawAutomationEventResponse,
  OpenClawAutomationSeverity,
  OpenClawAutomationSessionStrategy,
} from '@kyrae/shared-contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AgentOrchestratorService } from '../agents/agent-orchestrator.service';
import { AutomationSchedule } from '../automation-schedules/automation-schedule.entity';
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
    @InjectRepository(AutomationSchedule)
    private readonly scheduleRepository: Repository<AutomationSchedule>,
    private readonly messagesGateway: MessagesGateway,
    private readonly auditService: AuditService,
    private readonly agentOrchestrator: AgentOrchestratorService
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

    await this.updateScheduleLastRun(dto.userId, dto.automationKey);

    const notifySchedule = await this.scheduleRepository.findOne({
      where: { userId: dto.userId, automationKey: dto.automationKey, isActive: true },
    });
    const notifyMode: NotifyMode = notifySchedule?.notifyMode ?? 'always';

    if (this.shouldNotify(notifyMode, message.content)) {
      this.emitAutomationReceived(session.id, message, dto, severity, sessionStrategy, dto.userId);
    }
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

  async processScheduleExecution(params: {
    schedule: AutomationSchedule;
    instruction: string;
    assistantResponse: string;
    userId: string;
    openClawRequestId?: string | null;
    provider?: string;
    executionId?: string | null;
  }): Promise<{ sessionId: string; messageId: string }> {
    const session = await this.findOrCreateAutomationSession(
      params.userId,
      this.automationInboxTitle
    );

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: session.id,
        role: 'assistant',
        content: `**${params.schedule.title}**\n\n${params.assistantResponse}`,
        status: 'completed',
        channel: 'automation',
        metadata: {
          automationKey: params.schedule.automationKey,
          automationTitle: params.schedule.title,
          sessionStrategy: 'user_automation_inbox',
          source: 'automation_cron',
          instruction: params.instruction,
          openClawRequestId: params.openClawRequestId ?? null,
          provider: params.provider ?? 'OPENCLAW',
          executionId: params.executionId ?? null,
        },
      })
    );

    await this.touchSession(session.id);

    const notifyMode: NotifyMode = params.schedule.notifyMode ?? 'always';
    if (this.shouldNotify(notifyMode, message.content)) {
      this.messagesGateway.emitToUser(params.userId, 'assistant.automation.received', {
        sessionId: session.id,
        taskId: null,
        messageId: message.id,
        role: 'assistant',
        status: 'automation_received',
        content: message.content,
        errorMessage: null,
        metadata: {
          channel: 'automation',
          agent: 'main',
          automationKey: params.schedule.automationKey,
          automationTitle: params.schedule.title,
          sessionStrategy: 'user_automation_inbox',
          severity: 'INFO',
        },
        createdAt: message.createdAt.toISOString(),
      });
    }

    this.messagesGateway.emitToUser(params.userId, 'assistant.session.updated', {
      sessionId: session.id,
      taskId: null,
      messageId: null,
      role: null,
      status: 'automation_received',
      content: null,
      errorMessage: null,
      metadata: {
        channel: 'automation',
        agent: 'main',
        automationKey: params.schedule.automationKey,
      },
      createdAt: new Date().toISOString(),
    });

    await this.auditService.log({
      action: 'AUTOMATION_CRON_EXECUTED',
      actorUserId: params.userId,
      resourceType: 'automation_schedule',
      resourceId: params.schedule.id,
      metadata: {
        automationKey: params.schedule.automationKey,
        sessionId: session.id,
        messageId: message.id,
        notifyMode,
      },
    });

    return { sessionId: session.id, messageId: message.id };
  }

  async executeSchedule(schedule: AutomationSchedule): Promise<{
    assistantResponse: string;
    providerRequestId?: string;
    provider: string;
    executionId: string;
  }> {
    const session = await this.findOrCreateAutomationSession(
      schedule.userId,
      this.automationInboxTitle
    );
    const result = await this.agentOrchestrator.sendChat({
      userId: schedule.userId,
      conversationId: session.id,
      channel: 'automation',
      agentId: session.agentId ?? undefined,
      sessionKey: `agent:${session.agentId ?? 'default'}:user:${schedule.userId}:conversation:${session.id}`,
      messages: [{ role: 'user', content: schedule.instruction }],
    });
    return {
      assistantResponse: result.response.message,
      providerRequestId: result.response.providerRequestId,
      provider: result.execution.provider,
      executionId: result.execution.id,
    };
  }

  private shouldNotify(mode: NotifyMode, content: string): boolean {
    if (mode === 'silent') return false;
    if (mode === 'on_content') return this.hasSubstantiveContent(content);
    return true;
  }

  private hasSubstantiveContent(content: string): boolean {
    const stripped = content.replace(/\*+/g, '').replace(/\n+/g, ' ').trim();
    return stripped.length > 20;
  }

  private async updateScheduleLastRun(userId: string, automationKey: string): Promise<void> {
    await this.scheduleRepository.update(
      { userId, automationKey, isActive: true },
      { lastRunAt: new Date() }
    );
  }

  private async getOrCreateAutomationSession(
    userId: string,
    sessionStrategy: OpenClawAutomationSessionStrategy,
    dto: OpenClawAutomationEventDto
  ): Promise<Conversation> {
    const title =
      sessionStrategy === 'automation_key' ? dto.title.trim() : this.automationInboxTitle;
    return this.findOrCreateAutomationSession(userId, title);
  }

  private async findOrCreateAutomationSession(
    userId: string,
    title: string
  ): Promise<Conversation> {
    const existing = await this.conversationRepository.findOne({
      where: { userId, channel: 'automation', title },
    });

    if (existing) return existing;

    const agent = await this.agentOrchestrator.resolveAgent();
    return this.conversationRepository.save(
      this.conversationRepository.create({
        userId,
        title,
        channel: 'automation',
        status: 'active',
        agentId: agent.id,
        provider: agent.provider,
      })
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
