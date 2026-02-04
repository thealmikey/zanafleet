import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCommunicationTables1704067300000 implements MigrationInterface {
  name = 'CreateCommunicationTables1704067300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notification_channel enum
    await queryRunner.query(`
      CREATE TYPE "notification_channel_enum" AS ENUM ('email', 'sms', 'push')
    `);

    // Create notification_status enum
    await queryRunner.query(`
      CREATE TYPE "notification_status_enum" AS ENUM ('pending', 'sent', 'failed', 'skipped')
    `);

    // Create recipient_type enum
    await queryRunner.query(`
      CREATE TYPE "recipient_type_enum" AS ENUM ('actor', 'rider', 'business')
    `);

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL,
        "channel" "notification_channel_enum" NOT NULL,
        "recipientId" uuid NOT NULL,
        "recipientType" "recipient_type_enum" NOT NULL,
        "status" "notification_status_enum" NOT NULL DEFAULT 'pending',
        "templateId" varchar NOT NULL,
        "renderedSubject" text,
        "renderedBody" text NOT NULL,
        "sentAt" TIMESTAMP,
        "failedAt" TIMESTAMP,
        "error" text,
        "attempts" int NOT NULL DEFAULT 0,
        "workspaceId" uuid NOT NULL,
        "correlationId" uuid,
        "causationId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for notifications
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_recipient_status" ON "notifications" ("recipientId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_workspace_created" ON "notifications" ("workspaceId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_correlation" ON "notifications" ("correlationId")
    `);

    // Create notification_templates table
    await queryRunner.query(`
      CREATE TABLE "notification_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "channel" "notification_channel_enum" NOT NULL,
        "subject" text NOT NULL,
        "body" text NOT NULL,
        "variables" text NOT NULL,
        "version" int NOT NULL DEFAULT 1,
        "locale" varchar(10) NOT NULL DEFAULT 'en',
        "workspaceId" uuid,
        "brandingConfig" json,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_templates" PRIMARY KEY ("id")
      )
    `);

    // Create unique constraint and index for templates
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_template_unique" ON "notification_templates" ("workspaceId", "locale", "channel", "name")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_templates_workspace_locale_channel_name" ON "notification_templates" ("workspaceId", "locale", "channel", "name")
    `);

    // Create notification_preferences table
    await queryRunner.query(`
      CREATE TABLE "notification_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "recipientId" varchar(255) NOT NULL,
        "recipientType" "recipient_type_enum" NOT NULL,
        "channel" "notification_channel_enum" NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "workspaceId" uuid,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedBy" varchar(255),
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("id")
      )
    `);

    // Create unique constraint and index for preferences
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_preference_unique" ON "notification_preferences" ("recipientId", "recipientType", "channel", "workspaceId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_preferences_recipient_type_channel_workspace" ON "notification_preferences" ("recipientId", "recipientType", "channel", "workspaceId")
    `);

    // Seed initial templates
    await queryRunner.query(`
      INSERT INTO "notification_templates" ("name", "channel", "subject", "body", "variables", "locale", "workspaceId", "isActive")
      VALUES
        ('welcome', 'email', 'Welcome to ZanaFleet, {{username}}!', 'Hello {{username}}, welcome to ZanaFleet! Your email {{email}} has been registered.', 'username,email', 'en', NULL, true),
        ('signup-confirmation', 'email', 'Signup Confirmed', 'Your signup has been confirmed. Session ID: {{sessionId}}', 'sessionId,workspaceId', 'en', NULL, true),
        ('rider-onboarded', 'sms', 'Welcome Rider', 'Welcome {{fullName}}! You are now part of {{saccoName}}.', 'fullName,saccoName', 'en', NULL, true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_preferences"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "recipient_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_channel_enum"`);
  }
}
