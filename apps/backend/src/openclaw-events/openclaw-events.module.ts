import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Conversation } from '../messages/conversation.entity';
import { Message } from '../messages/message.entity';
import { MessagesModule } from '../messages/messages.module';
import { User } from '../users/user.entity';
import { OpenClawEvent } from './openclaw-event.entity';
import { OpenClawEventsController } from './openclaw-events.controller';
import { OpenClawEventsService } from './openclaw-events.service';
import { OpenClawEventsApiKeyGuard } from './guards/openclaw-events-api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([OpenClawEvent, User, Conversation, Message]),
    MessagesModule,
    AuditModule,
  ],
  controllers: [OpenClawEventsController],
  providers: [OpenClawEventsService, OpenClawEventsApiKeyGuard],
})
export class OpenClawEventsModule {}
