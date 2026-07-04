import type { AssistantChannel, AssistantRealtimeStatus } from '@kyrae/shared-contracts';
import { BadGatewayException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessagesGateway } from '../messages/messages.gateway';
import { SendVoiceSpeakDto } from './dto/send-voice-speak.dto';
import { VoiceEvent } from './voice-event.entity';

export interface VoiceSpeakResult {
  audio: Buffer;
  audioMimeType: string;
  voiceEventId: string;
  provider: string;
}

@Injectable()
export class TtsService {
  constructor(
    @InjectRepository(VoiceEvent)
    private readonly voiceEventRepository: Repository<VoiceEvent>,
    private readonly configService: ConfigService,
    private readonly messagesGateway: MessagesGateway
  ) {}

  async speak(params: { userId: string; dto: SendVoiceSpeakDto }): Promise<VoiceSpeakResult> {
    const text = params.dto.text.trim();
    const channel = params.dto.channel ?? 'web';
    const provider = this.configService.get<string>('VOICE_TTS_MODE', 'mock');
    const startedAt = Date.now();
    const event = await this.voiceEventRepository.save(
      this.voiceEventRepository.create({
        userId: params.userId,
        sessionId: params.dto.sessionId ?? null,
        taskId: null,
        status: 'synthesizing',
        transcript: text,
        channel,
        sttProvider: provider,
        metadata: {
          direction: 'output',
          kind: 'tts',
          messageId: params.dto.messageId ?? null,
          ttsProvider: provider,
        },
      })
    );

    this.emitVoiceEvent('voice.synthesizing', {
      sessionId: params.dto.sessionId,
      messageId: params.dto.messageId ?? null,
      status: 'synthesizing',
      channel,
      voiceEventId: event.id,
    });

    try {
      const result = await this.synthesize(text);
      event.status = 'ready';
      event.audioMimeType = result.audioMimeType;
      event.audioSizeBytes = result.audio.length;
      event.durationMs = Date.now() - startedAt;
      event.metadata = {
        ...(event.metadata ?? {}),
        audioMimeType: result.audioMimeType,
        audioSizeBytes: result.audio.length,
      };
      await this.voiceEventRepository.save(event);

      this.emitVoiceEvent('voice.ready', {
        sessionId: params.dto.sessionId,
        messageId: params.dto.messageId ?? null,
        status: 'ready',
        channel,
        voiceEventId: event.id,
      });

      return { ...result, voiceEventId: event.id, provider };
    } catch (error) {
      event.status = 'failed';
      event.errorMessage = error instanceof Error ? error.message : 'No se pudo generar voz.';
      event.durationMs = Date.now() - startedAt;
      await this.voiceEventRepository.save(event);

      this.emitVoiceEvent('voice.failed', {
        sessionId: params.dto.sessionId,
        messageId: params.dto.messageId ?? null,
        status: 'failed',
        channel,
        voiceEventId: event.id,
        errorMessage: event.errorMessage,
      });

      throw error;
    }
  }

  private async synthesize(text: string): Promise<{ audio: Buffer; audioMimeType: string }> {
    const mode = this.configService.get<string>('VOICE_TTS_MODE', 'mock');
    if (mode === 'mock') return this.synthesizeMock(text);
    if (mode === 'elevenlabs') return this.synthesizeElevenLabs(text);

    throw new InternalServerErrorException('El motor TTS configurado no está disponible.');
  }

  private synthesizeMock(text: string): { audio: Buffer; audioMimeType: string } {
    return {
      audio: this.createMockWav(text),
      audioMimeType: 'audio/wav',
    };
  }

  private async synthesizeElevenLabs(
    text: string
  ): Promise<{ audio: Buffer; audioMimeType: string }> {
    const apiKey = this.configService.get<string>('VOICE_TTS_API_KEY');
    const voiceId = this.configService.get<string>('VOICE_TTS_VOICE_ID');
    if (!apiKey || !voiceId) {
      throw new BadGatewayException('La configuración de ElevenLabs no está completa.');
    }

    const modelId = this.configService.get<string>('VOICE_TTS_MODEL', 'eleven_multilingual_v2');
    const timeoutMs = Number(this.configService.get<string>('VOICE_TTS_TIMEOUT_MS', '30000'));
    const controller = new AbortController();
    const timeout = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BadGatewayException(await this.readElevenLabsError(response));
      }

      return {
        audio: Buffer.from(await response.arrayBuffer()),
        audioMimeType: response.headers.get('content-type') ?? 'audio/mpeg',
      };
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private async readElevenLabsError(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (
        payload.detail &&
        typeof payload.detail === 'object' &&
        'message' in payload.detail &&
        typeof payload.detail.message === 'string'
      ) {
        return payload.detail.message;
      }
    } catch {
      // Ignore parsing errors and return the generic status message below.
    }

    return `ElevenLabs rechazó la síntesis de voz (${response.status}).`;
  }

  private createMockWav(text: string): Buffer {
    const sampleRate = 16000;
    const durationSeconds = Math.min(3, Math.max(0.6, text.length / 120));
    const sampleCount = Math.floor(sampleRate * durationSeconds);
    const dataSize = sampleCount * 2;
    const buffer = Buffer.alloc(44 + dataSize);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    for (let index = 0; index < sampleCount; index += 1) {
      const sample = Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 0.2;
      buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
    }

    return buffer;
  }

  private emitVoiceEvent(
    eventName: 'voice.synthesizing' | 'voice.ready' | 'voice.failed',
    params: {
      sessionId?: string;
      messageId: string | null;
      status: AssistantRealtimeStatus;
      channel: AssistantChannel;
      voiceEventId: string;
      errorMessage?: string | null;
    }
  ): void {
    if (!params.sessionId) return;

    this.messagesGateway.emitToSession(eventName, {
      sessionId: params.sessionId,
      taskId: null,
      messageId: params.messageId,
      role: 'assistant',
      status: params.status,
      content: null,
      errorMessage: params.errorMessage ?? null,
      metadata: {
        channel: params.channel,
        voiceEventId: params.voiceEventId,
      },
      createdAt: new Date().toISOString(),
    });
  }
}
