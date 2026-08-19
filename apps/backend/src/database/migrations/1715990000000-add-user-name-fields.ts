import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserNameFields1715990000000 implements MigrationInterface {
  name = 'AddUserNameFields1715990000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD "firstName" character varying(100) NOT NULL DEFAULT \'\''
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD "firstSurname" character varying(100) NOT NULL DEFAULT \'\''
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD "secondSurname" character varying(100) DEFAULT NULL'
    );
    await queryRunner.query('ALTER TABLE "users" ADD "rut" character varying(12) DEFAULT NULL');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_users_rut" ON "users" ("rut") WHERE "rut" IS NOT NULL'
    );

    await queryRunner.query(`
      UPDATE "users"
      SET
        "firstName" = SPLIT_PART("fullName", ' ', 1),
        "firstSurname" = CASE
          WHEN array_length(string_to_array("fullName", ' '), 1) >= 2
          THEN SPLIT_PART("fullName", ' ', 2)
          ELSE ''
        END,
        "secondSurname" = CASE
          WHEN array_length(string_to_array("fullName", ' '), 1) >= 3
          THEN SUBSTRING("fullName" FROM POSITION(' ' IN "fullName") + 1)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "secondSurname" = NULL
      WHERE "secondSurname" = "firstSurname" OR "secondSurname" IS NULL
    `);

    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "fullName"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD "fullName" character varying(160) NOT NULL DEFAULT \'\''
    );
    await queryRunner.query(`
      UPDATE "users"
      SET "fullName" = TRIM(
        COALESCE("firstName", '') || ' ' ||
        COALESCE("firstSurname", '') || ' ' ||
        COALESCE("secondSurname", '')
      )
    `);
    await queryRunner.query('DROP INDEX "IDX_users_rut"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "rut"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "secondSurname"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "firstSurname"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "firstName"');
  }
}
