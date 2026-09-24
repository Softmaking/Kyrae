import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifyMode1716070000000 implements MigrationInterface {
  name = 'AddNotifyMode1716070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "automation_schedules"
      ADD COLUMN "notify_mode" varchar(20) NOT NULL DEFAULT 'always'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "automation_schedules" DROP COLUMN "notify_mode"
    `);
  }
}
