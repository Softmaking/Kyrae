import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConfigurationModule1715950000000 implements MigrationInterface {
  name = 'AddConfigurationModule1715950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "app_config" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "key" character varying(100) NOT NULL, "value" jsonb NOT NULL, "description" character varying(255), "is_active" boolean NOT NULL DEFAULT true, "category" character varying(60), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_app_config_key" UNIQUE ("key"), CONSTRAINT "PK_app_config_id" PRIMARY KEY ("id"))'
    );
    await queryRunner.query('CREATE INDEX "idx_app_config_key" ON "app_config" ("key")');
    await queryRunner.query('CREATE INDEX "idx_app_config_category" ON "app_config" ("category")');
    await queryRunner.query(
      'CREATE INDEX "idx_app_config_is_active" ON "app_config" ("is_active")'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."idx_app_config_is_active"');
    await queryRunner.query('DROP INDEX "public"."idx_app_config_category"');
    await queryRunner.query('DROP INDEX "public"."idx_app_config_key"');
    await queryRunner.query('DROP TABLE "app_config"');
  }
}
