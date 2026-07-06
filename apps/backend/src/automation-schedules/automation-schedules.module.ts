import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AutomationSchedule } from './automation-schedule.entity';
import { AutomationSchedulesController } from './automation-schedules.controller';
import { AutomationSchedulesService } from './automation-schedules.service';

@Module({
  imports: [TypeOrmModule.forFeature([AutomationSchedule]), AuditModule],
  controllers: [AutomationSchedulesController],
  providers: [AutomationSchedulesService],
  exports: [AutomationSchedulesService],
})
export class AutomationSchedulesModule {}
