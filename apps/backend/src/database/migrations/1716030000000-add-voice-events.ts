import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVoiceEvents1716030000000 implements MigrationInterface {
  name = 'AddVoiceEvents1716030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "voice_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "session_id" uuid, "task_id" uuid, "status" character varying(30) NOT NULL, "transcript" text, "language" character varying(20), "confidence" numeric(5,4), "error_message" character varying(500), "audio_mime_type" character varying(100), "audio_size_bytes" integer, "audio_temp_path" character varying(500), "channel" character varying(30) NOT NULL DEFAULT \'web\', "duration_ms" integer, "stt_provider" character varying(50), "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_voice_events_id" PRIMARY KEY ("id"))'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_voice_events_user_id" ON "voice_events" ("user_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_voice_events_session_id" ON "voice_events" ("session_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_voice_events_task_id" ON "voice_events" ("task_id")'
    );
    await queryRunner.query('CREATE INDEX "idx_voice_events_status" ON "voice_events" ("status")');
    await queryRunner.query(
      'ALTER TABLE "voice_events" ADD CONSTRAINT "FK_voice_events_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "voice_events" ADD CONSTRAINT "FK_voice_events_session" FOREIGN KEY ("session_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "voice_events" ADD CONSTRAINT "FK_voice_events_task" FOREIGN KEY ("task_id") REFERENCES "assistant_message_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'INSERT INTO "permissions" ("name", "description") VALUES (\'ASSISTANT_VOICE_USE\', \'Allows ASSISTANT_VOICE_USE\') ON CONFLICT ("name") DO NOTHING'
    );
    await queryRunner.query(
      'INSERT INTO "roles_permissions" ("roleId", "permissionId") SELECT "roles"."id", "permissions"."id" FROM "roles", "permissions" WHERE "roles"."name" = \'admin\' AND "permissions"."name" = \'ASSISTANT_VOICE_USE\' ON CONFLICT DO NOTHING'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "voice_events" DROP CONSTRAINT "FK_voice_events_task"');
    await queryRunner.query('ALTER TABLE "voice_events" DROP CONSTRAINT "FK_voice_events_session"');
    await queryRunner.query('ALTER TABLE "voice_events" DROP CONSTRAINT "FK_voice_events_user"');
    await queryRunner.query('DROP INDEX "public"."idx_voice_events_status"');
    await queryRunner.query('DROP INDEX "public"."idx_voice_events_task_id"');
    await queryRunner.query('DROP INDEX "public"."idx_voice_events_session_id"');
    await queryRunner.query('DROP INDEX "public"."idx_voice_events_user_id"');
    await queryRunner.query('DROP TABLE "voice_events"');
  }
}
