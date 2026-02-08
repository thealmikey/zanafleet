import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import {
  CalendarScope,
  CalendarRuleType,
  CreateCalendarInput,
} from '@zanafleet/contracts';
import { CalendarService, UpdateCalendarInput } from '../../services/calendar.service';
import { CalendarRepository } from '../../repositories/calendar.repository';
import { CalendarEntity } from '../../entities/calendar.entity';
import { TimeWindowEntity } from '../../entities/time-window.entity';
import { CalendarRuleEntity } from '../../entities/calendar-rule.entity';

describe('CalendarService', () => {
  let service: CalendarService;
  let calendarRepository: jest.Mocked<CalendarRepository>;
  let timeWindowRepo: jest.Mocked<Repository<TimeWindowEntity>>;
  let calendarRuleRepo: jest.Mocked<Repository<CalendarRuleEntity>>;

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

    it('should convert Sunday to ISO weekday 7', async () => {
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
        dayOfWeek: 7,
        isActive: true,
        createdAt: now,
      });

      calendarRepository.findById.mockResolvedValue(calendar);
      timeWindowRepo.find.mockResolvedValue([sundayWindow]);

      const sunday = new Date('2024-01-21'); // Sunday
      const result = await service.getEffectiveTimeWindows('calendar-uuid', sunday);

      expect(result).toHaveLength(1);
      expect(result[0].dayOfWeek).toBe(7);
    });

    it('should throw NotFoundException when calendar not found', async () => {
      calendarRepository.findById.mockResolvedValue(null);

      await expect(
        service.getEffectiveTimeWindows('non-existent', new Date()),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
