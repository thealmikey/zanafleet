import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateCalendarInput,
  CreateTimeWindowInput,
  CalendarResponse,
  TimeWindowResponse,
  CalendarRuleResponse,
  CalendarScope,
  CalendarRuleType,
} from '@zanafleet/contracts';
import { CalendarEntity } from '../entities/calendar.entity';
import { TimeWindowEntity } from '../entities/time-window.entity';
import { CalendarRuleEntity } from '../entities/calendar-rule.entity';
import { CalendarRepository } from '../repositories/calendar.repository';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { NatsSubjects } from '../../../core/event-bus/event-bus.constants';
import { CalendarCreatedEventV1 } from '../events/calendar.events';

/**
 * Input for creating a calendar rule.
 */
export interface CreateCalendarRuleInput {
  ruleType: CalendarRuleType;
  scope: CalendarScope;
  priority?: number;
  conditions: Record<string, unknown>;
  isActive?: boolean;
}

/**
 * Input for updating a calendar.
 */
export interface UpdateCalendarInput {
  name?: string;
  timezone?: string;
  locale?: string;
  isActive?: boolean;
}

/**
 * CalendarService
 * Provides CRUD operations for calendars, time windows, and rules.
 */
@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly calendarRepository: CalendarRepository,
    @InjectRepository(TimeWindowEntity)
    private readonly timeWindowRepo: Repository<TimeWindowEntity>,
    @InjectRepository(CalendarRuleEntity)
    private readonly calendarRuleRepo: Repository<CalendarRuleEntity>,
    private readonly eventBusService: EventBusService,
  ) {}

  /**
   * Create a new calendar.
   * @param input Calendar creation input
   */
  async createCalendar(input: CreateCalendarInput): Promise<CalendarResponse> {
    const now = new Date();
    const entity = CalendarEntity.fromDomain({
      calendarId: uuidv4(),
      name: input.name,
      timezone: input.timezone,
      locale: input.locale,
      ownerScope: input.ownerScope,
      ownerScopeId: input.ownerScopeId,
      isActive: input.isActive,
      createdAt: now,
    });

    const saved = await this.calendarRepository.save(entity);
    this.logger.log(`Created calendar: ${saved.id} (${saved.name})`);

    const event = new CalendarCreatedEventV1({
      calendarId: saved.id,
      name: saved.name,
      timezone: saved.timezone,
      ownerScope: saved.ownerScope,
      ownerScopeId: saved.ownerScopeId,
    });

    this.eventBusService.publish(NatsSubjects.Calendar.CREATED_V1, event).catch((err) => {
      this.logger.warn(`Failed to publish CalendarCreatedEventV1: ${err.message}`);
    });

    return this.toCalendarResponse(saved);
  }

  /**
   * Retrieve a calendar by ID.
   * @param calendarId The calendar ID
   */
  async getCalendar(calendarId: string): Promise<CalendarResponse> {
    const entity = await this.calendarRepository.findById(calendarId);
    if (!entity) {
      throw new NotFoundException(`Calendar not found: ${calendarId}`);
    }
    return this.toCalendarResponse(entity);
  }

  /**
   * Update a calendar with partial data.
   * @param calendarId The calendar ID
   * @param updates Partial update fields
   */
  async updateCalendar(
    calendarId: string,
    updates: UpdateCalendarInput,
  ): Promise<CalendarResponse> {
    const entity = await this.calendarRepository.findById(calendarId);
    if (!entity) {
      throw new NotFoundException(`Calendar not found: ${calendarId}`);
    }

    if (updates.name !== undefined) entity.name = updates.name;
    if (updates.timezone !== undefined) entity.timezone = updates.timezone;
    if (updates.locale !== undefined) entity.locale = updates.locale;
    if (updates.isActive !== undefined) entity.isActive = updates.isActive;

    const saved = await this.calendarRepository.save(entity);
    this.logger.log(`Updated calendar: ${saved.id}`);
    return this.toCalendarResponse(saved);
  }

  /**
   * Soft delete a calendar by setting isActive to false.
   * @param calendarId The calendar ID
   */
  async deleteCalendar(calendarId: string): Promise<void> {
    const entity = await this.calendarRepository.findById(calendarId);
    if (!entity) {
      throw new NotFoundException(`Calendar not found: ${calendarId}`);
    }

    entity.isActive = false;
    await this.calendarRepository.save(entity);
    this.logger.log(`Soft-deleted calendar: ${calendarId}`);
  }

  /**
   * Add a time window to a calendar.
   * @param calendarId The calendar ID
   * @param input Time window creation input
   */
  async addTimeWindow(
    calendarId: string,
    input: Omit<CreateTimeWindowInput, 'calendarId'>,
  ): Promise<TimeWindowResponse> {
    const calendar = await this.calendarRepository.findById(calendarId);
    if (!calendar) {
      throw new NotFoundException(`Calendar not found: ${calendarId}`);
    }

    const now = new Date();
    const entity = TimeWindowEntity.fromDomain({
      timeWindowId: uuidv4(),
      calendarId,
      startTime: input.startTime,
      endTime: input.endTime,
      dayOfWeek: input.dayOfWeek,
      recurrenceRule: input.recurrenceRule
        ? JSON.parse(input.recurrenceRule)
        : null,
      isActive: input.isActive,
      createdAt: now,
    });

    const saved = await this.timeWindowRepo.save(entity);
    this.logger.log(`Added time window ${saved.id} to calendar ${calendarId}`);
    return this.toTimeWindowResponse(saved);
  }

  /**
   * Add a rule to a calendar.
   * @param calendarId The calendar ID
   * @param input Rule creation input
   */
  async addRule(
    calendarId: string,
    input: CreateCalendarRuleInput,
  ): Promise<CalendarRuleResponse> {
    const calendar = await this.calendarRepository.findById(calendarId);
    if (!calendar) {
      throw new NotFoundException(`Calendar not found: ${calendarId}`);
    }

    const now = new Date();
    const entity = CalendarRuleEntity.fromDomain({
      ruleId: uuidv4(),
      calendarId,
      ruleType: input.ruleType,
      scope: input.scope,
      priority: input.priority,
      conditions: input.conditions,
      isActive: input.isActive,
      createdAt: now,
    });

    const saved = await this.calendarRuleRepo.save(entity);
    this.logger.log(`Added rule ${saved.id} to calendar ${calendarId}`);
    return this.toCalendarRuleResponse(saved);
  }

  /**
   * Get effective time windows for a calendar on a specific date.
   * Filters windows by day of week using JavaScript convention (0=Sunday, 6=Saturday).
   * @param calendarId The calendar ID
   * @param date The date to resolve windows for
   */
  async getEffectiveTimeWindows(
    calendarId: string,
    date: Date,
  ): Promise<TimeWindowResponse[]> {
    const calendar = await this.calendarRepository.findById(calendarId);
    if (!calendar) {
      throw new NotFoundException(`Calendar not found: ${calendarId}`);
    }

    const dayOfWeek = date.getDay();

    const windows = await this.timeWindowRepo.find({
      where: { calendarId, isActive: true },
    });

    const effectiveWindows = windows.filter((window) => {
      if (window.dayOfWeek === null) {
        return true;
      }
      return window.dayOfWeek === dayOfWeek;
    });

    return effectiveWindows.map((w) => this.toTimeWindowResponse(w));
  }

  private toCalendarResponse(entity: CalendarEntity): CalendarResponse {
    const domain = entity.toDomain();
    return {
      calendarId: domain.calendarId,
      name: domain.name,
      timezone: domain.timezone,
      locale: domain.locale,
      ownerScope: domain.ownerScope,
      ownerScopeId: domain.ownerScopeId,
      isActive: domain.isActive,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }

  private toTimeWindowResponse(entity: TimeWindowEntity): TimeWindowResponse {
    const domain = entity.toDomain();
    return {
      timeWindowId: domain.timeWindowId,
      calendarId: domain.calendarId,
      startTime: domain.startTime,
      endTime: domain.endTime,
      dayOfWeek: domain.dayOfWeek,
      recurrenceRule: domain.recurrenceRule
        ? JSON.stringify(domain.recurrenceRule)
        : null,
      isActive: domain.isActive,
    };
  }

  private toCalendarRuleResponse(
    entity: CalendarRuleEntity,
  ): CalendarRuleResponse {
    const domain = entity.toDomain();
    return {
      ruleId: domain.ruleId,
      calendarId: domain.calendarId,
      ruleType: domain.ruleType,
      scope: domain.scope,
      priority: domain.priority,
      conditions: domain.conditions,
      isActive: domain.isActive,
    };
  }
}
