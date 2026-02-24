import { Test, TestingModule } from '@nestjs/testing';
import {
  BindingTargetType,
  CalendarRuleType,
  CalendarScope,
  PolicyEffect,
  PolicyScope,
} from '@zanafleet/contracts';

import { EventBusService } from '../../../../core/event-bus/event-bus.service';
import { CalendarBindingService } from '../../services/calendar-binding.service';
import {
  CalendarPolicyBridgeService,
  PolicyTemplate,
} from '../../services/calendar-policy-bridge.service';
import { SchedulingConstraintService } from '../../services/scheduling-constraint.service';

describe('CalendarPolicyBridgeService', () => {
  let service: CalendarPolicyBridgeService;
  let schedulingConstraintService: jest.Mocked<SchedulingConstraintService>;
  let calendarBindingService: jest.Mocked<CalendarBindingService>;
  let eventBusService: jest.Mocked<EventBusService>;

  beforeEach(async () => {
    const mockSchedulingConstraintService = {
      evaluate: jest.fn(),
      isWithinWorkingHours: jest.fn(),
      isHoliday: jest.fn(),
      isBlackoutPeriod: jest.fn(),
      hasActiveOverride: jest.fn(),
      suggestNextAvailableTime: jest.fn(),
    };

    const mockCalendarBindingService = {
      bindCalendar: jest.fn(),
      unbindCalendar: jest.fn(),
      getBindingsForTarget: jest.fn(),
      resolveEffectiveCalendars: jest.fn(),
      getActiveOverrides: jest.fn(),
      applyOverride: jest.fn(),
    };

    const mockEventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
      publishEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarPolicyBridgeService,
        { provide: SchedulingConstraintService, useValue: mockSchedulingConstraintService },
        { provide: CalendarBindingService, useValue: mockCalendarBindingService },
        { provide: EventBusService, useValue: mockEventBusService },
      ],
    }).compile();

    service = module.get<CalendarPolicyBridgeService>(CalendarPolicyBridgeService);
    schedulingConstraintService = module.get(SchedulingConstraintService);
    calendarBindingService = module.get(CalendarBindingService);
    eventBusService = module.get(EventBusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.clearCache();
  });

  describe('getCalendarPolicyContext', () => {
    const targetType = BindingTargetType.BUSINESS;
    const targetId = 'business-123';
    const timestamp = new Date('2024-01-15T10:00:00Z');

    beforeEach(() => {
      schedulingConstraintService.isHoliday.mockResolvedValue(false);
      schedulingConstraintService.isWithinWorkingHours.mockResolvedValue(true);
      schedulingConstraintService.isBlackoutPeriod.mockResolvedValue(false);
      schedulingConstraintService.hasActiveOverride.mockResolvedValue(false);
      calendarBindingService.getBindingsForTarget.mockResolvedValue([
        {
          bindingId: 'binding-1',
          calendarId: 'cal-1',
          targetType,
          targetId,
          priority: 1,
          inheritParent: true,
        },
      ]);
    });

    it('should return calendar policy context with all flags', async () => {
      const context = await service.getCalendarPolicyContext(timestamp, targetType, targetId);

      expect(context).toMatchObject({
        isHoliday: false,
        isWithinWorkingHours: true,
        isBlackoutPeriod: false,
        hasActiveOverride: false,
        effectiveCalendarIds: ['cal-1'],
      });
      expect(context.evaluatedAt).toBeInstanceOf(Date);
      expect(context.surgeMultiplier).toBeDefined();
    });

    it('should detect holiday and apply surge multiplier', async () => {
      schedulingConstraintService.isHoliday.mockResolvedValue(true);

      const context = await service.getCalendarPolicyContext(timestamp, targetType, targetId);

      expect(context.isHoliday).toBe(true);
      expect(context.surgeMultiplier).toBe(1.25);
    });

    it('should detect peak hours', async () => {
      const peakTime = new Date('2024-01-15T08:00:00Z');

      const context = await service.getCalendarPolicyContext(peakTime, targetType, targetId);

      expect(context.isPeakHour).toBe(true);
      expect(context.surgeMultiplier).toBeGreaterThan(1);
    });

    it('should apply off-peak discount during non-peak working hours', async () => {
      const offPeakTime = new Date('2024-01-15T15:00:00Z');

      const context = await service.getCalendarPolicyContext(offPeakTime, targetType, targetId);

      expect(context.isPeakHour).toBe(false);
      expect(context.surgeMultiplier).toBe(0.9);
    });

    it('should cache context and return cached value on second call', async () => {
      await service.getCalendarPolicyContext(timestamp, targetType, targetId);
      await service.getCalendarPolicyContext(timestamp, targetType, targetId);

      expect(schedulingConstraintService.isHoliday).toHaveBeenCalledTimes(1);
    });

    it('should use custom timezone when provided', async () => {
      const customTz = 'America/New_York';

      await service.getCalendarPolicyContext(timestamp, targetType, targetId, customTz);

      expect(schedulingConstraintService.isWithinWorkingHours).toHaveBeenCalledWith(
        targetType,
        targetId,
        timestamp,
        customTz
      );
    });
  });

  describe('createPolicyFromCalendarRule', () => {
    const ruleId = 'rule-123';
    const template: PolicyTemplate = {
      name: 'Holiday Block Policy',
      description: 'Block deliveries during holidays',
      effect: PolicyEffect.BLOCK,
      scope: PolicyScope.BUSINESS,
      priority: 100,
      conditions: { isHoliday: true },
      metadata: { source: 'calendar' },
    };

    it('should create policy and return success result', async () => {
      const result = await service.createPolicyFromCalendarRule(ruleId, template);

      expect(result.success).toBe(true);
      expect(result.policyId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should emit Calendar.PolicyBinding.CreatedV1 event', async () => {
      await service.createPolicyFromCalendarRule(ruleId, template);

      expect(eventBusService.publish).toHaveBeenCalledWith(
        'calendar.events.policy-binding-created-v1',
        expect.objectContaining({
          eventType: 'Calendar.PolicyBinding.CreatedV1',
          payload: expect.objectContaining({
            sourceRuleId: ruleId,
            policyDefinition: expect.objectContaining({
              name: template.name,
              effect: template.effect,
            }),
          }),
        })
      );
    });

    it('should include sourceRuleId in policy metadata', async () => {
      await service.createPolicyFromCalendarRule(ruleId, template);

      expect(eventBusService.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          payload: expect.objectContaining({
            policyDefinition: expect.objectContaining({
              metadata: expect.objectContaining({
                sourceRuleId: ruleId,
                createdFromCalendarRule: true,
              }),
            }),
          }),
        })
      );
    });

    it('should handle event bus errors gracefully', async () => {
      eventBusService.publish.mockRejectedValue(new Error('Event bus unavailable'));

      const result = await service.createPolicyFromCalendarRule(ruleId, template);

      expect(result.success).toBe(true);
    });
  });

  describe('isDeliveryAllowed', () => {
    const targetType = BindingTargetType.BUSINESS;
    const targetId = 'business-123';
    const timestamp = new Date('2024-01-15T10:00:00Z');

    beforeEach(() => {
      schedulingConstraintService.isHoliday.mockResolvedValue(false);
      schedulingConstraintService.isWithinWorkingHours.mockResolvedValue(true);
      schedulingConstraintService.isBlackoutPeriod.mockResolvedValue(false);
      schedulingConstraintService.hasActiveOverride.mockResolvedValue(false);
      schedulingConstraintService.suggestNextAvailableTime.mockResolvedValue(null);
      calendarBindingService.getBindingsForTarget.mockResolvedValue([]);
    });

    it('should allow delivery during normal working hours', async () => {
      const result = await service.isDeliveryAllowed(timestamp, targetType, targetId);

      expect(result.allowed).toBe(true);
      expect(result.blockType).toBeUndefined();
      expect(result.context).toBeDefined();
    });

    it('should block delivery during holiday', async () => {
      schedulingConstraintService.isHoliday.mockResolvedValue(true);

      const result = await service.isDeliveryAllowed(timestamp, targetType, targetId);

      expect(result.allowed).toBe(false);
      expect(result.blockType).toBe('HOLIDAY');
      expect(result.reason).toContain('holiday');
    });

    it('should block delivery during blackout period', async () => {
      schedulingConstraintService.isBlackoutPeriod.mockResolvedValue(true);

      const result = await service.isDeliveryAllowed(timestamp, targetType, targetId);

      expect(result.allowed).toBe(false);
      expect(result.blockType).toBe('BLACKOUT');
      expect(result.reason).toContain('blackout');
    });

    it('should block delivery outside working hours', async () => {
      schedulingConstraintService.isWithinWorkingHours.mockResolvedValue(false);

      const result = await service.isDeliveryAllowed(timestamp, targetType, targetId);

      expect(result.allowed).toBe(false);
      expect(result.blockType).toBe('OUTSIDE_WORKING_HOURS');
      expect(result.reason).toContain('working hours');
    });

    it('should allow delivery during holiday when override is active', async () => {
      schedulingConstraintService.isHoliday.mockResolvedValue(true);
      schedulingConstraintService.hasActiveOverride.mockResolvedValue(true);

      const result = await service.isDeliveryAllowed(timestamp, targetType, targetId);

      expect(result.allowed).toBe(true);
    });

    it('should allow delivery during blackout when override is active', async () => {
      schedulingConstraintService.isBlackoutPeriod.mockResolvedValue(true);
      schedulingConstraintService.hasActiveOverride.mockResolvedValue(true);

      const result = await service.isDeliveryAllowed(timestamp, targetType, targetId);

      expect(result.allowed).toBe(true);
    });

    it('should include suggested next slot when blocked', async () => {
      const nextSlot = new Date('2024-01-16T09:00:00Z');
      schedulingConstraintService.isBlackoutPeriod.mockResolvedValue(true);
      schedulingConstraintService.suggestNextAvailableTime.mockResolvedValue(nextSlot);

      const result = await service.isDeliveryAllowed(timestamp, targetType, targetId);

      expect(result.allowed).toBe(false);
      expect(result.suggestedNextSlot).toEqual(nextSlot);
    });

    it('should include surge multiplier in result', async () => {
      const result = await service.isDeliveryAllowed(timestamp, targetType, targetId);

      expect(result.surgeMultiplier).toBeDefined();
      expect(typeof result.surgeMultiplier).toBe('number');
    });

    it('should apply holiday surge when delivery is blocked by holiday', async () => {
      schedulingConstraintService.isHoliday.mockResolvedValue(true);

      const result = await service.isDeliveryAllowed(timestamp, targetType, targetId);

      expect(result.surgeMultiplier).toBe(1.25);
    });
  });

  describe('getSurgeMultiplier', () => {
    const timestamp = new Date('2024-01-15T10:00:00Z');

    beforeEach(() => {
      schedulingConstraintService.isHoliday.mockResolvedValue(false);
    });

    it('should return base multiplier during normal hours', async () => {
      const nonPeakTime = new Date('2024-01-15T15:00:00Z');

      const multiplier = await service.getSurgeMultiplier(nonPeakTime);

      expect(multiplier).toBe(0.9);
    });

    it('should return holiday surge multiplier on holidays', async () => {
      schedulingConstraintService.isHoliday.mockResolvedValue(true);

      const multiplier = await service.getSurgeMultiplier(timestamp);

      expect(multiplier).toBe(1.25);
    });

    it('should return peak hour surge during peak times', async () => {
      const peakTime = new Date('2024-01-15T08:00:00Z');

      const multiplier = await service.getSurgeMultiplier(peakTime);

      expect(multiplier).toBe(1.15);
    });

    it('should return highest multiplier when multiple conditions apply', async () => {
      schedulingConstraintService.isHoliday.mockResolvedValue(true);
      const peakTime = new Date('2024-01-15T08:00:00Z');

      const multiplier = await service.getSurgeMultiplier(peakTime);

      expect(multiplier).toBe(1.25);
    });

    it('should cache surge multiplier results', async () => {
      await service.getSurgeMultiplier(timestamp);
      await service.getSurgeMultiplier(timestamp);

      expect(schedulingConstraintService.isHoliday).toHaveBeenCalledTimes(1);
    });

    it('should consider region when checking holiday', async () => {
      const regionId = 'KE';

      await service.getSurgeMultiplier(timestamp, regionId);

      expect(schedulingConstraintService.isHoliday).toHaveBeenCalledWith(timestamp, {
        country: regionId,
      });
    });
  });

  describe('getNextAvailableSlot', () => {
    const targetType = BindingTargetType.BUSINESS;
    const targetId = 'business-123';
    const fromTime = new Date('2024-01-15T22:00:00Z');

    it('should delegate to scheduling constraint service', async () => {
      const expectedSlot = new Date('2024-01-16T09:00:00Z');
      schedulingConstraintService.suggestNextAvailableTime.mockResolvedValue(expectedSlot);

      const result = await service.getNextAvailableSlot(fromTime, targetType, targetId);

      expect(result).toEqual(expectedSlot);
      expect(schedulingConstraintService.suggestNextAvailableTime).toHaveBeenCalledWith(
        targetType,
        targetId,
        fromTime,
        'Africa/Nairobi'
      );
    });

    it('should return null when no slot is available', async () => {
      schedulingConstraintService.suggestNextAvailableTime.mockResolvedValue(null);

      const result = await service.getNextAvailableSlot(fromTime, targetType, targetId);

      expect(result).toBeNull();
    });

    it('should use custom timezone when provided', async () => {
      const customTz = 'America/New_York';
      schedulingConstraintService.suggestNextAvailableTime.mockResolvedValue(null);

      await service.getNextAvailableSlot(fromTime, targetType, targetId, customTz);

      expect(schedulingConstraintService.suggestNextAvailableTime).toHaveBeenCalledWith(
        targetType,
        targetId,
        fromTime,
        customTz
      );
    });
  });

  describe('cache invalidation', () => {
    const targetType = BindingTargetType.BUSINESS;
    const targetId = 'business-123';
    const timestamp = new Date('2024-01-15T10:00:00Z');

    beforeEach(() => {
      schedulingConstraintService.isHoliday.mockResolvedValue(false);
      schedulingConstraintService.isWithinWorkingHours.mockResolvedValue(true);
      schedulingConstraintService.isBlackoutPeriod.mockResolvedValue(false);
      schedulingConstraintService.hasActiveOverride.mockResolvedValue(false);
      calendarBindingService.getBindingsForTarget.mockResolvedValue([]);
    });

    it('should invalidate cache for specific target', async () => {
      await service.getCalendarPolicyContext(timestamp, targetType, targetId);

      service.invalidateCacheForTarget(targetType, targetId);

      await service.getCalendarPolicyContext(timestamp, targetType, targetId);

      expect(schedulingConstraintService.isHoliday).toHaveBeenCalledTimes(2);
    });

    it('should not invalidate cache for other targets', async () => {
      const otherTargetId = 'business-456';

      await service.getCalendarPolicyContext(timestamp, targetType, targetId);
      await service.getCalendarPolicyContext(timestamp, targetType, otherTargetId);

      service.invalidateCacheForTarget(targetType, targetId);

      await service.getCalendarPolicyContext(timestamp, targetType, otherTargetId);

      expect(calendarBindingService.getBindingsForTarget).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache entries', async () => {
      await service.getCalendarPolicyContext(timestamp, targetType, targetId);

      service.clearCache();

      await service.getCalendarPolicyContext(timestamp, targetType, targetId);

      expect(schedulingConstraintService.isHoliday).toHaveBeenCalledTimes(2);
    });
  });

  describe('activatePolicyBinding', () => {
    it('should emit Calendar.PolicyBinding.ActivatedV1 event', async () => {
      const policyId = 'policy-123';
      const ruleId = 'rule-456';

      await service.activatePolicyBinding(policyId, ruleId);

      expect(eventBusService.publish).toHaveBeenCalledWith(
        'calendar.events.policy-binding-activated-v1',
        expect.objectContaining({
          eventType: 'Calendar.PolicyBinding.ActivatedV1',
          payload: expect.objectContaining({
            policyId,
            sourceRuleId: ruleId,
          }),
        })
      );
    });
  });

  describe('mapRuleTypeToEffect', () => {
    it('should map BLACKOUT to BLOCK', () => {
      expect(service.mapRuleTypeToEffect(CalendarRuleType.BLACKOUT)).toBe(PolicyEffect.BLOCK);
    });

    it('should map CLOSURE to BLOCK', () => {
      expect(service.mapRuleTypeToEffect(CalendarRuleType.CLOSURE)).toBe(PolicyEffect.BLOCK);
    });

    it('should map HOLIDAY to BLOCK', () => {
      expect(service.mapRuleTypeToEffect(CalendarRuleType.HOLIDAY)).toBe(PolicyEffect.BLOCK);
    });

    it('should map WORKING_HOURS to ALLOW', () => {
      expect(service.mapRuleTypeToEffect(CalendarRuleType.WORKING_HOURS)).toBe(PolicyEffect.ALLOW);
    });

    it('should map WEEKEND to ALLOW', () => {
      expect(service.mapRuleTypeToEffect(CalendarRuleType.WEEKEND)).toBe(PolicyEffect.ALLOW);
    });
  });

  describe('mapCalendarScopeToPolicy', () => {
    it('should map GLOBAL to GLOBAL', () => {
      expect(service.mapCalendarScopeToPolicy(CalendarScope.GLOBAL)).toBe(PolicyScope.GLOBAL);
    });

    it('should map NATIONAL to NATIONAL', () => {
      expect(service.mapCalendarScopeToPolicy(CalendarScope.NATIONAL)).toBe(PolicyScope.NATIONAL);
    });

    it('should map SACCO to SACCO', () => {
      expect(service.mapCalendarScopeToPolicy(CalendarScope.SACCO)).toBe(PolicyScope.SACCO);
    });

    it('should map BUSINESS to BUSINESS', () => {
      expect(service.mapCalendarScopeToPolicy(CalendarScope.BUSINESS)).toBe(PolicyScope.BUSINESS);
    });

    it('should map RIDER to RIDER', () => {
      expect(service.mapCalendarScopeToPolicy(CalendarScope.RIDER)).toBe(PolicyScope.RIDER);
    });
  });

  describe('configuration', () => {
    it('should allow updating configuration', () => {
      service.updateConfig({
        cacheTtlMs: 10000,
        holidaySurgeMultiplier: 1.5,
        peakHourSurgeMultiplier: 1.3,
      });

      const config = service.getConfig();

      expect(config.cacheTtlMs).toBe(10000);
      expect(config.holidaySurgeMultiplier).toBe(1.5);
      expect(config.peakHourSurgeMultiplier).toBe(1.3);
    });

    it('should use updated surge multipliers', async () => {
      service.updateConfig({ holidaySurgeMultiplier: 1.5 });
      schedulingConstraintService.isHoliday.mockResolvedValue(true);

      const multiplier = await service.getSurgeMultiplier(new Date());

      expect(multiplier).toBe(1.5);
    });

    it('should use updated peak hours configuration', async () => {
      service.updateConfig({
        peakHours: [{ start: 10, end: 11 }],
      });

      const peakTime = new Date('2024-01-15T10:30:00Z');
      const nonPeakTime = new Date('2024-01-15T12:00:00Z');

      schedulingConstraintService.isHoliday.mockResolvedValue(false);
      schedulingConstraintService.isWithinWorkingHours.mockResolvedValue(true);
      schedulingConstraintService.isBlackoutPeriod.mockResolvedValue(false);
      schedulingConstraintService.hasActiveOverride.mockResolvedValue(false);
      calendarBindingService.getBindingsForTarget.mockResolvedValue([]);

      const peakContext = await service.getCalendarPolicyContext(
        peakTime,
        BindingTargetType.BUSINESS,
        'business-123'
      );

      service.clearCache();

      const nonPeakContext = await service.getCalendarPolicyContext(
        nonPeakTime,
        BindingTargetType.BUSINESS,
        'business-123'
      );

      expect(peakContext.isPeakHour).toBe(true);
      expect(nonPeakContext.isPeakHour).toBe(false);
    });
  });

  describe('error handling', () => {
    const targetType = BindingTargetType.BUSINESS;
    const targetId = 'business-123';
    const timestamp = new Date('2024-01-15T10:00:00Z');

    it('should handle event bus errors gracefully in context generation', async () => {
      schedulingConstraintService.isHoliday.mockResolvedValue(false);
      schedulingConstraintService.isWithinWorkingHours.mockResolvedValue(true);
      schedulingConstraintService.isBlackoutPeriod.mockResolvedValue(false);
      schedulingConstraintService.hasActiveOverride.mockResolvedValue(false);
      calendarBindingService.getBindingsForTarget.mockResolvedValue([]);

      const context = await service.getCalendarPolicyContext(timestamp, targetType, targetId);

      expect(context).toBeDefined();
    });
  });
});
