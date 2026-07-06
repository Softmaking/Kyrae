import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { AutomationSchedulesService } from './automation-schedules.service';
import { CreateAutomationScheduleDto } from './dto/create-automation-schedule.dto';
import { ListAutomationSchedulesDto } from './dto/list-automation-schedules.dto';
import { UpdateAutomationScheduleDto } from './dto/update-automation-schedule.dto';

@Controller('automation-schedules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AutomationSchedulesController {
  constructor(private readonly service: AutomationSchedulesService) {}

  @Post()
  @Permissions('AUTOMATION_CREATE')
  create(@Body() dto: CreateAutomationScheduleDto, @Req() req: Request & { user: JwtPayload }) {
    return this.service.create(dto, req.user.sub);
  }

  @Get()
  @Permissions('AUTOMATION_READ')
  findAll(@Query() query: ListAutomationSchedulesDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Permissions('AUTOMATION_READ')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Permissions('AUTOMATION_UPDATE')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAutomationScheduleDto,
    @Req() req: Request & { user: JwtPayload }
  ) {
    return this.service.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @Permissions('AUTOMATION_DELETE')
  remove(@Param('id') id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.service.remove(id, req.user.sub);
  }
}
