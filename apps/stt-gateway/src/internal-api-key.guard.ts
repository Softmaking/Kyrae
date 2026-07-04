import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedApiKey = this.configService.get<string>('STT_GATEWAY_API_KEY');
    if (!expectedApiKey) {
      throw new UnauthorizedException('El servicio de transcripción no está protegido.');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (!this.matches(token, expectedApiKey)) {
      throw new UnauthorizedException('No autorizado.');
    }

    return true;
  }

  private matches(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);

    return (
      actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }
}
