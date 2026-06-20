import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranchUniqueConstraint1715960000000 implements MigrationInterface {
  name = 'AddBranchUniqueConstraint1715960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_branches_organization_code" ON "branches" ("organization_id", "code")'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."uq_branches_organization_code"');
  }
}
