import type { SendVoiceMessageResponse } from '@kyrae/shared-contracts';
import {
  Body,
  Controller,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { SendVoiceMessageDto } from './dto/send-voice-message.dto';
import { SendVoiceSpeakDto } from './dto/send-voice-speak.dto';
import { TtsService } from './tts.service';
import { VoiceService } from './voice.service';
import type { UploadedVoiceFile } from './voice.types';

@Controller('voice')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VoiceController {
  constructor(
    private readonly voiceService: VoiceService,
    private readonly ttsService: TtsService
  ) {}

  @Post('messages')
  @Permissions('ASSISTANT_VOICE_USE')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: Number(process.env.VOICE_MAX_AUDIO_MB ?? 10) * 1024 * 1024 },
    })
  )
  sendVoiceMessage(
    @Body() dto: SendVoiceMessageDto,
    @UploadedFile() file: UploadedVoiceFile | undefined,
    @Req() req: Request & { user: JwtPayload }
  ): Promise<SendVoiceMessageResponse> {
    return this.voiceService.sendVoiceMessage({
      userId: req.user.sub,
      dto,
      file,
      ipAddress: req.ip ?? req.socket.remoteAddress,
      userAgent: Array.isArray(req.headers['user-agent'])
        ? req.headers['user-agent'].join(', ')
        : req.headers['user-agent'],
    });
  }

  @Post('speak')
  @Permissions('ASSISTANT_VOICE_OUTPUT_USE')
  async speak(
    @Body() dto: SendVoiceSpeakDto,
    @Req() req: Request & { user: JwtPayload }
  ): Promise<StreamableFile> {
    const result = await this.ttsService.speak({ userId: req.user.sub, dto });

    return new StreamableFile(result.audio, {
      type: result.audioMimeType,
      disposition: `inline; filename="kyrae-voice-${result.voiceEventId}.wav"`,
    });
  }
}
