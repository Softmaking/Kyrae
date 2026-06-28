import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AssistantRealtimeService } from '../services/assistant-realtime.service';
import { AssistantService } from '../services/assistant.service';
import type {
  AssistantMessageDto,
  AssistantRealtimeEvent,
  AssistantSessionDto,
} from '../models/assistant.model';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.css',
})
export class AssistantComponent implements OnInit, OnDestroy {
  private readonly assistantService = inject(AssistantService);
  private readonly realtimeService = inject(AssistantRealtimeService);

  readonly sessions = signal<AssistantSessionDto[]>([]);
  readonly messages = signal<AssistantMessageDto[]>([]);
  readonly loading = signal(false);
  readonly sessionsLoading = signal(false);
  readonly sessionsLoadingMore = signal(false);
  readonly historyLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly sessionId = signal<string | null>(null);
  readonly sessionsNextCursor = signal<string | null>(null);

  private readonly sessionPageSize = 10;
  private readonly taskPollIntervalMs = 3000;
  private activeTaskId: string | null = null;
  private taskPollingTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
      this.startTaskPolling(response.id);
      void this.loadSessions();
    } catch {
      this.error.set('No se pudo enviar el mensaje al asistente. Intenta nuevamente.');
      this.draft = message;
      this.loading.set(false);
    }
  }

  private readonly handleRealtimeEvent = (event: AssistantRealtimeEvent): void => {
    if (this.sessionId() !== event.sessionId) return;

    if (event.status === 'received' && event.role === 'user' && event.content) {
      this.addMessage(this.eventToMessage(event));
      return;
    }

    if (event.status === 'processing') {
      this.loading.set(true);
      this.error.set(null);
      return;
    }

    if (event.status === 'completed' && event.role === 'assistant' && event.content) {
      this.addMessage(this.eventToMessage(event));
      this.completeActiveTask(event.taskId);
      this.loading.set(false);
      this.error.set(null);
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
