export type AssistantChannel =
  | 'web'
  | 'mobile'
  | 'whatsapp'
  | 'telegram'
  | 'local_voice'
  | 'automation';

export type AssistantMessageRole = 'user' | 'assistant' | 'system';

export type AssistantMessageStatus = 'pending' | 'completed' | 'failed';

export type AssistantSessionStatus = 'active' | 'completed' | 'failed' | 'archived';

export type OpenClawRequestStatus = 'pending' | 'completed' | 'failed';

export type AssistantRealtimeEventName =
  | 'assistant.message.received'
  | 'assistant.agent.processing'
  | 'assistant.agent.completed'
  | 'assistant.agent.failed'
  | 'assistant.automation.received'
  | 'assistant.session.updated'
  | 'voice.synthesizing'
  | 'voice.ready'
  | 'voice.failed';

export type AssistantRealtimeStatus =
  | 'received'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'automation_received'
  | 'synthesizing'
  | 'ready';

export type OpenClawAutomationEventType =
  | 'automation.started'
  | 'automation.completed'
  | 'automation.failed';

export type OpenClawAutomationSeverity = 'INFO' | 'WARN' | 'ERROR';

export type OpenClawAutomationSessionStrategy = 'user_automation_inbox' | 'automation_key';

export interface OpenClawAutomationEventCommand {
  eventId: string;
  type: OpenClawAutomationEventType;
  userId: string;
  automationKey: string;
  title: string;
  message: string;
  severity?: OpenClawAutomationSeverity;
  sessionStrategy?: OpenClawAutomationSessionStrategy;
  externalRunId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface OpenClawAutomationEventResponse {
  eventId: string;
  status: 'processed' | 'duplicate';
  sessionId: string;
  messageId: string;
}

export interface JoinAssistantSessionCommand {
  sessionId: string;
}

export interface AssistantRealtimeEvent {
  sessionId: string;
  taskId: string | null;
  messageId: string | null;
  role: AssistantMessageRole | null;
  status: AssistantRealtimeStatus;
  content: string | null;
  errorMessage: string | null;
  metadata: {
    channel: AssistantChannel;
    agent?: 'main';
    [key: string]: unknown;
  };
  createdAt: string;
}

export interface SendAssistantMessageCommand {
  message: string;
  sessionId?: string;
  /** @deprecated Use sessionId. */
  conversationId?: string;
  channel?: AssistantChannel;
}

export interface AssistantMessageDto {
  id: string;
  sessionId: string;
  /** @deprecated Use sessionId. */
  conversationId: string;
  role: AssistantMessageRole;
  content: string;
  status: AssistantMessageStatus;
  channel: AssistantChannel;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface SendAssistantMessageResponse {
  sessionId: string;
  /** @deprecated Use sessionId. */
  conversationId: string;
  userMessage: AssistantMessageDto;
  assistantMessage: AssistantMessageDto;
  openClawRequestId: string | null;
}

export type AssistantTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AssistantMessageTaskDto {
  id: string;
  status: AssistantTaskStatus;
  sessionId: string;
  /** @deprecated Use sessionId. */
  conversationId: string;
  userMessage: AssistantMessageDto;
  assistantMessage: AssistantMessageDto | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface AssistantSessionDto {
  id: string;
  title: string | null;
  channel: AssistantChannel;
  status: AssistantSessionStatus;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListAssistantSessionsResponse {
  sessions: AssistantSessionDto[];
  nextCursor: string | null;
}

export interface ListAssistantSessionMessagesResponse {
  session: AssistantSessionDto;
  messages: AssistantMessageDto[];
}

export interface OpenClawRequestDto {
  id: string;
  sessionId: string;
  messageId: string;
  requestPayload: OpenClawRequest;
  responsePayload: OpenClawResponse | null;
  status: OpenClawRequestStatus;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
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
