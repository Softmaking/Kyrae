import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEvent } from './audit-event.entity';
import { AuditService } from './audit.service';
import { AuditEventsController } from './audit-events.controller';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditEvent, User])],
  controllers: [AuditEventsController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
