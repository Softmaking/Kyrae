import type { AssistantChannel, SendAssistantMessageCommand } from '@kyrae/shared-contracts';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class SendMessageDto implements SendAssistantMessageCommand {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  @Matches(/\S/)
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

  @IsOptional() @IsUUID() uploadBatchId?: string;
  @IsOptional() @IsUUID() clientMessageId?: string;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  attachmentIds?: string[];
}
