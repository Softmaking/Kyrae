import type { AssignUserToOrganizationCommand } from '@kyrae/shared-contracts';
import { IsUUID } from 'class-validator';

export class AssignUserDto implements AssignUserToOrganizationCommand {
  @IsUUID('4')
  userId!: string;
}
