import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { OpenClawModule } from '../openclaw/openclaw.module';
import { AssistantMessageTask } from './assistant-message-task.entity';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { OpenClawRequestTrace } from './openclaw-request.entity';
import { SessionsController } from './sessions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, AssistantMessageTask, OpenClawRequestTrace]),
    OpenClawModule,
    AuditModule,
  ],
  controllers: [MessagesController, SessionsController],
  providers: [MessagesService],
})
export class MessagesModule {}
