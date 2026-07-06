import type {
  OpenClawAutomationEventType,
  OpenClawAutomationSeverity,
  OpenClawAutomationSessionStrategy,
} from '@kyrae/shared-contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Conversation } from '../messages/conversation.entity';
import { Message } from '../messages/message.entity';
import { User } from '../users/user.entity';

@Entity('openclaw_events')
export class OpenClawEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_openclaw_events_event_id', { unique: true })
  @Column({ name: 'event_id', type: 'varchar', length: 180 })
  eventId!: string;

  @Index('idx_openclaw_events_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Index('idx_openclaw_events_session_id')
  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId!: string;

  @Column({ type: 'varchar', length: 40 })
  type!: OpenClawAutomationEventType;

  @Index('idx_openclaw_events_automation_key')
  @Column({ name: 'automation_key', type: 'varchar', length: 120 })
  automationKey!: string;

  @Column({ name: 'automation_title', type: 'varchar', length: 180 })
  automationTitle!: string;

  @Column({ type: 'varchar', length: 10, default: 'INFO' })
  severity!: OpenClawAutomationSeverity;

  @Column({
    name: 'session_strategy',
    type: 'varchar',
    length: 40,
    default: 'user_automation_inbox',
  })
  sessionStrategy!: OpenClawAutomationSessionStrategy;

  @Column({ name: 'external_run_id', type: 'varchar', length: 180, nullable: true })
  externalRunId?: string | null;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ name: 'occurred_at', type: 'timestamp' })
  occurredAt!: Date;

  @Column({ name: 'processed_at', type: 'timestamp' })
  processedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: Conversation;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message!: Message;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
