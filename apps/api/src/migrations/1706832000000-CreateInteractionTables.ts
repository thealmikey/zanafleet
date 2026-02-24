import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CreateInteractionTables Migration
 *
 * Creates the following tables:
 * - interaction_streams: Stores interaction streams (conversations)
 * - interaction_events: Stores individual events within streams
 */
export class CreateInteractionTables1706832000000 implements MigrationInterface {
  name = 'CreateInteractionTables1706832000000';

  /**
   * Create interaction_streams and interaction_events tables
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create interaction_streams enum types
    await queryRunner.query(`
      CREATE TYPE "interaction_stream_state_enum" AS ENUM (
        'ACTIVE',
        'ARCHIVED',
        'CLOSED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "interaction_context_type_enum" AS ENUM (
        'ORDER',
        'DELIVERY',
        'PAYMENT',
        'MOVES_QUOTE',
        'SUPPORT_TICKET',
        'GENERAL'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "interaction_event_type_enum" AS ENUM (
        'HUMAN_MESSAGE',
        'HUMAN_ACTION',
        'AI_RESPONSE',
        'AI_INTENT_DETECTED',
        'AI_SUMMARIZATION',
        'SYSTEM_NOTIFICATION',
        'POLICY_VIOLATION',
        'SLACK_MESSAGE',
        'TICKET_RESPONSE',
        'EMAIL_RECEIVED',
        'WEBHOOK_EVENT',
        'ORDER_CREATED',
        'ORDER_STATUS_CHANGED',
        'PAYMENT_COMPLETED',
        'DELIVERY_ASSIGNED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "interaction_actor_type_enum" AS ENUM (
        'USER',
        'ORGANIZATION',
        'DRIVER',
        'RIDER',
        'SYSTEM',
        'AI_AGENT',
        'EXTERNAL_INTEGRATION'
      )
    `);

    // Create interaction_streams table
    await queryRunner.query(`
      CREATE TABLE "interaction_streams" (
        "id" uuid NOT NULL PRIMARY KEY,
        "contextType" "interaction_context_type_enum" NOT NULL,
        "contextId" uuid NOT NULL,
        "state" "interaction_stream_state_enum" NOT NULL DEFAULT 'ACTIVE',
        "metadata" jsonb,
        "participantIds" text[] NOT NULL DEFAULT ARRAY[]::text[],
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);

    // Create indexes for interaction_streams
    await queryRunner.query(`
      CREATE INDEX "idx_interaction_streams_context" 
      ON "interaction_streams" ("contextType", "contextId")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_interaction_streams_state" 
      ON "interaction_streams" ("state")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_interaction_streams_created_at" 
      ON "interaction_streams" ("createdAt")
    `);

    // Create interaction_events table
    await queryRunner.query(`
      CREATE TABLE "interaction_events" (
        "id" uuid NOT NULL PRIMARY KEY,
        "streamId" uuid NOT NULL REFERENCES "interaction_streams"("id") ON DELETE CASCADE,
        "actorId" uuid NOT NULL,
        "actorType" "interaction_actor_type_enum" NOT NULL,
        "eventType" "interaction_event_type_enum" NOT NULL,
        "payload" jsonb NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);

    // Create indexes for interaction_events
    await queryRunner.query(`
      CREATE INDEX "idx_interaction_events_stream_created" 
      ON "interaction_events" ("streamId", "createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_interaction_events_actor_type" 
      ON "interaction_events" ("actorType")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_interaction_events_event_type" 
      ON "interaction_events" ("eventType")
    `);
  }

  /**
   * Drop interaction_streams and interaction_events tables
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop interaction_events table
    await queryRunner.query(`DROP TABLE IF EXISTS "interaction_events"`);

    // Drop interaction_streams table
    await queryRunner.query(`DROP TABLE IF EXISTS "interaction_streams"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "interaction_stream_state_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "interaction_context_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "interaction_event_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "interaction_actor_type_enum"`);
  }
}
