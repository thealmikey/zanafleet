import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCalendarBindingTables1761100000000 implements MigrationInterface {
  name = 'CreateCalendarBindingTables1761100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create BindingTargetType enum type
    await queryRunner.query(`
      CREATE TYPE "binding_target_type_enum" AS ENUM (
        'BUSINESS',
        'SACCO',
        'RIDER',
        'WORKSPACE'
      )
    `);

    // Create calendar_bindings table
    await queryRunner.query(`
      CREATE TABLE "calendar_bindings" (
        "id" uuid NOT NULL,
        "calendar_id" uuid NOT NULL,
        "target_type" "binding_target_type_enum" NOT NULL,
        "target_id" uuid NOT NULL,
        "priority" int NOT NULL DEFAULT 0,
        "inherit_parent" boolean NOT NULL DEFAULT true,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_calendar_bindings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_calendar_binding_target" UNIQUE ("calendar_id", "target_type", "target_id"),
        CONSTRAINT "FK_calendar_bindings_calendar" FOREIGN KEY ("calendar_id")
          REFERENCES "calendars"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes on calendar_bindings
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_bindings_calendar_id" ON "calendar_bindings" ("calendar_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_bindings_target" ON "calendar_bindings" ("target_type", "target_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_bindings_is_active" ON "calendar_bindings" ("is_active")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_bindings_priority" ON "calendar_bindings" ("priority")
    `);

    // Create calendar_overrides table
    await queryRunner.query(`
      CREATE TABLE "calendar_overrides" (
        "id" uuid NOT NULL,
        "target_scope" "calendar_scope_enum" NOT NULL,
        "target_scope_id" uuid,
        "exception_type" varchar(100) NOT NULL,
        "reason" text,
        "valid_from" TIMESTAMP WITH TIME ZONE NOT NULL,
        "valid_until" TIMESTAMP WITH TIME ZONE NOT NULL,
        "priority" int NOT NULL DEFAULT 0,
        "metadata" jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_calendar_overrides" PRIMARY KEY ("id")
      )
    `);

    // Create indexes on calendar_overrides
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_overrides_target_scope" ON "calendar_overrides" ("target_scope")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_overrides_target_scope_id" ON "calendar_overrides" ("target_scope_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_overrides_valid_from" ON "calendar_overrides" ("valid_from")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_overrides_valid_until" ON "calendar_overrides" ("valid_until")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_overrides_is_active" ON "calendar_overrides" ("is_active")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_overrides_priority" ON "calendar_overrides" ("priority")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop calendar_overrides table and indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_overrides_priority"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_overrides_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_overrides_valid_until"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_overrides_valid_from"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_overrides_target_scope_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_overrides_target_scope"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "calendar_overrides"`);

    // Drop calendar_bindings table and indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_bindings_priority"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_bindings_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_bindings_target"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_bindings_calendar_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "calendar_bindings"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "binding_target_type_enum"`);
  }
}
