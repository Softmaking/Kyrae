import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  BranchDto,
  BranchOrganizationSummaryDto,
  BranchUserDto,
  UserBranchDto,
} from '@kyrae/shared-contracts';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../audit/audit-actions.constants';
import { UserOrganization } from '../organizations/user-organization.entity';
import { User } from '../users/user.entity';
import { UserBranch } from './user-branch.entity';
import { Branch } from './branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(UserBranch)
    private readonly userBranchRepository: Repository<UserBranch>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService
  ) {}

  async create(dto: CreateBranchDto, actorUserId?: string): Promise<BranchDto> {
    const exists = await this.branchRepository.findOne({
      where: { organizationId: dto.organizationId, code: dto.code },
    });
    if (exists) {
      throw new ConflictException('Branch code already exists for this organization');
    }

    const branch = this.branchRepository.create({
      organizationId: dto.organizationId,
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.branchRepository.save(branch);

    await this.auditService.log({
      action: AuditActions.BRANCH_CREATED,
      actorUserId,
      resourceType: 'BRANCH',
      resourceId: saved.id,
      metadata: {
        code: saved.code,
        name: saved.name,
        organizationId: saved.organizationId,
      },
      severity: 'INFO',
    });

    return this.toBranchDto(saved);
  }

  async findAll(): Promise<BranchDto[]> {
    const branches = await this.branchRepository.find({ order: { createdAt: 'DESC' } });
    return branches.map((branch) => this.toBranchDto(branch));
  }

  async findByOrganization(organizationId: string): Promise<BranchDto[]> {
    const branches = await this.branchRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
    return branches.map((branch) => this.toBranchDto(branch));
  }

  private async findOneEntity(id: string): Promise<Branch> {
    const branch = await this.branchRepository.findOne({ where: { id } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return branch;
  }

  async findOne(id: string): Promise<BranchDto> {
    const branch = await this.findOneEntity(id);
    return this.toBranchDto(branch);
  }

  async update(id: string, dto: UpdateBranchDto, actorUserId?: string): Promise<BranchDto> {
    const branch = await this.findOneEntity(id);

    if (dto.code && dto.code !== branch.code) {
      const exists = await this.branchRepository.findOne({
        where: { organizationId: branch.organizationId, code: dto.code },
      });
      if (exists) {
        throw new ConflictException('Branch code already exists for this organization');
      }
      branch.code = dto.code;
    }

    branch.name = dto.name ?? branch.name;
    branch.description = dto.description ?? branch.description;

    const saved = await this.branchRepository.save(branch);

    await this.auditService.log({
      action: AuditActions.BRANCH_UPDATED,
      actorUserId,
      resourceType: 'BRANCH',
      resourceId: saved.id,
      severity: 'INFO',
    });

    return this.toBranchDto(saved);
  }

  async activate(id: string, actorUserId?: string): Promise<BranchDto> {
    const branch = await this.findOneEntity(id);
    branch.isActive = true;
    const saved = await this.branchRepository.save(branch);

    await this.auditService.log({
      action: AuditActions.BRANCH_ACTIVATED,
      actorUserId,
      resourceType: 'BRANCH',
      resourceId: saved.id,
      severity: 'INFO',
    });

    return this.toBranchDto(saved);
  }

  async deactivate(id: string, actorUserId?: string): Promise<BranchDto> {
    const branch = await this.findOneEntity(id);
    branch.isActive = false;
    const saved = await this.branchRepository.save(branch);

    await this.auditService.log({
      action: AuditActions.BRANCH_DEACTIVATED,
      actorUserId,
      resourceType: 'BRANCH',
      resourceId: saved.id,
      severity: 'INFO',
    });

    return this.toBranchDto(saved);
  }

  async remove(id: string, actorUserId?: string): Promise<void> {
    const branch = await this.findOneEntity(id);
    await this.branchRepository.remove(branch);

    await this.auditService.log({
      action: AuditActions.BRANCH_UPDATED,
      actorUserId,
      resourceType: 'BRANCH',
      resourceId: id,
      metadata: { action: 'deleted' },
      severity: 'INFO',
    });
  }

  async assignUser(branchId: string, userId: string, actorUserId?: string): Promise<UserBranchDto> {
    const branch = await this.findOneEntity(branchId);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userOrganization = await this.userOrganizationRepository.findOne({
      where: { userId, organizationId: branch.organizationId },
    });
    if (!userOrganization) {
      throw new ConflictException('User must be assigned to the branch organization first');
    }

    const existing = await this.userBranchRepository.findOne({
      where: { userId, branchId },
    });
    if (existing) {
      throw new ConflictException('User is already assigned to this branch');
    }

    const userBranch = this.userBranchRepository.create({ userId, branchId });
    const saved = await this.userBranchRepository.save(userBranch);

    await this.auditService.log({
      action: AuditActions.USER_ASSIGNED_TO_BRANCH,
      actorUserId,
      targetUserId: userId,
      resourceType: 'BRANCH',
      resourceId: branchId,
      metadata: { branchCode: branch.code },
      severity: 'INFO',
    });

    return { userId: saved.userId, branchId: saved.branchId };
  }

  async removeUser(branchId: string, userId: string, actorUserId?: string): Promise<void> {
    const userBranch = await this.userBranchRepository.findOne({
      where: { userId, branchId },
    });
    if (!userBranch) {
      throw new NotFoundException('User is not assigned to this branch');
    }
    await this.userBranchRepository.remove(userBranch);

    await this.auditService.log({
      action: AuditActions.USER_REMOVED_FROM_BRANCH,
      actorUserId,
      targetUserId: userId,
      resourceType: 'BRANCH',
      resourceId: branchId,
      severity: 'INFO',
    });
  }

  async getUsers(branchId: string): Promise<BranchUserDto[]> {
    await this.findOneEntity(branchId);
    const userBranches = await this.userBranchRepository.find({
      where: { branchId },
      relations: ['user', 'user.roles', 'user.roles.permissions'],
    });

    return userBranches.map((ub) => ({
      id: ub.user.id,
      email: ub.user.email,
      fullName: ub.user.fullName,
      isActive: ub.user.isActive,
      roles: ub.user.roles.map((role) => ({
        id: role.id,
        name: role.name,
      })),
    }));
  }

  private toBranchDto(branch: Branch): BranchDto {
    const organization: BranchOrganizationSummaryDto | undefined = branch.organization
      ? {
          id: branch.organization.id,
          code: branch.organization.code,
          name: branch.organization.name,
        }
      : undefined;

    return {
      id: branch.id,
      organizationId: branch.organizationId,
      code: branch.code,
      name: branch.name,
      description: branch.description ?? null,
      isActive: branch.isActive,
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString(),
      organization,
    };
  }
}
