import type { UserDto } from '@kyrae/shared-contracts';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../audit/audit-actions.constants';
import { normalizeRut, validateRut } from '../common/utils/rut-utils';
import { Role } from '../roles/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly auditService: AuditService
  ) {}

  async create(dto: CreateUserDto, actorUserId?: string): Promise<UserDto> {
    const exists = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('User email already exists');
    }

    let normalizedRut: string | undefined;
    if (dto.rut) {
      normalizedRut = normalizeRut(dto.rut);
      if (!validateRut(normalizedRut)) {
        throw new ConflictException('Invalid RUT check digit');
      }
      await this.checkRutUniqueness(normalizedRut);
    }

    const user = this.usersRepository.create({
      email: dto.email.toLowerCase(),
      firstName: dto.firstName,
      firstSurname: dto.firstSurname,
      secondSurname: dto.secondSurname ?? null,
      rut: normalizedRut ?? null,
      passwordHash: await bcrypt.hash(dto.password, 10),
      isActive: dto.isActive ?? true,
      provider: dto.provider ?? 'LOCAL',
      roles: dto.roleIds?.length ? await this.findRoles(dto.roleIds) : [],
    });

    const saved = await this.usersRepository.save(user);

    await this.auditService.log({
      action: AuditActions.USER_CREATED,
      actorUserId,
      targetUserId: saved.id,
      resourceType: 'USER',
      resourceId: saved.id,
      metadata: { email: saved.email },
      severity: 'INFO',
    });

    return this.toDto(saved);
  }

  async findAll(): Promise<UserDto[]> {
    const users = await this.usersRepository.find({ order: { createdAt: 'DESC' } });
    return users.map((user) => this.toDto(user));
  }

  async findOne(id: string): Promise<UserDto> {
    return this.toDto(await this.findOneEntity(id));
  }

  async findOneEntity(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async update(id: string, dto: UpdateUserDto, actorUserId?: string): Promise<UserDto> {
    const user = await this.findOneEntity(id);

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const exists = await this.usersRepository.findOne({
        where: { email: dto.email.toLowerCase() },
      });
      if (exists) {
        throw new ConflictException('User email already exists');
      }
      user.email = dto.email.toLowerCase();
    }

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName;
    }
    if (dto.firstSurname !== undefined) {
      user.firstSurname = dto.firstSurname;
    }
    if (dto.secondSurname !== undefined) {
      user.secondSurname = dto.secondSurname;
    }

    if (dto.rut !== undefined) {
      if (dto.rut) {
        const normalizedRut = normalizeRut(dto.rut);
        if (!validateRut(normalizedRut)) {
          throw new ConflictException('Invalid RUT check digit');
        }
        if (normalizedRut !== user.rut) {
          await this.checkRutUniqueness(normalizedRut, id);
        }
        user.rut = normalizedRut;
      } else {
        user.rut = null;
      }
    }

    if (dto.isActive !== undefined && dto.isActive !== user.isActive) {
      const action = dto.isActive ? AuditActions.USER_ACTIVATED : AuditActions.USER_DEACTIVATED;
      await this.auditService.log({
        action,
        actorUserId,
        targetUserId: user.id,
        resourceType: 'USER',
        resourceId: user.id,
        severity: 'INFO',
      });
    }
    user.isActive = dto.isActive ?? user.isActive;
    user.provider = dto.provider ?? user.provider;

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.roleIds) {
      user.roles = await this.findRoles(dto.roleIds);
    }

    const saved = await this.usersRepository.save(user);

    await this.auditService.log({
      action: AuditActions.USER_UPDATED,
      actorUserId,
      targetUserId: saved.id,
      resourceType: 'USER',
      resourceId: saved.id,
      severity: 'INFO',
    });

    return this.toDto(saved);
  }

  async updateLoginSecurity(
    userId: string,
    failedAttempts: number,
    lockedUntil: Date | null
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      failedLoginAttempts: failedAttempts,
      lockedUntil,
    });

    if (lockedUntil) {
      await this.auditService.log({
        action: AuditActions.USER_LOCKED,
        targetUserId: userId,
        resourceType: 'USER',
        resourceId: userId,
        metadata: { failedAttempts },
        severity: 'WARNING',
      });
    }
  }

  async setRefreshTokenHash(userId: string, refreshTokenHash: string | null): Promise<void> {
    await this.usersRepository.update(userId, { refreshTokenHash });
  }

  async remove(id: string, actorUserId?: string): Promise<void> {
    const user = await this.findOneEntity(id);
    await this.usersRepository.remove(user);

    await this.auditService.log({
      action: AuditActions.USER_UPDATED,
      actorUserId,
      targetUserId: id,
      resourceType: 'USER',
      resourceId: id,
      metadata: { action: 'deleted' },
      severity: 'INFO',
    });
  }

  private async checkRutUniqueness(rut: string, excludeId?: string): Promise<void> {
    const existing = await this.usersRepository.findOne({
      where: { rut },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('RUT already exists');
    }
  }

  private async findRoles(roleIds: string[]): Promise<Role[]> {
    const roles = await this.rolesRepository.findBy({ id: In(roleIds) });
    if (roles.length !== roleIds.length) {
      throw new NotFoundException('One or more roles were not found');
    }
    return roles;
  }

  private toDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      firstSurname: user.firstSurname,
      secondSurname: user.secondSurname ?? undefined,
      rut: user.rut ?? undefined,
      fullName: user.fullName,
      isActive: user.isActive,
      provider: user.provider,
      roles: user.roles.map((role) => ({ id: role.id, name: role.name })),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
