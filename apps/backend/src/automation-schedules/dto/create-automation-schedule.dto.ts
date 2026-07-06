import type { CreateAutomationScheduleCommand } from '@kyrae/shared-contracts';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAutomationScheduleDto implements CreateAutomationScheduleCommand {
  @IsUUID()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  automationKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title!: string;

  @IsString()
  @IsNotEmpty()
  instruction!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  cronExpression!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
