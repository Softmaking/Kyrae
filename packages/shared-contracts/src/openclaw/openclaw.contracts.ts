import type {
  AssistantAttachmentDto,
  AssistantContextManifestDto,
  AssistantOutputMetadata,
} from '../attachments/attachment.contracts';

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
  | 'assistant.agent.stream'
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
  executionId?: string | null;
  eventType?: string | null;
  sequence?: number | null;
  delta?: string | null;
  createdAt: string;
}

export interface SendAssistantMessageCommand {
  /** Trimmed nonempty instruction, at most 4,000 characters, including attachment sends. */
  message: string;
  sessionId?: string;
  /** @deprecated Use sessionId. */
  conversationId?: string;
  channel?: AssistantChannel;
  /** Attachment sends require all three fields below and channel web/mobile.
   * Both session aliases, if supplied, must agree and match the batch target.
   */
  uploadBatchId?: string;
  /** Ordered unique 1–5 ids; must equal the batch's entire ready set after removals. */
  attachmentIds?: string[];
  /** Owner-scoped UUID idempotency key; identical retry returns the persisted result. */
  clientMessageId?: string;
}

export interface AssistantMessageDto extends AssistantOutputMetadata {
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
  /** Absent on legacy rows is rendered as []; no extracted content or image bytes. */
  attachments?: AssistantAttachmentDto[];
  contextManifest?: AssistantContextManifestDto | null;
}

export interface SendAssistantMessageResponse extends AssistantOutputMetadata {
  sessionId: string;
  /** @deprecated Use sessionId. */
  conversationId: string;
  userMessage: AssistantMessageDto;
  assistantMessage: AssistantMessageDto;
  openClawRequestId: string | null;
  contextManifest?: AssistantContextManifestDto | null;
}

export type AssistantTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AssistantMessageTaskDto extends AssistantOutputMetadata {
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
  contextManifest?: AssistantContextManifestDto | null;
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
