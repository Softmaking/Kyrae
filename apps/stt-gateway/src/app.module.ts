import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { InternalApiKeyGuard } from './internal-api-key.guard';
import { TranscriptionController } from './transcription.controller';
import { TranscriptionService } from './transcription.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController, TranscriptionController],
  providers: [InternalApiKeyGuard, TranscriptionService],
})
export class AppModule {}
