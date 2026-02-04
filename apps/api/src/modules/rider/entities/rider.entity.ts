import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { VehicleType, LocationData } from '@zanafleet/contracts';
import { SaccoEntity } from '../../sacco/entities/sacco.entity';

/**
 * Rider Entity
 * Represents the Postgres persistence model for riders (transport service providers)
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Unique constraints on phone (primary identity) and nationalId
 * - Indexed columns for common queries (vehicleType, saccoId)
 * - Location stored as JSONB with embedded LocationData
 * - Optional ManyToOne relationship to Sacco
 * - Timestamps for audit trail
 */
@Entity('riders')
@Unique('UQ_rider_phone', ['phone'])
@Unique('UQ_rider_national_id', ['nationalId'])
@Index(['vehicleType'])
@Index(['saccoId'])
export class RiderEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  fullName!: string;

  @Column('varchar', { length: 20 })
  nationalId!: string;

  @Column('varchar', { length: 20 })
  phone!: string;

  @Column('jsonb')
  location!: LocationData;

  @Column('enum', { enum: VehicleType })
  vehicleType!: VehicleType;

  @Column('uuid', { nullable: true })
  saccoId!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  email?: string | null;

  @ManyToOne(() => SaccoEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sacco_id' })
  sacco?: SaccoEntity | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    riderId: string;
    fullName: string;
    nationalId: string;
    phone: string;
    location: LocationData;
    vehicleType: VehicleType;
    saccoId: string | null;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      riderId: this.id,
      fullName: this.fullName,
      nationalId: this.nationalId,
      phone: this.phone,
      location: this.location,
      vehicleType: this.vehicleType,
      saccoId: this.saccoId ?? null,
      email: this.email ?? null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    riderId: string;
    fullName: string;
    nationalId: string;
    phone: string;
    location: LocationData;
    vehicleType: VehicleType;
    saccoId: string | null;
    email?: string | null;
    createdAt: Date;
  }): RiderEntity {
    const entity = new RiderEntity();
    entity.id = data.riderId;
    entity.fullName = data.fullName;
    entity.nationalId = data.nationalId;
    entity.phone = data.phone;
    entity.location = data.location;
    entity.vehicleType = data.vehicleType;
    entity.saccoId = data.saccoId;
    entity.email = data.email ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
