import type { HealthResponseDto, ReadinessResponseDto } from '@kyrae/shared-contracts';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): HealthResponseDto {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async getReadiness(): Promise<ReadinessResponseDto> {
    const database = await this.healthService.isDatabaseReady();

    if (!database) {
      throw new ServiceUnavailableException({
        status: 'error',
        checks: { database: 'down' },
      });
    }

    return {
      status: 'ok',
      checks: { database: 'up' },
      timestamp: new Date().toISOString(),
    };
  }
}
