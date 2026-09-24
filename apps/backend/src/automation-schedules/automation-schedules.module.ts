import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { OpenClawModule } from '../openclaw/openclaw.module';
import { OpenClawEventsModule } from '../openclaw-events/openclaw-events.module';
import { AutomationCronService } from './automation-cron.service';
import { AutomationSchedule } from './automation-schedule.entity';
import { AutomationSchedulesController } from './automation-schedules.controller';
import { AutomationSchedulesService } from './automation-schedules.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutomationSchedule]),
    AuditModule,
    OpenClawModule,
    OpenClawEventsModule,
  ],
  controllers: [AutomationSchedulesController],
  providers: [AutomationSchedulesService, AutomationCronService],
  exports: [AutomationSchedulesService],
})
export class AutomationSchedulesModule {}
