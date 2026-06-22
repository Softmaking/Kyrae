import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AssistantService } from '../services/assistant.service';
import type { AssistantMessageDto } from '../models/assistant.model';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.css',
})
export class AssistantComponent {
  private readonly assistantService = inject(AssistantService);

  readonly messages = signal<AssistantMessageDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly conversationId = signal<string | null>(null);

  draft = '';

  async send(): Promise<void> {
    const message = this.draft.trim();
    if (!message || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.draft = '';

    try {
      const response = await this.assistantService.sendMessage({
        message,
        conversationId: this.conversationId() ?? undefined,
        channel: 'web',
      });

      this.conversationId.set(response.conversationId);
      this.messages.update((current) => [
        ...current,
        response.userMessage,
        response.assistantMessage,
      ]);
    } catch {
      this.error.set('No se pudo enviar el mensaje al asistente. Intenta nuevamente.');
      this.draft = message;
    } finally {
      this.loading.set(false);
    }
  }
}
