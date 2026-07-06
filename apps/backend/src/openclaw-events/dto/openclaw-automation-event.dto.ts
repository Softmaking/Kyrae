import type {
  OpenClawAutomationEventCommand,
  OpenClawAutomationEventType,
  OpenClawAutomationSeverity,
  OpenClawAutomationSessionStrategy,
} from '@kyrae/shared-contracts';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const eventTypes: OpenClawAutomationEventType[] = [
  'automation.started',
  'automation.completed',
  'automation.failed',
];

const severities: OpenClawAutomationSeverity[] = ['INFO', 'WARN', 'ERROR'];

const sessionStrategies: OpenClawAutomationSessionStrategy[] = [
  'user_automation_inbox',
  'automation_key',
];

export class OpenClawAutomationEventDto implements OpenClawAutomationEventCommand {
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  eventId!: string;

  @IsIn(eventTypes)
  type!: OpenClawAutomationEventType;

  @IsUUID()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  automationKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsIn(severities)
  severity?: OpenClawAutomationSeverity;

  @IsOptional()
  @IsIn(sessionStrategies)
  sessionStrategy?: OpenClawAutomationSessionStrategy;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  externalRunId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  createdAt?: string;
}
