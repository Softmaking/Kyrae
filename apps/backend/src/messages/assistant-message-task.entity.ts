import type { AssistantChannel, AssistantTaskStatus } from '@kyrae/shared-contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('assistant_message_tasks')
export class AssistantMessageTask {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_assistant_message_tasks_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Index('idx_assistant_message_tasks_conversation_id')
  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

  @Column({ name: 'user_message_id', type: 'uuid' })
  userMessageId!: string;

  @Column({ name: 'assistant_message_id', type: 'uuid', nullable: true })
  assistantMessageId?: string | null;

  @Index('idx_assistant_message_tasks_status')
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: AssistantTaskStatus;

  @Column({ type: 'varchar', length: 30, default: 'web' })
  channel!: AssistantChannel;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
