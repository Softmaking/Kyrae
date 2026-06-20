import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { PermissionDto } from '@kyrae/shared-contracts';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../audit/audit-actions.constants';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Permission } from './permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    private readonly auditService: AuditService
  ) {}

  async create(dto: CreatePermissionDto, actorUserId?: string): Promise<PermissionDto> {
    const exists = await this.permissionsRepository.findOne({
      where: { name: dto.name },
    });
    if (exists) {
      throw new ConflictException('Permission name already exists');
    }
    const saved = await this.permissionsRepository.save(this.permissionsRepository.create(dto));

    await this.auditService.log({
      action: AuditActions.PERMISSION_CREATED,
      actorUserId,
      resourceType: 'PERMISSION',
      resourceId: saved.id,
      metadata: { name: saved.name },
      severity: 'INFO',
    });

    return this.toPermissionDto(saved);
  }

  async findAll(): Promise<PermissionDto[]> {
    const permissions = await this.permissionsRepository.find({ order: { createdAt: 'DESC' } });
    return permissions.map((p) => this.toPermissionDto(p));
  }

  private async findOneEntity(id: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    return permission;
  }

  async findOne(id: string): Promise<PermissionDto> {
    return this.toPermissionDto(await this.findOneEntity(id));
  }

  async update(id: string, dto: UpdatePermissionDto, actorUserId?: string): Promise<PermissionDto> {
    const permission = await this.findOneEntity(id);

    if (dto.name && dto.name !== permission.name) {
      const exists = await this.permissionsRepository.findOne({
        where: { name: dto.name },
      });
      if (exists) {
        throw new ConflictException('Permission name already exists');
      }
    }

    Object.assign(permission, dto);
    const saved = await this.permissionsRepository.save(permission);

    await this.auditService.log({
      action: AuditActions.PERMISSION_UPDATED,
      actorUserId,
      resourceType: 'PERMISSION',
      resourceId: saved.id,
      severity: 'INFO',
    });

    return this.toPermissionDto(saved);
  }

  async remove(id: string, actorUserId?: string): Promise<void> {
    const permission = await this.findOneEntity(id);
    await this.permissionsRepository.remove(permission);

    await this.auditService.log({
      action: AuditActions.PERMISSION_UPDATED,
      actorUserId,
      resourceType: 'PERMISSION',
      resourceId: id,
      metadata: { action: 'deleted' },
      severity: 'INFO',
    });
  }

  private toPermissionDto(permission: Permission): PermissionDto {
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description ?? null,
      createdAt: permission.createdAt.toISOString(),
      updatedAt: permission.updatedAt.toISOString(),
    };
  }
}
