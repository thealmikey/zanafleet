import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';

import { BindingTargetType } from '@zanafleet/contracts';
import { CalendarEntity } from './calendar.entity';

/**
 * CalendarBinding Entity
 * Represents a binding between a calendar and a target entity (Business, Sacco, Rider, Workspace).
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Foreign key to calendars with cascade delete
 * - Unique constraint on (calendarId, targetType, targetId)
 * - Indexed columns for common queries
 */
@Entity('calendar_bindings')
@Unique('UQ_calendar_binding_target', ['calendarId', 'targetType', 'targetId'])
@Index(['calendarId'])
@Index(['targetType', 'targetId'])
@Index(['isActive'])
@Index(['priority'])
export class CalendarBindingEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  calendarId!: string;

  @Column('enum', { enum: BindingTargetType })
  targetType!: BindingTargetType;

  @Column('uuid')
  targetId!: string;

  @Column('int', { default: 0 })
  priority!: number;

  @Column('boolean', { default: true })
  inheritParent!: boolean;

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
    bindingId: string;
    calendarId: string;
    targetType: BindingTargetType;
    targetId: string;
    priority: number;
    inheritParent: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      bindingId: this.id,
      calendarId: this.calendarId,
      targetType: this.targetType,
      targetId: this.targetId,
      priority: this.priority,
      inheritParent: this.inheritParent,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    bindingId: string;
    calendarId: string;
    targetType: BindingTargetType;
    targetId: string;
    priority?: number;
    inheritParent?: boolean;
    isActive?: boolean;
    createdAt: Date;
    updatedAt?: Date;
  }): CalendarBindingEntity {
    const entity = new CalendarBindingEntity();
    entity.id = data.bindingId;
    entity.calendarId = data.calendarId;
    entity.targetType = data.targetType;
    entity.targetId = data.targetId;
    entity.priority = data.priority ?? 0;
    entity.inheritParent = data.inheritParent ?? true;
    entity.isActive = data.isActive ?? true;
    entity.createdAt = data.createdAt;
    entity.updatedAt = data.updatedAt ?? data.createdAt;
    return entity;
  }
}
