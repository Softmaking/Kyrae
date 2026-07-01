import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import type { UploadedVoiceFile, VoiceTranscriptionResult } from './voice.types';

@Injectable()
export class VoiceSttService {
  constructor(private readonly configService: ConfigService) {}

  async transcribe(params: {
    file: UploadedVoiceFile;
    tempPath: string;
  }): Promise<VoiceTranscriptionResult> {
    const mode = this.configService.get<string>('VOICE_STT_MODE', 'mock');
    if (mode === 'http') return this.transcribeHttp(params);

    return {
      transcript: 'Mensaje de voz recibido por Kyrae.',
      language: 'es',
      confidence: 1,
      provider: 'mock',
      metadata: { fileName: params.file.originalname },
    };
  }

  private async transcribeHttp(params: {
    file: UploadedVoiceFile;
    tempPath: string;
  }): Promise<VoiceTranscriptionResult> {
    const baseUrl = this.configService.get<string>('VOICE_STT_BASE_URL');
    if (!baseUrl) {
      throw new BadGatewayException('El servicio de transcripción no está configurado.');
    }

    const timeoutMs = Number(this.configService.get<string>('VOICE_STT_TIMEOUT_MS', '30000'));
    const controller = new AbortController();
    const timeout = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const audio = await readFile(params.tempPath);
      const formData = new FormData();
      formData.append(
        'audio',
        new Blob([audio], { type: params.file.mimetype }),
        params.file.originalname || 'voice-message.webm'
      );

      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/transcribe`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BadGatewayException('El servicio de transcripción rechazó el audio.');
      }

      const payload = (await response.json()) as {
        transcript?: unknown;
        text?: unknown;
        language?: unknown;
        confidence?: unknown;
        metadata?: unknown;
      };
      const transcript = typeof payload.transcript === 'string' ? payload.transcript : payload.text;
      if (typeof transcript !== 'string' || !transcript.trim()) {
        throw new BadGatewayException('El servicio de transcripción no devolvió texto.');
      }

      return {
        transcript: transcript.trim(),
        language: typeof payload.language === 'string' ? payload.language : null,
        confidence: typeof payload.confidence === 'number' ? payload.confidence : null,
        provider: 'http',
        metadata:
          payload.metadata && typeof payload.metadata === 'object'
            ? (payload.metadata as Record<string, unknown>)
            : null,
      };
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
