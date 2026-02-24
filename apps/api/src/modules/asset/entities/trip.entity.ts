import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { AssetEntity } from './asset.entity';

/**
 * Trip Entity
 * Captures all usage of an asset, including duration, distance, and earnings.
 */
@Entity('trips')
@Index(['assetId'])
@Index(['operatorId'])
@Index(['bundleId'])
export class TripEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid', { nullable: true })
  bundleId?: string; // For grouping multiple resources in a single project/move

  @Column('uuid')
  assetId!: string;

  @ManyToOne(() => AssetEntity)
  @JoinColumn({ name: 'asset_id' })
  asset?: AssetEntity;

  @Column('uuid')
  operatorId!: string; // Linked to OperatorEntity.id

  @Column({ type: 'timestamp with time zone' })
  startTime!: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  endTime?: Date;

  @Column('float', { nullable: true })
  distanceMeters?: number;

  @Column('float', { nullable: true })
  earnings?: number;

  @Column('float', { nullable: true })
  rating?: number;

  @Column('jsonb', { nullable: true })
  incidents?: Record<string, unknown>[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain-compatible object
   */
  toDomain() {
    return {
      tripId: this.id,
      assetId: this.assetId,
      operatorId: this.operatorId,
      startTime: this.startTime,
      endTime: this.endTime,
      distanceMeters: this.distanceMeters,
      earnings: this.earnings,
      rating: this.rating,
      incidents: this.incidents,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
