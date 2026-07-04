import { Injectable, NgZone, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from '../../auth/services/auth.service';
import type { AssistantRealtimeEvent, AssistantRealtimeEventName } from '../models/assistant.model';

@Injectable({ providedIn: 'root' })
export class AssistantRealtimeService {
  private readonly authService = inject(AuthService);
  private readonly zone = inject(NgZone);
  private readonly reconnectAttempts = 3;
  private socket: Socket | null = null;
  private activeSessionId: string | null = null;
  private readonly handlers = new Map<
    AssistantRealtimeEventName,
    Map<(event: AssistantRealtimeEvent) => void, (event: AssistantRealtimeEvent) => void>
  >();

  connect(): void {
    if (this.socket?.connected) return;

    const token = this.authService.getAccessToken();
    if (!token) return;

    if (this.socket) {
      this.socket.auth = { token };
      this.socket.connect();
      return;
    }

    this.socket = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: this.reconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      if (this.activeSessionId) this.joinSession(this.activeSessionId);
    });

    this.socket.io.on('reconnect_attempt', () => {
      const refreshedToken = this.authService.getAccessToken();
      if (!refreshedToken) {
        this.stopSocket();
        return;
      }

      if (this.socket) this.socket.auth = { token: refreshedToken };
    });

    this.socket.io.on('reconnect_failed', () => {
      this.stopSocket();
    });

    this.bindRegisteredHandlers();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.activeSessionId = null;
  }

  joinSession(sessionId: string): void {
    this.activeSessionId = sessionId;
    this.connect();
    this.socket?.emit('assistant.session.join', { sessionId });
  }

  on(
    eventName: AssistantRealtimeEventName,
    handler: (event: AssistantRealtimeEvent) => void
  ): void {
    this.connect();

    const wrappedHandler = (event: AssistantRealtimeEvent): void => {
      this.zone.run(() => handler(event));
    };

    const eventHandlers =
      this.handlers.get(eventName) ??
      new Map<(event: AssistantRealtimeEvent) => void, (event: AssistantRealtimeEvent) => void>();
    eventHandlers.set(handler, wrappedHandler);
    this.handlers.set(eventName, eventHandlers);
    this.socket?.on(eventName, wrappedHandler);
  }

  off(
    eventName: AssistantRealtimeEventName,
    handler: (event: AssistantRealtimeEvent) => void
  ): void {
    const wrappedHandler = this.handlers.get(eventName)?.get(handler);
    this.socket?.off(eventName, wrappedHandler ?? handler);
    this.handlers.get(eventName)?.delete(handler);
  }

  private stopSocket(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  private bindRegisteredHandlers(): void {
    if (!this.socket) return;

    for (const [eventName, eventHandlers] of this.handlers.entries()) {
      for (const wrappedHandler of eventHandlers.values()) {
        this.socket.on(eventName, wrappedHandler);
      }
    }
  }
}
