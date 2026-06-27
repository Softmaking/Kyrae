import type {
  ListAssistantSessionMessagesResponse,
  ListAssistantSessionsResponse,
} from '@kyrae/shared-contracts';
import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { MessagesService } from './messages.service';

@Controller('sessions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SessionsController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @Permissions('ASSISTANT_CHAT_USE')
  findSessions(
    @Req() req: Request & { user: JwtPayload },
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string
  ): Promise<ListAssistantSessionsResponse> {
    return this.messagesService.findSessions(req.user.sub, { limit, cursor });
  }

  @Get(':id/messages')
  @Permissions('ASSISTANT_CHAT_USE')
  findSessionMessages(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtPayload }
  ): Promise<ListAssistantSessionMessagesResponse> {
    return this.messagesService.findSessionMessages(id, req.user.sub);
  }
}
