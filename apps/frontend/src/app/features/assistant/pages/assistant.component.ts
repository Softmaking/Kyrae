import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { AssistantRealtimeService } from '../services/assistant-realtime.service';
import { AssistantService } from '../services/assistant.service';
import type {
  AssistantMessageDto,
  AssistantRealtimeEvent,
  AssistantSessionDto,
} from '../models/assistant.model';

interface AssistantMessageBlock {
  type: 'heading' | 'paragraph' | 'list' | 'code';
  text?: string;
  level?: 1 | 2 | 3;
  ordered?: boolean;
  items?: string[];
  language?: string;
}

type VoiceStatus = 'idle' | 'recording' | 'transcribing';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.css',
})
export class AssistantComponent implements OnInit, OnDestroy {
  private readonly assistantService = inject(AssistantService);
  private readonly authService = inject(AuthService);
  private readonly realtimeService = inject(AssistantRealtimeService);

  @ViewChild('messagesViewport') private messagesViewport?: ElementRef<HTMLElement>;

  readonly sessions = signal<AssistantSessionDto[]>([]);
  readonly messages = signal<AssistantMessageDto[]>([]);
  readonly loading = signal(false);
  readonly sessionsLoading = signal(false);
  readonly sessionsLoadingMore = signal(false);
  readonly historyLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly sessionId = signal<string | null>(null);
  readonly sessionsNextCursor = signal<string | null>(null);
  readonly voiceStatus = signal<VoiceStatus>('idle');

  private readonly sessionPageSize = 10;
  private readonly taskPollIntervalMs = 3000;
  private activeTaskId: string | null = null;
  private taskPollingTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];

  draft = '';

  ngOnInit(): void {
    this.realtimeService.connect();
    this.realtimeService.on('assistant.message.received', this.handleRealtimeEvent);
    this.realtimeService.on('assistant.agent.processing', this.handleRealtimeEvent);
    this.realtimeService.on('assistant.agent.completed', this.handleRealtimeEvent);
    this.realtimeService.on('assistant.agent.failed', this.handleRealtimeEvent);
    this.realtimeService.on('assistant.session.updated', this.handleRealtimeEvent);
    void this.loadSessions();
  }

  ngOnDestroy(): void {
    this.realtimeService.off('assistant.message.received', this.handleRealtimeEvent);
    this.realtimeService.off('assistant.agent.processing', this.handleRealtimeEvent);
    this.realtimeService.off('assistant.agent.completed', this.handleRealtimeEvent);
    this.realtimeService.off('assistant.agent.failed', this.handleRealtimeEvent);
    this.realtimeService.off('assistant.session.updated', this.handleRealtimeEvent);
    this.clearTaskPolling();
    this.stopMediaStream();
  }

  canUseVoice(): boolean {
    return this.authService.hasPermission('ASSISTANT_VOICE_USE');
  }

  voiceButtonLabel(): string {
    if (this.voiceStatus() === 'recording') return 'Detener grabación';
    if (this.voiceStatus() === 'transcribing') return 'Transcribiendo...';
    return 'Hablar';
  }

  async loadSessions(): Promise<void> {
    this.sessionsLoading.set(true);

    try {
      const response = await this.assistantService.findSessions({ limit: this.sessionPageSize });
      this.sessions.set(response.sessions);
      this.sessionsNextCursor.set(response.nextCursor);
    } catch {
      this.error.set('No se pudo cargar el listado de conversaciones.');
    } finally {
      this.sessionsLoading.set(false);
    }
  }

  async loadMoreSessions(): Promise<void> {
    const cursor = this.sessionsNextCursor();
    if (!cursor || this.sessionsLoadingMore()) return;

    this.sessionsLoadingMore.set(true);

    try {
      const response = await this.assistantService.findSessions({
        limit: this.sessionPageSize,
        cursor,
      });
      this.sessions.update((current) => [...current, ...response.sessions]);
      this.sessionsNextCursor.set(response.nextCursor);
    } catch {
      this.error.set('No se pudieron cargar más conversaciones.');
    } finally {
      this.sessionsLoadingMore.set(false);
    }
  }

  async openSession(session: AssistantSessionDto): Promise<void> {
    if (this.historyLoading() || this.sessionId() === session.id) return;

    this.historyLoading.set(true);
    this.error.set(null);

    try {
      const response = await this.assistantService.findSessionMessages(session.id);
      this.sessionId.set(response.session.id);
      this.messages.set(response.messages);
      this.realtimeService.joinSession(response.session.id);
      this.scrollMessagesToBottom();
    } catch {
      this.error.set('No se pudo cargar el historial de la conversación.');
    } finally {
      this.historyLoading.set(false);
    }
  }

  newSession(): void {
    this.sessionId.set(null);
    this.messages.set([]);
    this.error.set(null);
    this.draft = '';
  }

  async send(): Promise<void> {
    const message = this.draft.trim();
    if (!message || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.draft = '';

    try {
      const response = await this.assistantService.createMessageTask({
        message,
        sessionId: this.sessionId() ?? undefined,
        channel: 'web',
      });

      this.sessionId.set(response.sessionId);
      this.realtimeService.joinSession(response.sessionId);
      this.addMessage(response.userMessage);
      this.scrollMessagesToBottom();
      this.startTaskPolling(response.id);
      void this.loadSessions();
    } catch {
      this.error.set('No se pudo enviar el mensaje al asistente. Intenta nuevamente.');
      this.draft = message;
      this.loading.set(false);
    }
  }

  async toggleVoiceRecording(): Promise<void> {
    if (this.voiceStatus() === 'recording') {
      this.mediaRecorder?.stop();
      return;
    }

    if (this.loading() || this.voiceStatus() === 'transcribing') return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.error.set('Tu navegador no permite grabar audio desde esta página.');
      return;
    }

    try {
      this.error.set(null);
      this.audioChunks = [];
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined;
      this.mediaRecorder = new MediaRecorder(this.mediaStream, mimeType ? { mimeType } : undefined);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };
      this.mediaRecorder.onstop = () => {
        void this.handleVoiceRecordingStopped();
      };
      this.mediaRecorder.start();
      this.voiceStatus.set('recording');
    } catch {
      this.stopMediaStream();
      this.voiceStatus.set('idle');
      this.error.set('No se pudo acceder al micrófono. Revisa los permisos del navegador.');
    }
  }

  formatAssistantMessage(content: string): AssistantMessageBlock[] {
    const lines = content.split(/\r?\n/);
    const blocks: AssistantMessageBlock[] = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed) {
        index += 1;
        continue;
      }

      if (trimmed.startsWith('```')) {
        const language = trimmed.slice(3).trim() || undefined;
        const codeLines: string[] = [];
        index += 1;

        while (index < lines.length && !lines[index].trim().startsWith('```')) {
          codeLines.push(lines[index]);
          index += 1;
        }

        if (index < lines.length) index += 1;
        blocks.push({ type: 'code', text: codeLines.join('\n'), language });
        continue;
      }

      const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
      if (headingMatch) {
        blocks.push({
          type: 'heading',
          level: headingMatch[1].length as 1 | 2 | 3,
          text: headingMatch[2].trim(),
        });
        index += 1;
        continue;
      }

      const unorderedMatch = /^[-*]\s+(.+)$/.exec(trimmed);
      const orderedMatch = /^\d+[.)]\s+(.+)$/.exec(trimmed);
      if (unorderedMatch || orderedMatch) {
        const ordered = Boolean(orderedMatch);
        const items: string[] = [];

        while (index < lines.length) {
          const current = lines[index].trim();
          const itemMatch = ordered
            ? /^\d+[.)]\s+(.+)$/.exec(current)
            : /^[-*]\s+(.+)$/.exec(current);
          if (!itemMatch) break;

          items.push(itemMatch[1].trim());
          index += 1;
        }

        blocks.push({ type: 'list', ordered, items });
        continue;
      }

      const paragraphLines: string[] = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        if (
          !current ||
          current.startsWith('```') ||
          /^(#{1,3})\s+/.test(current) ||
          /^[-*]\s+/.test(current) ||
          /^\d+[.)]\s+/.test(current)
        ) {
          break;
        }

        paragraphLines.push(current);
        index += 1;
      }

      blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
    }

    return blocks.length ? blocks : [{ type: 'paragraph', text: content }];
  }

  private readonly handleRealtimeEvent = (event: AssistantRealtimeEvent): void => {
    if (this.sessionId() !== event.sessionId) return;

    if (event.status === 'received' && event.role === 'user' && event.content) {
      this.addMessage(this.eventToMessage(event));
      this.scrollMessagesToBottom();
      return;
    }

    if (event.status === 'processing') {
      this.loading.set(true);
      this.error.set(null);
      this.scrollMessagesToBottom();
      return;
    }

    if (event.status === 'completed' && event.role === 'assistant' && event.content) {
      this.addMessage(this.eventToMessage(event));
      this.completeActiveTask(event.taskId);
      this.loading.set(false);
      this.error.set(null);
      this.scrollMessagesToBottom();
      void this.loadSessions();
      return;
    }

    if (event.status === 'completed' && event.role === null) {
      void this.loadSessions();
      return;
    }

    if (event.status === 'failed') {
      this.completeActiveTask(event.taskId);
      this.loading.set(false);
      this.error.set(event.errorMessage ?? 'Kyrae no pudo procesar la solicitud.');
      void this.loadSessions();
    }
  };

  private async handleVoiceRecordingStopped(): Promise<void> {
    const audioType = this.mediaRecorder?.mimeType || 'audio/webm';
    this.stopMediaStream();

    if (!this.audioChunks.length) {
      this.voiceStatus.set('idle');
      this.error.set('No se capturó audio para enviar.');
      return;
    }

    const audio = new Blob(this.audioChunks, { type: audioType });
    this.audioChunks = [];
    this.voiceStatus.set('transcribing');
    this.error.set(null);

    try {
      const response = await this.assistantService.sendVoiceMessage(audio, {
        sessionId: this.sessionId() ?? undefined,
        channel: 'web',
      });

      this.sessionId.set(response.task.sessionId);
      this.realtimeService.joinSession(response.task.sessionId);
      this.addMessage(response.task.userMessage);
      this.loading.set(true);
      this.scrollMessagesToBottom();
      this.startTaskPolling(response.task.id);
      void this.loadSessions();
    } catch {
      this.error.set('No se pudo procesar el mensaje de voz. Intenta nuevamente.');
    } finally {
      this.voiceStatus.set('idle');
    }
  }

  private stopMediaStream(): void {
    this.mediaRecorder = null;
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
  }

  private startTaskPolling(taskId: string): void {
    this.clearTaskPolling();
    this.activeTaskId = taskId;
    this.scheduleTaskPoll(taskId);
  }

  private scheduleTaskPoll(taskId: string): void {
    this.taskPollingTimeoutId = setTimeout(() => {
      void this.pollTask(taskId);
    }, this.taskPollIntervalMs);
  }

  private async pollTask(taskId: string): Promise<void> {
    if (this.activeTaskId !== taskId) return;

    try {
      const task = await this.assistantService.getMessageTask(taskId);
      if (this.activeTaskId !== taskId) return;

      if (task.status === 'completed' && task.assistantMessage) {
        this.addMessage(task.assistantMessage);
        this.completeActiveTask(taskId);
        this.sessionId.set(task.sessionId);
        this.loading.set(false);
        this.error.set(null);
        this.scrollMessagesToBottom();
        void this.loadSessions();
        return;
      }

      if (task.status === 'failed') {
        this.completeActiveTask(taskId);
        this.loading.set(false);
        this.error.set(task.errorMessage ?? 'Kyrae no pudo procesar la solicitud.');
        void this.loadSessions();
        return;
      }

      this.scheduleTaskPoll(taskId);
    } catch {
      if (this.activeTaskId !== taskId) return;
      this.completeActiveTask(taskId);
      this.loading.set(false);
      this.error.set('No se pudo consultar el estado del mensaje. Intenta nuevamente.');
    }
  }

  private completeActiveTask(taskId: string | null): void {
    if (taskId && this.activeTaskId && this.activeTaskId !== taskId) return;
    this.clearTaskPolling();
  }

  private clearTaskPolling(): void {
    if (this.taskPollingTimeoutId) {
      clearTimeout(this.taskPollingTimeoutId);
      this.taskPollingTimeoutId = null;
    }
    this.activeTaskId = null;
  }

  private scrollMessagesToBottom(): void {
    requestAnimationFrame(() => {
      const element = this.messagesViewport?.nativeElement;
      if (!element) return;

      element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
    });
  }

  private addMessage(message: AssistantMessageDto): void {
    this.messages.update((current) => {
      if (current.some((item) => item.id === message.id)) return current;
      return [...current, message];
    });
  }

  private eventToMessage(event: AssistantRealtimeEvent): AssistantMessageDto {
    return {
      id: event.messageId ?? crypto.randomUUID(),
      sessionId: event.sessionId,
      conversationId: event.sessionId,
      role: event.role ?? 'assistant',
      content: event.content ?? '',
      status: event.status === 'failed' ? 'failed' : 'completed',
      channel: event.metadata.channel,
      metadata: event.metadata,
      createdAt: event.createdAt,
      updatedAt: null,
    };
  }
}
