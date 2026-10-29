import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  AgentProviderType,
  AttachmentCategory,
  AttachmentCoverageDto,
  AttachmentErrorCode,
  AttachmentLifecycle,
  AttachmentProcessingStatus,
  AssistantContextManifestDto,
  AssistantOutputMetadata,
} from '@kyrae/shared-contracts';

abstract class AttachmentRecord {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @CreateDateColumn({ type: 'timestamptz' }) created_at!: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at!: Date;
}

@Entity('assistant_upload_batches')
export class AssistantUploadBatch extends AttachmentRecord {
  @Column('uuid') owner_id!: string;
  @Column('uuid', { nullable: true }) target_conversation_id!: string | null;
  @Column('varchar') channel!: 'web' | 'mobile';
  @Column('uuid') client_batch_id!: string;
  @Column('varchar') state!: 'open' | 'consumed' | 'cancelled' | 'expired';
  @Column('timestamptz') expires_at!: Date;
  @Column('int', { default: 0 }) reserved_count!: number;
  @Column('bigint', { default: 0 }) reserved_bytes!: string;
  @Column('uuid') agent_id!: string;
  @Column('varchar') provider!: AgentProviderType;
  @Column('text', { nullable: true }) profile_version!: string | null;
}

@Entity('assistant_attachments')
export class AssistantAttachment extends AttachmentRecord {
  @Column('uuid') owner_id!: string;
  @Column('uuid') batch_id!: string;
  @Column('uuid', { nullable: true }) conversation_id!: string | null;
  @Column('uuid', { nullable: true }) message_id!: string | null;
  @Column('int', { nullable: true }) ordinal!: number | null;
  @Column('uuid') client_file_id!: string;
  @Column('varchar', { length: 255 }) original_filename!: string;
  @Column('bigint') byte_size!: string;
  @Column('text', { nullable: true }) media_type!: string | null;
  @Column('text', { nullable: true }) category!: AttachmentCategory | null;
  @Column('text') original_key!: string;
  @Column('text', { nullable: true }) sha256!: string | null;
  @Column('varchar') lifecycle!: AttachmentLifecycle;
  @Column('varchar') processing_status!: AttachmentProcessingStatus;
  @Column('int', { default: 1 }) processing_version!: number;
  @Column('text', { nullable: true }) error_code!: AttachmentErrorCode | null;
  @Column('text', { nullable: true }) error_message!: string | null;
  @Column('jsonb', { nullable: true }) coverage!: AttachmentCoverageDto | null;
  @Column('timestamptz', { nullable: true }) upload_lease_until!: Date | null;
  @Column('uuid', { nullable: true }) upload_generation!: string | null;
}

@Entity('assistant_attachment_derivatives')
export class AssistantAttachmentDerivative {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') attachment_id!: string;
  @Column('int') processing_version!: number;
  @Column('varchar') kind!: 'text' | 'image' | 'thumbnail';
  @Column('int', { default: 0 }) part_index!: number;
  @Column('text') storage_key!: string;
  @Column('bigint') byte_size!: string;
  @Column('text') media_type!: string;
  @Column('text') sha256!: string;
  @Column('jsonb') metadata!: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) created_at!: Date;
}

@Entity('assistant_attachment_jobs')
export class AssistantAttachmentJob extends AttachmentRecord {
  @Column('varchar') kind!: 'process' | 'dispatch' | 'delete';
  @Column('uuid', { nullable: true }) attachment_id!: string | null;
  @Column('uuid', { nullable: true }) task_id!: string | null;
  @Column('varchar') state!: 'pending' | 'running' | 'completed' | 'failed';
  @Column('int', { default: 0 }) attempts!: number;
  @Column('timestamptz') next_run_at!: Date;
  @Column('text', { nullable: true }) lease_owner!: string | null;
  @Column('timestamptz', { nullable: true }) lease_until!: Date | null;
  @Column('int', { default: 0 }) generation!: number;
  @Column('text', { nullable: true }) error_code!: string | null;
}

@Entity('assistant_message_submissions')
export class AssistantMessageSubmission {
  @PrimaryColumn('uuid') owner_id!: string;
  @PrimaryColumn('uuid') client_message_id!: string;
  @Column('text') fingerprint!: string;
  @Column('uuid') conversation_id!: string;
  @Column('uuid') message_id!: string;
  @Column('uuid') task_id!: string;
  @CreateDateColumn({ type: 'timestamptz' }) created_at!: Date;
}

@Entity('assistant_message_contexts')
export class AssistantMessageContext extends AttachmentRecord {
  @Column('uuid', { unique: true }) task_id!: string;
  @Column('uuid') message_id!: string;
  @Column('jsonb', { nullable: true }) manifest!: AssistantContextManifestDto | null;
  @Column('jsonb', { nullable: true }) output_metadata!: AssistantOutputMetadata | null;
  @Column('varchar') state!:
    'pending' | 'prepared' | 'dispatching' | 'delivered' | 'failed' | 'indeterminate';
}

export const ATTACHMENT_ENTITIES = [
  AssistantUploadBatch,
  AssistantAttachment,
  AssistantAttachmentDerivative,
  AssistantAttachmentJob,
  AssistantMessageSubmission,
  AssistantMessageContext,
];
