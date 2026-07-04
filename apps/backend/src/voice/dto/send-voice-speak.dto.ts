import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { AssistantChannel } from '@kyrae/shared-contracts';

export class SendVoiceSpeakDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  text!: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  messageId?: string;

  @IsOptional()
  @IsIn(['web', 'mobile'])
  channel?: AssistantChannel;
}
