import type { UpdateBranchCommand } from '@kyrae/shared-contracts';
import { PartialType } from '@nestjs/swagger';
import { CreateBranchDto } from './create-branch.dto';

export class UpdateBranchDto extends PartialType(CreateBranchDto) implements UpdateBranchCommand {
  organizationId?: never;
}
