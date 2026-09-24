import type { AgentApprovalCommand } from '@kyrae/shared-contracts';
import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class AgentApprovalDto implements AgentApprovalCommand {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
