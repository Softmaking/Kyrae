import type { SendAssistantMessageResponse } from '@kyrae/shared-contracts';
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @Permissions('ASSISTANT_CHAT_USE')
  sendMessage(
    @Body() dto: SendMessageDto,
    @Req() req: Request & { user: JwtPayload }
  ): Promise<SendAssistantMessageResponse> {
    return this.messagesService.sendMessage({
      userId: req.user.sub,
      dto,
      ipAddress: req.ip ?? req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  }
}
