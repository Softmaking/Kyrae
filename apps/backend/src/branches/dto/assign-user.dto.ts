import type { AssignUserToBranchCommand } from '@kyrae/shared-contracts';
import { IsUUID } from 'class-validator';

export class AssignUserToBranchDto implements AssignUserToBranchCommand {
  @IsUUID('4')
  userId!: string;
}
