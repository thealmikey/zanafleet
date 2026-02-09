import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  CalendarScope,
  CalendarRuleType,
  CreateCalendarInput,
} from '@zanafleet/contracts';
import { Repository } from 'typeorm';

import { EventBusService } from '../../../../core/event-bus/event-bus.service';
import { CalendarRuleEntity } from '../../entities/calendar-rule.entity';
import { CalendarEntity } from '../../entities/calendar.entity';
import { TimeWindowEntity } from '../../entities/time-window.entity';
import { CalendarRepository } from '../../repositories/calendar.repository';
import { CalendarService, UpdateCalendarInput } from '../../services/calendar.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let calendarRepository: jest.Mocked<CalendarRepository>;
  let timeWindowRepo: jest.Mocked<Repository<TimeWindowEntity>>;
  let calendarRuleRepo: jest.Mocked<Repository<CalendarRuleEntity>>;
  let eventBusService: jest.Mocked<EventBusService>;

  const now = new Date('2024-01-15T10:00:00Z');

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    calendarRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      findByOwnerScope: jest.fn(),
      findActiveCalendars: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<CalendarRepository>;

    timeWindowRepo = {
      save: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<TimeWindowEntity>>;

    calendarRuleRepo = {
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<CalendarRuleEntity>>;

    eventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBusService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        {
          provide: CalendarRepository,
          useValue: calendarRepository,
        },
        {
          provide: getRepositoryToken(TimeWindowEntity),
          useValue: timeWindowRepo,
        },
        {
          provide: getRepositoryToken(CalendarRuleEntity),
          useValue: calendarRuleRepo,
        },
        {
          provide: EventBusService,
          useValue: eventBusService,
        },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createCalendar', () => {
    it('should create a calendar with all fields', async () => {
      const input: CreateCalendarInput = {
        name: 'Kenya Business Hours',
        timezone: 'Africa/Nairobi',
        locale: 'en-KE',
        ownerScope: CalendarScope.NATIONAL,
        ownerScopeId: 'kenya-uuid',
        isActive: true,
      };

      calendarRepository.save.mockImplementation(async (entity) => entity);

      const result = await service.createCalendar(input);

      expect(result.name).toBe('Kenya Business Hours');
      expect(result.timezone).toBe('Africa/Nairobi');
      expect(result.locale).toBe('en-KE');
      expect(result.ownerScope).toBe(CalendarScope.NATIONAL);
      expect(result.ownerScopeId).toBe('kenya-uuid');
      expect(result.isActive).toBe(true);
      expect(result.calendarId).toBeDefined();
      expect(calendarRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should create a calendar with minimal fields and defaults', async () => {
      const input: CreateCalendarInput = {
        name: 'Global Default',
        timezone: 'UTC',
        ownerScope: CalendarScope.GLOBAL,
      };

      calendarRepository.save.mockImplementation(async (entity) => entity);

      const result = await service.createCalendar(input);

      expect(result.name).toBe('Global Default');
      expect(result.timezone).toBe('UTC');
      expect(result.locale).toBe('en-KE');
      expect(result.ownerScope).toBe(CalendarScope.GLOBAL);
      expect(result.ownerScopeId).toBeNull();
      expect(result.isActive).toBe(true);
    });

    it('should generate a unique UUID for each calendar', async () => {
      const input: CreateCalendarInput = {
        name: 'Test Calendar',
        timezone: 'UTC',
        ownerScope: CalendarScope.GLOBAL,
      };

      calendarRepository.save.mockImplementation(async (entity) => entity);

      const result1 = await service.createCalendar(input);
      const result2 = await service.createCalendar({ ...input, name: 'Another' });

      expect(result1.calendarId).not.toBe(result2.calendarId);
    });
  });

  describe('getCalendar', () => {
    it('should return calendar when found', async () => {
      const entity = CalendarEntity.fromDomain({
        calendarId: 'test-uuid',
        name: 'Test Calendar',
        timezone: 'Africa/Nairobi',
        ownerScope: CalendarScope.BUSINESS,
        ownerScopeId: 'business-uuid',
        createdAt: now,
      });

      calendarRepository.findById.mockResolvedValue(entity);

      const result = await service.getCalendar('test-uuid');

      expect(result.calendarId).toBe('test-uuid');
      expect(result.name).toBe('Test Calendar');
      expect(calendarRepository.findById).toHaveBeenCalledWith('test-uuid');
    });

    it('should throw NotFoundException when calendar not found', async () => {
      calendarRepository.findById.mockResolvedValue(null);

      await expect(service.getCalendar('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getCalendar('non-existent')).rejects.toThrow(
        'Calendar not found: non-existent',
      );
    });
  });

  describe('updateCalendar', () => {
    it('should update calendar name', async () => {
      const entity = CalendarEntity.fromDomain({
        calendarId: 'test-uuid',
        name: 'Old Name',
        timezone: 'UTC',
        ownerScope: CalendarScope.GLOBAL,
        createdAt: now,
      });

      calendarRepository.findById.mockResolvedValue(entity);
      calendarRepository.save.mockImplementation(async (e) => e);

      const updates: UpdateCalendarInput = { name: 'New Name' };
      const result = await service.updateCalendar('test-uuid', updates);

      expect(result.name).toBe('New Name');
      expect(result.timezone).toBe('UTC');
    });

    it('should update multiple fields', async () => {
      const entity = CalendarEntity.fromDomain({
        calendarId: 'test-uuid',
        name: 'Old Name',
        timezone: 'UTC',
        locale: 'en',
        ownerScope: CalendarScope.GLOBAL,
        isActive: true,
        createdAt: now,
      });

      calendarRepository.findById.mockResolvedValue(entity);
      calendarRepository.save.mockImplementation(async (e) => e);

      const updates: UpdateCalendarInput = {
        name: 'Updated',
        timezone: 'Africa/Nairobi',
        locale: 'sw-KE',
        isActive: false,
      };
      const result = await service.updateCalendar('test-uuid', updates);

      expect(result.name).toBe('Updated');
      expect(result.timezone).toBe('Africa/Nairobi');
      expect(result.locale).toBe('sw-KE');
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when calendar not found', async () => {
      calendarRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateCalendar('non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteCalendar', () => {
    it('should soft delete calendar by setting isActive to false', async () => {
      const entity = CalendarEntity.fromDomain({
        calendarId: 'test-uuid',
        name: 'Test Calendar',
        timezone: 'UTC',
        ownerScope: CalendarScope.GLOBAL,
        isActive: true,
        createdAt: now,
      });

      calendarRepository.findById.mockResolvedValue(entity);
      calendarRepository.save.mockImplementation(async (e) => e);

      await service.deleteCalendar('test-uuid');

      expect(calendarRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should throw NotFoundException when calendar not found', async () => {
      calendarRepository.findById.mockResolvedValue(null);

      await expect(service.deleteCalendar('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addTimeWindow', () => {
    it('should add time window to calendar', async () => {
      const calendar = CalendarEntity.fromDomain({
        calendarId: 'calendar-uuid',
        name: 'Test',
        timezone: 'UTC',
        ownerScope: CalendarScope.GLOBAL,
        createdAt: now,
      });

      calendarRepository.findById.mockResolvedValue(calendar);
      timeWindowRepo.save.mockImplementation(async (entity) => entity as TimeWindowEntity);

      const result = await service.addTimeWindow('calendar-uuid', {
        startTime: '08:00:00',
        endTime: '17:00:00',
        dayOfWeek: 1,
      });

      expect(result.calendarId).toBe('calendar-uuid');
      expect(result.startTime).toBe('08:00:00');
      expect(result.endTime).toBe('17:00:00');
      expect(result.dayOfWeek).toBe(1);
      expect(result.timeWindowId).toBeDefined();
    });

    it('should parse recurrence rule JSON string', async () => {
      const calendar = CalendarEntity.fromDomain({
        calendarId: 'calendar-uuid',
        name: 'Test',
        timezone: 'UTC',
        ownerScope: CalendarScope.GLOBAL,
        createdAt: now,
      });

      calendarRepository.findById.mockResolvedValue(calendar);
      timeWindowRepo.save.mockImplementation(async (entity) => entity as TimeWindowEntity);

      const result = await service.addTimeWindow('calendar-uuid', {
        startTime: '09:00:00',
        endTime: '18:00:00',
        recurrenceRule: '{"frequency":"WEEKLY","interval":1}',
      });

      expect(result.recurrenceRule).toBe('{"frequency":"WEEKLY","interval":1}');
    });

    it('should throw NotFoundException when calendar not found', async () => {
      calendarRepository.findById.mockResolvedValue(null);

      await expect(
        service.addTimeWindow('non-existent', {
          startTime: '08:00:00',
          endTime: '17:00:00',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addRule', () => {
    it('should add rule to calendar', async () => {
      const calendar = CalendarEntity.fromDomain({
        calendarId: 'calendar-uuid',
        name: 'Test',
        timezone: 'UTC',
        ownerScope: CalendarScope.GLOBAL,
        createdAt: now,
      });

      calendarRepository.findById.mockResolvedValue(calendar);
      calendarRuleRepo.save.mockImplementation(async (entity) => entity as CalendarRuleEntity);

      const result = await service.addRule('calendar-uuid', {
        ruleType: CalendarRuleType.WORKING_HOURS,
        scope: CalendarScope.BUSINESS,
        priority: 10,
        conditions: { field: 'time.hour', operator: 'gte', value: 8 },
      });

      expect(result.calendarId).toBe('calendar-uuid');
      expect(result.ruleType).toBe(CalendarRuleType.WORKING_HOURS);
      expect(result.scope).toBe(CalendarScope.BUSINESS);
      expect(result.priority).toBe(10);
      expect(result.ruleId).toBeDefined();
    });

    it('should throw NotFoundException when calendar not found', async () => {
      calendarRepository.findById.mockResolvedValue(null);

      await expect(
        service.addRule('non-existent', {
          ruleType: CalendarRuleType.HOLIDAY,
          scope: CalendarScope.NATIONAL,
          conditions: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEffectiveTimeWindows', () => {
    it('should return windows matching the day of week', async () => {
      const calendar = CalendarEntity.fromDomain({
        calendarId: 'calendar-uuid',
        name: 'Test',
        timezone: 'UTC',
        ownerScope: CalendarScope.GLOBAL,
        createdAt: now,
      });

      const mondayWindow = TimeWindowEntity.fromDomain({
        timeWindowId: 'window-1',
        calendarId: 'calendar-uuid',
        startTime: '08:00:00',
        endTime: '17:00:00',
        dayOfWeek: 1,
        isActive: true,
        createdAt: now,
      });

      const fridayWindow = TimeWindowEntity.fromDomain({
        timeWindowId: 'window-2',
        calendarId: 'calendar-uuid',
        startTime: '08:00:00',
        endTime: '14:00:00',
        dayOfWeek: 5,
        isActive: true,
        createdAt: now,
      });

      calendarRepository.findById.mockResolvedValue(calendar);
      timeWindowRepo.find.mockResolvedValue([mondayWindow, fridayWindow]);

      const monday = new Date('2024-01-15'); // Monday
      const result = await service.getEffectiveTimeWindows('calendar-uuid', monday);

      expect(result).toHaveLength(1);
      expect(result[0].dayOfWeek).toBe(1);
    });

    it('should return all-day windows (dayOfWeek=null) for any date', async () => {
      const calendar = CalendarEntity.fromDomain({
        calendarId: 'calendar-uuid',
        name: 'Test',
        timezone: 'UTC',
        ownerScope: CalendarScope.GLOBAL,
        createdAt: now,
      });

      const allDayWindow = TimeWindowEntity.fromDomain({
        timeWindowId: 'window-1',
        calendarId: 'calendar-uuid',
        startTime: '09:00:00',
        endTime: '21:00:00',
        dayOfWeek: null,
        isActive: true,
        createdAt: now,
      });

      calendarRepository.findById.mockResolvedValue(calendar);
      timeWindowRepo.find.mockResolvedValue([allDayWindow]);

      const saturday = new Date('2024-01-20'); // Saturday
      const result = await service.getEffectiveTimeWindows('calendar-uuid', saturday);

      expect(result).toHaveLength(1);
      expect(result[0].dayOfWeek).toBeNull();
    });

    it('should match Sunday windows using JavaScript convention (dayOfWeek=0)', async () => {
      const calendar = CalendarEntity.fromDomain({
        calendarId: 'calendar-uuid',
        name: 'Test',
        timezone: 'UTC',
        ownerScope: CalendarScope.GLOBAL,
        createdAt: now,
      });

      const sundayWindow = TimeWindowEntity.fromDomain({
        timeWindowId: 'window-1',
        calendarId: 'calendar-uuid',
        startTime: '10:00:00',
        endTime: '16:00:00',
        dayOfWeek: 0, // Sunday in JavaScript convention (Date.getDay() returns 0 for Sunday)
        isActive: true,
        createdAt: now,
      });

      calendarRepository.findById.mockResolvedValue(calendar);
      timeWindowRepo.find.mockResolvedValue([sundayWindow]);

      // Use local time constructor to avoid timezone issues with getDay()
      const sunday = new Date(2024, 0, 21); // January 21, 2024 (Sunday) in local time
      const result = await service.getEffectiveTimeWindows('calendar-uuid', sunday);

      expect(result).toHaveLength(1);
      expect(result[0].dayOfWeek).toBe(0);
    });

    it('should return correct subset of windows for each day of the week', async () => {
      const calendar = CalendarEntity.fromDomain({
        calendarId: 'calendar-uuid',
        name: 'Weekly Schedule',
        timezone: 'UTC',
        ownerScope: CalendarScope.GLOBAL,
        createdAt: now,
      });

      // Create windows for specific days using ISO convention
      // Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6, Sunday=7
      const mondayWindow = TimeWindowEntity.fromDomain({
        timeWindowId: 'window-mon',
        calendarId: 'calendar-uuid',
        startTime: '08:00:00',
        endTime: '17:00:00',
        dayOfWeek: 1, // Monday
        isActive: true,
        createdAt: now,
      });

      const wednesdayWindow = TimeWindowEntity.fromDomain({
        timeWindowId: 'window-wed',
        calendarId: 'calendar-uuid',
        startTime: '09:00:00',
        endTime: '18:00:00',
        dayOfWeek: 3, // Wednesday
        isActive: true,
        createdAt: now,
      });

      const fridayWindow = TimeWindowEntity.fromDomain({
        timeWindowId: 'window-fri',
        calendarId: 'calendar-uuid',
        startTime: '08:00:00',
        endTime: '14:00:00',
        dayOfWeek: 5, // Friday
        isActive: true,
        createdAt: now,
      });

      const sundayWindow = TimeWindowEntity.fromDomain({
        timeWindowId: 'window-sun',
        calendarId: 'calendar-uuid',
        startTime: '10:00:00',
        endTime: '16:00:00',
        dayOfWeek: 0, // Sunday (JavaScript convention: Date.getDay() returns 0)
        isActive: true,
        createdAt: now,
      });

      const allDaysWindow = TimeWindowEntity.fromDomain({
        timeWindowId: 'window-all',
        calendarId: 'calendar-uuid',
        startTime: '12:00:00',
        endTime: '13:00:00',
        dayOfWeek: null, // Applies to all days
        isActive: true,
        createdAt: now,
      });

      const allWindows = [mondayWindow, wednesdayWindow, fridayWindow, sundayWindow, allDaysWindow];

      calendarRepository.findById.mockResolvedValue(calendar);
      timeWindowRepo.find.mockResolvedValue(allWindows);

      // Use local time constructor to avoid timezone issues with getDay()
      // Test Monday (2024-01-15 is a Monday)
      const monday = new Date(2024, 0, 15); // January 15, 2024 in local time
      const mondayResult = await service.getEffectiveTimeWindows('calendar-uuid', monday);
      expect(mondayResult).toHaveLength(2); // Monday window + all-days window
      expect(mondayResult.map(w => w.timeWindowId).sort()).toEqual(['window-all', 'window-mon']);

      // Test Wednesday (2024-01-17 is a Wednesday)
      const wednesday = new Date(2024, 0, 17); // January 17, 2024 in local time
      const wednesdayResult = await service.getEffectiveTimeWindows('calendar-uuid', wednesday);
      expect(wednesdayResult).toHaveLength(2); // Wednesday window + all-days window
      expect(wednesdayResult.map(w => w.timeWindowId).sort()).toEqual(['window-all', 'window-wed']);

      // Test Friday (2024-01-19 is a Friday)
      const friday = new Date(2024, 0, 19); // January 19, 2024 in local time
      const fridayResult = await service.getEffectiveTimeWindows('calendar-uuid', friday);
      expect(fridayResult).toHaveLength(2); // Friday window + all-days window
      expect(fridayResult.map(w => w.timeWindowId).sort()).toEqual(['window-all', 'window-fri']);

      // Test Sunday (2024-01-21 is a Sunday)
      const sunday = new Date(2024, 0, 21); // January 21, 2024 in local time
      const sundayResult = await service.getEffectiveTimeWindows('calendar-uuid', sunday);
      expect(sundayResult).toHaveLength(2); // Sunday window + all-days window
      expect(sundayResult.map(w => w.timeWindowId).sort()).toEqual(['window-all', 'window-sun']);

      // Test Tuesday (2024-01-16 is a Tuesday) - should only get all-days window
      const tuesday = new Date(2024, 0, 16); // January 16, 2024 in local time
      const tuesdayResult = await service.getEffectiveTimeWindows('calendar-uuid', tuesday);
      expect(tuesdayResult).toHaveLength(1); // Only all-days window
      expect(tuesdayResult[0].timeWindowId).toBe('window-all');

      // Test Saturday (2024-01-20 is a Saturday) - should only get all-days window
      const saturday = new Date(2024, 0, 20); // January 20, 2024 in local time
      const saturdayResult = await service.getEffectiveTimeWindows('calendar-uuid', saturday);
      expect(saturdayResult).toHaveLength(1); // Only all-days window
      expect(saturdayResult[0].timeWindowId).toBe('window-all');
    });

    it('should throw NotFoundException when calendar not found', async () => {
      calendarRepository.findById.mockResolvedValue(null);

      await expect(
        service.getEffectiveTimeWindows('non-existent', new Date()),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
