import { Entity, PrimaryColumn, Column, UpdateDateColumn, Index } from 'typeorm';

import { GeoJsonPoint } from '../../../core/utils/geo.utils';

/**
 * Stores the current/latest location for each rider.
 * Uses riderId as PK for upsert semantics (one row per rider).
 * The point column is a PostGIS geometry for spatial queries.
 */
@Entity('rider_location_snapshots')
@Index('idx_snapshot_h3_medium', ['h3IndexMedium'])
export class RiderLocationSnapshotEntity {
  @PrimaryColumn('uuid')
  riderId!: string;

  @Column('double precision')
  latitude!: number;

  @Column('double precision')
  longitude!: number;

  /**
   * PostGIS Point geometry (SRID 4326 - WGS84).
   * Stored as GeoJSON: { type: 'Point', coordinates: [lng, lat] }
   */
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  point!: GeoJsonPoint;

  /** H3 index at resolution 9 (~174m hexagons) */
  @Column({ type: 'varchar', length: 15 })
  h3IndexFine!: string;

  /** H3 index at resolution 7 (~1.2km hexagons) - indexed for heatmap queries */
  @Column({ type: 'varchar', length: 15 })
  h3IndexMedium!: string;

  /** H3 index at resolution 5 (~8km hexagons) */
  @Column({ type: 'varchar', length: 15 })
  h3IndexCoarse!: string;

  /** Compass heading in degrees (0-360), null if unavailable */
  @Column('double precision', { nullable: true })
  heading!: number | null;

  /** Speed in meters per second, null if unavailable */
  @Column('double precision', { nullable: true })
  speed!: number | null;

  /** GPS accuracy in meters, null if unavailable */
  @Column('double precision', { nullable: true })
  accuracy!: number | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
