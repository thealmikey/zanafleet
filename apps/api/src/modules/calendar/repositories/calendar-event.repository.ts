import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { CalendarEventType } from '@zanafleet/contracts';
import { CalendarEventEntity } from '../entities/calendar-event.entity';

/**
 * Region filter for querying calendar events.
 * Events match if their regionScope is a parent-of or equal-to the query region.
 */
export interface RegionFilter {
  country?: string;
  administrativeArea?: string;
  locality?: string;
}

/**
 * CalendarEventRepository
 * Provides query capabilities for calendar events (holidays, closures, campaigns).
 */
@Injectable()
export class CalendarEventRepository {
  constructor(
    @InjectRepository(CalendarEventEntity)
    private readonly repo: Repository<CalendarEventEntity>,
  ) {}

  /**
   * Find all active events within a date range, optionally filtered by region.
   * @param startDate Start of the date range
   * @param endDate End of the date range
   * @param regionFilter Optional region to filter events
   */
  async findActiveEventsForDateRange(
    startDate: Date,
    endDate: Date,
    regionFilter?: RegionFilter,
  ): Promise<CalendarEventEntity[]> {
    const qb = this.repo
      .createQueryBuilder('event')
      .where('event.isActive = :isActive', { isActive: true })
      .andWhere('event.startTime <= :endDate', { endDate })
      .andWhere('event.endTime >= :startDate', { startDate });

    if (regionFilter) {
      this.applyRegionFilter(qb, regionFilter);
    }

    return qb
      .orderBy('event.priority', 'DESC')
      .addOrderBy('event.startTime', 'ASC')
      .getMany();
  }

  /**
   * Find public holidays for a specific date, optionally filtered by region.
   * @param date The date to check for holidays
   * @param regionFilter Optional region to filter holidays
   */
  async findHolidaysForDate(
    date: Date,
    regionFilter?: RegionFilter,
  ): Promise<CalendarEventEntity[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const qb = this.repo
      .createQueryBuilder('event')
      .where('event.isActive = :isActive', { isActive: true })
      .andWhere('event.eventType = :eventType', {
        eventType: CalendarEventType.PUBLIC_HOLIDAY,
      })
      .andWhere('event.startTime <= :endOfDay', { endOfDay })
      .andWhere('event.endTime >= :startOfDay', { startOfDay });

    if (regionFilter) {
      this.applyRegionFilter(qb, regionFilter);
    }

    return qb.orderBy('event.priority', 'DESC').getMany();
  }

  /**
   * Find all active events applicable to a specific region.
   * @param region The region to query events for
   */
  async findByRegion(region: RegionFilter): Promise<CalendarEventEntity[]> {
    const qb = this.repo
      .createQueryBuilder('event')
      .where('event.isActive = :isActive', { isActive: true });

    this.applyRegionFilter(qb, region);

    return qb.orderBy('event.startTime', 'ASC').getMany();
  }

  /**
   * Check if a specific date is a holiday in a given region.
   * Answers questions like "Is 2024-12-25 a holiday in Nairobi?"
   * @param date The date to check
   * @param region The region to check (e.g., { country: 'Kenya', administrativeArea: 'Nairobi' })
   */
  async isHolidayInRegion(date: Date, region: RegionFilter): Promise<boolean> {
    const holidays = await this.findHolidaysForDate(date, region);
    return holidays.length > 0;
  }

  /**
   * Find a calendar event by ID.
   * @param id The event ID
   */
  async findById(id: string): Promise<CalendarEventEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Save a calendar event.
   * @param entity The entity to save
   */
  async save(entity: CalendarEventEntity): Promise<CalendarEventEntity> {
    return this.repo.save(entity);
  }

  /**
   * Delete a calendar event by ID.
   * @param id The event ID to delete
   */
  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  /**
   * Apply region filter to a query builder.
   * Region hierarchy matching: events match if their region is a parent-of or equal-to the query region.
   * Example: A Kenya-level event applies to a Nairobi query; a Nairobi event doesn't apply to a Kenya-level query.
   */
  private applyRegionFilter(
    qb: ReturnType<Repository<CalendarEventEntity>['createQueryBuilder']>,
    region: RegionFilter,
  ): void {
    if (region.country) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where(`event.region_scope->>'country' = :country`, {
              country: region.country,
            })
            .orWhere(`event.region_scope->>'country' IS NULL`);
        }),
      );
    }

    if (region.administrativeArea) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where(`event.region_scope->>'administrativeArea' IS NULL`)
            .orWhere(
              `event.region_scope->>'administrativeArea' = :adminArea`,
              { adminArea: region.administrativeArea },
            );
        }),
      );
    }

    if (region.locality) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where(`event.region_scope->>'locality' IS NULL`)
            .orWhere(`event.region_scope->>'locality' = :locality`, {
              locality: region.locality,
            });
        }),
      );
    }
  }
}
