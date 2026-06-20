import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class SecurityService {
  private readonly minLength: number;
  private readonly requireUppercase: boolean;
  private readonly requireLowercase: boolean;
  private readonly requireNumbers: boolean;
  private readonly requireSpecialChars: boolean;
  private readonly maxLoginAttempts: number;
  private readonly lockoutDurationMinutes: number;
  private readonly criticalLoginFailuresThreshold: number;
  private readonly criticalLoginFailuresWindowMinutes: number;
  private readonly criticalLoginSprayDistinctUsersThreshold: number;
  private readonly criticalLoginSprayWindowMinutes: number;
  private readonly criticalLockedAttemptsThreshold: number;
  private readonly criticalLockedAttemptsWindowMinutes: number;
  private readonly criticalInvalidTokenThreshold: number;
  private readonly criticalInvalidTokenWindowMinutes: number;

  constructor(private readonly configService: ConfigService) {
    this.minLength = parseInt(
      this.configService.get<string>('SECURITY_PASSWORD_MIN_LENGTH', '8'),
      10
    );
    this.requireUppercase =
      this.configService.get<string>('SECURITY_PASSWORD_REQUIRE_UPPERCASE', 'true') === 'true';
    this.requireLowercase =
      this.configService.get<string>('SECURITY_PASSWORD_REQUIRE_LOWERCASE', 'true') === 'true';
    this.requireNumbers =
      this.configService.get<string>('SECURITY_PASSWORD_REQUIRE_NUMBERS', 'true') === 'true';
    this.requireSpecialChars =
      this.configService.get<string>('SECURITY_PASSWORD_REQUIRE_SPECIAL', 'false') === 'true';
    this.maxLoginAttempts = parseInt(
      this.configService.get<string>('SECURITY_MAX_LOGIN_ATTEMPTS', '5'),
      10
    );
    this.lockoutDurationMinutes = parseInt(
      this.configService.get<string>('SECURITY_LOCKOUT_DURATION_MINUTES', '15'),
      10
    );
    this.criticalLoginFailuresThreshold = parseInt(
      this.configService.get<string>('SECURITY_CRITICAL_LOGIN_FAILURES_THRESHOLD', '10'),
      10
    );
    this.criticalLoginFailuresWindowMinutes = parseInt(
      this.configService.get<string>('SECURITY_CRITICAL_LOGIN_FAILURES_WINDOW_MINUTES', '5'),
      10
    );
    this.criticalLoginSprayDistinctUsersThreshold = parseInt(
      this.configService.get<string>('SECURITY_CRITICAL_LOGIN_SPRAY_DISTINCT_USERS_THRESHOLD', '5'),
      10
    );
    this.criticalLoginSprayWindowMinutes = parseInt(
      this.configService.get<string>('SECURITY_CRITICAL_LOGIN_SPRAY_WINDOW_MINUTES', '10'),
      10
    );
    this.criticalLockedAttemptsThreshold = parseInt(
      this.configService.get<string>('SECURITY_CRITICAL_LOCKED_ATTEMPTS_THRESHOLD', '5'),
      10
    );
    this.criticalLockedAttemptsWindowMinutes = parseInt(
      this.configService.get<string>('SECURITY_CRITICAL_LOCKED_ATTEMPTS_WINDOW_MINUTES', '10'),
      10
    );
    this.criticalInvalidTokenThreshold = parseInt(
      this.configService.get<string>('SECURITY_CRITICAL_INVALID_TOKEN_THRESHOLD', '8'),
      10
    );
    this.criticalInvalidTokenWindowMinutes = parseInt(
      this.configService.get<string>('SECURITY_CRITICAL_INVALID_TOKEN_WINDOW_MINUTES', '5'),
      10
    );
  }

  validatePassword(password: string): PasswordPolicyResult {
    const errors: string[] = [];

    if (password.length < this.minLength) {
      errors.push(`Password must be at least ${this.minLength} characters long`);
    }
    if (this.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (this.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (this.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (this.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
  }

  isLocked(failedAttempts: number, lockedUntil: Date | null | undefined): boolean {
    if (lockedUntil && new Date() < lockedUntil) {
      return true;
    }
    return false;
  }

  shouldLock(failedAttempts: number): boolean {
    return failedAttempts >= this.maxLoginAttempts;
  }

  getLockoutUntil(): Date {
    const now = new Date();
    return new Date(now.getTime() + this.lockoutDurationMinutes * 60 * 1000);
  }

  getMaxLoginAttempts(): number {
    return this.maxLoginAttempts;
  }

  getLockoutDurationMinutes(): number {
    return this.lockoutDurationMinutes;
  }

  getCriticalLoginFailuresWindowMinutes(): number {
    return this.criticalLoginFailuresWindowMinutes;
  }

  getCriticalLoginSprayWindowMinutes(): number {
    return this.criticalLoginSprayWindowMinutes;
  }

  getCriticalLockedAttemptsWindowMinutes(): number {
    return this.criticalLockedAttemptsWindowMinutes;
  }

  getCriticalInvalidTokenWindowMinutes(): number {
    return this.criticalInvalidTokenWindowMinutes;
  }

  shouldEscalateLoginFailureToCritical(params: {
    recentFailuresFromIp: number;
    recentDistinctUsersFromIp: number;
  }): boolean {
    return (
      params.recentFailuresFromIp >= this.criticalLoginFailuresThreshold ||
      params.recentDistinctUsersFromIp >= this.criticalLoginSprayDistinctUsersThreshold
    );
  }

  shouldEscalateLockedAttemptToCritical(recentLockedAttempts: number): boolean {
    return recentLockedAttempts >= this.criticalLockedAttemptsThreshold;
  }

  shouldEscalateInvalidTokenToCritical(recentInvalidTokens: number): boolean {
    return recentInvalidTokens >= this.criticalInvalidTokenThreshold;
  }
}
