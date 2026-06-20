import { IsOptional, IsString, MaxLength } from 'class-validator';
import type { CreatePermissionCommand } from '@kyrae/shared-contracts';

export class CreatePermissionDto implements CreatePermissionCommand {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
