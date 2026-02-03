import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Change workspaceId to workspaceIds array
 *
 * This migration converts the nullable single UUID column `workspaceId`
 * to a UUID array column `workspaceIds` in the signup_sessions table.
 */
export class ChangeWorkspaceIdToWorkspaceIds1749826800000 implements MigrationInterface {
  name = 'ChangeWorkspaceIdToWorkspaceIds1749826800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new array column with default empty array
    await queryRunner.query(`
      ALTER TABLE "signup_sessions"
      ADD COLUMN "workspaceIds" uuid[] NOT NULL DEFAULT ARRAY[]::uuid[]
    `);

    // Migrate existing data: if workspaceId exists, put it in the array
    await queryRunner.query(`
      UPDATE "signup_sessions"
      SET "workspaceIds" = ARRAY["workspaceId"]::uuid[]
      WHERE "workspaceId" IS NOT NULL
    `);

    // Drop the old column
    await queryRunner.query(`
      ALTER TABLE "signup_sessions"
      DROP COLUMN "workspaceId"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the old nullable column
    await queryRunner.query(`
      ALTER TABLE "signup_sessions"
      ADD COLUMN "workspaceId" uuid
    `);

    // Migrate data back: take first element from array if present
    await queryRunner.query(`
      UPDATE "signup_sessions"
      SET "workspaceId" = "workspaceIds"[1]
      WHERE array_length("workspaceIds", 1) > 0
    `);

    // Drop the array column
    await queryRunner.query(`
      ALTER TABLE "signup_sessions"
      DROP COLUMN "workspaceIds"
    `);
  }
}
