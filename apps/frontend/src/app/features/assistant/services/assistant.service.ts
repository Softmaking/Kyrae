import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import type {
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
}
