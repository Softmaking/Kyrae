import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  AgentProviderType,
  AssistantChannel,
  AssistantSessionStatus,
} from '@kyrae/shared-contracts';
import { User } from '../users/user.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_conversations_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title?: string | null;

  @Column({ type: 'varchar', length: 30, default: 'web' })
  channel!: AssistantChannel;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: AssistantSessionStatus;

  @Index('idx_conversations_agent_id')
  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agentId?: string | null;

  @Index('idx_conversations_provider')
  @Column({ type: 'varchar', length: 30, nullable: true })
  provider?: AgentProviderType | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => Message, (message) => message.conversation)
  messages!: Message[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
