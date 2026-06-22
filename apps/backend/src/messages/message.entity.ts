import type { AssistantChannel, AssistantMessageRole } from '@kyrae/shared-contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
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

  @Column({ type: 'varchar', length: 30, default: 'web' })
  channel!: AssistantChannel;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  conversation!: Conversation;

  @Index('idx_messages_created_at')
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
