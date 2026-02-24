import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CreateJobTypeTables Migration
 *
 * Creates the JobType Registry tables:
 * - job_types: Core job type definitions
 * - job_type_worker_configs: Worker type requirements
 * - job_type_metadata_fields: Configurable metadata fields
 * - workspace_job_types: Workspace-JobType junction for sharing
 */
export class CreateJobTypeTables1751000000002 implements MigrationInterface {
  name = 'CreateJobTypeTables1751000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "vertical_enum" AS ENUM (
        'delivery',
        'moving',
        'wholesale',
        'fleet',
        'marketplace'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "job_type_mode_enum" AS ENUM (
        'internal',
        'marketplace',
        'consumer'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "job_type_status_enum" AS ENUM (
        'active',
        'inactive',
        'deprecated'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "metadata_field_type_enum" AS ENUM (
        'text',
        'number',
        'boolean',
        'date',
        'datetime',
        'select',
        'multiselect',
        'file',
        'location',
        'address',
        'phone',
        'email'
      )
    `);

    // Create job_types table
    await queryRunner.query(`
      CREATE TABLE "job_types" (
        "id" uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspaceId" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "vertical" "vertical_enum" NOT NULL,
        "mode" "job_type_mode_enum" NOT NULL DEFAULT 'internal',
        "status" "job_type_status_enum" NOT NULL DEFAULT 'active',
        "workflowDefinitionId" uuid,
        "assignmentStrategy" jsonb NOT NULL DEFAULT '{}',
        "pricingStrategy" jsonb NOT NULL DEFAULT '{}',
        "uiLayoutConfig" jsonb NOT NULL DEFAULT '{}',
        "slaRules" jsonb NOT NULL DEFAULT '{}',
        "supportsMultipleWorkers" boolean NOT NULL DEFAULT false,
        "supportsMultipleDestinations" boolean NOT NULL DEFAULT false,
        "verticalSpecificSettings" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Create indexes for job_types
    await queryRunner.query(`
      CREATE INDEX "IDX_job_types_workspace" ON "job_types" ("workspaceId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_job_types_vertical" ON "job_types" ("vertical")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_job_types_status" ON "job_types" ("status")
    `);

    // Create job_type_worker_configs table
    await queryRunner.query(`
      CREATE TABLE "job_type_worker_configs" (
        "id" uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "jobTypeId" uuid NOT NULL,
        "workerType" varchar(100) NOT NULL,
        "minWorkers" integer NOT NULL DEFAULT 1,
        "maxWorkers" integer,
        "required" boolean NOT NULL DEFAULT false,
        "qualifications" jsonb,
        CONSTRAINT "FK_job_type_worker_configs_job_type" FOREIGN KEY ("jobTypeId")
          REFERENCES "job_types"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_job_type_worker_config" UNIQUE ("jobTypeId", "workerType")
      )
    `);

    // Create job_type_metadata_fields table
    await queryRunner.query(`
      CREATE TABLE "job_type_metadata_fields" (
        "id" uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "jobTypeId" uuid NOT NULL,
        "fieldKey" varchar(100) NOT NULL,
        "displayName" varchar(255) NOT NULL,
        "description" text,
        "fieldType" "metadata_field_type_enum" NOT NULL DEFAULT 'text',
        "required" boolean NOT NULL DEFAULT false,
        "isCustomerEditable" boolean NOT NULL DEFAULT false,
        "validationRules" jsonb,
        "displayOrder" integer,
        "uiConfig" jsonb,
        CONSTRAINT "FK_job_type_metadata_fields_job_type" FOREIGN KEY ("jobTypeId")
          REFERENCES "job_types"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_job_type_metadata_field" UNIQUE ("jobTypeId", "fieldKey")
      )
    `);

    // Create workspace_job_types junction table
    await queryRunner.query(`
      CREATE TABLE "workspace_job_types" (
        "workspaceId" uuid NOT NULL,
        "jobTypeId" uuid NOT NULL,
        "enabledAt" TIMESTAMP NOT NULL DEFAULT now(),
        "enabledBy" uuid,
        CONSTRAINT "PK_workspace_job_types" PRIMARY KEY ("workspaceId", "jobTypeId"),
        CONSTRAINT "FK_workspace_job_types_workspace" FOREIGN KEY ("workspaceId")
          REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workspace_job_types_job_type" FOREIGN KEY ("jobTypeId")
          REFERENCES "job_types"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for junction table
    await queryRunner.query(`
      CREATE INDEX "IDX_workspace_job_types_job_type" ON "workspace_job_types" ("jobTypeId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop junction table
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace_job_types"`);

    // Drop metadata fields table
    await queryRunner.query(`DROP TABLE IF EXISTS "job_type_metadata_fields"`);

    // Drop worker configs table
    await queryRunner.query(`DROP TABLE IF EXISTS "job_type_worker_configs"`);

    // Drop job_types table
    await queryRunner.query(`DROP TABLE IF EXISTS "job_types"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "metadata_field_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "job_type_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "job_type_mode_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "vertical_enum"`);
  }
}
