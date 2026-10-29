import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AgentsModule } from '../agents/agents.module';
import { AssistantMessageTask } from './assistant-message-task.entity';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { MessagesGateway } from './messages.gateway';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { OpenClawRequestTrace } from './openclaw-request.entity';
import { SessionsController } from './sessions.controller';
import { AssistantAttachmentsModule } from '../assistant-attachments/assistant-attachments.module';
import { AssistantContextBuilder } from './assistant-context-builder.service';
import { AttachmentSubmissions } from './attachment-submissions.service';
import { AttachmentDispatcher } from './attachment-dispatcher.service';

@Module({
  imports: [
    AssistantAttachmentsModule,
    TypeOrmModule.forFeature([Conversation, Message, AssistantMessageTask, OpenClawRequestTrace]),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev_jwt_secret_change_me',
      signOptions: { expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 900) },
    }),
    AgentsModule,
    AuditModule,
  ],
  controllers: [MessagesController, SessionsController],
  providers: [
    MessagesService,
    MessagesGateway,
    AssistantContextBuilder,
    AttachmentSubmissions,
    AttachmentDispatcher,
  ],
  exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
