import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions('USERS_CREATE')
  create(@Body() dto: CreateUserDto, @Req() req: Request & { user: JwtPayload }) {
    return this.usersService.create(dto, req.user.sub);
  }

  @Get()
  @Permissions('USERS_READ')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Permissions('USERS_READ')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Permissions('USERS_UPDATE')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request & { user: JwtPayload }
  ) {
    return this.usersService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @Permissions('USERS_DELETE')
  remove(@Param('id') id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.usersService.remove(id, req.user.sub);
  }
}
