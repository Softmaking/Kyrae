import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { RoleDto } from '@kyrae/shared-contracts';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../audit/audit-actions.constants';
import { Permission } from '../permissions/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    private readonly auditService: AuditService
  ) {}

  async create(dto: CreateRoleDto, actorUserId?: string): Promise<RoleDto> {
    const exists = await this.rolesRepository.findOne({
      where: { name: dto.name },
    });
    if (exists) {
      throw new ConflictException('Role name already exists');
    }

    const role = this.rolesRepository.create({
      name: dto.name,
      description: dto.description,
      permissions: dto.permissionIds?.length ? await this.findPermissions(dto.permissionIds) : [],
    });

    const saved = await this.rolesRepository.save(role);

    await this.auditService.log({
      action: AuditActions.ROLE_CREATED,
      actorUserId,
      resourceType: 'ROLE',
      resourceId: saved.id,
      metadata: { name: saved.name },
      severity: 'INFO',
    });

    return this.toRoleDto(saved);
  }

  async findAll(): Promise<RoleDto[]> {
    const roles = await this.rolesRepository.find({ order: { createdAt: 'DESC' } });
    return roles.map((role) => this.toRoleDto(role));
  }

  private async findOneEntity(id: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async findOne(id: string): Promise<RoleDto> {
    return this.toRoleDto(await this.findOneEntity(id));
  }

  async update(id: string, dto: UpdateRoleDto, actorUserId?: string): Promise<RoleDto> {
    const role = await this.findOneEntity(id);

    if (dto.name && dto.name !== role.name) {
      const exists = await this.rolesRepository.findOne({
        where: { name: dto.name },
      });
      if (exists) {
        throw new ConflictException('Role name already exists');
      }
    }

    role.name = dto.name ?? role.name;
    role.description = dto.description ?? role.description;

    if (dto.permissionIds) {
      role.permissions = await this.findPermissions(dto.permissionIds);
    }

    const saved = await this.rolesRepository.save(role);

    await this.auditService.log({
      action: AuditActions.ROLE_UPDATED,
      actorUserId,
      resourceType: 'ROLE',
      resourceId: saved.id,
      severity: 'INFO',
    });

    return this.toRoleDto(saved);
  }

  async remove(id: string, actorUserId?: string): Promise<void> {
    const role = await this.findOneEntity(id);
    await this.rolesRepository.remove(role);

    await this.auditService.log({
      action: AuditActions.ROLE_UPDATED,
      actorUserId,
      resourceType: 'ROLE',
      resourceId: id,
      metadata: { action: 'deleted' },
      severity: 'INFO',
    });
  }

  private async findPermissions(permissionIds: string[]): Promise<Permission[]> {
    const permissions = await this.permissionsRepository.findBy({
      id: In(permissionIds),
    });
    if (permissions.length !== permissionIds.length) {
      throw new NotFoundException('One or more permissions were not found');
    }
    return permissions;
  }

  private toRoleDto(role: Role): RoleDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description ?? null,
      permissions: role.permissions.map((p) => ({ id: p.id, name: p.name })),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }
}
