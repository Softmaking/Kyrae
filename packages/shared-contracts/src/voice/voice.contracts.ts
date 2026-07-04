import type { AssistantChannel, AssistantMessageTaskDto } from '../openclaw/openclaw.contracts';

export type VoiceEventStatus =
  | 'recording'
  | 'stopped'
  | 'transcribing'
  | 'transcribed'
  | 'synthesizing'
  | 'ready'
  | 'failed';

export type VoiceOutputStatus = 'synthesizing' | 'ready' | 'failed';

export interface SendVoiceSpeakCommand {
  text: string;
  sessionId?: string;
  messageId?: string;
  channel?: AssistantChannel;
}

export interface VoiceSpeakMetadata {
  voiceEventId: string;
  audioMimeType: string;
  audioSizeBytes: number;
  provider: string;
}

export interface SendVoiceMessageResponse {
  transcript: string;
  language: string | null;
  confidence: number | null;
  voiceEventId: string;
  task: AssistantMessageTaskDto;
}

export interface VoiceEventDto {
  id: string;
  userId: string;
  sessionId: string | null;
  taskId: string | null;
  status: VoiceEventStatus;
  transcript: string | null;
  language: string | null;
  confidence: number | null;
  errorMessage: string | null;
  audioMimeType: string | null;
  audioSizeBytes: number | null;
  channel: AssistantChannel;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
}
