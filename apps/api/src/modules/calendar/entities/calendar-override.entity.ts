import { CalendarScope } from '@zanafleet/contracts';
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';


/**
 * CalendarOverride Entity
 * Represents exceptions/overrides to normal calendar rules.
 * Used for scenarios like "Allow deliveries on holiday" for premium merchants.
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Indexed columns for common queries (targetScope, validFrom, validUntil, priority)
 * - JSONB for flexible metadata storage
 * - Time-bound validity with validFrom/validUntil
 */
@Entity('calendar_overrides')
@Index(['targetScope'])
@Index(['targetScopeId'])
@Index(['validFrom'])
@Index(['validUntil'])
@Index(['isActive'])
@Index(['priority'])
export class CalendarOverrideEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('enum', { enum: CalendarScope })
  targetScope!: CalendarScope;

  @Column('uuid', { nullable: true })
  targetScopeId!: string | null;

  @Column('varchar', { length: 100 })
  exceptionType!: string;

  @Column('text', { nullable: true })
  reason!: string | null;

  @Column({ type: 'timestamp with time zone' })
  validFrom!: Date;

  @Column({ type: 'timestamp with time zone' })
  validUntil!: Date;

  @Column('int', { default: 0 })
  priority!: number;

  @Column('jsonb', { nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column('boolean', { default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    overrideId: string;
    targetScope: CalendarScope;
    targetScopeId: string | null;
    exceptionType: string;
    reason: string | null;
    validFrom: Date;
    validUntil: Date;
    priority: number;
    metadata: Record<string, unknown> | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      overrideId: this.id,
      targetScope: this.targetScope,
      targetScopeId: this.targetScopeId,
      exceptionType: this.exceptionType,
      reason: this.reason,
      validFrom: this.validFrom,
      validUntil: this.validUntil,
      priority: this.priority,
      metadata: this.metadata,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    overrideId: string;
    targetScope: CalendarScope;
    targetScopeId?: string | null;
    exceptionType: string;
    reason?: string | null;
    validFrom: Date;
    validUntil: Date;
    priority?: number;
    metadata?: Record<string, unknown> | null;
    isActive?: boolean;
    createdAt: Date;
    updatedAt?: Date;
  }): CalendarOverrideEntity {
    const entity = new CalendarOverrideEntity();
    entity.id = data.overrideId;
    entity.targetScope = data.targetScope;
    entity.targetScopeId = data.targetScopeId ?? null;
    entity.exceptionType = data.exceptionType;
    entity.reason = data.reason ?? null;
    entity.validFrom = data.validFrom;
    entity.validUntil = data.validUntil;
    entity.priority = data.priority ?? 0;
    entity.metadata = data.metadata ?? null;
    entity.isActive = data.isActive ?? true;
    entity.createdAt = data.createdAt;
    entity.updatedAt = data.updatedAt ?? data.createdAt;
    return entity;
  }
}
