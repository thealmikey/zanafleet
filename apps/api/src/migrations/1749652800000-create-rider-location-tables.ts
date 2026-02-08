import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to create rider location tables with PostGIS support.
 * Enables the PostGIS extension and creates both snapshot and history tables
 * with appropriate spatial and BTREE indexes.
 */
export class CreateRiderLocationTables1749652800000 implements MigrationInterface {
  name = 'CreateRiderLocationTables1749652800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable PostGIS extension (idempotent)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    // Create rider_location_snapshots table (current location per rider)
    await queryRunner.query(`
      CREATE TABLE "rider_location_snapshots" (
        "rider_id" uuid NOT NULL,
        "latitude" double precision NOT NULL,
        "longitude" double precision NOT NULL,
        "point" geometry(Point, 4326) NOT NULL,
        "h3_index_fine" varchar(15) NOT NULL,
        "h3_index_medium" varchar(15) NOT NULL,
        "h3_index_coarse" varchar(15) NOT NULL,
        "heading" double precision,
        "speed" double precision,
        "accuracy" double precision,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rider_location_snapshots" PRIMARY KEY ("rider_id")
      )
    `);

    // Create rider_location_history table (append-only time-series)
    await queryRunner.query(`
      CREATE TABLE "rider_location_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "rider_id" uuid NOT NULL,
        "latitude" double precision NOT NULL,
        "longitude" double precision NOT NULL,
        "point" geometry(Point, 4326) NOT NULL,
        "h3_index_fine" varchar(15) NOT NULL,
        "h3_index_medium" varchar(15) NOT NULL,
        "h3_index_coarse" varchar(15) NOT NULL,
        "heading" double precision,
        "speed" double precision,
        "accuracy" double precision,
        "recorded_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rider_location_history" PRIMARY KEY ("id")
      )
    `);

    // GiST spatial indexes for ST_DWithin and other spatial queries
    await queryRunner.query(`
      CREATE INDEX "idx_snapshot_point_gist" 
      ON "rider_location_snapshots" 
      USING GIST ("point")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_history_point_gist" 
      ON "rider_location_history" 
      USING GIST ("point")
    `);

    // BTREE indexes on H3 medium resolution for heatmap aggregation queries
    await queryRunner.query(`
      CREATE INDEX "idx_snapshot_h3_medium" 
      ON "rider_location_snapshots" ("h3_index_medium")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_history_h3_medium" 
      ON "rider_location_history" ("h3_index_medium")
    `);

    // BTREE index on rider_id for history lookups
    await queryRunner.query(`
      CREATE INDEX "idx_history_rider" 
      ON "rider_location_history" ("rider_id")
    `);

    // Composite index for path queries (rider + time range)
    await queryRunner.query(`
      CREATE INDEX "idx_history_rider_recorded" 
      ON "rider_location_history" ("rider_id", "recorded_at")
    `);

    // Index on recorded_at for time-range queries
    await queryRunner.query(`
      CREATE INDEX "idx_history_recorded" 
      ON "rider_location_history" ("recorded_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_history_recorded"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_history_rider_recorded"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_history_rider"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_history_h3_medium"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_snapshot_h3_medium"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_history_point_gist"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_snapshot_point_gist"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "rider_location_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rider_location_snapshots"`);

    // Note: We don't drop the PostGIS extension as other tables may depend on it
  }
}
