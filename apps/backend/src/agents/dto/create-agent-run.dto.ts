import type { CreateAgentRunCommand } from '@kyrae/shared-contracts';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateAgentRunDto implements CreateAgentRunCommand {
  @IsString()
  @MinLength(1)
  @MaxLength(12000)
  input!: string;

  @IsUUID('4')
  conversationId!: string;

  @IsOptional()
  @IsUUID('4')
  agentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  instructions?: string;
}
