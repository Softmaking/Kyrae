import type {
  AgentApprovalRequest,
  AgentCapabilityResponse,
  AgentChatRequest,
  AgentChatResponse,
  AgentProviderHealth,
  AgentRun,
  AgentRunEvent,
  AgentRunRequest,
  AgentStreamEvent,
} from '@kyrae/shared-contracts';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentProvider } from './agent-provider';
import {
  hasTypedParts,
  invokeAttachmentHermes,
  serializeAttachmentRequest,
} from './attachment-hermes.protocol';
import { attachmentError } from '../assistant-attachments/attachment.errors';
import {
  AgentProviderError,
  AgentProviderUnavailableError,
  AgentTimeoutError,
} from './agent.errors';

@Injectable()
export class HermesAgentProvider implements AgentProvider {
  private readonly logger = new Logger(HermesAgentProvider.name);

  constructor(private readonly config: ConfigService) {}

  getType() {
    return 'HERMES' as const;
  }

  async healthCheck(): Promise<AgentProviderHealth> {
    try {
      await this.request('/health', { method: 'GET' });
      return { provider: 'HERMES', status: 'AVAILABLE' };
    } catch (error) {
      this.logger.warn(`Hermes health check failed: ${this.safeMessage(error)}`);
      return { provider: 'HERMES', status: 'UNAVAILABLE', message: 'Hermes no está disponible.' };
    }
  }

  async sendMessage(request: AgentChatRequest): Promise<AgentChatResponse> {
    if (hasTypedParts(request.messages)) {
      const base = this.config.get<string>('HERMES_BASE_URL');
      if (!base) throw attachmentError('ATTACHMENTS_CAPABILITY_UNAVAILABLE', 503);
      return invokeAttachmentHermes(
        base,
        this.config.get<string>('HERMES_API_KEY'),
        serializeAttachmentRequest(
          request.model ?? this.config.get<string>('HERMES_DEFAULT_MODEL', 'hermes-agent'),
          request.messages
        )
      );
    }
    let content = '';
    let providerRequestId: string | undefined;

    if (this.streamMessage) {
      for await (const event of this.streamMessage(request)) {
        if (event.type === 'TOKEN') {
          const value = this.extractText(event.data);
          if (value) content += value;
        }
        const data = this.asRecord(event.data);
        if (typeof data?.id === 'string') providerRequestId = data.id;
      }
    }

    if (!content) throw new AgentProviderError('Hermes devolvió una respuesta vacía.');
    return { message: content, providerRequestId };
  }

  async *streamMessage(request: AgentChatRequest): AsyncIterable<AgentStreamEvent> {
    if (hasTypedParts(request.messages)) throw attachmentError('ATTACHMENTS_UNSUPPORTED_PROVIDER');
    const response = await this.request('/v1/chat/completions', {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream, application/json',
        'X-Hermes-Session-Id': request.conversationId,
        'X-Hermes-Session-Key': request.sessionKey,
      },
      body: JSON.stringify({
        model: request.model ?? this.config.get<string>('HERMES_DEFAULT_MODEL', 'hermes-agent'),
        messages: request.messages,
        stream: true,
      }),
    });

    if (!response.body) throw new AgentProviderError('Hermes no devolvió una respuesta válida.');
    yield { type: 'STARTED', data: {} };

    if (!response.headers.get('content-type')?.includes('text/event-stream')) {
      const payload = (await response.json()) as unknown;
      const text = this.extractText(payload);
      if (!text) throw new AgentProviderError('Hermes devolvió una respuesta vacía.');
      yield { type: 'MESSAGE', data: payload, sequence: 0 };
      yield { type: 'TOKEN', data: { text }, sequence: 1 };
      yield { type: 'COMPLETED', data: {}, sequence: 2 };
      return;
    }

    let sequence = 0;
    for await (const event of this.parseSse(response.body)) {
      if (event.data === '[DONE]') {
        yield { type: 'COMPLETED', data: {}, sequence };
        return;
      }

      let payload: unknown;
      try {
        payload = JSON.parse(event.data);
      } catch {
        continue;
      }

      const text = this.extractText(payload);
      if (text)
        yield { type: 'TOKEN', data: { text }, providerEventId: event.id, sequence: sequence++ };
      const record = this.asRecord(payload);
      if (record && typeof record.id === 'string') {
        yield { type: 'MESSAGE', data: record, providerEventId: event.id, sequence: sequence++ };
      }
    }
  }

  async createRun(request: AgentRunRequest): Promise<AgentRun> {
    if (hasTypedParts(request.conversationHistory ?? []))
      throw attachmentError('ATTACHMENTS_UNSUPPORTED_PROVIDER');
    const response = await this.request('/v1/runs', {
      method: 'POST',
      headers: {
        'Idempotency-Key': `kyrae-${request.conversationId}-${Date.now()}`,
        'X-Hermes-Session-Id': request.conversationId,
        'X-Hermes-Session-Key': request.sessionKey,
      },
      body: JSON.stringify({
        input: request.input,
        session_id: request.conversationId,
        instructions: request.instructions,
        conversation_history: request.conversationHistory,
      }),
    });
    const body = (await response.json()) as Record<string, unknown>;
    const providerRunId = this.stringValue(body.run_id);
    if (!providerRunId)
      throw new AgentProviderError('Hermes no devolvió un identificador de ejecución.');
    return { providerRunId, status: this.mapStatus(this.stringValue(body.status)) };
  }

  async getRun(runId: string): Promise<AgentRun> {
    const response = await this.request(`/v1/runs/${encodeURIComponent(runId)}`, { method: 'GET' });
    const body = (await response.json()) as Record<string, unknown>;
    return {
      providerRunId: this.stringValue(body.run_id) ?? runId,
      status: this.mapStatus(this.stringValue(body.status)),
      output: this.stringValue(body.output),
      metadata: this.asRecord(body.usage) ?? undefined,
    };
  }

  async *streamRunEvents(runId: string): AsyncIterable<AgentRunEvent> {
    const response = await this.request(`/v1/runs/${encodeURIComponent(runId)}/events`, {
      method: 'GET',
    });
    if (!response.body) throw new AgentProviderError('Hermes no devolvió eventos válidos.');
    let sequence = 0;
    for await (const event of this.parseSse(response.body)) {
      if (event.data === '[DONE]') return;
      try {
        const payload = JSON.parse(event.data) as unknown;
        yield {
          type: this.mapEventType(event.event),
          data: payload,
          providerEventId: event.id,
          sequence: sequence++,
        };
      } catch {
        this.logger.debug('Ignored malformed Hermes run event');
      }
    }
  }

  async stopRun(runId: string): Promise<void> {
    await this.request(`/v1/runs/${encodeURIComponent(runId)}/stop`, { method: 'POST' });
  }

  async steerRun(runId: string, instruction: string): Promise<void> {
    await this.request(`/v1/runs/${encodeURIComponent(runId)}/steer`, {
      method: 'POST',
      body: JSON.stringify({ instruction }),
    });
  }

  async approveRun(runId: string, approval: AgentApprovalRequest): Promise<void> {
    await this.request(`/v1/runs/${encodeURIComponent(runId)}/approval`, {
      method: 'POST',
      body: JSON.stringify(approval),
    });
  }

  getCapabilities(): Promise<AgentCapabilityResponse> {
    return this.getJson('/v1/capabilities').then((capabilities) => ({
      provider: 'HERMES',
      capabilities: this.asRecord(capabilities) ?? {},
    }));
  }

  getSkills(): Promise<unknown> {
    return this.getJson('/v1/skills');
  }

  getToolsets(): Promise<unknown> {
    return this.getJson('/v1/toolsets');
  }

  getModels(): Promise<unknown> {
    return this.getJson('/v1/models');
  }

  private async getJson(path: string): Promise<unknown> {
    const response = await this.request(path, { method: 'GET' });
    return response.json();
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const baseUrl = this.config.get<string>('HERMES_BASE_URL');
    if (!baseUrl) throw new AgentProviderUnavailableError('Hermes no está configurado.');
    const timeoutMs = Number(this.config.get<string>('HERMES_REQUEST_TIMEOUT_MS', '30000'));
    const controller = timeoutMs > 0 ? new AbortController() : undefined;
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');
    const apiKey = this.config.get<string>('HERMES_API_KEY');
    if (apiKey) headers.set('authorization', `Bearer ${apiKey}`);
    let responseStatus: number | undefined;

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
        ...init,
        headers,
        signal: controller?.signal,
      });
      responseStatus = response.status;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403)
          throw new AgentProviderError('Hermes rechazó la solicitud.');
        if (response.status >= 500) throw new AgentProviderUnavailableError();
        throw new AgentProviderError('Hermes rechazó la solicitud.');
      }
      return response;
    } catch (error) {
      if (error instanceof AgentProviderError || error instanceof AgentProviderUnavailableError) {
        this.logger.warn(
          `Hermes request failed for ${path}${responseStatus ? ` (HTTP ${responseStatus})` : ''}: ${this.safeMessage(error)}`
        );
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') throw new AgentTimeoutError();
      this.logger.warn(`Hermes request failed for ${path}: ${this.safeMessage(error)}`);
      throw new AgentProviderUnavailableError();
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private async *parseSse(
    body: ReadableStream<Uint8Array>
  ): AsyncIterable<{ event?: string; id?: string; data: string }> {
    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      buffer += decoder.decode(chunk, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const lines = frame.split(/\r?\n/);
        const data = lines
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n');
        if (!data) continue;
        yield {
          event: lines
            .find((line) => line.startsWith('event:'))
            ?.slice(6)
            .trim(),
          id: lines
            .find((line) => line.startsWith('id:'))
            ?.slice(3)
            .trim(),
          data,
        };
      }
    }
  }

  private extractText(value: unknown): string | null {
    const record = this.asRecord(value);
    const directText = this.stringValue(record?.text);
    if (directText) return directText;
    const choices = Array.isArray(record?.choices) ? record.choices : [];
    const choice = this.asRecord(choices[0]);
    const delta = this.asRecord(choice?.delta);
    return (
      this.stringValue(delta?.content) ??
      this.stringValue(this.asRecord(choice?.message)?.content) ??
      null
    );
  }

  private mapStatus(status?: string): AgentRun['status'] {
    if (status === 'completed') return 'COMPLETED';
    if (status === 'failed') return 'FAILED';
    if (status === 'cancelled' || status === 'canceled') return 'CANCELLED';
    if (status === 'waiting_approval' || status === 'awaiting_approval') return 'WAITING_APPROVAL';
    return 'RUNNING';
  }

  private mapEventType(event?: string): AgentRunEvent['type'] {
    if (event?.includes('approval')) return 'APPROVAL_REQUIRED';
    if (event?.includes('tool')) return event.includes('complete') ? 'TOOL_RESULT' : 'TOOL_START';
    if (event?.includes('delta')) return 'TOKEN';
    if (event?.includes('completed')) return 'COMPLETED';
    return 'MESSAGE';
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private stringValue(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private safeMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }
}
