import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistantAttachments1716090000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE conversations ADD CONSTRAINT uq_attachment_conversation_owner UNIQUE(id,user_id);
      ALTER TABLE messages ADD CONSTRAINT uq_attachment_message_conversation UNIQUE(id,conversation_id);
      CREATE TABLE assistant_upload_batches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        target_conversation_id uuid, channel varchar(30) NOT NULL CHECK(channel IN ('web','mobile')),
        client_batch_id uuid NOT NULL, state varchar(20) NOT NULL DEFAULT 'open' CHECK(state IN ('open','consumed','cancelled','expired')),
        expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
        reserved_count int NOT NULL DEFAULT 0 CHECK(reserved_count BETWEEN 0 AND 5),
        reserved_bytes bigint NOT NULL DEFAULT 0 CHECK(reserved_bytes BETWEEN 0 AND 104857600),
        agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE RESTRICT, provider varchar(30) NOT NULL CHECK(provider IN ('HERMES','OPENCLAW')),
        profile_version text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(owner_id,client_batch_id), UNIQUE(id,owner_id),
        FOREIGN KEY(target_conversation_id,owner_id) REFERENCES conversations(id,user_id) ON DELETE RESTRICT
      );
      CREATE TABLE assistant_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        batch_id uuid NOT NULL, conversation_id uuid, message_id uuid, ordinal int CHECK(ordinal BETWEEN 0 AND 4),
        client_file_id uuid NOT NULL, original_filename varchar(255) NOT NULL CHECK(octet_length(original_filename) BETWEEN 1 AND 255),
        byte_size bigint NOT NULL DEFAULT 0 CHECK(byte_size BETWEEN 0 AND 20971520), media_type text, category text,
        original_key text NOT NULL UNIQUE CHECK(original_key ~ '^[0-9a-f-]{36}$'), sha256 text,
        lifecycle varchar(20) NOT NULL CHECK(lifecycle IN ('uploading','ready','attached','deleting','expired')),
        processing_status varchar(20) NOT NULL DEFAULT 'pending' CHECK(processing_status IN ('pending','processing','usable','partial','failed')),
        processing_version int NOT NULL DEFAULT 1 CHECK(processing_version>0), error_code text, error_message text, coverage jsonb,
        upload_lease_until timestamptz, upload_generation uuid,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(batch_id,client_file_id), UNIQUE(message_id,ordinal),
        FOREIGN KEY(batch_id,owner_id) REFERENCES assistant_upload_batches(id,owner_id) ON DELETE RESTRICT,
        FOREIGN KEY(conversation_id,owner_id) REFERENCES conversations(id,user_id) ON DELETE RESTRICT,
        FOREIGN KEY(message_id,conversation_id) REFERENCES messages(id,conversation_id) ON DELETE RESTRICT,
        CHECK((message_id IS NULL AND conversation_id IS NULL AND ordinal IS NULL) OR (message_id IS NOT NULL AND conversation_id IS NOT NULL AND ordinal IS NOT NULL)),
        CHECK(lifecycle <> 'attached' OR message_id IS NOT NULL)
      );
      CREATE TABLE assistant_attachment_derivatives (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attachment_id uuid NOT NULL REFERENCES assistant_attachments(id) ON DELETE RESTRICT,
        processing_version int NOT NULL CHECK(processing_version>0), kind varchar(20) NOT NULL CHECK(kind IN ('text','image','thumbnail')),
        part_index int NOT NULL DEFAULT 0 CHECK(part_index>=0), storage_key text NOT NULL UNIQUE CHECK(storage_key ~ '^[0-9a-f-]{36}$'),
        byte_size bigint NOT NULL CHECK(byte_size>=0), media_type text NOT NULL, sha256 text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(attachment_id,processing_version,kind,part_index)
      );
      CREATE TABLE assistant_attachment_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind varchar(20) NOT NULL CHECK(kind IN ('process','dispatch','delete')),
        attachment_id uuid REFERENCES assistant_attachments(id) ON DELETE RESTRICT, task_id uuid REFERENCES assistant_message_tasks(id) ON DELETE RESTRICT,
        state varchar(20) NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','running','completed','failed')),
        attempts int NOT NULL DEFAULT 0 CHECK(attempts>=0), next_run_at timestamptz NOT NULL DEFAULT now(), lease_owner text, lease_until timestamptz,
        generation int NOT NULL DEFAULT 0, error_code text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CHECK((kind='dispatch' AND task_id IS NOT NULL AND attachment_id IS NULL) OR (kind IN ('process','delete') AND attachment_id IS NOT NULL))
      );
      CREATE UNIQUE INDEX uq_attachment_job_file ON assistant_attachment_jobs(kind,attachment_id) WHERE attachment_id IS NOT NULL;
      CREATE UNIQUE INDEX uq_attachment_job_task ON assistant_attachment_jobs(kind,task_id) WHERE kind='dispatch';
      CREATE INDEX idx_attachment_jobs_runnable ON assistant_attachment_jobs(kind,next_run_at,lease_until) WHERE state IN ('pending','running');
      CREATE INDEX idx_attachment_batches_expiry ON assistant_upload_batches(expires_at) WHERE state='open';
      CREATE INDEX idx_attachment_owner_batch ON assistant_attachments(owner_id,batch_id);
      CREATE INDEX idx_attachment_conversation ON assistant_attachments(conversation_id,message_id,ordinal);
      CREATE TABLE assistant_message_submissions (
        owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, client_message_id uuid NOT NULL, fingerprint text NOT NULL,
        conversation_id uuid NOT NULL, message_id uuid NOT NULL, task_id uuid NOT NULL REFERENCES assistant_message_tasks(id) ON DELETE RESTRICT,
        created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner_id,client_message_id),
        FOREIGN KEY(conversation_id,owner_id) REFERENCES conversations(id,user_id) ON DELETE RESTRICT,
        FOREIGN KEY(message_id,conversation_id) REFERENCES messages(id,conversation_id) ON DELETE RESTRICT
      );
      CREATE TABLE assistant_message_contexts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL UNIQUE REFERENCES assistant_message_tasks(id) ON DELETE RESTRICT,
        message_id uuid NOT NULL REFERENCES messages(id) ON DELETE RESTRICT, manifest jsonb, output_metadata jsonb,
        state varchar(20) NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','prepared','dispatching','delivered','failed','indeterminate')),
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE assistant_message_contexts, assistant_message_submissions, assistant_attachment_jobs, assistant_attachment_derivatives, assistant_attachments, assistant_upload_batches;
      ALTER TABLE messages DROP CONSTRAINT uq_attachment_message_conversation;
      ALTER TABLE conversations DROP CONSTRAINT uq_attachment_conversation_owner;`);
  }
}
