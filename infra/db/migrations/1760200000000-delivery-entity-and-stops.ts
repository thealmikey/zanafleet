import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm'

export class DeliveryEntityAndStops1760200000000 implements MigrationInterface {
  name = 'DeliveryEntityAndStops1760200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add additive columns to deliveries table for lifecycle, attempts, SLA, and tracking
    await queryRunner.query(`
      ALTER TABLE "deliveries"
      ADD COLUMN IF NOT EXISTS "assignedRiderId" uuid NULL,
      ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP WITH TIME ZONE NULL,
      ADD COLUMN IF NOT EXISTS "assignmentNotifiedAt" TIMESTAMP WITH TIME ZONE NULL,
      ADD COLUMN IF NOT EXISTS "pickedUpAt" TIMESTAMP WITH TIME ZONE NULL,
      ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP WITH TIME ZONE NULL,
      ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP WITH TIME ZONE NULL,
      ADD COLUMN IF NOT EXISTS "firstAttemptAt" TIMESTAMP WITH TIME ZONE NULL,
      ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP WITH TIME ZONE NULL,
      ADD COLUMN IF NOT EXISTS "attemptCount" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "slaPickupBy" TIMESTAMP WITH TIME ZONE NULL,
      ADD COLUMN IF NOT EXISTS "slaDropoffBy" TIMESTAMP WITH TIME ZONE NULL,
      ADD COLUMN IF NOT EXISTS "slaBreachedAt" TIMESTAMP WITH TIME ZONE NULL,
      ADD COLUMN IF NOT EXISTS "visibilityToken" varchar(64) NULL,
      ADD COLUMN IF NOT EXISTS "trackingCode" varchar(64) NULL,
      ADD COLUMN IF NOT EXISTS "trackingUrl" varchar(512) NULL
    `)

    // Helpful indexes on deliveries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_deliveries_assigned_rider_id"
      ON "deliveries" ("assignedRiderId")
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_deliveries_business_id"
      ON "deliveries" ("businessId")
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_deliveries_status"
      ON "deliveries" ("status")
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_deliveries_scheduled_pickup_time"
      ON "deliveries" ("scheduledPickupTime")
    `)

    // delivery_stops table
    await queryRunner.createTable(
      new Table({
        name: 'delivery_stops',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'deliveryId', type: 'uuid', isNullable: false },
          { name: 'sequence', type: 'int', isNullable: false },
          { name: 'type', type: 'varchar', length: '32', isNullable: false },
          { name: 'locationId', type: 'uuid', isNullable: false },
          { name: 'scheduledTime', type: 'timestamp with time zone', isNullable: true },
          { name: 'actualTime', type: 'timestamp with time zone', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'now()' },
        ],
        indices: [
          { name: 'IDX_delivery_stops_delivery_id', columnNames: ['deliveryId'] },
          { name: 'IDX_delivery_stops_delivery_id_sequence', columnNames: ['deliveryId', 'sequence'] },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_delivery_stops_delivery_id',
            columnNames: ['deliveryId'],
            referencedTableName: 'deliveries',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    )

    // delivery_orders table (no FK to orders; store orderId as unconstrained UUID)
    await queryRunner.createTable(
      new Table({
        name: 'delivery_orders',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'deliveryId', type: 'uuid', isNullable: false },
          { name: 'orderId', type: 'uuid', isNullable: false },
          { name: 'sequence', type: 'int', isNullable: false, default: 0 },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'now()' },
        ],
        indices: [
          { name: 'IDX_delivery_orders_delivery_id', columnNames: ['deliveryId'] },
        ],
        uniques: [
          { name: 'UQ_delivery_orders_delivery_order', columnNames: ['deliveryId', 'orderId'] },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_delivery_orders_delivery_id',
            columnNames: ['deliveryId'],
            referencedTableName: 'deliveries',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop delivery_orders (with FKs)
    await queryRunner.dropTable('delivery_orders', true)
    // Drop delivery_stops (with FKs)
    await queryRunner.dropTable('delivery_stops', true)

    // Drop indexes from deliveries
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deliveries_scheduled_pickup_time"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deliveries_status"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deliveries_business_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deliveries_assigned_rider_id"`)

    // Remove additive columns from deliveries
    await queryRunner.query(`
      ALTER TABLE "deliveries"
      DROP COLUMN IF EXISTS "trackingUrl",
      DROP COLUMN IF EXISTS "trackingCode",
      DROP COLUMN IF EXISTS "visibilityToken",
      DROP COLUMN IF EXISTS "slaBreachedAt",
      DROP COLUMN IF EXISTS "slaDropoffBy",
      DROP COLUMN IF EXISTS "slaPickupBy",
      DROP COLUMN IF EXISTS "attemptCount",
      DROP COLUMN IF EXISTS "lastAttemptAt",
      DROP COLUMN IF EXISTS "firstAttemptAt",
      DROP COLUMN IF EXISTS "cancelledAt",
      DROP COLUMN IF EXISTS "deliveredAt",
      DROP COLUMN IF EXISTS "pickedUpAt",
      DROP COLUMN IF EXISTS "assignmentNotifiedAt",
      DROP COLUMN IF EXISTS "assignedAt",
      DROP COLUMN IF EXISTS "assignedRiderId"
    `)
  }
}
