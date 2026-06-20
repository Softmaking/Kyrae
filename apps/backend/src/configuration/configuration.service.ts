import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AppConfigDto,
  ListAppConfigsResponse,
  ListAppConfigsQuery,
} from '@kyrae/shared-contracts';
import { Repository } from 'typeorm';
import { AuditActions } from '../audit/audit-actions.constants';
import { AuditService } from '../audit/audit.service';
import { AppConfig } from './app-config.entity';
import { CreateAppConfigDto } from './dto/create-app-config.dto';
import { UpdateAppConfigDto } from './dto/update-app-config.dto';

@Injectable()
export class ConfigurationService {
  constructor(
    @InjectRepository(AppConfig)
    private readonly configRepository: Repository<AppConfig>,
    private readonly auditService: AuditService
  ) {}

  async create(dto: CreateAppConfigDto, actorUserId?: string): Promise<AppConfigDto> {
    const existing = await this.configRepository.findOne({ where: { key: dto.key } });
    if (existing) {
      throw new ConflictException('Configuration key already exists');
    }

    const config = this.configRepository.create({
      key: dto.key,
      value: dto.value,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
      category: dto.category ?? null,
    });
    const saved = await this.configRepository.save(config);

    await this.auditService.log({
      action: AuditActions.CONFIGURATION_UPDATED,
      actorUserId,
      resourceType: 'CONFIGURATION',
      resourceId: saved.id,
      metadata: { action: 'created', key: saved.key },
      severity: 'INFO',
    });

    return this.toDto(saved);
  }

  async findAll(filters: ListAppConfigsQuery = {}): Promise<ListAppConfigsResponse> {
    const qb = this.configRepository.createQueryBuilder('config');

    if (filters.category) {
      qb.andWhere('config.category = :category', { category: filters.category });
    }

    if (typeof filters.isActive === 'boolean') {
      qb.andWhere('config.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters.search) {
      qb.andWhere('(config.key ILIKE :search OR config.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy('config.createdAt', 'DESC');

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return {
      data: data.map((config) => this.toDto(config)),
      total,
      page,
      pageSize,
    };
  }

  async findByKey(key: string): Promise<AppConfigDto> {
    const config = await this.configRepository.findOne({ where: { key } });
    if (!config) {
      throw new NotFoundException('Configuration not found');
    }
    return this.toDto(config);
  }

  async findOne(id: string): Promise<AppConfigDto> {
    const config = await this.findOneEntity(id);
    return this.toDto(config);
  }

  async update(id: string, dto: UpdateAppConfigDto, actorUserId?: string): Promise<AppConfigDto> {
    const config = await this.findOneEntity(id);

    if (dto.key && dto.key !== config.key) {
      const existing = await this.configRepository.findOne({ where: { key: dto.key } });
      if (existing) {
        throw new ConflictException('Configuration key already exists');
      }
      config.key = dto.key;
    }

    if (dto.value !== undefined) {
      config.value = dto.value;
    }

    config.description = dto.description ?? config.description;
    config.category = dto.category ?? config.category;
    config.isActive = dto.isActive ?? config.isActive;

    const saved = await this.configRepository.save(config);

    await this.auditService.log({
      action: AuditActions.CONFIGURATION_UPDATED,
      actorUserId,
      resourceType: 'CONFIGURATION',
      resourceId: saved.id,
      metadata: { action: 'updated', key: saved.key },
      severity: 'INFO',
    });

    return this.toDto(saved);
  }

  async remove(id: string, actorUserId?: string): Promise<void> {
    const config = await this.findOneEntity(id);
    await this.configRepository.remove(config);

    await this.auditService.log({
      action: AuditActions.CONFIGURATION_UPDATED,
      actorUserId,
      resourceType: 'CONFIGURATION',
      resourceId: id,
      metadata: { action: 'deleted', key: config.key },
      severity: 'INFO',
    });
  }

  private async findOneEntity(id: string): Promise<AppConfig> {
    const config = await this.configRepository.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException('Configuration not found');
    }
    return config;
  }

  private toDto(config: AppConfig): AppConfigDto {
    return {
      id: config.id,
      key: config.key,
      value: config.value,
      description: config.description ?? null,
      isActive: config.isActive,
      category: config.category ?? null,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    };
  }
}
