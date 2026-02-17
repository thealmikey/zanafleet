import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { CalendarEntity } from './calendar.entity';

/**
 * TimeWindow Entity
 * Represents operating hours or availability windows within a calendar.
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Foreign key to calendars with cascade delete
 * - Time type columns for HH:MM:SS storage
 * - JSONB for flexible recurrence rules
 */
@Entity('time_windows')
@Index(['calendarId'])
@Index(['isActive'])
export class TimeWindowEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  calendarId!: string;

  @Column('time')
  startTime!: string;

  @Column('time')
  endTime!: string;

  /**
   * Day of week using JavaScript convention: 0=Sunday, 1=Monday, ..., 6=Saturday.
   * Null means the window applies to all days.
   */
  @Column('int', { nullable: true })
  dayOfWeek!: number | null;

  @Column('simple-json', { nullable: true })
  recurrenceRule!: Record<string, unknown> | null;

  @Column('boolean', { default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => CalendarEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'calendar_id' })
  calendar?: CalendarEntity;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    timeWindowId: string;
    calendarId: string;
    startTime: string;
    endTime: string;
    dayOfWeek: number | null;
    recurrenceRule: Record<string, unknown> | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      timeWindowId: this.id,
      calendarId: this.calendarId,
      startTime: this.startTime,
      endTime: this.endTime,
      dayOfWeek: this.dayOfWeek,
      recurrenceRule: this.recurrenceRule,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  /**
   * Create entity from domain data
   * @param data.dayOfWeek Day of week using JavaScript convention (0=Sunday, 6=Saturday), or null for all days
   */
  static fromDomain(data: {
    timeWindowId: string;
    calendarId: string;
    startTime: string;
    endTime: string;
    /** Day of week: 0=Sunday, 1=Monday, ..., 6=Saturday. Null for all days. */
    dayOfWeek?: number | null;
    recurrenceRule?: Record<string, unknown> | null;
    isActive?: boolean;
    createdAt: Date;
    updatedAt?: Date;
  }): TimeWindowEntity {
    const entity = new TimeWindowEntity();
    entity.id = data.timeWindowId;
    entity.calendarId = data.calendarId;
    entity.startTime = data.startTime;
    entity.endTime = data.endTime;
    entity.dayOfWeek = data.dayOfWeek ?? null;
    entity.recurrenceRule = data.recurrenceRule ?? null;
    entity.isActive = data.isActive ?? true;
    entity.createdAt = data.createdAt;
    entity.updatedAt = data.updatedAt ?? data.createdAt;
    return entity;
  }
}
