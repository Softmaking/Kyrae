import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UploadedAudioFile } from './uploaded-audio-file';

export interface TranscriptionResponse {
  transcript: string;
  language: string | null;
  confidence: number | null;
  provider: string;
}

@Injectable()
export class TranscriptionService {
  constructor(private readonly configService: ConfigService) {}

  async transcribe(file: UploadedAudioFile): Promise<TranscriptionResponse> {
    const provider = this.configService.get<string>('STT_PROVIDER', 'openai');
    if (provider !== 'openai') {
      throw new BadRequestException(`Proveedor STT no soportado: ${provider}`);
    }

    return this.transcribeWithOpenAi(file);
  }

  private async transcribeWithOpenAi(file: UploadedAudioFile): Promise<TranscriptionResponse> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new BadRequestException('OPENAI_API_KEY no está configurada.');

    const timeoutMs = Number(this.configService.get<string>('OPENAI_TIMEOUT_MS', '60000'));
    const controller = new AbortController();
    const timeout = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const formData = new FormData();
      const audio = new ArrayBuffer(file.buffer.byteLength);
      new Uint8Array(audio).set(file.buffer);
      formData.append(
        'file',
        new Blob([audio], { type: file.mimetype || 'audio/webm' }),
        file.originalname || 'voice-message.webm'
      );
      formData.append(
        'model',
        this.configService.get<string>('OPENAI_TRANSCRIPTION_MODEL', 'whisper-1')
      );

      const language = this.configService.get<string>('OPENAI_TRANSCRIPTION_LANGUAGE');
      if (language) formData.append('language', language);

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BadGatewayException(await this.readOpenAiError(response));
      }

      const payload = (await response.json()) as { text?: unknown; language?: unknown };
      if (typeof payload.text !== 'string' || !payload.text.trim()) {
        throw new BadGatewayException('OpenAI no devolvió una transcripción válida.');
      }

      return {
        transcript: payload.text.trim(),
        language: typeof payload.language === 'string' ? payload.language : (language ?? null),
        confidence: null,
        provider: 'openai',
      };
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private async readOpenAiError(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as { error?: { message?: unknown } };
      if (typeof payload.error?.message === 'string') return payload.error.message;
    } catch {
      // Ignore parsing errors and return the generic status message below.
    }

    return `OpenAI rechazó la transcripción (${response.status}).`;
  }
}
