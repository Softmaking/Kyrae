import type { AuthenticatedUserDto, LoginResponseDto } from '@kyrae/shared-contracts';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../audit/audit-actions.constants';
import { SecurityService } from '../security/security.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly securityService: SecurityService
  ) {}

  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const user = await this.usersService.findOneByEmail(email);

    if (!user) {
      const loginRisk = await this.getLoginFailureRiskSnapshot({ ipAddress });
      await this.auditService.log({
        action: AuditActions.AUTH_LOGIN_FAILED,
        resourceType: 'AUTH',
        metadata: {
          email,
          reason: 'user_not_found',
          ...loginRisk,
        },
        ipAddress,
        userAgent,
        severity: loginRisk.escalatedToCritical ? 'CRITICAL' : 'WARNING',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (this.securityService.isLocked(user.failedLoginAttempts, user.lockedUntil)) {
      const lockedRisk = await this.getLockedAttemptRiskSnapshot({
        actorUserId: user.id,
        ipAddress,
      });
      await this.auditService.log({
        action: AuditActions.AUTH_LOCKED_USER_LOGIN_ATTEMPT,
        actorUserId: user.id,
        resourceType: 'AUTH',
        metadata: {
          failedAttempts: user.failedLoginAttempts,
          ...lockedRisk,
        },
        ipAddress,
        userAgent,
        severity: lockedRisk.escalatedToCritical ? 'CRITICAL' : 'WARNING',
      });
      throw new UnauthorizedException('Account is locked. Try again later');
    }

    if (!user.isActive) {
      await this.auditService.log({
        action: AuditActions.AUTH_INACTIVE_USER_LOGIN_ATTEMPT,
        actorUserId: user.id,
        resourceType: 'AUTH',
        ipAddress,
        userAgent,
        severity: 'WARNING',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      const newAttempts = user.failedLoginAttempts + 1;
      let lockedUntil = user.lockedUntil;

      if (this.securityService.shouldLock(newAttempts)) {
        lockedUntil = this.securityService.getLockoutUntil();
      }

      await this.usersService.updateLoginSecurity(user.id, newAttempts, lockedUntil ?? null);

      const loginRisk = await this.getLoginFailureRiskSnapshot({
        actorUserId: user.id,
        ipAddress,
      });

      await this.auditService.log({
        action: AuditActions.AUTH_LOGIN_FAILED,
        actorUserId: user.id,
        resourceType: 'AUTH',
        metadata: {
          failedAttempts: newAttempts,
          locked: !!lockedUntil,
          ...loginRisk,
        },
        ipAddress,
        userAgent,
        severity: loginRisk.escalatedToCritical ? 'CRITICAL' : 'WARNING',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.updateLoginSecurity(user.id, 0, null);

    await this.auditService.log({
      action: AuditActions.AUTH_LOGIN_SUCCESS,
      actorUserId: user.id,
      resourceType: 'AUTH',
      ipAddress,
      userAgent,
      severity: 'INFO',
    });

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    const payload = await this.jwtService.verifyAsync<{ sub: string }>(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret_change_me',
    });

    const user = await this.usersService.findOneEntity(payload.sub);

    if (!user.isActive) {
      await this.auditService.log({
        action: AuditActions.AUTH_INACTIVE_USER_LOGIN_ATTEMPT,
        actorUserId: user.id,
        resourceType: 'AUTH',
        metadata: { reason: 'refresh_inactive_user' },
        severity: 'WARNING',
      });
      throw new UnauthorizedException('User is not allowed');
    }

    if (this.securityService.isLocked(user.failedLoginAttempts, user.lockedUntil)) {
      const lockedRisk = await this.getLockedAttemptRiskSnapshot({
        actorUserId: user.id,
        ipAddress,
      });
      await this.auditService.log({
        action: AuditActions.AUTH_LOCKED_USER_LOGIN_ATTEMPT,
        actorUserId: user.id,
        resourceType: 'AUTH',
        metadata: {
          reason: 'refresh_locked_user',
          failedAttempts: user.failedLoginAttempts,
          ...lockedRisk,
        },
        ipAddress,
        userAgent,
        severity: lockedRisk.escalatedToCritical ? 'CRITICAL' : 'WARNING',
      });
      throw new UnauthorizedException('User is not allowed');
    }

    if (!user.refreshTokenHash) {
      const invalidTokenRisk = await this.getInvalidTokenRiskSnapshot({
        actorUserId: user.id,
        ipAddress,
      });
      await this.auditService.log({
        action: AuditActions.AUTH_INVALID_TOKEN,
        actorUserId: user.id,
        resourceType: 'AUTH',
        metadata: {
          reason: 'token_revoked',
          ...invalidTokenRisk,
        },
        ipAddress,
        userAgent,
        severity: invalidTokenRisk.escalatedToCritical ? 'CRITICAL' : 'ERROR',
      });
      throw new UnauthorizedException('Refresh token was revoked');
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      const invalidTokenRisk = await this.getInvalidTokenRiskSnapshot({
        actorUserId: user.id,
        ipAddress,
      });
      await this.auditService.log({
        action: AuditActions.AUTH_INVALID_TOKEN,
        actorUserId: user.id,
        resourceType: 'AUTH',
        metadata: {
          reason: 'invalid_token',
          ...invalidTokenRisk,
        },
        ipAddress,
        userAgent,
        severity: invalidTokenRisk.escalatedToCritical ? 'CRITICAL' : 'ERROR',
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.auditService.log({
      action: AuditActions.AUTH_TOKEN_REFRESH,
      actorUserId: user.id,
      resourceType: 'AUTH',
      severity: 'INFO',
    });

    return this.issueTokens(user);
  }

  async logout(userId: string) {
    await this.usersService.setRefreshTokenHash(userId, null);
    await this.auditService.log({
      action: AuditActions.AUTH_LOGOUT,
      actorUserId: userId,
      resourceType: 'AUTH',
      severity: 'INFO',
    });
  }

  async getProfile(userId: string): Promise<AuthenticatedUserDto> {
    const user = await this.usersService.findOneEntity(userId);
    const permissions = user.roles.flatMap((role) =>
      role.permissions.map((permission) => permission.name)
    );

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      firstSurname: user.firstSurname,
      secondSurname: user.secondSurname ?? undefined,
      fullName: user.fullName,
      provider: user.provider,
      roles: user.roles.map((role) => role.name),
      permissions: Array.from(new Set(permissions)),
    };
  }

  private async issueTokens(user: User): Promise<LoginResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      provider: user.provider,
      roles: user.roles.map((role) => role.name),
      permissions: user.roles.flatMap((role) =>
        role.permissions.map((permission) => permission.name)
      ),
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET ?? 'dev_jwt_secret_change_me',
      expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 900),
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, jti: randomUUID() },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret_change_me',
        expiresIn: Number(process.env.JWT_REFRESH_EXPIRES_IN ?? 604800),
      }
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.setRefreshTokenHash(user.id, refreshTokenHash);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        firstSurname: user.firstSurname,
        secondSurname: user.secondSurname ?? undefined,
        fullName: user.fullName,
        provider: user.provider,
        roles: payload.roles,
        permissions: Array.from(new Set(payload.permissions)),
      },
    };
  }

  private async getLoginFailureRiskSnapshot(params: { actorUserId?: string; ipAddress?: string }) {
    const failuresWindowMinutes = this.securityService.getCriticalLoginFailuresWindowMinutes();
    const sprayWindowMinutes = this.securityService.getCriticalLoginSprayWindowMinutes();

    const recentFailuresFromIp = params.ipAddress
      ? await this.auditService.countRecentEvents({
          action: AuditActions.AUTH_LOGIN_FAILED,
          windowMinutes: failuresWindowMinutes,
          ipAddress: params.ipAddress,
        })
      : 0;

    const recentDistinctUsersFromIp = params.ipAddress
      ? await this.auditService.countDistinctRecentLoginIdentifiersByIp({
          action: AuditActions.AUTH_LOGIN_FAILED,
          windowMinutes: sprayWindowMinutes,
          ipAddress: params.ipAddress,
        })
      : 0;

    const escalatedToCritical = this.securityService.shouldEscalateLoginFailureToCritical({
      recentFailuresFromIp,
      recentDistinctUsersFromIp,
    });

    return {
      riskRule: escalatedToCritical ? 'login_failure_burst_or_spray' : 'none',
      escalatedToCritical,
      recentFailuresFromIp,
      recentDistinctUsersFromIp,
      failuresWindowMinutes,
      sprayWindowMinutes,
      actorUserId: params.actorUserId,
      ipAddress: params.ipAddress,
    };
  }

  private async getLockedAttemptRiskSnapshot(params: { actorUserId: string; ipAddress?: string }) {
    const windowMinutes = this.securityService.getCriticalLockedAttemptsWindowMinutes();

    const recentLockedAttempts = await this.auditService.countRecentEvents({
      action: AuditActions.AUTH_LOCKED_USER_LOGIN_ATTEMPT,
      windowMinutes,
      actorUserId: params.actorUserId,
      ipAddress: params.ipAddress,
    });

    const escalatedToCritical =
      this.securityService.shouldEscalateLockedAttemptToCritical(recentLockedAttempts);

    return {
      riskRule: escalatedToCritical ? 'locked_user_repeated_attempts' : 'none',
      escalatedToCritical,
      recentLockedAttempts,
      windowMinutes,
      actorUserId: params.actorUserId,
      ipAddress: params.ipAddress,
    };
  }

  private async getInvalidTokenRiskSnapshot(params: { actorUserId: string; ipAddress?: string }) {
    const windowMinutes = this.securityService.getCriticalInvalidTokenWindowMinutes();

    const recentInvalidTokens = await this.auditService.countRecentEvents({
      action: AuditActions.AUTH_INVALID_TOKEN,
      windowMinutes,
      actorUserId: params.actorUserId,
      ipAddress: params.ipAddress,
    });

    const escalatedToCritical =
      this.securityService.shouldEscalateInvalidTokenToCritical(recentInvalidTokens);

    return {
      riskRule: escalatedToCritical ? 'invalid_token_replay_pattern' : 'none',
      escalatedToCritical,
      recentInvalidTokens,
      windowMinutes,
      actorUserId: params.actorUserId,
      ipAddress: params.ipAddress,
    };
  }
}
