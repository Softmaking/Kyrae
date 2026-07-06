import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOpenClawEvents1716050000000 implements MigrationInterface {
  name = 'AddOpenClawEvents1716050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "openclaw_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_id" varchar(180) NOT NULL,
        "user_id" uuid NOT NULL,
        "session_id" uuid NOT NULL,
        "message_id" uuid NOT NULL,
        "type" varchar(40) NOT NULL,
        "automation_key" varchar(120) NOT NULL,
        "automation_title" varchar(180) NOT NULL,
        "severity" varchar(10) NOT NULL DEFAULT 'INFO',
        "session_strategy" varchar(40) NOT NULL DEFAULT 'user_automation_inbox',
        "external_run_id" varchar(180),
        "payload" jsonb NOT NULL,
        "occurred_at" timestamp NOT NULL,
        "processed_at" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_openclaw_events" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_openclaw_events_event_id" ON "openclaw_events" ("event_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_openclaw_events_user_id" ON "openclaw_events" ("user_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_openclaw_events_session_id" ON "openclaw_events" ("session_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_openclaw_events_automation_key" ON "openclaw_events" ("automation_key")`
    );

    await queryRunner.query(`
      ALTER TABLE "openclaw_events"
      ADD CONSTRAINT "FK_openclaw_events_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "openclaw_events"
      ADD CONSTRAINT "FK_openclaw_events_session"
      FOREIGN KEY ("session_id") REFERENCES "conversations"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "openclaw_events"
      ADD CONSTRAINT "FK_openclaw_events_message"
      FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "openclaw_events" DROP CONSTRAINT "FK_openclaw_events_message"`
    );
    await queryRunner.query(
      `ALTER TABLE "openclaw_events" DROP CONSTRAINT "FK_openclaw_events_session"`
    );
    await queryRunner.query(
      `ALTER TABLE "openclaw_events" DROP CONSTRAINT "FK_openclaw_events_user"`
    );
    await queryRunner.query(`DROP INDEX "idx_openclaw_events_automation_key"`);
    await queryRunner.query(`DROP INDEX "idx_openclaw_events_session_id"`);
    await queryRunner.query(`DROP INDEX "idx_openclaw_events_user_id"`);
    await queryRunner.query(`DROP INDEX "idx_openclaw_events_event_id"`);
    await queryRunner.query(`DROP TABLE "openclaw_events"`);
  }
}
