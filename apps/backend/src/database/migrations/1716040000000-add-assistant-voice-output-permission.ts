import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistantVoiceOutputPermission1716040000000 implements MigrationInterface {
  name = 'AddAssistantVoiceOutputPermission1716040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'INSERT INTO "permissions" ("name", "description") VALUES (\'ASSISTANT_VOICE_OUTPUT_USE\', \'Allows ASSISTANT_VOICE_OUTPUT_USE\') ON CONFLICT ("name") DO NOTHING'
    );
    await queryRunner.query(
      'INSERT INTO "roles_permissions" ("roleId", "permissionId") SELECT "roles"."id", "permissions"."id" FROM "roles", "permissions" WHERE "roles"."name" = \'admin\' AND "permissions"."name" = \'ASSISTANT_VOICE_OUTPUT_USE\' ON CONFLICT DO NOTHING'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DELETE FROM "roles_permissions" WHERE "permissionId" IN (SELECT "id" FROM "permissions" WHERE "name" = \'ASSISTANT_VOICE_OUTPUT_USE\')'
    );
    await queryRunner.query(
      'DELETE FROM "permissions" WHERE "name" = \'ASSISTANT_VOICE_OUTPUT_USE\''
    );
  }
}
