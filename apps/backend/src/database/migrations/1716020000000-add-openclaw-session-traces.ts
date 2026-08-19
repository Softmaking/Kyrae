import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOpenClawSessionTraces1716020000000 implements MigrationInterface {
  name = 'AddOpenClawSessionTraces1716020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "conversations" ADD "channel" character varying(30) NOT NULL DEFAULT \'web\''
    );
    await queryRunner.query(
      'ALTER TABLE "conversations" ADD "status" character varying(20) NOT NULL DEFAULT \'active\''
    );
    await queryRunner.query(
      'ALTER TABLE "messages" ADD "status" character varying(20) NOT NULL DEFAULT \'completed\''
    );
    await queryRunner.query(
      'ALTER TABLE "messages" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()'
    );
    await queryRunner.query(
      'CREATE TABLE "openclaw_requests" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "session_id" uuid NOT NULL, "message_id" uuid NOT NULL, "request_payload" jsonb NOT NULL, "response_payload" jsonb, "status" character varying(20) NOT NULL DEFAULT \'pending\', "error_message" character varying(500), "duration_ms" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_openclaw_requests_id" PRIMARY KEY ("id"))'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_openclaw_requests_session_id" ON "openclaw_requests" ("session_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_openclaw_requests_message_id" ON "openclaw_requests" ("message_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_openclaw_requests_status" ON "openclaw_requests" ("status")'
    );
    await queryRunner.query(
      'ALTER TABLE "openclaw_requests" ADD CONSTRAINT "FK_openclaw_requests_session" FOREIGN KEY ("session_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "openclaw_requests" ADD CONSTRAINT "FK_openclaw_requests_message" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "openclaw_requests" DROP CONSTRAINT "FK_openclaw_requests_message"'
    );
    await queryRunner.query(
      'ALTER TABLE "openclaw_requests" DROP CONSTRAINT "FK_openclaw_requests_session"'
    );
    await queryRunner.query('DROP INDEX "public"."idx_openclaw_requests_status"');
    await queryRunner.query('DROP INDEX "public"."idx_openclaw_requests_message_id"');
    await queryRunner.query('DROP INDEX "public"."idx_openclaw_requests_session_id"');
    await queryRunner.query('DROP TABLE "openclaw_requests"');
    await queryRunner.query('ALTER TABLE "messages" DROP COLUMN "updated_at"');
    await queryRunner.query('ALTER TABLE "messages" DROP COLUMN "status"');
    await queryRunner.query('ALTER TABLE "conversations" DROP COLUMN "status"');
    await queryRunner.query('ALTER TABLE "conversations" DROP COLUMN "channel"');
  }
}
