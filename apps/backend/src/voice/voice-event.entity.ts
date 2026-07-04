import type { AssistantChannel, VoiceEventStatus } from '@kyrae/shared-contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('voice_events')
export class VoiceEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId!: string | null;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId!: string | null;

  @Column({ type: 'varchar', length: 30 })
  status!: VoiceEventStatus;

  @Column({ type: 'text', nullable: true })
  transcript!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  language!: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 4, nullable: true })
  confidence!: number | null;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'audio_mime_type', type: 'varchar', length: 100, nullable: true })
  audioMimeType!: string | null;

  @Column({ name: 'audio_size_bytes', type: 'int', nullable: true })
  audioSizeBytes!: number | null;

  @Column({ name: 'audio_temp_path', type: 'varchar', length: 500, nullable: true })
  audioTempPath!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'web' })
  channel!: AssistantChannel;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs!: number | null;

  @Column({ name: 'stt_provider', type: 'varchar', length: 50, nullable: true })
  sttProvider!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
