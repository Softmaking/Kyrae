import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { OpenClawModule } from '../openclaw/openclaw.module';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), OpenClawModule, AuditModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
