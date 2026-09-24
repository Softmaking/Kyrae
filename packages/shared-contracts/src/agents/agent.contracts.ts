import type { AssistantChannel } from '../openclaw/openclaw.contracts';

export type AgentProviderType = 'HERMES' | 'OPENCLAW';

export type AgentExecutionMode = 'CHAT' | 'RUN';

export type AgentExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type AgentProviderHealthStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'DEGRADED';

export type AgentStreamEventType =
  | 'STARTED'
  | 'TOKEN'
  | 'TOOL_START'
  | 'TOOL_RESULT'
  | 'MESSAGE'
  | 'APPROVAL_REQUIRED'
  | 'COMPLETED'
  | 'ERROR';

export interface AgentChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AgentChatRequest {
  agentId: string;
  userId: string;
  conversationId: string;
  sessionKey: string;
  channel?: AssistantChannel;
  messages: AgentChatMessage[];
  model?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentChatResponse {
  message: string;
  providerRequestId?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentStreamEvent {
  type: AgentStreamEventType;
  data: unknown;
  providerEventId?: string;
  sequence?: number;
}

export interface AgentRunRequest {
  agentId: string;
  userId: string;
  conversationId: string;
  sessionKey: string;
  input: string;
  instructions?: string;
  conversationHistory?: AgentChatMessage[];
  metadata?: Record<string, unknown>;
}

export interface AgentRun {
  providerRunId: string;
  status: AgentExecutionStatus;
  output?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AgentRunEvent {
  type: AgentStreamEventType;
  data: unknown;
  providerEventId?: string;
  sequence?: number;
}

export interface AgentApprovalRequest {
  approved: boolean;
  data?: Record<string, unknown>;
}

export interface AgentProviderHealth {
  provider: AgentProviderType;
  status: AgentProviderHealthStatus;
  message?: string;
}

export interface AgentCapabilityResponse {
  provider: AgentProviderType;
  capabilities: Record<string, unknown>;
}

export interface AgentDto {
  id: string;
  name: string;
  description: string | null;
  provider: AgentProviderType;
  providerAgentId: string | null;
  defaultExecutionMode: AgentExecutionMode;
  configuration: Record<string, unknown> | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentExecutionDto {
  id: string;
  userId: string;
  conversationId: string;
  agentId: string;
  provider: AgentProviderType;
  executionMode: AgentExecutionMode;
  providerRunId: string | null;
  status: AgentExecutionStatus;
  startedAt: string | null;
  finishedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentExecutionEventDto {
  id: string;
  executionId: string;
  type: AgentStreamEventType;
  sequence: number;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateAgentRunCommand {
  input: string;
  conversationId?: string;
  agentId?: string;
  instructions?: string;
}

export interface AgentSteerCommand {
  instruction: string;
}

export interface AgentApprovalCommand {
  approved: boolean;
  data?: Record<string, unknown>;
}
