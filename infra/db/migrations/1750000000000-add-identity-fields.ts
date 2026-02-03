import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdentityFields1750000000000 implements MigrationInterface {
  name = 'AddIdentityFields1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add identity columns to actors table
    await queryRunner.query(`
      ALTER TABLE "actors"
      ADD COLUMN "email" VARCHAR NOT NULL,
      ADD COLUMN "username" VARCHAR NOT NULL,
      ADD COLUMN "password_hash" VARCHAR NOT NULL,
      ADD COLUMN "location" VARCHAR
    `);

    // Add unique constraints and indexes for actors
    await queryRunner.query(`
      ALTER TABLE "actors"
      ADD CONSTRAINT "UQ_actors_email" UNIQUE ("email")
    `);

    await queryRunner.query(`
      ALTER TABLE "actors"
      ADD CONSTRAINT "UQ_actors_username" UNIQUE ("username")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_actors_email" ON "actors" ("email")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_actors_username" ON "actors" ("username")
    `);

    // Add identity columns to signup_sessions table (all nullable for in-progress signups)
    await queryRunner.query(`
      ALTER TABLE "signup_sessions"
      ADD COLUMN "email" VARCHAR,
      ADD COLUMN "username" VARCHAR,
      ADD COLUMN "password_hash" VARCHAR,
      ADD COLUMN "location" VARCHAR,
      ADD COLUMN "workspace_name" VARCHAR
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from signup_sessions
    await queryRunner.query(`
      ALTER TABLE "signup_sessions"
      DROP COLUMN "workspace_name",
      DROP COLUMN "location",
      DROP COLUMN "password_hash",
      DROP COLUMN "username",
      DROP COLUMN "email"
    `);

    // Remove indexes from actors
    await queryRunner.query(`DROP INDEX "IDX_actors_username"`);
    await queryRunner.query(`DROP INDEX "IDX_actors_email"`);

    // Remove unique constraints from actors
    await queryRunner.query(`
      ALTER TABLE "actors"
      DROP CONSTRAINT "UQ_actors_username"
    `);

    await queryRunner.query(`
      ALTER TABLE "actors"
      DROP CONSTRAINT "UQ_actors_email"
    `);

    // Remove columns from actors
    await queryRunner.query(`
      ALTER TABLE "actors"
      DROP COLUMN "location",
      DROP COLUMN "password_hash",
      DROP COLUMN "username",
      DROP COLUMN "email"
    `);
  }
}
