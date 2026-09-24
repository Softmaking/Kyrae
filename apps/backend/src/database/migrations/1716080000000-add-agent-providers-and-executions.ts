import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentProvidersAndExecutions1716080000000 implements MigrationInterface {
  name = 'AddAgentProvidersAndExecutions1716080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "agents" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(120) NOT NULL, "description" character varying(500), "provider" character varying(30) NOT NULL, "provider_agent_id" character varying(200), "default_execution_mode" character varying(20) NOT NULL DEFAULT \'CHAT\', "configuration" jsonb, "enabled" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_agents_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_agents_name" UNIQUE ("name"))'
    );
    await queryRunner.query('CREATE INDEX "idx_agents_provider" ON "agents" ("provider")');
    await queryRunner.query('CREATE INDEX "idx_agents_enabled" ON "agents" ("enabled")');

    await queryRunner.query(
      'CREATE TABLE "agent_executions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "conversation_id" uuid NOT NULL, "agent_id" uuid NOT NULL, "provider" character varying(30) NOT NULL, "execution_mode" character varying(20) NOT NULL, "provider_run_id" character varying(200), "status" character varying(30) NOT NULL DEFAULT \'PENDING\', "started_at" TIMESTAMP, "finished_at" TIMESTAMP, "error_code" character varying(80), "error_message" character varying(500), "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_agent_executions_id" PRIMARY KEY ("id"))'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_agent_executions_user_id" ON "agent_executions" ("user_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_agent_executions_conversation_id" ON "agent_executions" ("conversation_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_agent_executions_agent_id" ON "agent_executions" ("agent_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_agent_executions_provider_run_id" ON "agent_executions" ("provider_run_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_agent_executions_status" ON "agent_executions" ("status")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_agent_executions_created_at" ON "agent_executions" ("created_at")'
    );

    await queryRunner.query(
      'CREATE TABLE "agent_execution_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "execution_id" uuid NOT NULL, "type" character varying(40) NOT NULL, "sequence" integer NOT NULL, "payload" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_agent_execution_events_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_agent_execution_events_sequence" UNIQUE ("execution_id", "sequence"))'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_agent_execution_events_execution_id" ON "agent_execution_events" ("execution_id")'
    );

    await queryRunner.query('ALTER TABLE "conversations" ADD "agent_id" uuid');
    await queryRunner.query('ALTER TABLE "conversations" ADD "provider" character varying(30)');
    await queryRunner.query(
      'CREATE INDEX "idx_conversations_agent_id" ON "conversations" ("agent_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_conversations_provider" ON "conversations" ("provider")'
    );

    await queryRunner.query(
      'ALTER TABLE "agent_executions" ADD CONSTRAINT "FK_agent_executions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "agent_executions" ADD CONSTRAINT "FK_agent_executions_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "agent_executions" ADD CONSTRAINT "FK_agent_executions_agent" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "agent_execution_events" ADD CONSTRAINT "FK_agent_execution_events_execution" FOREIGN KEY ("execution_id") REFERENCES "agent_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );

    await queryRunner.query(
      `INSERT INTO "agents" ("name", "description", "provider", "provider_agent_id", "default_execution_mode") VALUES ('main', 'Default Hermes assistant', 'HERMES', 'hermes-agent', 'CHAT'), ('legacy-openclaw', 'Legacy OpenClaw assistant', 'OPENCLAW', 'main', 'CHAT') ON CONFLICT ("name") DO NOTHING`
    );
    await queryRunner.query(
      `UPDATE "conversations" SET "provider" = 'OPENCLAW', "agent_id" = (SELECT "id" FROM "agents" WHERE "name" = 'legacy-openclaw') WHERE "provider" IS NULL`
    );
    await queryRunner.query(
      'ALTER TABLE "conversations" ADD CONSTRAINT "FK_conversations_agent" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "conversations" DROP CONSTRAINT "FK_conversations_agent"');
    await queryRunner.query('DROP INDEX "public"."idx_conversations_provider"');
    await queryRunner.query('DROP INDEX "public"."idx_conversations_agent_id"');
    await queryRunner.query('ALTER TABLE "conversations" DROP COLUMN "provider"');
    await queryRunner.query('ALTER TABLE "conversations" DROP COLUMN "agent_id"');
    await queryRunner.query(
      'ALTER TABLE "agent_execution_events" DROP CONSTRAINT "FK_agent_execution_events_execution"'
    );
    await queryRunner.query(
      'ALTER TABLE "agent_executions" DROP CONSTRAINT "FK_agent_executions_agent"'
    );
    await queryRunner.query(
      'ALTER TABLE "agent_executions" DROP CONSTRAINT "FK_agent_executions_conversation"'
    );
    await queryRunner.query(
      'ALTER TABLE "agent_executions" DROP CONSTRAINT "FK_agent_executions_user"'
    );
    await queryRunner.query('DROP INDEX "public"."idx_agent_execution_events_execution_id"');
    await queryRunner.query('DROP TABLE "agent_execution_events"');
    await queryRunner.query('DROP INDEX "public"."idx_agent_executions_created_at"');
    await queryRunner.query('DROP INDEX "public"."idx_agent_executions_status"');
    await queryRunner.query('DROP INDEX "public"."idx_agent_executions_provider_run_id"');
    await queryRunner.query('DROP INDEX "public"."idx_agent_executions_agent_id"');
    await queryRunner.query('DROP INDEX "public"."idx_agent_executions_conversation_id"');
    await queryRunner.query('DROP INDEX "public"."idx_agent_executions_user_id"');
    await queryRunner.query('DROP TABLE "agent_executions"');
    await queryRunner.query('DROP INDEX "public"."idx_agents_enabled"');
    await queryRunner.query('DROP INDEX "public"."idx_agents_provider"');
    await queryRunner.query('DROP TABLE "agents"');
  }
}
