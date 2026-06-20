import type { AppConfigValue, CreateAppConfigCommand } from '@kyrae/shared-contracts';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAppConfigDto implements CreateAppConfigCommand {
  @IsString()
  @MaxLength(100)
  key!: string;

  @IsNotEmpty()
  value!: AppConfigValue;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;
}
