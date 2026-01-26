import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { OrganizationType, OrganizationStatus } from '../dto/organization.enums';

/**
 * Organization Entity
 * Represents the Postgres persistence model for organizations
 * 
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Indexed columns for common queries
 * - Timestamps for audit trail
 * - Enum types for status and type fields
 */
@Entity('organizations')
@Index(['status'])
@Index(['type'])
@Index(['createdAt'])
export class OrganizationEntity {
  @PrimaryColumn('uuid')
  id: string; // organizationId

  @Column('varchar', { length: 255 })
  name: string;

  @Column('enum', { enum: OrganizationType })
  type: OrganizationType;

  @Column('enum', { enum: OrganizationStatus })
  status: OrganizationStatus;

  @Column('uuid', { array: true, default: () => 'ARRAY[]::uuid[]' })
  linkedWallets: string[]; // Array of wallet UUIDs

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  /**
   * Convert entity to domain object
   */
  toDomain() {
    return {
      organizationId: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      linkedWallets: this.linkedWallets,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    organizationId: string;
    name: string;
    type: OrganizationType;
    status: OrganizationStatus;
    linkedWallets: string[];
    createdAt: Date;
  }): OrganizationEntity {
    const entity = new OrganizationEntity();
    entity.id = data.organizationId;
    entity.name = data.name;
    entity.type = data.type;
    entity.status = data.status;
    entity.linkedWallets = data.linkedWallets;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
