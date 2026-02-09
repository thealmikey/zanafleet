import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CalendarEventType, RecurrencePattern } from '@zanafleet/contracts';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { CalendarEventEntity } from '../entities/calendar-event.entity';

import {
  CalendarProviderInterface,
  ExternalCalendarEvent,
  FetchEventsOptions,
  SyncResult,
} from './calendar-provider.interface';

/**
 * CalendarSyncService
 * Manages external calendar providers and synchronizes events.
 * Providers can connect to Google Calendar, government holiday APIs,
 * static holiday feeds, or any other external event source.
 */
@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);
  private readonly providers = new Map<string, CalendarProviderInterface>();

  constructor(
    @InjectRepository(CalendarEventEntity)
    private readonly calendarEventRepo: Repository<CalendarEventEntity>,
  ) {}

  /**
   * Register an external calendar provider.
   * @param provider The provider to register
   */
  registerProvider(provider: CalendarProviderInterface): void {
    if (this.providers.has(provider.providerName)) {
      this.logger.warn(`Provider ${provider.providerName} is being replaced`);
    }
    this.providers.set(provider.providerName, provider);
    this.logger.log(`Registered calendar provider: ${provider.providerName}`);
  }

  /**
   * Unregister a calendar provider.
   * @param providerName The provider name to unregister
   */
  unregisterProvider(providerName: string): boolean {
    const removed = this.providers.delete(providerName);
    if (removed) {
      this.logger.log(`Unregistered calendar provider: ${providerName}`);
    }
    return removed;
  }

  /**
   * Get a registered provider by name.
   * @param providerName The provider name
   */
  getProvider(providerName: string): CalendarProviderInterface | undefined {
    return this.providers.get(providerName);
  }

  /**
   * Get all registered provider names.
   */
  getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Sync events from an external provider into the calendar system.
   * Uses externalId + source for conflict resolution.
   *
   * @param providerName Name of the registered provider
   * @param options Fetch options for the provider
   * @returns Sync result with created/updated/skipped counts
   */
  async syncFromProvider(
    providerName: string,
    options: FetchEventsOptions,
  ): Promise<SyncResult> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new NotFoundException(`Calendar provider not found: ${providerName}`);
    }

    this.logger.log(
      `Starting sync from provider ${providerName} for ${options.startDate.toISOString()} to ${options.endDate.toISOString()}`,
    );

    const externalEvents = await provider.fetchEvents(options);
    this.logger.log(`Fetched ${externalEvents.length} events from ${providerName}`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const externalEvent of externalEvents) {
      const result = await this.mergeExternalEvent(externalEvent);
      switch (result) {
        case 'created':
          created++;
          break;
        case 'updated':
          updated++;
          break;
        case 'skipped':
          skipped++;
          break;
      }
    }

    this.logger.log(
      `Sync complete from ${providerName}: created=${created}, updated=${updated}, skipped=${skipped}`,
    );

    return { created, updated, skipped };
  }

  /**
   * Merge an external event into the calendar system.
   * Conflict resolution: events with same externalId+source update existing.
   *
   * @param externalEvent The external event to merge
   * @returns 'created', 'updated', or 'skipped'
   */
  private async mergeExternalEvent(
    externalEvent: ExternalCalendarEvent,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const existing = await this.calendarEventRepo.findOne({
      where: {
        externalId: externalEvent.externalId,
        externalSource: externalEvent.source,
      },
    });

    if (existing) {
      const needsUpdate = this.eventNeedsUpdate(existing, externalEvent);
      if (!needsUpdate) {
        return 'skipped';
      }

      existing.title = externalEvent.title;
      existing.eventType = externalEvent.eventType;
      existing.startTime = externalEvent.startTime;
      existing.endTime = externalEvent.endTime;
      existing.regionScope = externalEvent.regionScope ?? {};
      existing.recurrenceRule = externalEvent.recurrenceRule
        ? { rule: externalEvent.recurrenceRule }
        : null;
      existing.externalMetadata = externalEvent.metadata ?? null;

      await this.calendarEventRepo.save(existing);
      return 'updated';
    }

    const newEvent = CalendarEventEntity.fromDomain({
      eventId: uuidv4(),
      eventType: externalEvent.eventType,
      title: externalEvent.title,
      description: null,
      startTime: externalEvent.startTime,
      endTime: externalEvent.endTime,
      allDay: this.isAllDayEvent(externalEvent),
      regionScope: externalEvent.regionScope ?? {},
      recurrencePattern: externalEvent.recurrenceRule
        ? RecurrencePattern.CUSTOM
        : RecurrencePattern.NONE,
      recurrenceRule: externalEvent.recurrenceRule
        ? { rule: externalEvent.recurrenceRule }
        : null,
      priority: this.getPriorityForEventType(externalEvent.eventType),
      isActive: true,
      externalId: externalEvent.externalId,
      externalSource: externalEvent.source,
      externalMetadata: externalEvent.metadata ?? null,
      createdAt: new Date(),
    });

    await this.calendarEventRepo.save(newEvent);
    return 'created';
  }

  /**
   * Check if an existing event needs to be updated.
   */
  private eventNeedsUpdate(
    existing: CalendarEventEntity,
    incoming: ExternalCalendarEvent,
  ): boolean {
    if (existing.title !== incoming.title) return true;
    if (existing.eventType !== incoming.eventType) return true;
    if (existing.startTime.getTime() !== incoming.startTime.getTime()) return true;
    if (existing.endTime.getTime() !== incoming.endTime.getTime()) return true;

    const existingCountry = existing.regionScope?.country;
    const incomingCountry = incoming.regionScope?.country;
    if (existingCountry !== incomingCountry) return true;

    return false;
  }

  /**
   * Determine if an event spans a full day.
   */
  private isAllDayEvent(event: ExternalCalendarEvent): boolean {
    const start = event.startTime;
    const end = event.endTime;

    const startIsMidnight = start.getHours() === 0 && start.getMinutes() === 0;
    const endIsMidnight = end.getHours() === 0 && end.getMinutes() === 0;

    if (startIsMidnight && endIsMidnight) {
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 1;
    }

    return false;
  }

  /**
   * Get default priority for event type.
   * Public holidays have higher priority than campaigns.
   */
  private getPriorityForEventType(eventType: CalendarEventType): number {
    switch (eventType) {
      case CalendarEventType.PUBLIC_HOLIDAY:
        return 100;
      case CalendarEventType.NATIONAL_EVENT:
        return 90;
      case CalendarEventType.BUSINESS_CLOSURE:
        return 80;
      case CalendarEventType.WEATHER_DISRUPTION:
        return 70;
      case CalendarEventType.STRIKE_ADVISORY:
        return 60;
      case CalendarEventType.PROMOTIONAL_CAMPAIGN:
        return 10;
      default:
        return 50;
    }
  }
}
