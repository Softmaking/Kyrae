import type { CreateAutomationScheduleCommand, NotifyMode } from '@kyrae/shared-contracts';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAutomationScheduleDto implements CreateAutomationScheduleCommand {
  @IsOptional()
  @IsUUID()
  userId?: string;

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

  @IsOptional()
  @IsString()
  @IsIn(['always', 'on_content', 'silent'])
  notifyMode?: NotifyMode;
}
