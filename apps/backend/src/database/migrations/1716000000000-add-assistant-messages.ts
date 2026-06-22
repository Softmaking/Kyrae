import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistantMessages1716000000000 implements MigrationInterface {
  name = 'AddAssistantMessages1716000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "conversations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "title" character varying(200), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_conversations_id" PRIMARY KEY ("id"))'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_conversations_user_id" ON "conversations" ("user_id")'
    );
    await queryRunner.query(
      'CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "conversation_id" uuid NOT NULL, "role" character varying(20) NOT NULL, "content" text NOT NULL, "channel" character varying(30) NOT NULL DEFAULT \'web\', "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_messages_id" PRIMARY KEY ("id"))'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_messages_conversation_id" ON "messages" ("conversation_id")'
    );
    await queryRunner.query('CREATE INDEX "idx_messages_created_at" ON "messages" ("created_at")');
    await queryRunner.query(
      'ALTER TABLE "conversations" ADD CONSTRAINT "FK_conversations_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_conversation"');
    await queryRunner.query('ALTER TABLE "conversations" DROP CONSTRAINT "FK_conversations_user"');
    await queryRunner.query('DROP INDEX "public"."idx_messages_created_at"');
    await queryRunner.query('DROP INDEX "public"."idx_messages_conversation_id"');
    await queryRunner.query('DROP TABLE "messages"');
    await queryRunner.query('DROP INDEX "public"."idx_conversations_user_id"');
    await queryRunner.query('DROP TABLE "conversations"');
  }
}
