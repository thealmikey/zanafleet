import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CalendarScope } from '@zanafleet/contracts';
import { Repository } from 'typeorm';

import { CalendarEntity } from '../entities/calendar.entity';

/**
 * CalendarRepository
 * Provides query capabilities for calendar definitions.
 */
@Injectable()
export class CalendarRepository {
  constructor(
    @InjectRepository(CalendarEntity)
    private readonly repo: Repository<CalendarEntity>,
  ) {}

  /**
   * Find a calendar by ID.
   * @param id The calendar ID
   */
  async findById(id: string): Promise<CalendarEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Find a calendar by its unique name.
   * @param name The calendar name
   */
  async findByName(name: string): Promise<CalendarEntity | null> {
    return this.repo.findOne({ where: { name } });
  }

  /**
   * Find calendars by owner scope and optional scope ID.
   * @param scope The owner scope level
   * @param scopeId Optional scope target ID (e.g., businessId, saccoId)
   */
  async findByOwnerScope(
    scope: CalendarScope,
    scopeId?: string,
  ): Promise<CalendarEntity[]> {
    if (scopeId !== undefined) {
      return this.repo.find({
        where: { ownerScope: scope, ownerScopeId: scopeId },
      });
    }
    return this.repo.find({ where: { ownerScope: scope } });
  }

  /**
   * Find all active calendars.
   */
  async findActiveCalendars(): Promise<CalendarEntity[]> {
    return this.repo.find({ where: { isActive: true } });
  }

  /**
   * Save a calendar entity.
   * @param entity The entity to save
   */
  async save(entity: CalendarEntity): Promise<CalendarEntity> {
    return this.repo.save(entity);
  }

  /**
   * Delete a calendar by ID (hard delete).
   * @param id The calendar ID to delete
   */
  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
