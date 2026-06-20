import { IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import type { CreateRoleCommand } from '@kyrae/shared-contracts';

export class CreateRoleDto implements CreateRoleCommand {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}
