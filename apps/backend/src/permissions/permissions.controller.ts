import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @Permissions('PERMISSIONS_CREATE')
  create(@Body() dto: CreatePermissionDto, @Req() req: Request & { user: JwtPayload }) {
    return this.permissionsService.create(dto, req.user.sub);
  }

  @Get()
  @Permissions('PERMISSIONS_READ')
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @Permissions('PERMISSIONS_READ')
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('PERMISSIONS_UPDATE')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
    @Req() req: Request & { user: JwtPayload }
  ) {
    return this.permissionsService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @Permissions('PERMISSIONS_DELETE')
  remove(@Param('id') id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.permissionsService.remove(id, req.user.sub);
  }
}
