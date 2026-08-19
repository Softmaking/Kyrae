import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProvider1715970000000 implements MigrationInterface {
  name = 'AddUserProvider1715970000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD "provider" character varying(20) NOT NULL DEFAULT \'LOCAL\''
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "provider"');
  }
}
