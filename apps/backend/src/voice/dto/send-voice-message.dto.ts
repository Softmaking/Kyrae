import { IsIn, IsOptional, IsUUID } from 'class-validator';
import type { AssistantChannel } from '@kyrae/shared-contracts';

export class SendVoiceMessageDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsOptional()
  @IsIn(['web', 'mobile'])
  channel?: AssistantChannel;
}
