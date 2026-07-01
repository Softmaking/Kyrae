import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesModule } from '../messages/messages.module';
import { VoiceController } from './voice.controller';
import { VoiceEvent } from './voice-event.entity';
import { VoiceService } from './voice.service';
import { VoiceSttService } from './voice-stt.service';

@Module({
  imports: [TypeOrmModule.forFeature([VoiceEvent]), MessagesModule],
  controllers: [VoiceController],
  providers: [VoiceService, VoiceSttService],
})
export class VoiceModule {}
