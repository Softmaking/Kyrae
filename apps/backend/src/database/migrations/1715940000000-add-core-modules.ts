import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoreModules1715940000000 implements MigrationInterface {
  name = 'AddCoreModules1715940000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "audit_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "action" character varying(80) NOT NULL, "actor_user_id" uuid, "target_user_id" uuid, "resource_type" character varying(60), "resource_id" uuid, "metadata" jsonb, "ip_address" character varying(45), "user_agent" character varying(500), "severity" character varying(20) DEFAULT \'INFO\', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_audit_events_id" PRIMARY KEY ("id"))'
    );
    await queryRunner.query('CREATE INDEX "idx_audit_events_action" ON "audit_events" ("action")');
    await queryRunner.query(
      'CREATE INDEX "idx_audit_events_actor_user_id" ON "audit_events" ("actor_user_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_audit_events_target_user_id" ON "audit_events" ("target_user_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_audit_events_resource_type" ON "audit_events" ("resource_type")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_audit_events_created_at" ON "audit_events" ("created_at")'
    );

    await queryRunner.query(
      'CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying(60) NOT NULL, "name" character varying(200) NOT NULL, "description" character varying(500), "is_active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_organizations_code" UNIQUE ("code"), CONSTRAINT "PK_organizations_id" PRIMARY KEY ("id"))'
    );
    await queryRunner.query('CREATE INDEX "idx_organizations_code" ON "organizations" ("code")');
    await queryRunner.query(
      'CREATE INDEX "idx_organizations_is_active" ON "organizations" ("is_active")'
    );

    await queryRunner.query(
      'CREATE TABLE "branches" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "organization_id" uuid NOT NULL, "code" character varying(60) NOT NULL, "name" character varying(200) NOT NULL, "description" character varying(500), "is_active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_branches_org_code" UNIQUE ("organization_id", "code"), CONSTRAINT "PK_branches_id" PRIMARY KEY ("id"))'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_branches_organization_id" ON "branches" ("organization_id")'
    );
    await queryRunner.query('CREATE INDEX "idx_branches_code" ON "branches" ("code")');

    await queryRunner.query(
      'CREATE TABLE "user_organizations" ("user_id" uuid NOT NULL, "organization_id" uuid NOT NULL, CONSTRAINT "PK_user_organizations" PRIMARY KEY ("user_id", "organization_id"))'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_user_organizations_user_id" ON "user_organizations" ("user_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_user_organizations_organization_id" ON "user_organizations" ("organization_id")'
    );

    await queryRunner.query(
      'CREATE TABLE "user_branches" ("user_id" uuid NOT NULL, "branch_id" uuid NOT NULL, CONSTRAINT "PK_user_branches" PRIMARY KEY ("user_id", "branch_id"))'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_user_branches_user_id" ON "user_branches" ("user_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "idx_user_branches_branch_id" ON "user_branches" ("branch_id")'
    );

    await queryRunner.query(
      'ALTER TABLE "users" ADD "failed_login_attempts" integer NOT NULL DEFAULT 0'
    );
    await queryRunner.query('ALTER TABLE "users" ADD "locked_until" TIMESTAMP');

    await queryRunner.query(
      'ALTER TABLE "user_organizations" ADD CONSTRAINT "FK_user_organizations_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "user_organizations" ADD CONSTRAINT "FK_user_organizations_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "user_branches" ADD CONSTRAINT "FK_user_branches_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "user_branches" ADD CONSTRAINT "FK_user_branches_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "branches" ADD CONSTRAINT "FK_branches_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "branches" DROP CONSTRAINT "FK_branches_organization"');
    await queryRunner.query(
      'ALTER TABLE "user_branches" DROP CONSTRAINT "FK_user_branches_branch"'
    );
    await queryRunner.query('ALTER TABLE "user_branches" DROP CONSTRAINT "FK_user_branches_user"');
    await queryRunner.query(
      'ALTER TABLE "user_organizations" DROP CONSTRAINT "FK_user_organizations_org"'
    );
    await queryRunner.query(
      'ALTER TABLE "user_organizations" DROP CONSTRAINT "FK_user_organizations_user"'
    );

    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "locked_until"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "failed_login_attempts"');

    await queryRunner.query('DROP INDEX "public"."idx_user_branches_branch_id"');
    await queryRunner.query('DROP INDEX "public"."idx_user_branches_user_id"');
    await queryRunner.query('DROP TABLE "user_branches"');

    await queryRunner.query('DROP INDEX "public"."idx_user_organizations_organization_id"');
    await queryRunner.query('DROP INDEX "public"."idx_user_organizations_user_id"');
    await queryRunner.query('DROP TABLE "user_organizations"');

    await queryRunner.query('DROP INDEX "public"."idx_branches_code"');
    await queryRunner.query('DROP INDEX "public"."idx_branches_organization_id"');
    await queryRunner.query('DROP TABLE "branches"');

    await queryRunner.query('DROP INDEX "public"."idx_organizations_is_active"');
    await queryRunner.query('DROP INDEX "public"."idx_organizations_code"');
    await queryRunner.query('DROP TABLE "organizations"');

    await queryRunner.query('DROP INDEX "public"."idx_audit_events_created_at"');
    await queryRunner.query('DROP INDEX "public"."idx_audit_events_resource_type"');
    await queryRunner.query('DROP INDEX "public"."idx_audit_events_target_user_id"');
    await queryRunner.query('DROP INDEX "public"."idx_audit_events_actor_user_id"');
    await queryRunner.query('DROP INDEX "public"."idx_audit_events_action"');
    await queryRunner.query('DROP TABLE "audit_events"');
  }
}
