import { type ListBranchesQuery } from '@kyrae/shared-contracts';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { AssignUserToBranchDto } from './dto/assign-user.dto';
import { BranchesService } from './branches.service';

@Controller('branches')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Permissions('BRANCHES_CREATE')
  create(@Body() dto: CreateBranchDto, @Req() req: Request & { user: JwtPayload }) {
    return this.branchesService.create(dto, req.user.sub);
  }

  @Get()
  @Permissions('BRANCHES_READ')
  findAll(@Query() query: ListBranchesQuery) {
    if (query.organizationId) {
      return this.branchesService.findByOrganization(query.organizationId);
    }
    return this.branchesService.findAll();
  }

  @Get(':id')
  @Permissions('BRANCHES_READ')
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Get(':id/users')
  @Permissions('BRANCHES_READ')
  getUsers(@Param('id') id: string) {
    return this.branchesService.getUsers(id);
  }

  @Patch(':id')
  @Permissions('BRANCHES_UPDATE')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @Req() req: Request & { user: JwtPayload }
  ) {
    return this.branchesService.update(id, dto, req.user.sub);
  }

  @Patch(':id/activate')
  @Permissions('BRANCHES_UPDATE')
  activate(@Param('id') id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.branchesService.activate(id, req.user.sub);
  }

  @Patch(':id/deactivate')
  @Permissions('BRANCHES_UPDATE')
  deactivate(@Param('id') id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.branchesService.deactivate(id, req.user.sub);
  }

  @Post(':id/users')
  @Permissions('BRANCHES_UPDATE')
  assignUser(
    @Param('id') id: string,
    @Body() dto: AssignUserToBranchDto,
    @Req() req: Request & { user: JwtPayload }
  ) {
    return this.branchesService.assignUser(id, dto.userId, req.user.sub);
  }

  @Delete(':id/users/:userId')
  @Permissions('BRANCHES_UPDATE')
  removeUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: Request & { user: JwtPayload }
  ) {
    return this.branchesService.removeUser(id, userId, req.user.sub);
  }

  @Delete(':id')
  @Permissions('BRANCHES_DELETE')
  remove(@Param('id') id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.branchesService.remove(id, req.user.sub);
  }
}
