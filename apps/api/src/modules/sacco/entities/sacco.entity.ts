import { LocationData } from '@zanafleet/contracts';
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

/**
 * Sacco Entity
 * Represents the Postgres persistence model for saccos (transport cooperatives)
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Unique constraint on name
 * - Indexed columns for common queries
 * - Timestamps for audit trail
 */
@Entity('saccos')
@Unique('UQ_sacco_name', ['name'])
@Index(['workspaceId'])
export class SaccoEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('jsonb')
  location!: LocationData;

  @Column('varchar', { length: 20 })
  contactPhone!: string;

  @Column('uuid')
  workspaceId!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    saccoId: string;
    name: string;
    location: LocationData;
    contactPhone: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      saccoId: this.id,
      name: this.name,
      location: this.location,
      contactPhone: this.contactPhone,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    saccoId: string;
    name: string;
    location: LocationData;
    contactPhone: string;
    createdAt: Date;
  }): SaccoEntity {
    const entity = new SaccoEntity();
    entity.id = data.saccoId;
    entity.name = data.name;
    entity.location = data.location;
    entity.contactPhone = data.contactPhone;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
