import type { AgentExecutionMode, AgentProviderType } from '@kyrae/shared-contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_agents_name', { unique: true })
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string | null;

  @Index('idx_agents_provider')
  @Column({ type: 'varchar', length: 30 })
  provider!: AgentProviderType;

  @Column({ name: 'provider_agent_id', type: 'varchar', length: 200, nullable: true })
  providerAgentId?: string | null;

  @Column({ name: 'default_execution_mode', type: 'varchar', length: 20, default: 'CHAT' })
  defaultExecutionMode!: AgentExecutionMode;

  @Column({ type: 'jsonb', nullable: true })
  configuration?: Record<string, unknown> | null;

  @Index('idx_agents_enabled')
  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
