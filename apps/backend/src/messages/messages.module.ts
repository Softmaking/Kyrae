import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { OpenClawModule } from '../openclaw/openclaw.module';
import { AssistantMessageTask } from './assistant-message-task.entity';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, AssistantMessageTask]),
    OpenClawModule,
    AuditModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
