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
import { ConfigurationService } from './configuration.service';
import { CreateAppConfigDto } from './dto/create-app-config.dto';
import { ListAppConfigsDto } from './dto/list-app-configs.dto';
import { UpdateAppConfigDto } from './dto/update-app-config.dto';

@Controller('configuration')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConfigurationController {
  constructor(private readonly configurationService: ConfigurationService) {}

  @Post()
  @Permissions('CONFIGURATION_CREATE')
  create(@Body() dto: CreateAppConfigDto, @Req() req: Request & { user: JwtPayload }) {
    return this.configurationService.create(dto, req.user.sub);
  }

  @Get()
  @Permissions('CONFIGURATION_READ')
  findAll(@Query() query: ListAppConfigsDto) {
    return this.configurationService.findAll(query);
  }

  @Get('key/:key')
  @Permissions('CONFIGURATION_READ')
  findByKey(@Param('key') key: string) {
    return this.configurationService.findByKey(key);
  }

  @Get(':id')
  @Permissions('CONFIGURATION_READ')
  findOne(@Param('id') id: string) {
    return this.configurationService.findOne(id);
  }

  @Patch(':id')
  @Permissions('CONFIGURATION_UPDATE')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAppConfigDto,
    @Req() req: Request & { user: JwtPayload }
  ) {
    return this.configurationService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @Permissions('CONFIGURATION_DELETE')
  remove(@Param('id') id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.configurationService.remove(id, req.user.sub);
  }
}
