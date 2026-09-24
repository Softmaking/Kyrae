import type {
  AgentApprovalRequest,
  AgentCapabilityResponse,
  AgentChatRequest,
  AgentChatResponse,
  AgentProviderHealth,
  AgentProviderType,
  AgentRun,
  AgentRunEvent,
  AgentRunRequest,
  AgentStreamEvent,
} from '@kyrae/shared-contracts';

export interface AgentProvider {
  getType(): AgentProviderType;
  healthCheck(): Promise<AgentProviderHealth>;
  sendMessage(request: AgentChatRequest): Promise<AgentChatResponse>;
  streamMessage?(request: AgentChatRequest): AsyncIterable<AgentStreamEvent>;
  createRun?(request: AgentRunRequest): Promise<AgentRun>;
  getRun?(runId: string): Promise<AgentRun>;
  streamRunEvents?(runId: string): AsyncIterable<AgentRunEvent>;
  stopRun?(runId: string): Promise<void>;
  steerRun?(runId: string, instruction: string): Promise<void>;
  approveRun?(runId: string, approval: AgentApprovalRequest): Promise<void>;
  getCapabilities?(): Promise<AgentCapabilityResponse>;
  getSkills?(): Promise<unknown>;
  getToolsets?(): Promise<unknown>;
  getModels?(): Promise<unknown>;
}
