import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  OrganizationDto,
  OrganizationUserDto,
  UserOrganizationDto,
} from '@kyrae/shared-contracts';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../audit/audit-actions.constants';
import { User } from '../users/user.entity';
import { UserOrganization } from './user-organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepository: Repository<UserOrganization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService
  ) {}

  async create(dto: CreateOrganizationDto, actorUserId?: string): Promise<OrganizationDto> {
    const exists = await this.orgRepository.findOne({
      where: { code: dto.code },
    });
    if (exists) {
      throw new ConflictException('Organization code already exists');
    }

    const org = this.orgRepository.create({
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.orgRepository.save(org);

    await this.auditService.log({
      action: AuditActions.ORGANIZATION_CREATED,
      actorUserId,
      resourceType: 'ORGANIZATION',
      resourceId: saved.id,
      metadata: { code: saved.code, name: saved.name },
      severity: 'INFO',
    });

    return this.toOrganizationDto(saved);
  }

  async findAll(): Promise<OrganizationDto[]> {
    const organizations = await this.orgRepository.find({ order: { createdAt: 'DESC' } });
    return organizations.map((organization) => this.toOrganizationDto(organization));
  }

  private async findOneEntity(id: string): Promise<Organization> {
    const org = await this.orgRepository.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async findOne(id: string): Promise<OrganizationDto> {
    const organization = await this.findOneEntity(id);
    return this.toOrganizationDto(organization);
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
    actorUserId?: string
  ): Promise<OrganizationDto> {
    const org = await this.findOneEntity(id);

    if (dto.code && dto.code !== org.code) {
      const exists = await this.orgRepository.findOne({
        where: { code: dto.code },
      });
      if (exists) {
        throw new ConflictException('Organization code already exists');
      }
      org.code = dto.code;
    }

    org.name = dto.name ?? org.name;
    org.description = dto.description ?? org.description;

    const saved = await this.orgRepository.save(org);

    await this.auditService.log({
      action: AuditActions.ORGANIZATION_UPDATED,
      actorUserId,
      resourceType: 'ORGANIZATION',
      resourceId: saved.id,
      severity: 'INFO',
    });

    return this.toOrganizationDto(saved);
  }

  async activate(id: string, actorUserId?: string): Promise<OrganizationDto> {
    const org = await this.findOneEntity(id);
    org.isActive = true;
    const saved = await this.orgRepository.save(org);

    await this.auditService.log({
      action: AuditActions.ORGANIZATION_ACTIVATED,
      actorUserId,
      resourceType: 'ORGANIZATION',
      resourceId: saved.id,
      severity: 'INFO',
    });

    return this.toOrganizationDto(saved);
  }

  async deactivate(id: string, actorUserId?: string): Promise<OrganizationDto> {
    const org = await this.findOneEntity(id);
    org.isActive = false;
    const saved = await this.orgRepository.save(org);

    await this.auditService.log({
      action: AuditActions.ORGANIZATION_DEACTIVATED,
      actorUserId,
      resourceType: 'ORGANIZATION',
      resourceId: saved.id,
      severity: 'INFO',
    });

    return this.toOrganizationDto(saved);
  }

  async remove(id: string, actorUserId?: string): Promise<void> {
    const org = await this.findOneEntity(id);
    await this.orgRepository.remove(org);

    await this.auditService.log({
      action: AuditActions.ORGANIZATION_UPDATED,
      actorUserId,
      resourceType: 'ORGANIZATION',
      resourceId: id,
      metadata: { action: 'deleted' },
      severity: 'INFO',
    });
  }

  async assignUser(
    organizationId: string,
    userId: string,
    actorUserId?: string
  ): Promise<UserOrganizationDto> {
    const org = await this.findOneEntity(organizationId);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.userOrgRepository.findOne({
      where: { userId, organizationId },
    });
    if (existing) {
      throw new ConflictException('User is already assigned to this organization');
    }

    const userOrg = this.userOrgRepository.create({ userId, organizationId });
    const saved = await this.userOrgRepository.save(userOrg);

    await this.auditService.log({
      action: AuditActions.USER_ASSIGNED_TO_ORGANIZATION,
      actorUserId,
      targetUserId: userId,
      resourceType: 'ORGANIZATION',
      resourceId: organizationId,
      metadata: { organizationCode: org.code },
      severity: 'INFO',
    });

    return { userId: saved.userId, organizationId: saved.organizationId };
  }

  async removeUser(organizationId: string, userId: string, actorUserId?: string): Promise<void> {
    const userOrg = await this.userOrgRepository.findOne({
      where: { userId, organizationId },
    });
    if (!userOrg) {
      throw new NotFoundException('User is not assigned to this organization');
    }
    await this.userOrgRepository.remove(userOrg);

    await this.auditService.log({
      action: AuditActions.USER_REMOVED_FROM_ORGANIZATION,
      actorUserId,
      targetUserId: userId,
      resourceType: 'ORGANIZATION',
      resourceId: organizationId,
      severity: 'INFO',
    });
  }

  async getUsers(organizationId: string): Promise<OrganizationUserDto[]> {
    await this.findOneEntity(organizationId);
    const userOrgs = await this.userOrgRepository.find({
      where: { organizationId },
      relations: { user: { roles: { permissions: true } } },
    });
    return userOrgs.map((uo) => ({
      id: uo.user.id,
      email: uo.user.email,
      fullName: uo.user.fullName,
      isActive: uo.user.isActive,
      roles: uo.user.roles.map((role) => ({
        id: role.id,
        name: role.name,
      })),
    }));
  }

  private toOrganizationDto(organization: Organization): OrganizationDto {
    return {
      id: organization.id,
      code: organization.code,
      name: organization.name,
      description: organization.description ?? null,
      isActive: organization.isActive,
      createdAt: organization.createdAt.toISOString(),
      updatedAt: organization.updatedAt.toISOString(),
    };
  }
}
