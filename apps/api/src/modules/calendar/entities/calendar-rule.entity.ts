import { CalendarScope, CalendarRuleType } from '@zanafleet/contracts';
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
 * CalendarRule Entity
 * Represents rules that modify calendar behavior (working hours, holidays, etc.).
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Foreign key to calendars with cascade delete
 * - Indexed columns for common queries (ruleType, scope, priority, isActive)
 * - JSONB for flexible PolicyCondition-style conditions
 */
@Entity('calendar_rules')
@Index(['calendarId'])
@Index(['ruleType'])
@Index(['scope'])
@Index(['priority'])
@Index(['isActive'])
export class CalendarRuleEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  calendarId!: string;

  @Column('enum', { enum: CalendarRuleType })
  ruleType!: CalendarRuleType;

  @Column('enum', { enum: CalendarScope })
  scope!: CalendarScope;

  @Column('int', { default: 0 })
  priority!: number;

  @Column('jsonb')
  conditions!: Record<string, unknown>;

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
    ruleId: string;
    calendarId: string;
    ruleType: CalendarRuleType;
    scope: CalendarScope;
    priority: number;
    conditions: Record<string, unknown>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      ruleId: this.id,
      calendarId: this.calendarId,
      ruleType: this.ruleType,
      scope: this.scope,
      priority: this.priority,
      conditions: this.conditions,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    ruleId: string;
    calendarId: string;
    ruleType: CalendarRuleType;
    scope: CalendarScope;
    priority?: number;
    conditions: Record<string, unknown>;
    isActive?: boolean;
    createdAt: Date;
    updatedAt?: Date;
  }): CalendarRuleEntity {
    const entity = new CalendarRuleEntity();
    entity.id = data.ruleId;
    entity.calendarId = data.calendarId;
    entity.ruleType = data.ruleType;
    entity.scope = data.scope;
    entity.priority = data.priority ?? 0;
    entity.conditions = data.conditions;
    entity.isActive = data.isActive ?? true;
    entity.createdAt = data.createdAt;
    entity.updatedAt = data.updatedAt ?? data.createdAt;
    return entity;
  }
}
