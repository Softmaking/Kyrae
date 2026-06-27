import { HttpClient } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import type {
  ListAssistantSessionMessagesResponse,
  ListAssistantSessionsResponse,
  SendAssistantMessageCommand,
  SendAssistantMessageResponse,
} from '../models/assistant.model';

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly apiBaseUrl = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  async sendMessage(command: SendAssistantMessageCommand): Promise<SendAssistantMessageResponse> {
    return firstValueFrom(
      this.http.post<SendAssistantMessageResponse>(`${this.apiBaseUrl}/messages`, command)
    );
  }

  async findSessions(
    options: { limit?: number; cursor?: string } = {}
  ): Promise<ListAssistantSessionsResponse> {
    let params = new HttpParams().set('limit', String(options.limit ?? 10));
    if (options.cursor) {
      params = params.set('cursor', options.cursor);
    }

    return firstValueFrom(
      this.http.get<ListAssistantSessionsResponse>(`${this.apiBaseUrl}/sessions`, { params })
    );
  }

  async findSessionMessages(sessionId: string): Promise<ListAssistantSessionMessagesResponse> {
    return firstValueFrom(
      this.http.get<ListAssistantSessionMessagesResponse>(
        `${this.apiBaseUrl}/sessions/${sessionId}/messages`
      )
    );
  }
}
