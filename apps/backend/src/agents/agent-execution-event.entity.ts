import type { AgentStreamEventType } from '@kyrae/shared-contracts';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('agent_execution_events')
@Index('idx_agent_execution_events_execution_id', ['executionId'])
@Index('idx_agent_execution_events_execution_sequence', ['executionId', 'sequence'], {
  unique: true,
})
export class AgentExecutionEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'execution_id', type: 'uuid' })
  executionId!: string;

  @Column({ type: 'varchar', length: 40 })
  type!: AgentStreamEventType;

  @Column({ type: 'integer' })
  sequence!: number;

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
