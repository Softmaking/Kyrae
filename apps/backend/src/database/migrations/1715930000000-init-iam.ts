import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitIam1715930000000 implements MigrationInterface {
  name = 'InitIam1715930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.query(
      'CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(100) NOT NULL, "description" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_permissions_name" UNIQUE ("name"), CONSTRAINT "PK_permissions_id" PRIMARY KEY ("id"))'
    );
    await queryRunner.query(
      'CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(100) NOT NULL, "description" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_roles_name" UNIQUE ("name"), CONSTRAINT "PK_roles_id" PRIMARY KEY ("id"))'
    );
    await queryRunner.query(
      'CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying(180) NOT NULL, "fullName" character varying(160) NOT NULL, "passwordHash" character varying(255) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "refreshTokenHash" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_users_email" UNIQUE ("email"), CONSTRAINT "PK_users_id" PRIMARY KEY ("id"))'
    );
    await queryRunner.query(
      'CREATE TABLE "users_roles" ("userId" uuid NOT NULL, "roleId" uuid NOT NULL, CONSTRAINT "PK_users_roles" PRIMARY KEY ("userId", "roleId"))'
    );
    await queryRunner.query('CREATE INDEX "IDX_users_roles_userId" ON "users_roles" ("userId") ');
    await queryRunner.query('CREATE INDEX "IDX_users_roles_roleId" ON "users_roles" ("roleId") ');
    await queryRunner.query(
      'CREATE TABLE "roles_permissions" ("roleId" uuid NOT NULL, "permissionId" uuid NOT NULL, CONSTRAINT "PK_roles_permissions" PRIMARY KEY ("roleId", "permissionId"))'
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_roles_permissions_roleId" ON "roles_permissions" ("roleId") '
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_roles_permissions_permissionId" ON "roles_permissions" ("permissionId") '
    );

    await queryRunner.query(
      'ALTER TABLE "users_roles" ADD CONSTRAINT "FK_users_roles_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "users_roles" ADD CONSTRAINT "FK_users_roles_role" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "roles_permissions" ADD CONSTRAINT "FK_roles_permissions_role" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE "roles_permissions" ADD CONSTRAINT "FK_roles_permissions_permission" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "roles_permissions" DROP CONSTRAINT "FK_roles_permissions_permission"'
    );
    await queryRunner.query(
      'ALTER TABLE "roles_permissions" DROP CONSTRAINT "FK_roles_permissions_role"'
    );
    await queryRunner.query('ALTER TABLE "users_roles" DROP CONSTRAINT "FK_users_roles_role"');
    await queryRunner.query('ALTER TABLE "users_roles" DROP CONSTRAINT "FK_users_roles_user"');
    await queryRunner.query('DROP INDEX "public"."IDX_roles_permissions_permissionId"');
    await queryRunner.query('DROP INDEX "public"."IDX_roles_permissions_roleId"');
    await queryRunner.query('DROP TABLE "roles_permissions"');
    await queryRunner.query('DROP INDEX "public"."IDX_users_roles_roleId"');
    await queryRunner.query('DROP INDEX "public"."IDX_users_roles_userId"');
    await queryRunner.query('DROP TABLE "users_roles"');
    await queryRunner.query('DROP TABLE "users"');
    await queryRunner.query('DROP TABLE "roles"');
    await queryRunner.query('DROP TABLE "permissions"');
  }
}
