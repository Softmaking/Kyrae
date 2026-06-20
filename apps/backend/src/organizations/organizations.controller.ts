import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @Permissions('ORGANIZATIONS_CREATE')
  create(@Body() dto: CreateOrganizationDto, @Req() req: Request & { user: JwtPayload }) {
    return this.orgsService.create(dto, req.user.sub);
  }

  @Get()
  @Permissions('ORGANIZATIONS_READ')
  findAll() {
    return this.orgsService.findAll();
  }

  @Get(':id')
  @Permissions('ORGANIZATIONS_READ')
  findOne(@Param('id') id: string) {
    return this.orgsService.findOne(id);
  }

  @Get(':id/users')
  @Permissions('ORGANIZATIONS_READ')
  getUsers(@Param('id') id: string) {
    return this.orgsService.getUsers(id);
  }

  @Patch(':id')
  @Permissions('ORGANIZATIONS_UPDATE')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @Req() req: Request & { user: JwtPayload }
  ) {
    return this.orgsService.update(id, dto, req.user.sub);
  }

  @Patch(':id/activate')
  @Permissions('ORGANIZATIONS_UPDATE')
  activate(@Param('id') id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.orgsService.activate(id, req.user.sub);
  }

  @Patch(':id/deactivate')
  @Permissions('ORGANIZATIONS_UPDATE')
  deactivate(@Param('id') id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.orgsService.deactivate(id, req.user.sub);
  }

  @Post(':id/users')
  @Permissions('ORGANIZATIONS_UPDATE')
  assignUser(
    @Param('id') id: string,
    @Body() dto: AssignUserDto,
    @Req() req: Request & { user: JwtPayload }
  ) {
    return this.orgsService.assignUser(id, dto.userId, req.user.sub);
  }

  @Delete(':id/users/:userId')
  @Permissions('ORGANIZATIONS_UPDATE')
  removeUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: Request & { user: JwtPayload }
  ) {
    return this.orgsService.removeUser(id, userId, req.user.sub);
  }

  @Delete(':id')
  @Permissions('ORGANIZATIONS_DELETE')
  remove(@Param('id') id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.orgsService.remove(id, req.user.sub);
  }
}
