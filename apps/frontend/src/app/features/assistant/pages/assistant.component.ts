import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AssistantService } from '../services/assistant.service';
import type { AssistantMessageDto, AssistantSessionDto } from '../models/assistant.model';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.css',
})
export class AssistantComponent implements OnInit {
  private readonly assistantService = inject(AssistantService);

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

  draft = '';

  ngOnInit(): void {
    void this.loadSessions();
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
      const response = await this.assistantService.sendMessage({
        message,
        sessionId: this.sessionId() ?? undefined,
        channel: 'web',
      });

      this.sessionId.set(response.sessionId);
      this.messages.update((current) => [
        ...current,
        response.userMessage,
        response.assistantMessage,
      ]);
      void this.loadSessions();
    } catch {
      this.error.set('No se pudo enviar el mensaje al asistente. Intenta nuevamente.');
      this.draft = message;
    } finally {
      this.loading.set(false);
    }
  }
}
