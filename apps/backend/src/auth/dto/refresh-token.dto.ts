import type { RefreshTokenCommand } from '@kyrae/shared-contracts';
import { IsString } from 'class-validator';

export class RefreshTokenDto implements RefreshTokenCommand {
  @IsString()
  refreshToken!: string;
}
