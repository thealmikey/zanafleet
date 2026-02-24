import { CalendarEventType, RecurrencePattern } from '@zanafleet/contracts';
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Region Scope Interface
 * Defines geographic applicability for calendar events.
 * Events can target specific regions hierarchically: country > administrativeArea > locality
 */
export interface RegionScope {
  country?: string;
  administrativeArea?: string;
  locality?: string;
}

/**
 * Recurrence Rule Interface
 * RRULE-style recurrence definitions for recurring events.
 */
export interface RecurrenceRule {
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  count?: number;
  until?: string;
  byDay?: string[];
  byMonth?: number[];
  byMonthDay?: number[];
  /** Raw RRULE string from external calendar sources */
  rule?: string;
}

/**
 * CalendarEvent Entity
 * Represents real-world events (holidays, closures, campaigns) with recurrence support.
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Indexed columns for common queries (eventType, startTime, endTime, isActive)
 * - GIN index on regionScope for JSONB queries
 * - Support for RRULE-style recurrence patterns
 */
@Entity('calendar_events')
@Index(['eventType'])
@Index(['startTime'])
@Index(['endTime'])
@Index(['isActive'])
export class CalendarEventEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('enum', { enum: CalendarEventType })
  eventType!: CalendarEventType;

  @Column('varchar', { length: 255 })
  title!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column({ type: 'timestamp with time zone' })
  startTime!: Date;

  @Column({ type: 'timestamp with time zone' })
  endTime!: Date;

  @Column('boolean', { default: false })
  allDay!: boolean;

  @Column('jsonb')
  regionScope!: RegionScope;

  @Column('enum', { enum: RecurrencePattern })
  recurrencePattern!: RecurrencePattern;

  @Column('jsonb', { nullable: true })
  recurrenceRule!: RecurrenceRule | null;

  @Column('int', { default: 0 })
  priority!: number;

  @Column('boolean', { default: true })
  isActive!: boolean;

  @Column({ name: 'external_id', type: 'varchar', length: 255, nullable: true })
  externalId!: string | null;

  @Column({ name: 'external_source', type: 'varchar', length: 100, nullable: true })
  externalSource!: string | null;

  @Column({ name: 'external_metadata', type: 'jsonb', nullable: true })
  externalMetadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    eventId: string;
    eventType: CalendarEventType;
    title: string;
    description: string | null;
    startTime: Date;
    endTime: Date;
    allDay: boolean;
    regionScope: RegionScope;
    recurrencePattern: RecurrencePattern;
    recurrenceRule: RecurrenceRule | null;
    priority: number;
    isActive: boolean;
    externalId: string | null;
    externalSource: string | null;
    externalMetadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      eventId: this.id,
      eventType: this.eventType,
      title: this.title,
      description: this.description,
      startTime: this.startTime,
      endTime: this.endTime,
      allDay: this.allDay,
      regionScope: this.regionScope,
      recurrencePattern: this.recurrencePattern,
      recurrenceRule: this.recurrenceRule,
      priority: this.priority,
      isActive: this.isActive,
      externalId: this.externalId,
      externalSource: this.externalSource,
      externalMetadata: this.externalMetadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    eventId: string;
    eventType: CalendarEventType;
    title: string;
    description?: string | null;
    startTime: Date;
    endTime: Date;
    allDay?: boolean;
    regionScope?: RegionScope;
    recurrencePattern?: RecurrencePattern;
    recurrenceRule?: RecurrenceRule | null;
    priority?: number;
    isActive?: boolean;
    externalId?: string | null;
    externalSource?: string | null;
    externalMetadata?: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt?: Date;
  }): CalendarEventEntity {
    const entity = new CalendarEventEntity();
    entity.id = data.eventId;
    entity.eventType = data.eventType;
    entity.title = data.title;
    entity.description = data.description ?? null;
    entity.startTime = data.startTime;
    entity.endTime = data.endTime;
    entity.allDay = data.allDay ?? false;
    entity.regionScope = data.regionScope ?? {};
    entity.recurrencePattern = data.recurrencePattern ?? RecurrencePattern.NONE;
    entity.recurrenceRule = data.recurrenceRule ?? null;
    entity.priority = data.priority ?? 0;
    entity.isActive = data.isActive ?? true;
    entity.externalId = data.externalId ?? null;
    entity.externalSource = data.externalSource ?? null;
    entity.externalMetadata = data.externalMetadata ?? null;
    entity.createdAt = data.createdAt;
    entity.updatedAt = data.updatedAt ?? data.createdAt;
    return entity;
  }
}
