import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AuditService } from './audit.service';
import { ListAuditEventsDto } from './dto/list-audit-events.dto';

@Controller('audit-events')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditEventsController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions('AUDIT_READ')
  async findAll(@Query() filters: ListAuditEventsDto) {
    return this.auditService.findAll(filters);
  }

  @Get(':id')
  @Permissions('AUDIT_READ')
  async findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }
}
