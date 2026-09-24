import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AutomationSchedule } from '../automation-schedules/automation-schedule.entity';
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
    AgentsModule,
    TypeOrmModule.forFeature([OpenClawEvent, User, Conversation, Message, AutomationSchedule]),
    MessagesModule,
    AuditModule,
  ],
  controllers: [OpenClawEventsController],
  providers: [OpenClawEventsService, OpenClawEventsApiKeyGuard],
  exports: [OpenClawEventsService],
})
export class OpenClawEventsModule {}
