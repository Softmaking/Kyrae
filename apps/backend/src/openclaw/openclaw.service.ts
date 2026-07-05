import type { OpenClawRequest, OpenClawResponse } from '@kyrae/shared-contracts';
import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenClawService {
  constructor(private readonly configService: ConfigService) {}

  async sendMessage(request: OpenClawRequest): Promise<OpenClawResponse> {
    const mode = this.configService.get<string>('OPENCLAW_MODE', 'mock');

    if (mode === 'http') {
      return this.sendHttpMessage(request);
    }

    return {
      message: `Kyrae recibió tu mensaje: "${request.message}".`,
      requestId: `mock-${Date.now()}`,
      metadata: { mode: 'mock' },
    };
  }

  private async sendHttpMessage(request: OpenClawRequest): Promise<OpenClawResponse> {
    const baseUrl = this.configService.get<string>('OPENCLAW_BASE_URL');
    if (!baseUrl) {
      throw new ServiceUnavailableException('Kyrae no está configurado correctamente.');
    }

    const timeoutMs = Number(this.configService.get<string>('OPENCLAW_TIMEOUT_MS', '10000'));
    const controller = timeoutMs > 0 ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const apiKey = this.configService.get<string>('OPENCLAW_API_KEY');
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (apiKey) headers.authorization = `Bearer ${apiKey}`;

      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller?.signal,
      });

      if (!response.ok) {
        throw new BadGatewayException('Kyrae no pudo procesar la solicitud.');
      }

      const body = (await response.json()) as Partial<OpenClawResponse> & { success?: boolean };
      if (body.success === false) {
        throw new BadGatewayException('Kyrae no pudo procesar la solicitud.');
      }

      if (!body.message || typeof body.message !== 'string') {
        throw new BadGatewayException('Kyrae devolvió una respuesta inválida.');
      }

      return {
        message: body.message,
        requestId: body.requestId,
        metadata: body.metadata,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException('Kyrae tardó demasiado en responder.');
      }
      throw new ServiceUnavailableException('Kyrae no está disponible en este momento.');
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
