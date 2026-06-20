import { PartialType } from '@nestjs/swagger';
import type { UpdateAppConfigCommand } from '@kyrae/shared-contracts';
import { CreateAppConfigDto } from './create-app-config.dto';

export class UpdateAppConfigDto
  extends PartialType(CreateAppConfigDto)
  implements UpdateAppConfigCommand {}
