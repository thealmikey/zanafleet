import { CalendarScope, CalendarRuleType } from '@zanafleet/contracts';
import { CalendarEntity } from '../../entities/calendar.entity';
import { TimeWindowEntity } from '../../entities/time-window.entity';
import { CalendarRuleEntity } from '../../entities/calendar-rule.entity';

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
});
