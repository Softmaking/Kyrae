import type {
  AgentApprovalRequest,
  AgentChatMessage,
  AgentChatRequest,
  AgentChatResponse,
  AgentExecutionDto,
  AgentExecutionEventDto,
  AgentProviderType,
  AgentRunEvent,
  AgentStreamEvent,
} from '@kyrae/shared-contracts';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Agent } from './agent.entity';
import { AgentExecutionEvent } from './agent-execution-event.entity';
import { AgentExecution } from './agent-execution.entity';
import { AgentProviderFactory } from './agent-provider.factory';
import { hasTypedParts } from './attachment-hermes.protocol';
import { AttachmentModelProfiles } from './attachment-model-profile.service';
import { attachmentError } from '../assistant-attachments/attachment.errors';

@Injectable()
export class AgentOrchestratorService {
  constructor(
    @InjectRepository(Agent) private readonly agentRepository: Repository<Agent>,
    @InjectRepository(AgentExecution)
    private readonly executionRepository: Repository<AgentExecution>,
    @InjectRepository(AgentExecutionEvent)
    private readonly eventRepository: Repository<AgentExecutionEvent>,
    private readonly providerFactory: AgentProviderFactory,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly attachmentProfiles: AttachmentModelProfiles
  ) {}

  async resolveAgent(agentId?: string): Promise<Agent> {
    if (agentId) {
      const agent = await this.agentRepository.findOne({ where: { id: agentId, enabled: true } });
      if (!agent) throw new NotFoundException('No se encontró el agente solicitado.');
      return agent;
    }

    const provider = this.config.get<AgentProviderType>('DEFAULT_AGENT_PROVIDER', 'HERMES');
    const agent = await this.agentRepository.findOne({
      where: { provider, enabled: true },
      order: { createdAt: 'ASC' },
    });
    if (!agent)
      throw new ServiceUnavailableException('No existe un agente predeterminado habilitado.');
    return agent;
  }

  async sendChat(params: {
    userId: string;
    conversationId: string;
    channel?: AgentChatRequest['channel'];
    agentId?: string;
    messages: AgentChatMessage[];
    sessionKey: string;
    metadata?: Record<string, unknown>;
    onEvent?: (event: AgentStreamEvent, execution: AgentExecution) => Promise<void> | void;
  }): Promise<{ response: AgentChatResponse; execution: AgentExecutionDto }> {
    const agent = await this.resolveAgent(params.agentId);
    const typed = hasTypedParts(params.messages);
    if (typed) this.attachmentProfiles.requireAvailable(agent);
    const provider = this.providerFactory.get(agent.provider);
    const execution = await this.executionRepository.save(
      this.executionRepository.create({
        userId: params.userId,
        conversationId: params.conversationId,
        agentId: agent.id,
        provider: agent.provider,
        executionMode: 'CHAT',
        status: 'RUNNING',
        startedAt: new Date(),
        metadata: params.metadata ?? null,
      })
    );

    try {
      const request = {
        agentId: agent.id,
        userId: params.userId,
        conversationId: params.conversationId,
        sessionKey: params.sessionKey,
        channel: params.channel,
        messages: params.messages,
        model:
          typeof agent.configuration?.model === 'string' ? agent.configuration.model : undefined,
        metadata: params.metadata,
      };
      let response: AgentChatResponse;
      if (provider.streamMessage && !typed) {
        let content = '';
        let providerRequestId: string | undefined;
        for await (const event of provider.streamMessage(request)) {
          await this.persistEvent(execution, event);
          await params.onEvent?.(event, execution);
          const data = this.asRecord(event.data);
          if (typeof data?.text === 'string') content += data.text;
          if (typeof data?.id === 'string') providerRequestId = data.id;
        }
        response = { message: content, providerRequestId };
      } else {
        response = await provider.sendMessage(request);
      }
      execution.status = 'COMPLETED';
      execution.finishedAt = new Date();
      execution.providerRunId = response.providerRequestId ?? null;
      await this.executionRepository.save(execution);
      await this.auditService.log({
        action: 'AGENT_EXECUTION_COMPLETED',
        actorUserId: params.userId,
        resourceType: 'agent_execution',
        resourceId: execution.id,
        metadata: {
          agentId: agent.id,
          provider: agent.provider,
          conversationId: params.conversationId,
        },
        severity: 'INFO',
      });
      return { response, execution: this.toExecutionDto(execution) };
    } catch (error) {
      execution.status = 'FAILED';
      execution.finishedAt = new Date();
      execution.errorCode = this.errorCode(error);
      execution.errorMessage = 'El proveedor de agente no pudo completar la solicitud.';
      await this.executionRepository.save(execution);
      await this.auditService.log({
        action: 'AGENT_EXECUTION_FAILED',
        actorUserId: params.userId,
        resourceType: 'agent_execution',
        resourceId: execution.id,
        metadata: { agentId: agent.id, provider: agent.provider, errorCode: execution.errorCode },
        severity: 'ERROR',
      });
      throw error;
    }
  }

  async createRun(params: {
    userId: string;
    conversationId: string;
    agentId?: string;
    input: string;
    instructions?: string;
    conversationHistory?: AgentChatMessage[];
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AgentExecutionDto> {
    if (hasTypedParts(params.conversationHistory ?? []))
      throw attachmentError('ATTACHMENTS_UNSUPPORTED_PROVIDER');
    const agent = await this.resolveAgent(params.agentId);
    const provider = this.providerFactory.get(agent.provider);
    if (!provider.createRun)
      throw new ConflictException('El proveedor no soporta ejecuciones RUN.');
    const execution = await this.executionRepository.save(
      this.executionRepository.create({
        userId: params.userId,
        conversationId: params.conversationId,
        agentId: agent.id,
        provider: agent.provider,
        executionMode: 'RUN',
        status: 'PENDING',
        metadata: null,
      })
    );

    try {
      const run = await provider.createRun({
        agentId: agent.id,
        userId: params.userId,
        conversationId: params.conversationId,
        sessionKey: this.sessionKey(params.userId, params.conversationId, agent.id),
        input: params.input,
        instructions: params.instructions,
        conversationHistory: params.conversationHistory,
      });
      execution.providerRunId = run.providerRunId;
      execution.status = run.status === 'RUNNING' ? 'RUNNING' : run.status;
      execution.startedAt = new Date();
      execution.metadata = run.metadata ?? null;
      await this.executionRepository.save(execution);
      await this.auditService.log({
        action: 'AGENT_EXECUTION_CREATED',
        actorUserId: params.userId,
        resourceType: 'agent_execution',
        resourceId: execution.id,
        metadata: {
          agentId: agent.id,
          provider: agent.provider,
          conversationId: params.conversationId,
        },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        severity: 'INFO',
      });
      return this.toExecutionDto(execution);
    } catch (error) {
      execution.status = 'FAILED';
      execution.finishedAt = new Date();
      execution.errorCode = this.errorCode(error);
      execution.errorMessage = 'No se pudo iniciar la ejecución.';
      await this.executionRepository.save(execution);
      throw error;
    }
  }

  async findExecution(id: string, userId: string): Promise<AgentExecutionDto> {
    return this.toExecutionDto(await this.getOwnedExecution(id, userId));
  }

  async findEvents(id: string, userId: string): Promise<AgentExecutionEventDto[]> {
    await this.getOwnedExecution(id, userId);
    const events = await this.eventRepository.find({
      where: { executionId: id },
      order: { sequence: 'ASC' },
    });
    return events.map((event) => this.toEventDto(event));
  }

  async stop(id: string, userId: string): Promise<AgentExecutionDto> {
    const execution = await this.getOwnedExecution(id, userId);
    if (!['PENDING', 'RUNNING', 'WAITING_APPROVAL'].includes(execution.status)) {
      throw new ConflictException({
        code: 'AGENT_EXECUTION_ALREADY_FINISHED',
        message: 'La ejecución ya finalizó.',
      });
    }
    const provider = this.providerFactory.get(execution.provider);
    if (!provider.stopRun || !execution.providerRunId)
      throw new ConflictException('El proveedor no permite detener esta ejecución.');
    await provider.stopRun(execution.providerRunId);
    execution.status = 'CANCELLED';
    execution.finishedAt = new Date();
    await this.executionRepository.save(execution);
    await this.auditAction('AGENT_EXECUTION_STOPPED', execution, userId);
    return this.toExecutionDto(execution);
  }

  async steer(id: string, userId: string, instruction: string): Promise<AgentExecutionDto> {
    const execution = await this.getOwnedExecution(id, userId);
    if (execution.status !== 'RUNNING')
      throw new ConflictException({
        code: 'AGENT_EXECUTION_ALREADY_FINISHED',
        message: 'La ejecución no acepta instrucciones.',
      });
    const provider = this.providerFactory.get(execution.provider);
    if (!provider.steerRun || !execution.providerRunId)
      throw new ConflictException('El proveedor no permite steer.');
    await provider.steerRun(execution.providerRunId, instruction);
    await this.auditAction('AGENT_EXECUTION_STEERED', execution, userId, {
      instructionLength: instruction.length,
    });
    return this.toExecutionDto(execution);
  }

  async approve(
    id: string,
    userId: string,
    approval: AgentApprovalRequest
  ): Promise<AgentExecutionDto> {
    const execution = await this.getOwnedExecution(id, userId);
    if (execution.status !== 'WAITING_APPROVAL')
      throw new ConflictException({
        code: 'AGENT_APPROVAL_NOT_PENDING',
        message: 'La ejecución no espera aprobación.',
      });
    const provider = this.providerFactory.get(execution.provider);
    if (!provider.approveRun || !execution.providerRunId)
      throw new ConflictException('El proveedor no permite approvals.');
    await provider.approveRun(execution.providerRunId, approval);
    execution.status = 'RUNNING';
    await this.executionRepository.save(execution);
    await this.auditAction('AGENT_EXECUTION_APPROVAL', execution, userId, {
      approved: approval.approved,
    });
    return this.toExecutionDto(execution);
  }

  async *streamRun(id: string, userId: string): AsyncIterable<AgentRunEvent> {
    const execution = await this.getOwnedExecution(id, userId);
    const provider = this.providerFactory.get(execution.provider);
    if (!provider.streamRunEvents || !execution.providerRunId)
      throw new ConflictException('El proveedor no permite eventos de ejecución.');
    for await (const event of provider.streamRunEvents(execution.providerRunId)) {
      await this.persistEvent(execution, event);
      if (event.type === 'APPROVAL_REQUIRED') execution.status = 'WAITING_APPROVAL';
      if (event.type === 'COMPLETED') {
        execution.status = 'COMPLETED';
        execution.finishedAt = new Date();
      }
      if (event.type === 'ERROR') {
        execution.status = 'FAILED';
        execution.finishedAt = new Date();
      }
      await this.executionRepository.save(execution);
      yield event;
    }
  }

  private async getOwnedExecution(id: string, userId: string): Promise<AgentExecution> {
    const execution = await this.executionRepository.findOne({ where: { id } });
    if (!execution) throw new NotFoundException('No se encontró la ejecución.');
    if (execution.userId !== userId)
      throw new ForbiddenException('No tienes acceso a esta ejecución.');
    return execution;
  }

  private async persistEvent(
    execution: AgentExecution,
    event: AgentStreamEvent | AgentRunEvent
  ): Promise<void> {
    // Provider sequences are local to each stream and may restart on reconnects.
    // Kyrae owns the persisted sequence for each execution.
    const sequence = await this.eventRepository.count({
      where: { executionId: execution.id },
    });
    const payload = this.asRecord(event.data);
    await this.eventRepository.save(
      this.eventRepository.create({
        executionId: execution.id,
        type: event.type,
        sequence,
        payload,
      })
    );
  }

  private async auditAction(
    action: string,
    execution: AgentExecution,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.auditService.log({
      action,
      actorUserId: userId,
      resourceType: 'agent_execution',
      resourceId: execution.id,
      metadata: {
        provider: execution.provider,
        agentId: execution.agentId,
        conversationId: execution.conversationId,
        ...metadata,
      },
      severity: 'INFO',
    });
  }

  private sessionKey(userId: string, conversationId: string, agentId: string): string {
    return `agent:${agentId}:user:${userId}:conversation:${conversationId}`;
  }

  private errorCode(error: unknown): string {
    const response = this.asRecord(this.asRecord(error)?.response);
    return typeof response?.code === 'string' ? response.code : 'AGENT_PROVIDER_ERROR';
  }

  private asRecord(value: unknown): Record<string, any> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : null;
  }

  private toExecutionDto(execution: AgentExecution): AgentExecutionDto {
    return {
      id: execution.id,
      userId: execution.userId,
      conversationId: execution.conversationId,
      agentId: execution.agentId,
      provider: execution.provider,
      executionMode: execution.executionMode,
      providerRunId: execution.providerRunId ?? null,
      status: execution.status,
      startedAt: execution.startedAt?.toISOString() ?? null,
      finishedAt: execution.finishedAt?.toISOString() ?? null,
      errorCode: execution.errorCode ?? null,
      errorMessage: execution.errorMessage ?? null,
      metadata: execution.metadata ?? null,
      createdAt: execution.createdAt.toISOString(),
      updatedAt: execution.updatedAt.toISOString(),
    };
  }

  private toEventDto(event: AgentExecutionEvent): AgentExecutionEventDto {
    return {
      id: event.id,
      executionId: event.executionId,
      type: event.type,
      sequence: event.sequence,
      payload: event.payload ?? null,
      createdAt: event.createdAt.toISOString(),
    };
  }
}
