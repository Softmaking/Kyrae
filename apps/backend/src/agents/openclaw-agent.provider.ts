import type {
  AgentChatRequest,
  AgentChatResponse,
  AgentProviderHealth,
} from '@kyrae/shared-contracts';
import { Injectable } from '@nestjs/common';
import { OpenClawService } from '../openclaw/openclaw.service';
import { AgentProvider } from './agent-provider';
import { hasTypedParts } from './attachment-hermes.protocol';
import { attachmentError } from '../assistant-attachments/attachment.errors';

@Injectable()
export class OpenClawAgentProvider implements AgentProvider {
  constructor(private readonly openClawService: OpenClawService) {}

  getType() {
    return 'OPENCLAW' as const;
  }

  async healthCheck(): Promise<AgentProviderHealth> {
    return this.openClawService.healthCheck();
  }

  async sendMessage(request: AgentChatRequest): Promise<AgentChatResponse> {
    if (hasTypedParts(request.messages)) throw attachmentError('ATTACHMENTS_UNSUPPORTED_PROVIDER');
    const content = request.messages.at(-1)?.content ?? '';
    if (typeof content !== 'string') throw attachmentError('ATTACHMENTS_UNSUPPORTED_PROVIDER');
    const response = await this.openClawService.sendMessage({
      sessionId: request.conversationId,
      channel: request.channel ?? 'web',
      message: content,
      metadata: { userId: request.userId, conversationId: request.conversationId },
    });
    return {
      message: response.message,
      providerRequestId: response.requestId,
      metadata: response.metadata,
    };
  }
}
