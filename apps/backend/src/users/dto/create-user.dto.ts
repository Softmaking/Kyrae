import { AuthProvider, type CreateUserCommand } from '@kyrae/shared-contracts';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto implements CreateUserCommand {
  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  firstSurname!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  secondSurname?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK])$/, {
    message: 'rut must be a valid Chilean RUT',
  })
  rut?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(Object.values(AuthProvider))
  provider?: AuthProvider;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}
