import type { UpdateOrganizationCommand } from '@kyrae/shared-contracts';
import { PartialType } from '@nestjs/swagger';
import { CreateOrganizationDto } from './create-organization.dto';

export class UpdateOrganizationDto
  extends PartialType(CreateOrganizationDto)
  implements UpdateOrganizationCommand {}
