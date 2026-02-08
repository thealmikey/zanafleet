import { CalendarScope, CalendarRuleType, CalendarEventType, RecurrencePattern, BindingTargetType } from '@zanafleet/contracts';
import { CalendarEntity } from '../../entities/calendar.entity';
import { TimeWindowEntity } from '../../entities/time-window.entity';
import { CalendarRuleEntity } from '../../entities/calendar-rule.entity';
import { CalendarEventEntity } from '../../entities/calendar-event.entity';
import { CalendarBindingEntity } from '../../entities/calendar-binding.entity';
import { CalendarOverrideEntity } from '../../entities/calendar-override.entity';

describe('Calendar Entities', () => {
  describe('CalendarEntity', () => {
    const now = new Date();

    describe('toDomain', () => {
      it('should convert entity to domain object with all fields', () => {
        const entity = new CalendarEntity();
        entity.id = '123e4567-e89b-12d3-a456-426614174000';
        entity.name = 'Kenya Business Hours';
        entity.timezone = 'Africa/Nairobi';
        entity.locale = 'en-KE';
        entity.ownerScope = CalendarScope.NATIONAL;
        entity.ownerScopeId = '223e4567-e89b-12d3-a456-426614174001';
        entity.isActive = true;
        entity.createdAt = now;
        entity.updatedAt = now;

        const domain = entity.toDomain();

        expect(domain.calendarId).toBe(entity.id);
        expect(domain.name).toBe('Kenya Business Hours');
        expect(domain.timezone).toBe('Africa/Nairobi');
        expect(domain.locale).toBe('en-KE');
        expect(domain.ownerScope).toBe(CalendarScope.NATIONAL);
        expect(domain.ownerScopeId).toBe('223e4567-e89b-12d3-a456-426614174001');
        expect(domain.isActive).toBe(true);
        expect(domain.createdAt).toBe(now);
        expect(domain.updatedAt).toBe(now);
      });

      it('should handle null ownerScopeId for global calendars', () => {
        const entity = new CalendarEntity();
        entity.id = '123e4567-e89b-12d3-a456-426614174000';
        entity.name = 'Global Default';
        entity.timezone = 'UTC';
        entity.locale = 'en';
        entity.ownerScope = CalendarScope.GLOBAL;
        entity.ownerScopeId = null;
        entity.isActive = true;
        entity.createdAt = now;
        entity.updatedAt = now;

        const domain = entity.toDomain();

        expect(domain.ownerScopeId).toBeNull();
        expect(domain.ownerScope).toBe(CalendarScope.GLOBAL);
      });
    });

    describe('fromDomain', () => {
      it('should create entity from domain data with all fields', () => {
        const domainData = {
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Kenya Business Hours',
          timezone: 'Africa/Nairobi',
          locale: 'en-KE',
          ownerScope: CalendarScope.BUSINESS,
          ownerScopeId: '323e4567-e89b-12d3-a456-426614174002',
          isActive: false,
          createdAt: now,
          updatedAt: now,
        };

        const entity = CalendarEntity.fromDomain(domainData);

        expect(entity.id).toBe(domainData.calendarId);
        expect(entity.name).toBe(domainData.name);
        expect(entity.timezone).toBe(domainData.timezone);
        expect(entity.locale).toBe(domainData.locale);
        expect(entity.ownerScope).toBe(domainData.ownerScope);
        expect(entity.ownerScopeId).toBe(domainData.ownerScopeId);
        expect(entity.isActive).toBe(false);
        expect(entity.createdAt).toBe(now);
        expect(entity.updatedAt).toBe(now);
      });

      it('should apply default values for optional fields', () => {
        const domainData = {
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Minimal Calendar',
          timezone: 'Africa/Nairobi',
          ownerScope: CalendarScope.GLOBAL,
          createdAt: now,
        };

        const entity = CalendarEntity.fromDomain(domainData);

        expect(entity.locale).toBe('en-KE');
        expect(entity.ownerScopeId).toBeNull();
        expect(entity.isActive).toBe(true);
        expect(entity.updatedAt).toBe(now);
      });

      it('should round-trip through toDomain and fromDomain', () => {
        const original = {
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Round Trip Test',
          timezone: 'Africa/Nairobi',
          locale: 'sw-KE',
          ownerScope: CalendarScope.SACCO,
          ownerScopeId: '423e4567-e89b-12d3-a456-426614174003',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        const entity = CalendarEntity.fromDomain(original);
        const roundTripped = entity.toDomain();

        expect(roundTripped).toEqual(original);
      });
    });
  });

  describe('TimeWindowEntity', () => {
    const now = new Date();

    describe('toDomain', () => {
      it('should convert entity to domain object with all fields', () => {
        const entity = new TimeWindowEntity();
        entity.id = '523e4567-e89b-12d3-a456-426614174004';
        entity.calendarId = '123e4567-e89b-12d3-a456-426614174000';
        entity.startTime = '08:00:00';
        entity.endTime = '17:00:00';
        entity.dayOfWeek = 1;
        entity.recurrenceRule = { frequency: 'WEEKLY' };
        entity.isActive = true;
        entity.createdAt = now;
        entity.updatedAt = now;

        const domain = entity.toDomain();

        expect(domain.timeWindowId).toBe(entity.id);
        expect(domain.calendarId).toBe(entity.calendarId);
        expect(domain.startTime).toBe('08:00:00');
        expect(domain.endTime).toBe('17:00:00');
        expect(domain.dayOfWeek).toBe(1);
        expect(domain.recurrenceRule).toEqual({ frequency: 'WEEKLY' });
        expect(domain.isActive).toBe(true);
      });

      it('should handle null dayOfWeek for all-days windows', () => {
        const entity = new TimeWindowEntity();
        entity.id = '523e4567-e89b-12d3-a456-426614174004';
        entity.calendarId = '123e4567-e89b-12d3-a456-426614174000';
        entity.startTime = '09:00:00';
        entity.endTime = '18:00:00';
        entity.dayOfWeek = null;
        entity.recurrenceRule = null;
        entity.isActive = true;
        entity.createdAt = now;
        entity.updatedAt = now;

        const domain = entity.toDomain();

        expect(domain.dayOfWeek).toBeNull();
        expect(domain.recurrenceRule).toBeNull();
      });
    });

    describe('fromDomain', () => {
      it('should create entity from domain data with all fields', () => {
        const domainData = {
          timeWindowId: '523e4567-e89b-12d3-a456-426614174004',
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          startTime: '06:00:00',
          endTime: '22:00:00',
          dayOfWeek: 6,
          recurrenceRule: { interval: 2 },
          isActive: false,
          createdAt: now,
          updatedAt: now,
        };

        const entity = TimeWindowEntity.fromDomain(domainData);

        expect(entity.id).toBe(domainData.timeWindowId);
        expect(entity.calendarId).toBe(domainData.calendarId);
        expect(entity.startTime).toBe(domainData.startTime);
        expect(entity.endTime).toBe(domainData.endTime);
        expect(entity.dayOfWeek).toBe(6);
        expect(entity.recurrenceRule).toEqual({ interval: 2 });
        expect(entity.isActive).toBe(false);
      });

      it('should apply default values for optional fields', () => {
        const domainData = {
          timeWindowId: '523e4567-e89b-12d3-a456-426614174004',
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          startTime: '08:00:00',
          endTime: '17:00:00',
          createdAt: now,
        };

        const entity = TimeWindowEntity.fromDomain(domainData);

        expect(entity.dayOfWeek).toBeNull();
        expect(entity.recurrenceRule).toBeNull();
        expect(entity.isActive).toBe(true);
        expect(entity.updatedAt).toBe(now);
      });

      it('should round-trip through toDomain and fromDomain', () => {
        const original = {
          timeWindowId: '523e4567-e89b-12d3-a456-426614174004',
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          startTime: '07:30:00',
          endTime: '19:30:00',
          dayOfWeek: 3,
          recurrenceRule: { until: '2025-12-31' },
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        const entity = TimeWindowEntity.fromDomain(original);
        const roundTripped = entity.toDomain();

        expect(roundTripped).toEqual(original);
      });
    });
  });

  describe('CalendarRuleEntity', () => {
    const now = new Date();

    describe('toDomain', () => {
      it('should convert entity to domain object with all fields', () => {
        const entity = new CalendarRuleEntity();
        entity.id = '623e4567-e89b-12d3-a456-426614174005';
        entity.calendarId = '123e4567-e89b-12d3-a456-426614174000';
        entity.ruleType = CalendarRuleType.WORKING_HOURS;
        entity.scope = CalendarScope.BUSINESS;
        entity.priority = 10;
        entity.conditions = { field: 'time.hour', operator: 'gte', value: 8 };
        entity.isActive = true;
        entity.createdAt = now;
        entity.updatedAt = now;

        const domain = entity.toDomain();

        expect(domain.ruleId).toBe(entity.id);
        expect(domain.calendarId).toBe(entity.calendarId);
        expect(domain.ruleType).toBe(CalendarRuleType.WORKING_HOURS);
        expect(domain.scope).toBe(CalendarScope.BUSINESS);
        expect(domain.priority).toBe(10);
        expect(domain.conditions).toEqual({ field: 'time.hour', operator: 'gte', value: 8 });
        expect(domain.isActive).toBe(true);
      });
    });

    describe('fromDomain', () => {
      it('should create entity from domain data with all fields', () => {
        const domainData = {
          ruleId: '623e4567-e89b-12d3-a456-426614174005',
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          ruleType: CalendarRuleType.HOLIDAY,
          scope: CalendarScope.NATIONAL,
          priority: 100,
          conditions: { field: 'date', operator: 'eq', value: '2025-12-25' },
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        const entity = CalendarRuleEntity.fromDomain(domainData);

        expect(entity.id).toBe(domainData.ruleId);
        expect(entity.calendarId).toBe(domainData.calendarId);
        expect(entity.ruleType).toBe(domainData.ruleType);
        expect(entity.scope).toBe(domainData.scope);
        expect(entity.priority).toBe(100);
        expect(entity.conditions).toEqual(domainData.conditions);
        expect(entity.isActive).toBe(true);
      });

      it('should apply default values for optional fields', () => {
        const domainData = {
          ruleId: '623e4567-e89b-12d3-a456-426614174005',
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          ruleType: CalendarRuleType.BLACKOUT,
          scope: CalendarScope.GLOBAL,
          conditions: { blocked: true },
          createdAt: now,
        };

        const entity = CalendarRuleEntity.fromDomain(domainData);

        expect(entity.priority).toBe(0);
        expect(entity.isActive).toBe(true);
        expect(entity.updatedAt).toBe(now);
      });

      it('should round-trip through toDomain and fromDomain', () => {
        const original = {
          ruleId: '623e4567-e89b-12d3-a456-426614174005',
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          ruleType: CalendarRuleType.CLOSURE,
          scope: CalendarScope.SACCO,
          priority: 50,
          conditions: {
            logic: 'AND',
            children: [
              { field: 'time.hour', operator: 'gte', value: 12 },
              { field: 'time.hour', operator: 'lt', value: 14 },
            ],
          },
          isActive: false,
          createdAt: now,
          updatedAt: now,
        };

        const entity = CalendarRuleEntity.fromDomain(original);
        const roundTripped = entity.toDomain();

        expect(roundTripped).toEqual(original);
      });
    });
  });

  describe('CalendarEventEntity', () => {
    const now = new Date();
    const startTime = new Date('2024-12-25T00:00:00Z');
    const endTime = new Date('2024-12-25T23:59:59Z');

    describe('toDomain', () => {
      it('should convert entity to domain object with all fields', () => {
        const entity = new CalendarEventEntity();
        entity.id = '723e4567-e89b-12d3-a456-426614174006';
        entity.eventType = CalendarEventType.PUBLIC_HOLIDAY;
        entity.title = 'Christmas Day';
        entity.description = 'National public holiday';
        entity.startTime = startTime;
        entity.endTime = endTime;
        entity.allDay = true;
        entity.regionScope = { country: 'Kenya' };
        entity.recurrencePattern = RecurrencePattern.YEARLY;
        entity.recurrenceRule = { frequency: 'YEARLY', byMonth: [12], byMonthDay: [25] };
        entity.priority = 100;
        entity.isActive = true;
        entity.createdAt = now;
        entity.updatedAt = now;

        const domain = entity.toDomain();

        expect(domain.eventId).toBe(entity.id);
        expect(domain.eventType).toBe(CalendarEventType.PUBLIC_HOLIDAY);
        expect(domain.title).toBe('Christmas Day');
        expect(domain.description).toBe('National public holiday');
        expect(domain.startTime).toBe(startTime);
        expect(domain.endTime).toBe(endTime);
        expect(domain.allDay).toBe(true);
        expect(domain.regionScope).toEqual({ country: 'Kenya' });
        expect(domain.recurrencePattern).toBe(RecurrencePattern.YEARLY);
        expect(domain.recurrenceRule).toEqual({ frequency: 'YEARLY', byMonth: [12], byMonthDay: [25] });
        expect(domain.priority).toBe(100);
        expect(domain.isActive).toBe(true);
        expect(domain.createdAt).toBe(now);
        expect(domain.updatedAt).toBe(now);
      });

      it('should handle null description and recurrenceRule', () => {
        const entity = new CalendarEventEntity();
        entity.id = '723e4567-e89b-12d3-a456-426614174006';
        entity.eventType = CalendarEventType.BUSINESS_CLOSURE;
        entity.title = 'Office Renovation';
        entity.description = null;
        entity.startTime = startTime;
        entity.endTime = endTime;
        entity.allDay = false;
        entity.regionScope = { country: 'Kenya', administrativeArea: 'Nairobi', locality: 'Westlands' };
        entity.recurrencePattern = RecurrencePattern.NONE;
        entity.recurrenceRule = null;
        entity.priority = 0;
        entity.isActive = true;
        entity.createdAt = now;
        entity.updatedAt = now;

        const domain = entity.toDomain();

        expect(domain.description).toBeNull();
        expect(domain.recurrenceRule).toBeNull();
        expect(domain.regionScope).toEqual({
          country: 'Kenya',
          administrativeArea: 'Nairobi',
          locality: 'Westlands',
        });
      });

      it('should support all CalendarEventType values', () => {
        const eventTypes = [
          CalendarEventType.PUBLIC_HOLIDAY,
          CalendarEventType.BUSINESS_CLOSURE,
          CalendarEventType.NATIONAL_EVENT,
          CalendarEventType.WEATHER_DISRUPTION,
          CalendarEventType.STRIKE_ADVISORY,
          CalendarEventType.PROMOTIONAL_CAMPAIGN,
        ];

        eventTypes.forEach((eventType) => {
          const entity = new CalendarEventEntity();
          entity.id = '723e4567-e89b-12d3-a456-426614174006';
          entity.eventType = eventType;
          entity.title = 'Test Event';
          entity.description = null;
          entity.startTime = startTime;
          entity.endTime = endTime;
          entity.allDay = false;
          entity.regionScope = { country: 'Kenya' };
          entity.recurrencePattern = RecurrencePattern.NONE;
          entity.recurrenceRule = null;
          entity.priority = 0;
          entity.isActive = true;
          entity.createdAt = now;
          entity.updatedAt = now;

          const domain = entity.toDomain();
          expect(domain.eventType).toBe(eventType);
        });
      });
    });

    describe('fromDomain', () => {
      it('should create entity from domain data with all fields', () => {
        const domainData = {
          eventId: '723e4567-e89b-12d3-a456-426614174006',
          eventType: CalendarEventType.NATIONAL_EVENT,
          title: 'Independence Day',
          description: 'Jamhuri Day celebration',
          startTime,
          endTime,
          allDay: true,
          regionScope: { country: 'Kenya' },
          recurrencePattern: RecurrencePattern.YEARLY,
          recurrenceRule: { frequency: 'YEARLY' as const, byMonth: [12], byMonthDay: [12] },
          priority: 90,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        const entity = CalendarEventEntity.fromDomain(domainData);

        expect(entity.id).toBe(domainData.eventId);
        expect(entity.eventType).toBe(domainData.eventType);
        expect(entity.title).toBe(domainData.title);
        expect(entity.description).toBe(domainData.description);
        expect(entity.startTime).toBe(domainData.startTime);
        expect(entity.endTime).toBe(domainData.endTime);
        expect(entity.allDay).toBe(true);
        expect(entity.regionScope).toEqual(domainData.regionScope);
        expect(entity.recurrencePattern).toBe(domainData.recurrencePattern);
        expect(entity.recurrenceRule).toEqual(domainData.recurrenceRule);
        expect(entity.priority).toBe(90);
        expect(entity.isActive).toBe(true);
        expect(entity.createdAt).toBe(now);
        expect(entity.updatedAt).toBe(now);
      });

      it('should apply default values for optional fields', () => {
        const domainData = {
          eventId: '723e4567-e89b-12d3-a456-426614174006',
          eventType: CalendarEventType.WEATHER_DISRUPTION,
          title: 'Heavy Rain Warning',
          startTime,
          endTime,
          regionScope: { country: 'Kenya', administrativeArea: 'Nairobi' },
          createdAt: now,
        };

        const entity = CalendarEventEntity.fromDomain(domainData);

        expect(entity.description).toBeNull();
        expect(entity.allDay).toBe(false);
        expect(entity.recurrencePattern).toBe(RecurrencePattern.NONE);
        expect(entity.recurrenceRule).toBeNull();
        expect(entity.priority).toBe(0);
        expect(entity.isActive).toBe(true);
        expect(entity.updatedAt).toBe(now);
      });

      it('should round-trip through toDomain and fromDomain', () => {
        const original = {
          eventId: '723e4567-e89b-12d3-a456-426614174006',
          eventType: CalendarEventType.STRIKE_ADVISORY,
          title: 'Transport Strike',
          description: 'Matatu operators strike advisory',
          startTime,
          endTime,
          allDay: false,
          regionScope: { country: 'Kenya', administrativeArea: 'Nairobi' },
          recurrencePattern: RecurrencePattern.NONE,
          recurrenceRule: null,
          priority: 80,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        const entity = CalendarEventEntity.fromDomain(original);
        const roundTripped = entity.toDomain();

        expect(roundTripped).toEqual(original);
      });

      it('should handle complex recurrence rules', () => {
        const recurrenceRule = {
          frequency: 'WEEKLY' as const,
          interval: 2,
          byDay: ['MO', 'WE', 'FR'],
          count: 10,
        };

        const domainData = {
          eventId: '723e4567-e89b-12d3-a456-426614174006',
          eventType: CalendarEventType.PROMOTIONAL_CAMPAIGN,
          title: 'Bi-Weekly Flash Sale',
          startTime,
          endTime,
          regionScope: { country: 'Kenya' },
          recurrencePattern: RecurrencePattern.CUSTOM,
          recurrenceRule,
          createdAt: now,
        };

        const entity = CalendarEventEntity.fromDomain(domainData);
        const domain = entity.toDomain();

        expect(domain.recurrencePattern).toBe(RecurrencePattern.CUSTOM);
        expect(domain.recurrenceRule).toEqual(recurrenceRule);
      });

      it('should handle region scope with only country (national events)', () => {
        const domainData = {
          eventId: '723e4567-e89b-12d3-a456-426614174006',
          eventType: CalendarEventType.PUBLIC_HOLIDAY,
          title: 'Madaraka Day',
          startTime,
          endTime,
          regionScope: { country: 'Kenya' },
          createdAt: now,
        };

        const entity = CalendarEventEntity.fromDomain(domainData);
        expect(entity.regionScope).toEqual({ country: 'Kenya' });
      });

      it('should handle region scope with full hierarchy (locality-specific events)', () => {
        const domainData = {
          eventId: '723e4567-e89b-12d3-a456-426614174006',
          eventType: CalendarEventType.BUSINESS_CLOSURE,
          title: 'Local Power Outage',
          startTime,
          endTime,
          regionScope: {
            country: 'Kenya',
            administrativeArea: 'Nairobi',
            locality: 'Westlands',
          },
          createdAt: now,
        };

        const entity = CalendarEventEntity.fromDomain(domainData);
        expect(entity.regionScope).toEqual({
          country: 'Kenya',
          administrativeArea: 'Nairobi',
          locality: 'Westlands',
        });
      });
    });
  });

  describe('CalendarBindingEntity', () => {
    const now = new Date();

    describe('toDomain', () => {
      it('should convert entity to domain object with all fields', () => {
        const entity = new CalendarBindingEntity();
        entity.id = '823e4567-e89b-12d3-a456-426614174007';
        entity.calendarId = '123e4567-e89b-12d3-a456-426614174000';
        entity.targetType = BindingTargetType.BUSINESS;
        entity.targetId = '923e4567-e89b-12d3-a456-426614174008';
        entity.priority = 10;
        entity.inheritParent = true;
        entity.isActive = true;
        entity.createdAt = now;
        entity.updatedAt = now;

        const domain = entity.toDomain();

        expect(domain.bindingId).toBe(entity.id);
        expect(domain.calendarId).toBe(entity.calendarId);
        expect(domain.targetType).toBe(BindingTargetType.BUSINESS);
        expect(domain.targetId).toBe('923e4567-e89b-12d3-a456-426614174008');
        expect(domain.priority).toBe(10);
        expect(domain.inheritParent).toBe(true);
        expect(domain.isActive).toBe(true);
        expect(domain.createdAt).toBe(now);
        expect(domain.updatedAt).toBe(now);
      });

      it('should support all BindingTargetType values', () => {
        const targetTypes = [
          BindingTargetType.BUSINESS,
          BindingTargetType.SACCO,
          BindingTargetType.RIDER,
          BindingTargetType.WORKSPACE,
        ];

        targetTypes.forEach((targetType) => {
          const entity = new CalendarBindingEntity();
          entity.id = '823e4567-e89b-12d3-a456-426614174007';
          entity.calendarId = '123e4567-e89b-12d3-a456-426614174000';
          entity.targetType = targetType;
          entity.targetId = '923e4567-e89b-12d3-a456-426614174008';
          entity.priority = 0;
          entity.inheritParent = true;
          entity.isActive = true;
          entity.createdAt = now;
          entity.updatedAt = now;

          const domain = entity.toDomain();
          expect(domain.targetType).toBe(targetType);
        });
      });
    });

    describe('fromDomain', () => {
      it('should create entity from domain data with all fields', () => {
        const domainData = {
          bindingId: '823e4567-e89b-12d3-a456-426614174007',
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          targetType: BindingTargetType.RIDER,
          targetId: '923e4567-e89b-12d3-a456-426614174008',
          priority: 50,
          inheritParent: false,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        const entity = CalendarBindingEntity.fromDomain(domainData);

        expect(entity.id).toBe(domainData.bindingId);
        expect(entity.calendarId).toBe(domainData.calendarId);
        expect(entity.targetType).toBe(domainData.targetType);
        expect(entity.targetId).toBe(domainData.targetId);
        expect(entity.priority).toBe(50);
        expect(entity.inheritParent).toBe(false);
        expect(entity.isActive).toBe(true);
        expect(entity.createdAt).toBe(now);
        expect(entity.updatedAt).toBe(now);
      });

      it('should apply default values for optional fields', () => {
        const domainData = {
          bindingId: '823e4567-e89b-12d3-a456-426614174007',
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          targetType: BindingTargetType.SACCO,
          targetId: '923e4567-e89b-12d3-a456-426614174008',
          createdAt: now,
        };

        const entity = CalendarBindingEntity.fromDomain(domainData);

        expect(entity.priority).toBe(0);
        expect(entity.inheritParent).toBe(true);
        expect(entity.isActive).toBe(true);
        expect(entity.updatedAt).toBe(now);
      });

      it('should round-trip through toDomain and fromDomain', () => {
        const original = {
          bindingId: '823e4567-e89b-12d3-a456-426614174007',
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          targetType: BindingTargetType.BUSINESS,
          targetId: '923e4567-e89b-12d3-a456-426614174008',
          priority: 25,
          inheritParent: true,
          isActive: false,
          createdAt: now,
          updatedAt: now,
        };

        const entity = CalendarBindingEntity.fromDomain(original);
        const roundTripped = entity.toDomain();

        expect(roundTripped).toEqual(original);
      });
    });
  });

  describe('CalendarOverrideEntity', () => {
    const now = new Date();
    const validFrom = new Date('2024-12-01T00:00:00Z');
    const validUntil = new Date('2024-12-31T23:59:59Z');

    describe('toDomain', () => {
      it('should convert entity to domain object with all fields', () => {
        const entity = new CalendarOverrideEntity();
        entity.id = 'a23e4567-e89b-12d3-a456-426614174009';
        entity.targetScope = CalendarScope.BUSINESS;
        entity.targetScopeId = 'b23e4567-e89b-12d3-a456-42661417400a';
        entity.exceptionType = 'ALLOW_ON_HOLIDAY';
        entity.reason = 'Premium merchant - 24/7 delivery';
        entity.validFrom = validFrom;
        entity.validUntil = validUntil;
        entity.priority = 100;
        entity.metadata = { premiumTier: 'gold' };
        entity.isActive = true;
        entity.createdAt = now;
        entity.updatedAt = now;

        const domain = entity.toDomain();

        expect(domain.overrideId).toBe(entity.id);
        expect(domain.targetScope).toBe(CalendarScope.BUSINESS);
        expect(domain.targetScopeId).toBe('b23e4567-e89b-12d3-a456-42661417400a');
        expect(domain.exceptionType).toBe('ALLOW_ON_HOLIDAY');
        expect(domain.reason).toBe('Premium merchant - 24/7 delivery');
        expect(domain.validFrom).toBe(validFrom);
        expect(domain.validUntil).toBe(validUntil);
        expect(domain.priority).toBe(100);
        expect(domain.metadata).toEqual({ premiumTier: 'gold' });
        expect(domain.isActive).toBe(true);
        expect(domain.createdAt).toBe(now);
        expect(domain.updatedAt).toBe(now);
      });

      it('should handle null targetScopeId for GLOBAL scope', () => {
        const entity = new CalendarOverrideEntity();
        entity.id = 'a23e4567-e89b-12d3-a456-426614174009';
        entity.targetScope = CalendarScope.GLOBAL;
        entity.targetScopeId = null;
        entity.exceptionType = 'EMERGENCY_OPEN';
        entity.reason = null;
        entity.validFrom = validFrom;
        entity.validUntil = validUntil;
        entity.priority = 0;
        entity.metadata = null;
        entity.isActive = true;
        entity.createdAt = now;
        entity.updatedAt = now;

        const domain = entity.toDomain();

        expect(domain.targetScopeId).toBeNull();
        expect(domain.reason).toBeNull();
        expect(domain.metadata).toBeNull();
      });

      it('should support common exception types', () => {
        const exceptionTypes = [
          'ALLOW_ON_HOLIDAY',
          'EMERGENCY_OPEN',
          'TEMPORARY_CLOSURE',
          'EXTENDED_HOURS',
          'REDUCED_HOURS',
        ];

        exceptionTypes.forEach((exceptionType) => {
          const entity = new CalendarOverrideEntity();
          entity.id = 'a23e4567-e89b-12d3-a456-426614174009';
          entity.targetScope = CalendarScope.BUSINESS;
          entity.targetScopeId = 'b23e4567-e89b-12d3-a456-42661417400a';
          entity.exceptionType = exceptionType;
          entity.reason = null;
          entity.validFrom = validFrom;
          entity.validUntil = validUntil;
          entity.priority = 0;
          entity.metadata = null;
          entity.isActive = true;
          entity.createdAt = now;
          entity.updatedAt = now;

          const domain = entity.toDomain();
          expect(domain.exceptionType).toBe(exceptionType);
        });
      });
    });

    describe('fromDomain', () => {
      it('should create entity from domain data with all fields', () => {
        const domainData = {
          overrideId: 'a23e4567-e89b-12d3-a456-426614174009',
          targetScope: CalendarScope.RIDER,
          targetScopeId: 'b23e4567-e89b-12d3-a456-42661417400a',
          exceptionType: 'TEMPORARY_CLOSURE',
          reason: 'Rider on leave',
          validFrom,
          validUntil,
          priority: 50,
          metadata: { leaveType: 'annual' },
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        const entity = CalendarOverrideEntity.fromDomain(domainData);

        expect(entity.id).toBe(domainData.overrideId);
        expect(entity.targetScope).toBe(domainData.targetScope);
        expect(entity.targetScopeId).toBe(domainData.targetScopeId);
        expect(entity.exceptionType).toBe(domainData.exceptionType);
        expect(entity.reason).toBe(domainData.reason);
        expect(entity.validFrom).toBe(domainData.validFrom);
        expect(entity.validUntil).toBe(domainData.validUntil);
        expect(entity.priority).toBe(50);
        expect(entity.metadata).toEqual(domainData.metadata);
        expect(entity.isActive).toBe(true);
        expect(entity.createdAt).toBe(now);
        expect(entity.updatedAt).toBe(now);
      });

      it('should apply default values for optional fields', () => {
        const domainData = {
          overrideId: 'a23e4567-e89b-12d3-a456-426614174009',
          targetScope: CalendarScope.NATIONAL,
          exceptionType: 'EMERGENCY_OPEN',
          validFrom,
          validUntil,
          createdAt: now,
        };

        const entity = CalendarOverrideEntity.fromDomain(domainData);

        expect(entity.targetScopeId).toBeNull();
        expect(entity.reason).toBeNull();
        expect(entity.priority).toBe(0);
        expect(entity.metadata).toBeNull();
        expect(entity.isActive).toBe(true);
        expect(entity.updatedAt).toBe(now);
      });

      it('should round-trip through toDomain and fromDomain', () => {
        const original = {
          overrideId: 'a23e4567-e89b-12d3-a456-426614174009',
          targetScope: CalendarScope.SACCO,
          targetScopeId: 'b23e4567-e89b-12d3-a456-42661417400a',
          exceptionType: 'EXTENDED_HOURS',
          reason: 'Festival season extended hours',
          validFrom,
          validUntil,
          priority: 75,
          metadata: { festival: 'Diwali' },
          isActive: false,
          createdAt: now,
          updatedAt: now,
        };

        const entity = CalendarOverrideEntity.fromDomain(original);
        const roundTripped = entity.toDomain();

        expect(roundTripped).toEqual(original);
      });
    });
  });
});
