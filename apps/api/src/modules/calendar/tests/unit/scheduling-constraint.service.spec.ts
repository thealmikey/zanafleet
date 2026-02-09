import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BindingTargetType,
  CalendarScope,
  CalendarRuleType,
  CalendarEventType,
  RecurrencePattern,
} from '@zanafleet/contracts';
import { SchedulingConstraintService } from '../../services/scheduling-constraint.service';
import { CalendarBindingService } from '../../services/calendar-binding.service';
import { CalendarEventRepository } from '../../repositories/calendar-event.repository';
import { CalendarService } from '../../services/calendar.service';
import { CalendarRuleEntity } from '../../entities/calendar-rule.entity';
import { CalendarEventEntity } from '../../entities/calendar-event.entity';
import { ConstraintContext } from '../../dto/constraint.types';
import { EventBusService } from '../../../../core/event-bus/event-bus.service';

describe('SchedulingConstraintService', () => {
  let service: SchedulingConstraintService;
  let calendarBindingService: jest.Mocked<CalendarBindingService>;
  let calendarEventRepository: jest.Mocked<CalendarEventRepository>;
  let calendarService: jest.Mocked<CalendarService>;
  let calendarRuleRepo: jest.Mocked<Repository<CalendarRuleEntity>>;
  let eventBusService: jest.Mocked<EventBusService>;

  const now = new Date('2024-12-25T10:00:00Z');

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    calendarBindingService = {
      resolveEffectiveCalendars: jest.fn(),
      getActiveOverrides: jest.fn(),
      bindCalendar: jest.fn(),
      unbindCalendar: jest.fn(),
      getBindingsForTarget: jest.fn(),
      applyOverride: jest.fn(),
      deactivateOverride: jest.fn(),
      getActiveOverridesWithInheritance: jest.fn(),
    } as unknown as jest.Mocked<CalendarBindingService>;

    calendarEventRepository = {
      findHolidaysForDate: jest.fn(),
      findActiveEventsForDateRange: jest.fn(),
      findByRegion: jest.fn(),
      isHolidayInRegion: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<CalendarEventRepository>;

    calendarService = {
      getEffectiveTimeWindows: jest.fn(),
      createCalendar: jest.fn(),
      getCalendar: jest.fn(),
      updateCalendar: jest.fn(),
      deleteCalendar: jest.fn(),
      addTimeWindow: jest.fn(),
      addRule: jest.fn(),
    } as unknown as jest.Mocked<CalendarService>;

    calendarRuleRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<CalendarRuleEntity>>;

    eventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBusService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingConstraintService,
        {
          provide: CalendarBindingService,
          useValue: calendarBindingService,
        },
        {
          provide: CalendarEventRepository,
          useValue: calendarEventRepository,
        },
        {
          provide: CalendarService,
          useValue: calendarService,
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

    service = module.get<SchedulingConstraintService>(SchedulingConstraintService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('evaluate', () => {
    const baseContext: ConstraintContext = {
      timestamp: now,
      timezone: 'Africa/Nairobi',
      targetType: BindingTargetType.BUSINESS,
      targetId: 'business-uuid',
      operationType: 'DELIVERY_CREATION',
    };

    it('should allow operation when all constraints are satisfied', async () => {
      calendarBindingService.getActiveOverrides.mockResolvedValue([]);
      calendarEventRepository.findHolidaysForDate.mockResolvedValue([]);
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([]);

      const result = await service.evaluate(baseContext);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('All scheduling constraints satisfied');
    });

    it('should allow operation when ALLOW override is active', async () => {
      calendarBindingService.getActiveOverrides.mockResolvedValue([
        {
          overrideId: 'override-uuid',
          targetScope: CalendarScope.BUSINESS,
          targetScopeId: 'business-uuid',
          exceptionType: 'ALLOW_ON_HOLIDAY',
          reason: 'Premium merchant',
          validFrom: new Date('2024-12-01'),
          validUntil: new Date('2024-12-31'),
          priority: 100,
          isActive: true,
        },
      ]);

      const result = await service.evaluate(baseContext);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Override active: operation permitted by exception');
    });

    it('should block operation on public holiday', async () => {
      calendarBindingService.getActiveOverrides.mockResolvedValue([]);
      
      const christmasEvent = new CalendarEventEntity();
      christmasEvent.id = 'christmas-uuid';
      christmasEvent.eventType = CalendarEventType.PUBLIC_HOLIDAY;
      christmasEvent.title = 'Christmas Day';
      christmasEvent.startTime = new Date('2024-12-25T00:00:00Z');
      christmasEvent.endTime = new Date('2024-12-25T23:59:59Z');
      christmasEvent.allDay = true;
      christmasEvent.regionScope = { country: 'Kenya' };
      christmasEvent.recurrencePattern = RecurrencePattern.YEARLY;
      christmasEvent.priority = 100;
      christmasEvent.isActive = true;
      christmasEvent.createdAt = now;
      christmasEvent.updatedAt = now;

      calendarEventRepository.findHolidaysForDate.mockResolvedValue([christmasEvent]);
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([]);

      const result = await service.evaluate(baseContext);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Public holiday: Christmas Day');
      expect(result.blockedBy).toEqual({
        type: 'HOLIDAY',
        name: 'Christmas Day',
        id: 'christmas-uuid',
      });
    });

    it('should block operation outside working hours', async () => {
      calendarBindingService.getActiveOverrides.mockResolvedValue([]);
      calendarEventRepository.findHolidaysForDate.mockResolvedValue([]);
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([
        {
          binding: {
            bindingId: 'binding-uuid',
            calendarId: 'calendar-uuid',
            targetType: BindingTargetType.BUSINESS,
            targetId: 'business-uuid',
            priority: 0,
            inheritParent: true,
          },
          inheritanceLevel: 0,
          effectivePriority: 10000,
        },
      ]);
      calendarRuleRepo.find.mockResolvedValue([]);
      calendarService.getEffectiveTimeWindows.mockResolvedValue([
        {
          timeWindowId: 'window-uuid',
          calendarId: 'calendar-uuid',
          startTime: '08:00:00',
          endTime: '17:00:00',
          dayOfWeek: null,
          recurrenceRule: null,
          isActive: true,
        },
      ]);

      const lateNightContext: ConstraintContext = {
        ...baseContext,
        timestamp: new Date('2024-12-26T22:00:00Z'),
      };

      const result = await service.evaluate(lateNightContext);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Outside working hours');
      expect(result.blockedBy?.type).toBe('OUTSIDE_HOURS');
    });

    it('should block operation during blackout period', async () => {
      calendarBindingService.getActiveOverrides.mockResolvedValue([]);
      calendarEventRepository.findHolidaysForDate.mockResolvedValue([]);
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([
        {
          binding: {
            bindingId: 'binding-uuid',
            calendarId: 'calendar-uuid',
            targetType: BindingTargetType.BUSINESS,
            targetId: 'business-uuid',
            priority: 0,
            inheritParent: true,
          },
          inheritanceLevel: 0,
          effectivePriority: 10000,
        },
      ]);

      const blackoutRule = CalendarRuleEntity.fromDomain({
        ruleId: 'blackout-rule-uuid',
        calendarId: 'calendar-uuid',
        ruleType: CalendarRuleType.BLACKOUT,
        scope: CalendarScope.BUSINESS,
        conditions: {
          startDate: '2024-12-24',
          endDate: '2024-12-26',
          reason: 'Holiday shutdown',
        },
        isActive: true,
        createdAt: now,
      });

      // First call in evaluate -> checkBlackoutPeriod for BLACKOUT rules
      calendarRuleRepo.find.mockResolvedValueOnce([blackoutRule]);
      // Second call in evaluate -> checkBlackoutPeriod for CLOSURE rules
      calendarRuleRepo.find.mockResolvedValueOnce([]);
      // Subsequent calls in suggestNextAvailableTime -> isBlackoutPeriod -> checkBlackoutPeriod
      calendarRuleRepo.find.mockResolvedValue([]);

      const result = await service.evaluate(baseContext);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Blackout period: Holiday shutdown');
      expect(result.blockedBy?.type).toBe('BLACKOUT');
    });

    it('should include region filter from metadata', async () => {
      calendarBindingService.getActiveOverrides.mockResolvedValue([]);
      calendarEventRepository.findHolidaysForDate.mockResolvedValue([]);
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([]);

      const contextWithRegion: ConstraintContext = {
        ...baseContext,
        metadata: {
          region: {
            country: 'Kenya',
            administrativeArea: 'Nairobi',
          },
        },
      };

      await service.evaluate(contextWithRegion);

      expect(calendarEventRepository.findHolidaysForDate).toHaveBeenCalledWith(
        now,
        { country: 'Kenya', administrativeArea: 'Nairobi', locality: undefined },
      );
    });
  });

  describe('isWithinWorkingHours', () => {
    it('should return true when within working hours', async () => {
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([
        {
          binding: {
            bindingId: 'binding-uuid',
            calendarId: 'calendar-uuid',
            targetType: BindingTargetType.BUSINESS,
            targetId: 'business-uuid',
            priority: 0,
            inheritParent: true,
          },
          inheritanceLevel: 0,
          effectivePriority: 10000,
        },
      ]);
      calendarService.getEffectiveTimeWindows.mockResolvedValue([
        {
          timeWindowId: 'window-uuid',
          calendarId: 'calendar-uuid',
          startTime: '08:00:00',
          endTime: '17:00:00',
          dayOfWeek: null,
          recurrenceRule: null,
          isActive: true,
        },
      ]);

      const workingHoursTime = new Date('2024-12-26T10:00:00Z');
      const result = await service.isWithinWorkingHours(
        BindingTargetType.BUSINESS,
        'business-uuid',
        workingHoursTime,
        'UTC',
      );

      expect(result).toBe(true);
    });

    it('should return false when outside working hours', async () => {
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([
        {
          binding: {
            bindingId: 'binding-uuid',
            calendarId: 'calendar-uuid',
            targetType: BindingTargetType.BUSINESS,
            targetId: 'business-uuid',
            priority: 0,
            inheritParent: true,
          },
          inheritanceLevel: 0,
          effectivePriority: 10000,
        },
      ]);
      calendarRuleRepo.find.mockResolvedValue([]);
      calendarService.getEffectiveTimeWindows.mockResolvedValue([
        {
          timeWindowId: 'window-uuid',
          calendarId: 'calendar-uuid',
          startTime: '08:00:00',
          endTime: '17:00:00',
          dayOfWeek: null,
          recurrenceRule: null,
          isActive: true,
        },
      ]);

      const afterHoursTime = new Date('2024-12-26T20:00:00Z');
      const result = await service.isWithinWorkingHours(
        BindingTargetType.BUSINESS,
        'business-uuid',
        afterHoursTime,
        'UTC',
      );

      expect(result).toBe(false);
    });

    it('should return true when no calendar restrictions configured', async () => {
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([]);

      const result = await service.isWithinWorkingHours(
        BindingTargetType.BUSINESS,
        'business-uuid',
        now,
        'UTC',
      );

      expect(result).toBe(true);
    });
  });

  describe('Midnight-Crossing Time Windows', () => {
    it('should return true when time is after start (before midnight) in midnight-crossing window', async () => {
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([
        {
          binding: {
            bindingId: 'binding-uuid',
            calendarId: 'calendar-uuid',
            targetType: BindingTargetType.BUSINESS,
            targetId: 'business-uuid',
            priority: 0,
            inheritParent: true,
          },
          inheritanceLevel: 0,
          effectivePriority: 10000,
        },
      ]);
      calendarService.getEffectiveTimeWindows.mockResolvedValue([
        {
          timeWindowId: 'window-uuid',
          calendarId: 'calendar-uuid',
          startTime: '22:00:00',
          endTime: '06:00:00',
          dayOfWeek: null,
          recurrenceRule: null,
          isActive: true,
        },
      ]);

      const testTimestamp = new Date('2024-12-26T23:00:00Z');
      const result = await service.isWithinWorkingHours(
        BindingTargetType.BUSINESS,
        'business-uuid',
        testTimestamp,
        'UTC',
      );

      expect(result).toBe(true);
    });

    it('should return true when time is before end (after midnight) in midnight-crossing window', async () => {
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([
        {
          binding: {
            bindingId: 'binding-uuid',
            calendarId: 'calendar-uuid',
            targetType: BindingTargetType.BUSINESS,
            targetId: 'business-uuid',
            priority: 0,
            inheritParent: true,
          },
          inheritanceLevel: 0,
          effectivePriority: 10000,
        },
      ]);
      calendarService.getEffectiveTimeWindows.mockResolvedValue([
        {
          timeWindowId: 'window-uuid',
          calendarId: 'calendar-uuid',
          startTime: '22:00:00',
          endTime: '06:00:00',
          dayOfWeek: null,
          recurrenceRule: null,
          isActive: true,
        },
      ]);

      const testTimestamp = new Date('2024-12-26T02:00:00Z');
      const result = await service.isWithinWorkingHours(
        BindingTargetType.BUSINESS,
        'business-uuid',
        testTimestamp,
        'UTC',
      );

      expect(result).toBe(true);
    });

    it('should return false when time is outside midnight-crossing window', async () => {
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([
        {
          binding: {
            bindingId: 'binding-uuid',
            calendarId: 'calendar-uuid',
            targetType: BindingTargetType.BUSINESS,
            targetId: 'business-uuid',
            priority: 0,
            inheritParent: true,
          },
          inheritanceLevel: 0,
          effectivePriority: 10000,
        },
      ]);
      calendarService.getEffectiveTimeWindows.mockResolvedValue([
        {
          timeWindowId: 'window-uuid',
          calendarId: 'calendar-uuid',
          startTime: '22:00:00',
          endTime: '06:00:00',
          dayOfWeek: null,
          recurrenceRule: null,
          isActive: true,
        },
      ]);

      const testTimestamp = new Date('2024-12-26T12:00:00Z');
      const result = await service.isWithinWorkingHours(
        BindingTargetType.BUSINESS,
        'business-uuid',
        testTimestamp,
        'UTC',
      );

      expect(result).toBe(false);
    });

    it('should return true at exactly the start time of midnight-crossing window', async () => {
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([
        {
          binding: {
            bindingId: 'binding-uuid',
            calendarId: 'calendar-uuid',
            targetType: BindingTargetType.BUSINESS,
            targetId: 'business-uuid',
            priority: 0,
            inheritParent: true,
          },
          inheritanceLevel: 0,
          effectivePriority: 10000,
        },
      ]);
      calendarService.getEffectiveTimeWindows.mockResolvedValue([
        {
          timeWindowId: 'window-uuid',
          calendarId: 'calendar-uuid',
          startTime: '22:00:00',
          endTime: '06:00:00',
          dayOfWeek: null,
          recurrenceRule: null,
          isActive: true,
        },
      ]);

      const testTimestamp = new Date('2024-12-26T22:00:00Z');
      const result = await service.isWithinWorkingHours(
        BindingTargetType.BUSINESS,
        'business-uuid',
        testTimestamp,
        'UTC',
      );

      expect(result).toBe(true);
    });

    it('should return true at exactly the end time of midnight-crossing window', async () => {
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([
        {
          binding: {
            bindingId: 'binding-uuid',
            calendarId: 'calendar-uuid',
            targetType: BindingTargetType.BUSINESS,
            targetId: 'business-uuid',
            priority: 0,
            inheritParent: true,
          },
          inheritanceLevel: 0,
          effectivePriority: 10000,
        },
      ]);
      calendarService.getEffectiveTimeWindows.mockResolvedValue([
        {
          timeWindowId: 'window-uuid',
          calendarId: 'calendar-uuid',
          startTime: '22:00:00',
          endTime: '06:00:00',
          dayOfWeek: null,
          recurrenceRule: null,
          isActive: true,
        },
      ]);

      const testTimestamp = new Date('2024-12-26T06:00:00Z');
      const result = await service.isWithinWorkingHours(
        BindingTargetType.BUSINESS,
        'business-uuid',
        testTimestamp,
        'UTC',
      );

      expect(result).toBe(true);
    });
  });

  describe('isHoliday', () => {
    it('should return true when date is a holiday', async () => {
      const christmasEvent = new CalendarEventEntity();
      christmasEvent.id = 'christmas-uuid';
      christmasEvent.eventType = CalendarEventType.PUBLIC_HOLIDAY;
      christmasEvent.title = 'Christmas Day';

      calendarEventRepository.findHolidaysForDate.mockResolvedValue([christmasEvent]);

      const result = await service.isHoliday(now);

      expect(result).toBe(true);
    });

    it('should return false when date is not a holiday', async () => {
      calendarEventRepository.findHolidaysForDate.mockResolvedValue([]);

      const result = await service.isHoliday(new Date('2024-12-26'));

      expect(result).toBe(false);
    });

    it('should filter by region when provided', async () => {
      calendarEventRepository.findHolidaysForDate.mockResolvedValue([]);

      await service.isHoliday(now, { country: 'Kenya', administrativeArea: 'Nairobi' });

      expect(calendarEventRepository.findHolidaysForDate).toHaveBeenCalledWith(
        now,
        { country: 'Kenya', administrativeArea: 'Nairobi' },
      );
    });
  });

  describe('isBlackoutPeriod', () => {
    it('should return true when in blackout period', async () => {
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([
        {
          binding: {
            bindingId: 'binding-uuid',
            calendarId: 'calendar-uuid',
            targetType: BindingTargetType.RIDER,
            targetId: 'rider-uuid',
            priority: 0,
            inheritParent: true,
          },
          inheritanceLevel: 0,
          effectivePriority: 10000,
        },
      ]);

      const blackoutRule = CalendarRuleEntity.fromDomain({
        ruleId: 'blackout-rule-uuid',
        calendarId: 'calendar-uuid',
        ruleType: CalendarRuleType.BLACKOUT,
        scope: CalendarScope.RIDER,
        conditions: {
          startDate: '2024-12-20',
          endDate: '2024-12-31',
          reason: 'Rider leave',
        },
        isActive: true,
        createdAt: now,
      });

      calendarRuleRepo.find.mockResolvedValueOnce([blackoutRule]);
      calendarRuleRepo.find.mockResolvedValueOnce([]);

      const result = await service.isBlackoutPeriod(
        BindingTargetType.RIDER,
        'rider-uuid',
        now,
      );

      expect(result).toBe(true);
    });

    it('should return false when not in blackout period', async () => {
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([
        {
          binding: {
            bindingId: 'binding-uuid',
            calendarId: 'calendar-uuid',
            targetType: BindingTargetType.RIDER,
            targetId: 'rider-uuid',
            priority: 0,
            inheritParent: true,
          },
          inheritanceLevel: 0,
          effectivePriority: 10000,
        },
      ]);

      calendarRuleRepo.find.mockResolvedValue([]);

      const result = await service.isBlackoutPeriod(
        BindingTargetType.RIDER,
        'rider-uuid',
        now,
      );

      expect(result).toBe(false);
    });
  });

  describe('hasActiveOverride', () => {
    it('should return true when ALLOW_ON_HOLIDAY override exists', async () => {
      calendarBindingService.getActiveOverrides.mockResolvedValue([
        {
          overrideId: 'override-uuid',
          targetScope: CalendarScope.BUSINESS,
          targetScopeId: 'business-uuid',
          exceptionType: 'ALLOW_ON_HOLIDAY',
          reason: 'Premium merchant',
          validFrom: new Date('2024-12-01'),
          validUntil: new Date('2024-12-31'),
          priority: 100,
          isActive: true,
        },
      ]);

      const result = await service.hasActiveOverride(
        CalendarScope.BUSINESS,
        'business-uuid',
        now,
        'ALLOW',
      );

      expect(result).toBe(true);
    });

    it('should return true when EMERGENCY_OPEN override exists', async () => {
      calendarBindingService.getActiveOverrides.mockResolvedValue([
        {
          overrideId: 'override-uuid',
          targetScope: CalendarScope.GLOBAL,
          targetScopeId: null,
          exceptionType: 'EMERGENCY_OPEN',
          reason: 'Emergency response',
          validFrom: new Date('2024-12-25'),
          validUntil: new Date('2024-12-25'),
          priority: 1000,
          isActive: true,
        },
      ]);

      const result = await service.hasActiveOverride(
        CalendarScope.GLOBAL,
        'any-id',
        now,
        'ALLOW',
      );

      expect(result).toBe(true);
    });

    it('should return false when no matching override exists', async () => {
      calendarBindingService.getActiveOverrides.mockResolvedValue([]);

      const result = await service.hasActiveOverride(
        CalendarScope.BUSINESS,
        'business-uuid',
        now,
        'ALLOW',
      );

      expect(result).toBe(false);
    });

    it('should match specific override type', async () => {
      calendarBindingService.getActiveOverrides.mockResolvedValue([
        {
          overrideId: 'override-uuid',
          targetScope: CalendarScope.BUSINESS,
          targetScopeId: 'business-uuid',
          exceptionType: 'CUSTOM_OVERRIDE',
          reason: 'Custom reason',
          validFrom: new Date('2024-12-01'),
          validUntil: new Date('2024-12-31'),
          priority: 50,
          isActive: true,
        },
      ]);

      const result = await service.hasActiveOverride(
        CalendarScope.BUSINESS,
        'business-uuid',
        now,
        'CUSTOM_OVERRIDE',
      );

      expect(result).toBe(true);
    });
  });

  describe('suggestNextAvailableTime', () => {
    it('should return current time when no restrictions exist', async () => {
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([]);
      calendarEventRepository.findHolidaysForDate.mockResolvedValue([]);

      const result = await service.suggestNextAvailableTime(
        BindingTargetType.BUSINESS,
        'business-uuid',
        now,
        'UTC',
      );

      expect(result).toBeInstanceOf(Date);
    });

    it('should skip holidays and find next available day', async () => {
      const christmasEvent = new CalendarEventEntity();
      christmasEvent.id = 'christmas-uuid';
      christmasEvent.eventType = CalendarEventType.PUBLIC_HOLIDAY;
      christmasEvent.title = 'Christmas Day';

      calendarEventRepository.findHolidaysForDate
        .mockResolvedValueOnce([christmasEvent])
        .mockResolvedValue([]);
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([]);

      const result = await service.suggestNextAvailableTime(
        BindingTargetType.BUSINESS,
        'business-uuid',
        now,
        'UTC',
      );

      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should find start of next working window', async () => {
      calendarEventRepository.findHolidaysForDate.mockResolvedValue([]);
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([
        {
          binding: {
            bindingId: 'binding-uuid',
            calendarId: 'calendar-uuid',
            targetType: BindingTargetType.BUSINESS,
            targetId: 'business-uuid',
            priority: 0,
            inheritParent: true,
          },
          inheritanceLevel: 0,
          effectivePriority: 10000,
        },
      ]);
      calendarRuleRepo.find.mockResolvedValue([]);
      calendarService.getEffectiveTimeWindows.mockResolvedValue([
        {
          timeWindowId: 'window-uuid',
          calendarId: 'calendar-uuid',
          startTime: '08:00:00',
          endTime: '17:00:00',
          dayOfWeek: null,
          recurrenceRule: null,
          isActive: true,
        },
      ]);

      const earlyMorning = new Date('2024-12-26T05:00:00Z');
      const result = await service.suggestNextAvailableTime(
        BindingTargetType.BUSINESS,
        'business-uuid',
        earlyMorning,
        'UTC',
      );

      expect(result).toBeInstanceOf(Date);
      expect(result!.getUTCHours()).toBe(8);
      expect(result!.getUTCMinutes()).toBe(0);
    });

    it('should return null if no available time within search window', async () => {
      const christmasEvent = new CalendarEventEntity();
      christmasEvent.id = 'christmas-uuid';
      christmasEvent.eventType = CalendarEventType.PUBLIC_HOLIDAY;
      christmasEvent.title = 'Christmas Day';

      calendarEventRepository.findHolidaysForDate.mockResolvedValue([christmasEvent]);
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([]);

      const result = await service.suggestNextAvailableTime(
        BindingTargetType.BUSINESS,
        'business-uuid',
        now,
        'UTC',
      );

      expect(result).toBeNull();
    });
  });

  describe('Premium Merchant Holiday Override Scenario', () => {
    it('should allow premium merchant to operate on holiday', async () => {
      const christmasEvent = new CalendarEventEntity();
      christmasEvent.id = 'christmas-uuid';
      christmasEvent.eventType = CalendarEventType.PUBLIC_HOLIDAY;
      christmasEvent.title = 'Christmas Day';
      christmasEvent.startTime = new Date('2024-12-25T00:00:00Z');
      christmasEvent.endTime = new Date('2024-12-25T23:59:59Z');
      christmasEvent.allDay = true;
      christmasEvent.regionScope = { country: 'Kenya' };
      christmasEvent.recurrencePattern = RecurrencePattern.YEARLY;
      christmasEvent.priority = 100;
      christmasEvent.isActive = true;
      christmasEvent.createdAt = now;
      christmasEvent.updatedAt = now;

      calendarBindingService.getActiveOverrides.mockResolvedValue([
        {
          overrideId: 'premium-override',
          targetScope: CalendarScope.BUSINESS,
          targetScopeId: 'premium-business-uuid',
          exceptionType: 'ALLOW_ON_HOLIDAY',
          reason: 'Premium merchant - 24/7 delivery',
          validFrom: new Date('2024-01-01'),
          validUntil: new Date('2024-12-31'),
          priority: 100,
          isActive: true,
        },
      ]);

      const context: ConstraintContext = {
        timestamp: now,
        timezone: 'Africa/Nairobi',
        targetType: BindingTargetType.BUSINESS,
        targetId: 'premium-business-uuid',
        operationType: 'DELIVERY_CREATION',
      };

      const result = await service.evaluate(context);

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('Override active');
      expect(calendarEventRepository.findHolidaysForDate).not.toHaveBeenCalled();
    });
  });

  describe('Rider Availability Scenario', () => {
    it('should block rider assignment during blackout', async () => {
      calendarBindingService.getActiveOverrides.mockResolvedValue([]);
      calendarEventRepository.findHolidaysForDate.mockResolvedValue([]);
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([
        {
          binding: {
            bindingId: 'rider-calendar-binding',
            calendarId: 'rider-calendar',
            targetType: BindingTargetType.RIDER,
            targetId: 'rider-uuid',
            priority: 0,
            inheritParent: true,
          },
          inheritanceLevel: 0,
          effectivePriority: 10000,
        },
      ]);

      const blackoutRule = CalendarRuleEntity.fromDomain({
        ruleId: 'rider-blackout',
        calendarId: 'rider-calendar',
        ruleType: CalendarRuleType.BLACKOUT,
        scope: CalendarScope.RIDER,
        conditions: {
          startDate: '2024-12-24',
          endDate: '2024-12-26',
          reason: 'Rider holiday leave',
        },
        isActive: true,
        createdAt: now,
      });

      // First call in evaluate -> checkBlackoutPeriod for BLACKOUT rules
      calendarRuleRepo.find.mockResolvedValueOnce([blackoutRule]);
      // Second call in evaluate -> checkBlackoutPeriod for CLOSURE rules
      calendarRuleRepo.find.mockResolvedValueOnce([]);
      // Subsequent calls in suggestNextAvailableTime -> isBlackoutPeriod -> checkBlackoutPeriod
      calendarRuleRepo.find.mockResolvedValue([]);

      const context: ConstraintContext = {
        timestamp: now,
        timezone: 'Africa/Nairobi',
        targetType: BindingTargetType.RIDER,
        targetId: 'rider-uuid',
        operationType: 'RIDER_ASSIGNMENT',
      };

      const result = await service.evaluate(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Blackout period: Rider holiday leave');
      expect(result.blockedBy?.type).toBe('BLACKOUT');
      expect(result.suggestedReschedule).toBeDefined();
    });
  });

  describe('Target Type to Scope Mapping', () => {
    it('should correctly map all target types to scopes', async () => {
      calendarBindingService.getActiveOverrides.mockResolvedValue([]);
      calendarEventRepository.findHolidaysForDate.mockResolvedValue([]);
      calendarBindingService.resolveEffectiveCalendars.mockResolvedValue([]);

      const testCases: Array<{ targetType: BindingTargetType; expectedScope: CalendarScope }> = [
        { targetType: BindingTargetType.RIDER, expectedScope: CalendarScope.RIDER },
        { targetType: BindingTargetType.BUSINESS, expectedScope: CalendarScope.BUSINESS },
        { targetType: BindingTargetType.SACCO, expectedScope: CalendarScope.SACCO },
        { targetType: BindingTargetType.WORKSPACE, expectedScope: CalendarScope.NATIONAL },
      ];

      for (const { targetType, expectedScope } of testCases) {
        calendarBindingService.getActiveOverrides.mockClear();

        const context: ConstraintContext = {
          timestamp: now,
          timezone: 'UTC',
          targetType,
          targetId: 'test-id',
          operationType: 'DELIVERY_CREATION',
        };

        await service.evaluate(context);

        expect(calendarBindingService.getActiveOverrides).toHaveBeenCalledWith(
          expectedScope,
          'test-id',
          now,
        );
      }
    });
  });
});
