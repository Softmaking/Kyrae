import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditCursorIndex1715980000000 implements MigrationInterface {
  name = 'AddAuditCursorIndex1715980000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX "idx_audit_events_created_at_id" ON "audit_events" ("created_at" DESC, "id" DESC)'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."idx_audit_events_created_at_id"');
  }
}
