export type AssistantChannel = 'web' | 'mobile' | 'whatsapp' | 'telegram' | 'local_voice';

export type AssistantMessageRole = 'user' | 'assistant' | 'system';

export interface SendAssistantMessageCommand {
  message: string;
  conversationId?: string;
  channel?: AssistantChannel;
}

export interface AssistantMessageDto {
  id: string;
  conversationId: string;
  role: AssistantMessageRole;
  content: string;
  channel: AssistantChannel;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface SendAssistantMessageResponse {
  conversationId: string;
  userMessage: AssistantMessageDto;
  assistantMessage: AssistantMessageDto;
  openClawRequestId: string | null;
}

export type AssistantTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AssistantMessageTaskDto {
  id: string;
  status: AssistantTaskStatus;
  conversationId: string;
  userMessage: AssistantMessageDto;
  assistantMessage: AssistantMessageDto | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface OpenClawRequest {
  sessionId: string;
  channel: AssistantChannel;
  message: string;
  metadata: {
    userId: string;
    conversationId: string;
  };
}

export interface OpenClawResponse {
  message: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}
