import type { AssistantChannel, SendAssistantMessageCommand } from '@kyrae/shared-contracts';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto implements SendAssistantMessageCommand {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsUUID('4')
  sessionId?: string;

  @IsOptional()
  @IsUUID('4')
  conversationId?: string;

  @IsOptional()
  @IsIn(['web', 'mobile', 'whatsapp', 'telegram', 'local_voice'])
  channel?: AssistantChannel;
}
