import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import type { CreateAssistantUploadBatchCommand } from '@kyrae/shared-contracts';
import type { Request, Response } from 'express';
import { pipeline } from 'node:stream/promises';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { AssistantAttachmentsService } from './assistant-attachments.service';
import { AttachmentMultipartService } from './attachment-multipart.service';
import { AssistantAttachmentDerivative } from './attachment.entities';
import { attachmentError } from './attachment.errors';

export class CreateUploadBatchDto implements CreateAssistantUploadBatchCommand {
  @IsUUID() clientBatchId!: string;
  @IsOptional() @IsUUID() sessionId?: string;
  @IsIn(['web', 'mobile']) channel!: 'web' | 'mobile';
}
export class AttachmentCapabilitiesQuery {
  @IsOptional() @IsUUID() sessionId?: string;
}
type AuthRequest = Request & { user: JwtPayload };

@ApiTags('Assistant attachments')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('ASSISTANT_CHAT_USE')
export class AssistantAttachmentsController {
  constructor(
    private readonly service: AssistantAttachmentsService,
    private readonly multipart: AttachmentMultipartService
  ) {}
  @Get('attachment-capabilities') async capabilities(
    @Req() req: AuthRequest,
    @Query() query: AttachmentCapabilitiesQuery
  ) {
    return (await this.service.resolve(req.user.sub, query.sessionId)).capabilities;
  }
  @Post('upload-batches') create(@Req() req: AuthRequest, @Body() dto: CreateUploadBatchDto) {
    return this.service.createBatch(req.user.sub, dto);
  }
  @Get('upload-batches/:id') batch(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.service.getBatch(id, req.user.sub);
  }
  @Post('upload-batches/:id/files') @ApiConsumes('multipart/form-data') upload(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.multipart.upload(req, id, req.user.sub);
  }
  @Delete('upload-batches/:id') cancel(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.service.remove(id, req.user.sub);
  }
  @Delete('upload-batches/:id/files/:attachmentId') remove(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) file: string
  ) {
    return this.service.remove(id, req.user.sub, file);
  }
  @Get('attachments/:id') descriptor(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.service.descriptor(id, req.user.sub);
  }
  @Get('attachments/:id/content') content(
    @Req() req: AuthRequest,
    @Res() res: Response,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.stream(req, res, id, false);
  }
  @Get('attachments/:id/thumbnail') thumbnail(
    @Req() req: AuthRequest,
    @Res() res: Response,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.stream(req, res, id, true);
  }

  private async stream(
    req: AuthRequest,
    res: Response,
    id: string,
    thumbnail: boolean
  ): Promise<void> {
    const f = await this.service.owned(id, req.user.sub);
    if (!['ready', 'attached'].includes(f.lifecycle)) throw attachmentError('ATTACHMENT_NOT_READY');
    const derivative = thumbnail
      ? await this.service.db.getRepository(AssistantAttachmentDerivative).findOneBy({
          attachment_id: id,
          processing_version: f.processing_version,
          kind: 'thumbnail',
        })
      : null;
    if (
      thumbnail &&
      (!derivative ||
        !['image/jpeg', 'image/png'].includes(derivative.media_type) ||
        Number(derivative.byte_size) > 131072)
    )
      throw attachmentError('ATTACHMENT_THUMBNAIL_UNAVAILABLE', 404, true);
    const file = await this.service.storage.open(derivative?.storage_key ?? f.original_key);
    const expected = Number(derivative?.byte_size ?? f.byte_size);
    if ((await file.stat()).size !== expected) {
      await file.close();
      throw attachmentError('ATTACHMENT_ORIGINAL_UNAVAILABLE', 503, true);
    }
    const source = file.createReadStream();
    res.setHeader('Content-Type', derivative?.media_type ?? 'application/octet-stream');
    res.setHeader('Content-Length', expected);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader(
      'Content-Disposition',
      `${thumbnail ? 'inline' : 'attachment'}; filename="download"; filename*=UTF-8''${encodeURIComponent(f.original_filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)}`
    );
    const timer = setInterval(() => {
      void this.service.access.assertCurrent(req.user.sub).catch(() => source.destroy());
    }, 5000);
    await this.service.auditEvent('ASSISTANT_ATTACHMENT_DOWNLOAD_STARTED', req.user.sub, id);
    try {
      await pipeline(source, res);
      await this.service.auditEvent('ASSISTANT_ATTACHMENT_DOWNLOAD_COMPLETED', req.user.sub, id);
    } catch {
      await this.service.auditEvent('ASSISTANT_ATTACHMENT_DOWNLOAD_ABORTED', req.user.sub, id);
    } finally {
      clearInterval(timer);
      source.destroy();
    }
  }
}
