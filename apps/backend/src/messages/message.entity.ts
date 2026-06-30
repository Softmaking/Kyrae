import type {
  AssistantChannel,
  AssistantMessageRole,
  AssistantMessageStatus,
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
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_messages_conversation_id')
  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

  @Column({ type: 'varchar', length: 20 })
  role!: AssistantMessageRole;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 20, default: 'completed' })
  status!: AssistantMessageStatus;

  @Column({ type: 'varchar', length: 30, default: 'web' })
  channel!: AssistantChannel;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation;

  @Index('idx_messages_created_at')
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
