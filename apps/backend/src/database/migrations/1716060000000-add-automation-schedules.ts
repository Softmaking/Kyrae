import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAutomationSchedules1716060000000 implements MigrationInterface {
  name = 'AddAutomationSchedules1716060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "automation_schedules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "automation_key" varchar(120) NOT NULL,
        "user_id" uuid NOT NULL,
        "title" varchar(180) NOT NULL,
        "instruction" text NOT NULL,
        "cron_expression" varchar(100) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_run_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_automation_schedules" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_automation_schedules_automation_key" ON "automation_schedules" ("automation_key")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_automation_schedules_user_id" ON "automation_schedules" ("user_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_automation_schedules_is_active" ON "automation_schedules" ("is_active")`
    );

    await queryRunner.query(`
      ALTER TABLE "automation_schedules"
      ADD CONSTRAINT "FK_automation_schedules_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "automation_schedules" DROP CONSTRAINT "FK_automation_schedules_user"`
    );
    await queryRunner.query(`DROP INDEX "idx_automation_schedules_is_active"`);
    await queryRunner.query(`DROP INDEX "idx_automation_schedules_user_id"`);
    await queryRunner.query(`DROP INDEX "idx_automation_schedules_automation_key"`);
    await queryRunner.query(`DROP TABLE "automation_schedules"`);
  }
}
