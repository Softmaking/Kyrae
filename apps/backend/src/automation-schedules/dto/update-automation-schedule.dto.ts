import { PartialType } from '@nestjs/mapped-types';
import { CreateAutomationScheduleDto } from './create-automation-schedule.dto';

export class UpdateAutomationScheduleDto extends PartialType(CreateAutomationScheduleDto) {}
