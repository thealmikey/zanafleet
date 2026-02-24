import { BusinessType, LocationData } from '@zanafleet/contracts';
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Business Entity
 * Represents the Postgres persistence model for businesses
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Unique constraint on phone (primary identity)
 * - Indexed columns for common queries
 * - Timestamps for audit trail
 * - Enum type for business type field
 * - JSONB column for embedded location data
 */
@Entity('businesses')
@Unique('UQ_business_phone', ['phone'])
@Index(['businessType'])
@Index(['workspaceId'])
export class BusinessEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  businessName!: string;

  @Column('varchar', { length: 20 })
  phone!: string;

  @Column('jsonb')
  location!: LocationData;

  @Column('enum', { enum: BusinessType })
  businessType!: BusinessType;

  @Column('varchar', { length: 255, nullable: true })
  email?: string | null;

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
    businessId: string;
    businessName: string;
    phone: string;
    location: LocationData;
    businessType: BusinessType;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      businessId: this.id,
      businessName: this.businessName,
      phone: this.phone,
      location: this.location,
      businessType: this.businessType,
      email: this.email ?? null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    businessId: string;
    businessName: string;
    phone: string;
    location: LocationData;
    businessType: BusinessType;
    email?: string | null;
    createdAt: Date;
  }): BusinessEntity {
    const entity = new BusinessEntity();
    entity.id = data.businessId;
    entity.businessName = data.businessName;
    entity.phone = data.phone;
    entity.location = data.location;
    entity.businessType = data.businessType;
    entity.email = data.email ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
