import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { TranscriptionService, TranscriptionResponse } from './transcription.service';
import type { UploadedAudioFile } from './uploaded-audio-file';

@Controller()
export class TranscriptionController {
  constructor(
    private readonly transcriptionService: TranscriptionService,
    private readonly configService: ConfigService
  ) {}

  @Post('transcribe')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: Number(process.env.STT_MAX_AUDIO_MB ?? 10) * 1024 * 1024 },
    })
  )
  async transcribe(
    @UploadedFile() file: UploadedAudioFile | undefined
  ): Promise<TranscriptionResponse> {
    if (!file) throw new BadRequestException('Debes enviar un archivo de audio.');

    const maxMb = Number(this.configService.get<string>('STT_MAX_AUDIO_MB', '10'));
    if (file.size > Math.max(1, maxMb) * 1024 * 1024) {
      throw new BadRequestException(`El audio no puede superar ${maxMb} MB.`);
    }

    return this.transcriptionService.transcribe(file);
  }
}
