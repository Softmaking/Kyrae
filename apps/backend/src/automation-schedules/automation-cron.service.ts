import { Logger, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronExpressionParser } from 'cron-parser';
import { AuditService } from '../audit/audit.service';
import { OpenClawEventsService } from '../openclaw-events/openclaw-events.service';
import { AutomationSchedule } from './automation-schedule.entity';

@Injectable()
export class AutomationCronService {
  private readonly logger = new Logger(AutomationCronService.name);

  constructor(
    @InjectRepository(AutomationSchedule)
    private readonly scheduleRepository: Repository<AutomationSchedule>,
    private readonly openClawEventsService: OpenClawEventsService,
    private readonly auditService: AuditService
  ) {
    this.logger.log('AutomationCronService inicializado. Cron cada 1 minuto activo.');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async tickSchedules(): Promise<void> {
    console.log('[AutomationCron] Tick iniciado');
    const schedules = await this.scheduleRepository.find({ where: { isActive: true } });
    console.log(`[AutomationCron] Schedules activos: ${schedules.length}`);
    const now = new Date();

    for (const schedule of schedules) {
      const due = this.isDue(schedule, now);
      console.log(
        `[AutomationCron] ${schedule.title} lastRunAt=${String(schedule.lastRunAt)} due=${due}`
      );
      if (!due) continue;

      try {
        this.logger.log(`Ejecutando schedule: ${schedule.title} (${schedule.automationKey})`);

        const response = await this.openClawEventsService.executeSchedule(schedule);

        await this.openClawEventsService.processScheduleExecution({
          schedule,
          instruction: schedule.instruction,
          assistantResponse: response.assistantResponse,
          userId: schedule.userId,
          openClawRequestId: response.providerRequestId,
          provider: response.provider,
          executionId: response.executionId,
        });

        schedule.lastRunAt = now;
        await this.scheduleRepository.save(schedule);

        this.logger.log(`Schedule ejecutado: ${schedule.title}`);
      } catch (error) {
        this.logger.error(
          `Error ejecutando schedule ${schedule.title}: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );

        await this.auditService.log({
          action: 'AUTOMATION_CRON_FAILED',
          actorUserId: schedule.userId,
          resourceType: 'automation_schedule',
          resourceId: schedule.id,
          metadata: {
            automationKey: schedule.automationKey,
            title: schedule.title,
            error: error instanceof Error ? error.message : 'Error desconocido',
          },
          severity: 'ERROR',
        });
      }
    }
  }

  private isDue(schedule: AutomationSchedule, now: Date): boolean {
    try {
      const interval = CronExpressionParser.parse(schedule.cronExpression);
      const next = interval.next();
      const nextDate = next.toDate();

      if (!schedule.lastRunAt) {
        return true;
      }

      return nextDate > schedule.lastRunAt && nextDate <= now;
    } catch (error) {
      console.log(`[AutomationCron] Error isDue ${schedule.title}:`, error);
      this.logger.warn(
        `Expresion cron invalida para ${schedule.title}: ${schedule.cronExpression}`
      );
      return false;
    }
  }
}
