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
      message: `OpenClaw mock response: received "${request.message}".`,
      requestId: `mock-${Date.now()}`,
      metadata: { mode: 'mock' },
    };
  }

  private async sendHttpMessage(request: OpenClawRequest): Promise<OpenClawResponse> {
    const baseUrl = this.configService.get<string>('OPENCLAW_BASE_URL');
    if (!baseUrl) {
      throw new ServiceUnavailableException('OpenClaw HTTP mode requires OPENCLAW_BASE_URL');
    }

    const timeoutMs = Number(this.configService.get<string>('OPENCLAW_TIMEOUT_MS', '10000'));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BadGatewayException(`OpenClaw request failed with status ${response.status}`);
      }

      const body = (await response.json()) as Partial<OpenClawResponse>;
      if (!body.message || typeof body.message !== 'string') {
        throw new BadGatewayException('OpenClaw returned an invalid response');
      }

      return {
        message: body.message,
        requestId: body.requestId,
        metadata: body.metadata,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException('OpenClaw request timed out');
      }
      throw new ServiceUnavailableException('OpenClaw service is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }
}
