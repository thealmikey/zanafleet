import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Capability categories for organization
 */
export enum CapabilityCategory {
  ADMIN = 'admin',
  BUSINESS = 'business',
  DELIVERY = 'delivery',
  FINANCIAL = 'financial',
  RIDER = 'rider',
  CUSTOMER = 'customer',
  REPORTING = 'reporting',
  AUDIT = 'audit',
  SYSTEM = 'system',
}

/**
 * Capability metadata stored as JSON
 */
export interface CapabilityMetadata {
  /**
   * Human-readable description of what this capability grants
   */
  description?: string;

  /**
   * Category for organizing capabilities
   */
  category?: CapabilityCategory | string;

  /**
   * Whether this capability requires explicit user consent
   */
  requiresConsent?: boolean;

  /**
   * Semantic version for capability schema
   */
  version?: string;

  /**
   * Additional custom metadata
   */
  [key: string]: unknown;
}

/**
 * CapabilityEntity
 *
 * Enhanced entity with metadata support for:
 * - Introspection (list all capabilities, query by category)
 * - AI/UI consumption (descriptions, metadata)
 * - Consent requirements tracking
 */
@Entity('capabilities')
@Index('capabilities_name_unique', ['name'], { unique: true })
@Index('capabilities_created_at_index', ['createdAt'])
@Index('capabilities_category_index', ['category'])
export class CapabilityEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  /**
   * Human-readable description
   */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Category for organizing capabilities
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  category!: string | null;

  /**
   * Whether this capability requires explicit consent
   */
  @Column({ type: 'boolean', default: false })
  requiresConsent!: boolean;

  /**
   * Semantic version for the capability definition
   */
  @Column({ type: 'varchar', length: 20, default: '1.0.0' })
  version!: string;

  /**
   * Additional metadata as JSON
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Get full metadata as structured object
   */
  getMetadata(): CapabilityMetadata {
    return {
      description: this.description ?? undefined,
      category: this.category ?? undefined,
      requiresConsent: this.requiresConsent,
      version: this.version,
      ...this.metadata,
    };
  }

  /**
   * Check if capability requires consent
   */
  getRequiresConsent(): boolean {
    return this.requiresConsent;
  }

  toDomain(): {
    capabilityId: string;
    name: string;
    description: string | null;
    category: string | null;
    requiresConsent: boolean;
    version: string;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      capabilityId: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      requiresConsent: this.requiresConsent,
      version: this.version,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromDomain(data: {
    capabilityId: string;
    name: string;
    description?: string | null;
    category?: string | null;
    requiresConsent?: boolean;
    version?: string;
    metadata?: Record<string, unknown> | null;
    createdAt?: Date;
  }): CapabilityEntity {
    const entity = new CapabilityEntity();
    entity.id = data.capabilityId;
    entity.name = data.name;
    entity.description = data.description ?? null;
    entity.category = data.category ?? null;
    entity.requiresConsent = data.requiresConsent ?? false;
    entity.version = data.version ?? '1.0.0';
    entity.metadata = data.metadata ?? null;
    entity.createdAt = data.createdAt ?? new Date();
    return entity;
  }
}
