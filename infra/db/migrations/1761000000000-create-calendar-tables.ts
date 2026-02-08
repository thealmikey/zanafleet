import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCalendarTables1761000000000 implements MigrationInterface {
  name = 'CreateCalendarTables1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create CalendarScope enum type
    await queryRunner.query(`
      CREATE TYPE "calendar_scope_enum" AS ENUM (
        'GLOBAL',
        'NATIONAL',
        'SACCO',
        'BUSINESS',
        'RIDER'
      )
    `);

    // Create CalendarRuleType enum type
    await queryRunner.query(`
      CREATE TYPE "calendar_rule_type_enum" AS ENUM (
        'WORKING_HOURS',
        'WEEKEND',
        'HOLIDAY',
        'CLOSURE',
        'BLACKOUT'
      )
    `);

    // Create CalendarEventType enum type
    await queryRunner.query(`
      CREATE TYPE "calendar_event_type_enum" AS ENUM (
        'PUBLIC_HOLIDAY',
        'BUSINESS_CLOSURE',
        'NATIONAL_EVENT',
        'WEATHER_DISRUPTION',
        'STRIKE_ADVISORY',
        'PROMOTIONAL_CAMPAIGN'
      )
    `);

    // Create RecurrencePattern enum type
    await queryRunner.query(`
      CREATE TYPE "recurrence_pattern_enum" AS ENUM (
        'NONE',
        'DAILY',
        'WEEKLY',
        'MONTHLY',
        'YEARLY',
        'CUSTOM'
      )
    `);

    // Create calendars table
    await queryRunner.query(`
      CREATE TABLE "calendars" (
        "id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "timezone" varchar(50) NOT NULL,
        "locale" varchar(10) NOT NULL,
        "owner_scope" "calendar_scope_enum" NOT NULL,
        "owner_scope_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_calendars" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_calendars_name" UNIQUE ("name")
      )
    `);

    // Create indexes on calendars
    await queryRunner.query(`
      CREATE INDEX "IDX_calendars_owner_scope" ON "calendars" ("owner_scope")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendars_is_active" ON "calendars" ("is_active")
    `);

    // Create time_windows table
    await queryRunner.query(`
      CREATE TABLE "time_windows" (
        "id" uuid NOT NULL,
        "calendar_id" uuid NOT NULL,
        "start_time" TIME NOT NULL,
        "end_time" TIME NOT NULL,
        "day_of_week" int,
        "recurrence_rule" jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_time_windows" PRIMARY KEY ("id"),
        CONSTRAINT "FK_time_windows_calendar" FOREIGN KEY ("calendar_id")
          REFERENCES "calendars"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes on time_windows
    await queryRunner.query(`
      CREATE INDEX "IDX_time_windows_calendar_id" ON "time_windows" ("calendar_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_time_windows_is_active" ON "time_windows" ("is_active")
    `);

    // Create calendar_rules table
    await queryRunner.query(`
      CREATE TABLE "calendar_rules" (
        "id" uuid NOT NULL,
        "calendar_id" uuid NOT NULL,
        "rule_type" "calendar_rule_type_enum" NOT NULL,
        "scope" "calendar_scope_enum" NOT NULL,
        "priority" int NOT NULL DEFAULT 0,
        "conditions" jsonb NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_calendar_rules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_calendar_rules_calendar" FOREIGN KEY ("calendar_id")
          REFERENCES "calendars"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes on calendar_rules
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_rules_calendar_id" ON "calendar_rules" ("calendar_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_rules_rule_type" ON "calendar_rules" ("rule_type")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_rules_scope" ON "calendar_rules" ("scope")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_rules_priority" ON "calendar_rules" ("priority")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_rules_is_active" ON "calendar_rules" ("is_active")
    `);

    // Create calendar_events table
    await queryRunner.query(`
      CREATE TABLE "calendar_events" (
        "id" uuid NOT NULL,
        "event_type" "calendar_event_type_enum" NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "all_day" boolean NOT NULL DEFAULT false,
        "region_scope" jsonb NOT NULL,
        "recurrence_pattern" "recurrence_pattern_enum" NOT NULL,
        "recurrence_rule" jsonb,
        "priority" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_calendar_events" PRIMARY KEY ("id")
      )
    `);

    // Create indexes on calendar_events
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_events_event_type" ON "calendar_events" ("event_type")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_events_start_time" ON "calendar_events" ("start_time")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_events_end_time" ON "calendar_events" ("end_time")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_events_is_active" ON "calendar_events" ("is_active")
    `);

    // Create GIN index on region_scope for JSONB queries
    await queryRunner.query(`
      CREATE INDEX "IDX_calendar_events_region_scope" ON "calendar_events" USING GIN ("region_scope")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop calendar_events table and indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_events_region_scope"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_events_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_events_end_time"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_events_start_time"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_events_event_type"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "calendar_events"`);

    // Drop calendar_rules table and indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_rules_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_rules_priority"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_rules_scope"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_rules_rule_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendar_rules_calendar_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "calendar_rules"`);

    // Drop time_windows table and indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_time_windows_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_time_windows_calendar_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "time_windows"`);

    // Drop calendars table and indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendars_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_calendars_owner_scope"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "calendars"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "recurrence_pattern_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "calendar_event_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "calendar_rule_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "calendar_scope_enum"`);
  }
}
