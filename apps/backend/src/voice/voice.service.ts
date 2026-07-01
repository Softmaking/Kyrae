import type { SendVoiceMessageResponse } from '@kyrae/shared-contracts';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Repository } from 'typeorm';
import { MessagesService } from '../messages/messages.service';
import { SendVoiceMessageDto } from './dto/send-voice-message.dto';
import { VoiceEvent } from './voice-event.entity';
import { VoiceSttService } from './voice-stt.service';
import type { UploadedVoiceFile } from './voice.types';

@Injectable()
export class VoiceService {
  private readonly supportedMimeTypes = new Set([
    'audio/webm',
    'audio/wav',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/x-m4a',
  ]);

  constructor(
    @InjectRepository(VoiceEvent)
    private readonly voiceEventRepository: Repository<VoiceEvent>,
    private readonly configService: ConfigService,
    private readonly messagesService: MessagesService,
    private readonly voiceSttService: VoiceSttService
  ) {}

  async sendVoiceMessage(params: {
    userId: string;
    dto: SendVoiceMessageDto;
    file?: UploadedVoiceFile;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<SendVoiceMessageResponse> {
    const file = params.file;
    if (!file) throw new BadRequestException('Debes enviar un archivo de audio.');

    this.validateFile(file);

    const channel = params.dto.channel ?? 'web';
    const tempPath = await this.writeTempFile(file);
    const startedAt = Date.now();
    const event = await this.voiceEventRepository.save(
      this.voiceEventRepository.create({
        userId: params.userId,
        sessionId: params.dto.sessionId ?? params.dto.conversationId ?? null,
        taskId: null,
        status: 'transcribing',
        audioMimeType: file.mimetype,
        audioSizeBytes: file.size,
        audioTempPath: tempPath,
        channel,
        sttProvider: this.configService.get<string>('VOICE_STT_MODE', 'mock'),
        metadata: { originalName: file.originalname },
      })
    );

    try {
      const transcription = await this.voiceSttService.transcribe({ file, tempPath });
      const task = await this.messagesService.createMessageTask({
        userId: params.userId,
        dto: {
          message: transcription.transcript,
          sessionId: params.dto.sessionId,
          conversationId: params.dto.conversationId,
          channel,
        },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });

      event.status = 'transcribed';
      event.transcript = transcription.transcript;
      event.language = transcription.language;
      event.confidence = transcription.confidence;
      event.sessionId = task.sessionId;
      event.taskId = task.id;
      event.durationMs = Date.now() - startedAt;
      event.sttProvider = transcription.provider;
      event.metadata = { ...(event.metadata ?? {}), ...(transcription.metadata ?? {}) };
      await this.voiceEventRepository.save(event);

      return {
        transcript: transcription.transcript,
        language: transcription.language,
        confidence: transcription.confidence,
        voiceEventId: event.id,
        task,
      };
    } catch (error) {
      event.status = 'failed';
      event.errorMessage =
        error instanceof Error ? error.message : 'No se pudo transcribir el audio.';
      event.durationMs = Date.now() - startedAt;
      await this.voiceEventRepository.save(event);
      throw error;
    } finally {
      await unlink(tempPath).catch(() => undefined);
    }
  }

  private validateFile(file: UploadedVoiceFile): void {
    const maxMb = Number(this.configService.get<string>('VOICE_MAX_AUDIO_MB', '10'));
    const maxBytes = Math.max(1, maxMb) * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException(`El audio no puede superar ${maxMb} MB.`);
    }

    if (!this.supportedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('El formato de audio no es compatible.');
    }
  }

  private async writeTempFile(file: UploadedVoiceFile): Promise<string> {
    const directory = join(tmpdir(), 'kyrae-voice');
    await mkdir(directory, { recursive: true });
    const tempPath = join(directory, `${randomUUID()}.webm`);
    await writeFile(tempPath, file.buffer);

    return tempPath;
  }
}
