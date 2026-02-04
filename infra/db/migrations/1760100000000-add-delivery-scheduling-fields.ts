import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliverySchedulingFields1760100000000 implements MigrationInterface {
  name = 'AddDeliverySchedulingFields1760100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "deliveries"
      ADD COLUMN "scheduledPickupTime" TIMESTAMP WITH TIME ZONE
    `);

    await queryRunner.query(`
      ALTER TABLE "deliveries"
      ADD COLUMN "scheduledDropoffTime" TIMESTAMP WITH TIME ZONE
    `);

    await queryRunner.query(`
      ALTER TABLE "deliveries"
      ADD COLUMN "isScheduled" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_deliveries_scheduled_dropoff_time"
      ON "deliveries" ("scheduledDropoffTime")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deliveries_scheduled_dropoff_time"`);
    await queryRunner.query(`
      ALTER TABLE "deliveries"
      DROP COLUMN "isScheduled"
    `);
    await queryRunner.query(`
      ALTER TABLE "deliveries"
      DROP COLUMN "scheduledDropoffTime"
    `);
    await queryRunner.query(`
      ALTER TABLE "deliveries"
      DROP COLUMN "scheduledPickupTime"
    `);
  }
}
