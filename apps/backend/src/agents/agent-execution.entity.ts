import type {
  AgentExecutionMode,
  AgentExecutionStatus,
  AgentProviderType,
} from '@kyrae/shared-contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('agent_executions')
@Index('idx_agent_executions_conversation_id', ['conversationId'])
@Index('idx_agent_executions_agent_id', ['agentId'])
@Index('idx_agent_executions_provider_run_id', ['providerRunId'])
@Index('idx_agent_executions_status', ['status'])
@Index('idx_agent_executions_created_at', ['createdAt'])
export class AgentExecution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_agent_executions_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

  @Column({ name: 'agent_id', type: 'uuid' })
  agentId!: string;

  @Column({ type: 'varchar', length: 30 })
  provider!: AgentProviderType;

  @Column({ name: 'execution_mode', type: 'varchar', length: 20 })
  executionMode!: AgentExecutionMode;

  @Column({ name: 'provider_run_id', type: 'varchar', length: 200, nullable: true })
  providerRunId?: string | null;

  @Column({ type: 'varchar', length: 30, default: 'PENDING' })
  status!: AgentExecutionStatus;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt?: Date | null;

  @Column({ name: 'error_code', type: 'varchar', length: 80, nullable: true })
  errorCode?: string | null;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
