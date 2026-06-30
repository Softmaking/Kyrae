import type {
  OpenClawRequest,
  OpenClawRequestStatus,
  OpenClawResponse,
} from '@kyrae/shared-contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('openclaw_requests')
export class OpenClawRequestTrace {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_openclaw_requests_session_id')
  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @Index('idx_openclaw_requests_message_id')
  @Column({ name: 'message_id', type: 'uuid' })
  messageId!: string;

  @Column({ name: 'request_payload', type: 'jsonb' })
  requestPayload!: OpenClawRequest;

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload?: OpenClawResponse | null;

  @Index('idx_openclaw_requests_status')
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: OpenClawRequestStatus;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
