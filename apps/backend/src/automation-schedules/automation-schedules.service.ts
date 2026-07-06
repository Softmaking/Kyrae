import type {
  AutomationScheduleDto,
  CreateAutomationScheduleCommand,
  ListAutomationSchedulesResponse,
  UpdateAutomationScheduleCommand,
} from '@kyrae/shared-contracts';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AutomationSchedule } from './automation-schedule.entity';
import { ListAutomationSchedulesDto } from './dto/list-automation-schedules.dto';

@Injectable()
export class AutomationSchedulesService {
  constructor(
    @InjectRepository(AutomationSchedule)
    private readonly scheduleRepository: Repository<AutomationSchedule>,
    private readonly auditService: AuditService
  ) {}

  async create(
    dto: CreateAutomationScheduleCommand,
    actorUserId: string
  ): Promise<AutomationScheduleDto> {
    const existing = await this.scheduleRepository.findOne({
      where: { automationKey: dto.automationKey },
    });

    if (existing) {
      throw new ConflictException('Ya existe una automatizacion con esa clave.');
    }

    const schedule = await this.scheduleRepository.save(
      this.scheduleRepository.create({
        userId: dto.userId,
        automationKey: dto.automationKey,
        title: dto.title,
        instruction: dto.instruction,
        cronExpression: dto.cronExpression,
        isActive: dto.isActive ?? true,
      })
    );

    await this.auditService.log({
      action: 'AUTOMATION_SCHEDULE_CREATED',
      actorUserId,
      resourceType: 'automation_schedule',
      resourceId: schedule.id,
      metadata: { automationKey: dto.automationKey, title: dto.title },
    });

    return this.toDto(schedule);
  }

  async findAll(query: ListAutomationSchedulesDto): Promise<ListAutomationSchedulesResponse> {
    const where: FindOptionsWhere<AutomationSchedule> = {};
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    if (query.search?.trim()) {
      where.title = Like(`%${query.search.trim()}%`);
    }

    const [data, total] = await this.scheduleRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      data: data.map((s) => this.toDto(s)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string): Promise<AutomationScheduleDto> {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException('Automatizacion no encontrada.');
    return this.toDto(schedule);
  }

  async update(
    id: string,
    dto: UpdateAutomationScheduleCommand,
    actorUserId: string
  ): Promise<AutomationScheduleDto> {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException('Automatizacion no encontrada.');

    if (dto.automationKey && dto.automationKey !== schedule.automationKey) {
      const existing = await this.scheduleRepository.findOne({
        where: { automationKey: dto.automationKey },
      });
      if (existing) {
        throw new ConflictException('Ya existe otra automatizacion con esa clave.');
      }
    }

    Object.assign(schedule, dto);
    const updated = await this.scheduleRepository.save(schedule);

    await this.auditService.log({
      action: 'AUTOMATION_SCHEDULE_UPDATED',
      actorUserId,
      resourceType: 'automation_schedule',
      resourceId: id,
      metadata: { automationKey: updated.automationKey },
    });

    return this.toDto(updated);
  }

  async remove(id: string, actorUserId: string): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException('Automatizacion no encontrada.');

    await this.scheduleRepository.remove(schedule);

    await this.auditService.log({
      action: 'AUTOMATION_SCHEDULE_DELETED',
      actorUserId,
      resourceType: 'automation_schedule',
      resourceId: id,
      metadata: { automationKey: schedule.automationKey },
    });
  }

  private toDto(schedule: AutomationSchedule): AutomationScheduleDto {
    return {
      id: schedule.id,
      userId: schedule.userId,
      automationKey: schedule.automationKey,
      title: schedule.title,
      instruction: schedule.instruction,
      cronExpression: schedule.cronExpression,
      isActive: schedule.isActive,
      lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
    };
  }
}
