import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CreateWorkflowTables Migration
 *
 * Creates the workflow engine tables:
 * - process_definitions: Blueprint for process definitions
 * - process_instances: Runtime process instances
 * - process_transitions: Transition rules between states
 */
export class CreateWorkflowTables1749652800001 implements MigrationInterface {
  name = 'CreateWorkflowTables1749652800001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create process_state enum
    await queryRunner.query(`
      CREATE TYPE "process_state_enum" AS ENUM (
        'draft',
        'estimate_requested',
        'options_presented',
        'booking_confirmed',
        'payment_authorized',
        'driver_assigned',
        'vehicle_assigned',
        'in_progress',
        'arrived',
        'loading',
        'unloading',
        'completed',
        'cancelled',
        'failed'
      )
    `);

    // Create process_instance_status enum
    await queryRunner.query(`
      CREATE TYPE "process_instance_status_enum" AS ENUM (
        'active',
        'suspended',
        'completed',
        'cancelled',
        'failed'
      )
    `);

    // Create transition_trigger_type enum
    await queryRunner.query(`
      CREATE TYPE "transition_trigger_type_enum" AS ENUM (
        'event',
        'manual',
        'timeout',
        'ai_suggestion'
      )
    `);

    // Create guard_type enum
    await queryRunner.query(`
      CREATE TYPE "guard_type_enum" AS ENUM (
        'policy',
        'expression',
        'callback'
      )
    `);

    // Create process_definitions table
    await queryRunner.query(`
      CREATE TABLE "process_definitions" (
        "definitionId" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "version" varchar(50) NOT NULL DEFAULT '1.0.0',
        "isActive" boolean NOT NULL DEFAULT true,
        "allowedStates" text,
        "metadata" jsonb,
        "initialState" varchar(100),
        "terminalStates" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_process_definitions" PRIMARY KEY ("definitionId")
      )
    `);

    // Create index on process_definitions
    await queryRunner.query(`
      CREATE INDEX "IDX_process_definitions_name_version" ON "process_definitions" ("name", "version")
    `);

    // Create process_transitions table
    await queryRunner.query(`
      CREATE TABLE "process_transitions" (
        "transitionId" uuid NOT NULL,
        "definitionId" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "sourceState" varchar(100) NOT NULL,
        "targetState" varchar(100) NOT NULL,
        "triggerType" "transition_trigger_type_enum" NOT NULL DEFAULT 'event',
        "triggerEventType" varchar(255),
        "guardConditions" jsonb NOT NULL DEFAULT '[]',
        "actions" jsonb NOT NULL DEFAULT '[]',
        "isActive" boolean NOT NULL DEFAULT true,
        "priority" int NOT NULL DEFAULT 0,
        "timeoutMs" bigint,
        "timeoutEventType" varchar(255),
        CONSTRAINT "PK_process_transitions" PRIMARY KEY ("transitionId"),
        CONSTRAINT "FK_process_transitions_definition" FOREIGN KEY ("definitionId")
          REFERENCES "process_definitions"("definitionId") ON DELETE CASCADE
      )
    `);

    // Create indexes for process_transitions
    await queryRunner.query(`
      CREATE INDEX "IDX_process_transitions_definition_source" ON "process_transitions" ("definitionId", "sourceState")
    `);

    // Create process_instances table
    await queryRunner.query(`
      CREATE TABLE "process_instances" (
        "instanceId" uuid NOT NULL,
        "definitionId" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "currentState" "process_state_enum" NOT NULL DEFAULT 'draft',
        "status" "process_instance_status_enum" NOT NULL DEFAULT 'active',
        "context" jsonb NOT NULL DEFAULT '{}',
        "relatedEntities" jsonb NOT NULL DEFAULT '[]',
        "triggeredBy" varchar(255),
        "correlationId" uuid,
        "parentInstanceId" uuid,
        "expiresAt" TIMESTAMP,
        "transitionCount" int NOT NULL DEFAULT 0,
        "history" jsonb NOT NULL DEFAULT '[]',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "completedAt" TIMESTAMP,
        CONSTRAINT "PK_process_instances" PRIMARY KEY ("instanceId"),
        CONSTRAINT "FK_process_instances_definition" FOREIGN KEY ("definitionId")
          REFERENCES "process_definitions"("definitionId") ON DELETE RESTRICT
      )
    `);

    // Create indexes for process_instances
    await queryRunner.query(`
      CREATE INDEX "IDX_process_instances_definition_status" ON "process_instances" ("definitionId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_process_instances_state_status" ON "process_instances" ("currentState", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_process_instances_created" ON "process_instances" ("createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_process_instances_correlation" ON "process_instances" ("correlationId")
    `);

    // Insert MoveBookingProcess definition
    await queryRunner.query(`
      INSERT INTO "process_definitions" (
        "definitionId",
        "name",
        "description",
        "version",
        "isActive",
        "allowedStates",
        "initialState",
        "terminalStates",
        "metadata"
      ) VALUES (
        'move-booking-v1',
        'MoveBookingProcess',
        'Process for booking a move with driver and vehicle',
        '1.0.0',
        true,
        'draft,estimate_requested,options_presented,booking_confirmed,payment_authorized,driver_assigned,vehicle_assigned,in_progress,completed,cancelled,failed',
        'estimate_requested',
        'completed,cancelled,failed',
        '{"category": "booking", "slaMinutes": 480, "requiresPayment": true, "requiresDriver": true}'
      )
    `);

    // Insert MoveBookingProcess transitions
    await queryRunner.query(`
      INSERT INTO "process_transitions" (
        "transitionId",
        "definitionId",
        "name",
        "description",
        "sourceState",
        "targetState",
        "triggerType",
        "triggerEventType",
        "guardConditions",
        "actions",
        "isActive",
        "priority"
      ) VALUES
        (
          'move-booking-request-estimate',
          'move-booking-v1',
          'RequestEstimate',
          'Request a move estimate from the system',
          'draft',
          'estimate_requested',
          'manual',
          NULL,
          '[]',
          '[]',
          true,
          100
        ),
        (
          'move-booking-present-options',
          'move-booking-v1',
          'PresentOptions',
          'Present available move options to the customer',
          'estimate_requested',
          'options_presented',
          'event',
          'EstimateGeneratedEvent-V1',
          '[]',
          '[]',
          true,
          100
        ),
        (
          'move-booking-confirm',
          'move-booking-v1',
          'ConfirmBooking',
          'Customer confirms the booking',
          'options_presented',
          'booking_confirmed',
          'event',
          'BookingConfirmedEvent-V1',
          '[{"guardType": "policy", "guardName": "booking_allowed", "policyScope": "move_booking", "policyAction": "confirm", "failMessage": "Booking is not allowed at this time"}]',
          '[]',
          true,
          100
        ),
        (
          'move-booking-authorize-payment',
          'move-booking-v1',
          'AuthorizePayment',
          'Authorize payment for the booking',
          'booking_confirmed',
          'payment_authorized',
          'event',
          'PaymentAuthorizedEvent-V1',
          '[{"guardType": "policy", "guardName": "payment_valid", "policyScope": "payment", "policyAction": "authorize", "failMessage": "Payment authorization failed"}]',
          '[]',
          true,
          100
        ),
        (
          'move-booking-assign-driver',
          'move-booking-v1',
          'AssignDriver',
          'Assign a driver to the booking',
          'payment_authorized',
          'driver_assigned',
          'event',
          'DriverAssignedEvent-V1',
          '[]',
          '[]',
          true,
          100
        ),
        (
          'move-booking-start',
          'move-booking-v1',
          'StartMove',
          'Driver starts the move',
          'driver_assigned',
          'in_progress',
          'event',
          'MoveStartedEvent-V1',
          '[]',
          '[]',
          true,
          100
        ),
        (
          'move-booking-complete',
          'move-booking-v1',
          'CompleteMove',
          'Move is completed successfully',
          'in_progress',
          'completed',
          'event',
          'DeliveryCompletedEvent-V1',
          '[]',
          '[{"actionType": "event", "actionName": "move.completed", "payload": {}, "async": false, "onFailure": "continue"}]',
          true,
          100
        ),
        (
          'move-booking-cancel',
          'move-booking-v1',
          'CancelBooking',
          'Cancel the booking',
          'options_presented',
          'cancelled',
          'event',
          'BookingCancelledEvent-V1',
          '[]',
          '[]',
          true,
          50
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "process_instances"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "process_transitions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "process_definitions"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "guard_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transition_trigger_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "process_instance_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "process_state_enum"`);
  }
}
