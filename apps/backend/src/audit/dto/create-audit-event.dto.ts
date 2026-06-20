import type { AuditSeverity, CreateAuditEventCommand } from '@kyrae/shared-contracts';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAuditEventDto implements CreateAuditEventCommand {
  @IsString()
  @MaxLength(80)
  action!: string;

  @IsOptional()
  @IsUUID('4')
  actorUserId?: string;

  @IsOptional()
  @IsUUID('4')
  targetUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  resourceType?: string;

  @IsOptional()
  @IsUUID('4')
  resourceId?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(45)
  ipAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;

  @IsOptional()
  @IsEnum(['INFO', 'WARNING', 'ERROR', 'CRITICAL'])
  severity?: AuditSeverity;
}
