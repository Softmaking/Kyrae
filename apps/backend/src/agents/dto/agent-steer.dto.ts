import type { AgentSteerCommand } from '@kyrae/shared-contracts';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AgentSteerDto implements AgentSteerCommand {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  instruction!: string;
}
