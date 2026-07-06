import type {
  AssistantRealtimeEvent,
  AssistantRealtimeEventName,
  JoinAssistantSessionCommand,
} from '@kyrae/shared-contracts';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { Conversation } from './conversation.entity';

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class MessagesGateway {
  private readonly logger = new Logger(MessagesGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>
  ) {}

  @SubscribeMessage('assistant.session.join')
  async joinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() command: JoinAssistantSessionCommand
  ): Promise<{ ok: boolean; errorMessage?: string }> {
    const userId = this.getClientUserId(client);
    if (!userId) return { ok: false, errorMessage: 'No tienes autorización.' };

    const conversation = await this.conversationRepository.findOne({
      where: { id: command.sessionId },
    });

    if (!conversation || conversation.userId !== userId) {
      return { ok: false, errorMessage: 'No tienes acceso a esta conversación.' };
    }

    await client.join(this.sessionRoom(command.sessionId));
    return { ok: true };
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      client.data.userId = payload.sub;
      await client.join(this.userRoom(payload.sub));
    } catch (error) {
      this.logger.warn(error instanceof Error ? error.message : 'Socket authentication failed');
      client.disconnect(true);
    }
  }

  emitToSession(eventName: AssistantRealtimeEventName, event: AssistantRealtimeEvent): void {
    this.server.to(this.sessionRoom(event.sessionId)).emit(eventName, event);
  }

  emitToUser(
    userId: string,
    eventName: AssistantRealtimeEventName,
    event: AssistantRealtimeEvent
  ): void {
    this.server.to(this.userRoom(userId)).emit(eventName, event);
  }

  private sessionRoom(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private getClientUserId(client: Socket): string | null {
    return typeof client.data.userId === 'string' ? client.data.userId : null;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) return authToken;

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice(7);

    return null;
  }
}
