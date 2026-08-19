import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistantMessageTasks1716010000000 implements MigrationInterface {
  name = 'AddAssistantMessageTasks1716010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "assistant_message_tasks" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "conversation_id" uuid NOT NULL, "user_message_id" uuid NOT NULL, "assistant_message_id" uuid, "status" character varying(20) NOT NULL DEFAULT \'pending\', "channel" character varying(30) NOT NULL DEFAULT \'web\', "error_message" character varying(500), "completed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_assistant_message_tasks_id" PRIMARY KEY ("id"))'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_assistant_message_tasks_user_id" ON "assistant_message_tasks" ("user_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_assistant_message_tasks_conversation_id" ON "assistant_message_tasks" ("conversation_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_assistant_message_tasks_status" ON "assistant_message_tasks" ("status")'
    );
    await queryRunner.query(
      'ALTER TABLE "assistant_message_tasks" ADD CONSTRAINT "FK_assistant_message_tasks_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "assistant_message_tasks" ADD CONSTRAINT "FK_assistant_message_tasks_user_message" FOREIGN KEY ("user_message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "assistant_message_tasks" ADD CONSTRAINT "FK_assistant_message_tasks_assistant_message" FOREIGN KEY ("assistant_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "assistant_message_tasks" DROP CONSTRAINT "FK_assistant_message_tasks_assistant_message"'
    );
    await queryRunner.query(
      'ALTER TABLE "assistant_message_tasks" DROP CONSTRAINT "FK_assistant_message_tasks_user_message"'
    );
    await queryRunner.query(
      'ALTER TABLE "assistant_message_tasks" DROP CONSTRAINT "FK_assistant_message_tasks_conversation"'
    );
    await queryRunner.query('DROP INDEX "public"."idx_assistant_message_tasks_status"');
    await queryRunner.query('DROP INDEX "public"."idx_assistant_message_tasks_conversation_id"');
    await queryRunner.query('DROP INDEX "public"."idx_assistant_message_tasks_user_id"');
    await queryRunner.query('DROP TABLE "assistant_message_tasks"');
  }
}
