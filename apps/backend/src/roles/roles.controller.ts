import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Permissions('ROLES_CREATE')
  create(@Body() dto: CreateRoleDto, @Req() req: Request & { user: JwtPayload }) {
    return this.rolesService.create(dto, req.user.sub);
  }

  @Get()
  @Permissions('ROLES_READ')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permissions('ROLES_READ')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @Permissions('ROLES_UPDATE')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: Request & { user: JwtPayload }
  ) {
    return this.rolesService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @Permissions('ROLES_DELETE')
  remove(@Param('id') id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.rolesService.remove(id, req.user.sub);
  }
}
