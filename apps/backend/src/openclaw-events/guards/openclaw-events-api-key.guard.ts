import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class OpenClawEventsApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedApiKey = this.configService.get<string>('OPENCLAW_EVENTS_API_KEY');
    if (!expectedApiKey) {
      throw new ServiceUnavailableException('OpenClaw events API key is not configured.');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing OpenClaw events credentials.');
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (token !== expectedApiKey) {
      throw new UnauthorizedException('Invalid OpenClaw events credentials.');
    }

    return true;
  }
}
