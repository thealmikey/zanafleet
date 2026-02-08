import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Append-only time-series table for rider location history.
 * Used for path reconstruction, analytics, and audit trails.
 */
@Entity('rider_location_history')
@Index('idx_history_rider_recorded', ['riderId', 'recordedAt'])
@Index('idx_history_h3_medium', ['h3IndexMedium'])
export class RiderLocationHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  @Index('idx_history_rider')
  riderId!: string;

  @Column('double precision')
  latitude!: number;

  @Column('double precision')
  longitude!: number;

  /**
   * PostGIS Point geometry (SRID 4326 - WGS84).
   * Stored as GeoJSON-compatible object: { type: 'Point', coordinates: [lng, lat] }
   */
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  point!: object;

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

  /** Timestamp when the location was recorded on the device */
  @CreateDateColumn({ type: 'timestamptz' })
  @Index('idx_history_recorded')
  recordedAt!: Date;
}
