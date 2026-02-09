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
 * Calendar Entity
 * Represents the Postgres persistence model for calendar definitions.
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Indexed columns for common queries (ownerScope, isActive)
 * - IANA timezone identifiers for accurate time calculations
 */
@Entity('calendars')
@Index(['ownerScope'])
@Index(['isActive'])
export class CalendarEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255, unique: true })
  name!: string;

  @Column('varchar', { length: 50 })
  timezone!: string;

  @Column('varchar', { length: 10 })
  locale!: string;

  @Column('enum', { enum: CalendarScope })
  ownerScope!: CalendarScope;

  @Column('uuid', { nullable: true })
  ownerScopeId!: string | null;

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
    calendarId: string;
    name: string;
    timezone: string;
    locale: string;
    ownerScope: CalendarScope;
    ownerScopeId: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      calendarId: this.id,
      name: this.name,
      timezone: this.timezone,
      locale: this.locale,
      ownerScope: this.ownerScope,
      ownerScopeId: this.ownerScopeId,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    calendarId: string;
    name: string;
    timezone: string;
    locale?: string;
    ownerScope: CalendarScope;
    ownerScopeId?: string | null;
    isActive?: boolean;
    createdAt: Date;
    updatedAt?: Date;
  }): CalendarEntity {
    const entity = new CalendarEntity();
    entity.id = data.calendarId;
    entity.name = data.name;
    entity.timezone = data.timezone;
    entity.locale = data.locale ?? 'en-KE';
    entity.ownerScope = data.ownerScope;
    entity.ownerScopeId = data.ownerScopeId ?? null;
    entity.isActive = data.isActive ?? true;
    entity.createdAt = data.createdAt;
    entity.updatedAt = data.updatedAt ?? data.createdAt;
    return entity;
  }
}
