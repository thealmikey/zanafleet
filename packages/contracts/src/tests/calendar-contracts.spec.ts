import {
  CalendarScope,
  CalendarRuleType,
  CalendarEventType,
  RecurrencePattern,
  BindingTargetType,
} from '../index';

describe('Calendar Contracts', () => {
  describe('CalendarScope enum', () => {
    it('should have correct values matching PolicyScope hierarchy', () => {
      expect(CalendarScope.GLOBAL).toBe('GLOBAL');
      expect(CalendarScope.NATIONAL).toBe('NATIONAL');
      expect(CalendarScope.SACCO).toBe('SACCO');
      expect(CalendarScope.BUSINESS).toBe('BUSINESS');
      expect(CalendarScope.RIDER).toBe('RIDER');
    });

    it('should have exactly 5 values', () => {
      const values = Object.values(CalendarScope);
      expect(values).toHaveLength(5);
    });
  });

  describe('CalendarRuleType enum', () => {
    it('should have correct values', () => {
      expect(CalendarRuleType.WORKING_HOURS).toBe('WORKING_HOURS');
      expect(CalendarRuleType.WEEKEND).toBe('WEEKEND');
      expect(CalendarRuleType.HOLIDAY).toBe('HOLIDAY');
      expect(CalendarRuleType.CLOSURE).toBe('CLOSURE');
      expect(CalendarRuleType.BLACKOUT).toBe('BLACKOUT');
    });

    it('should have exactly 5 values', () => {
      const values = Object.values(CalendarRuleType);
      expect(values).toHaveLength(5);
    });
  });

  describe('CalendarEventType enum', () => {
    it('should have correct values', () => {
      expect(CalendarEventType.PUBLIC_HOLIDAY).toBe('PUBLIC_HOLIDAY');
      expect(CalendarEventType.BUSINESS_CLOSURE).toBe('BUSINESS_CLOSURE');
      expect(CalendarEventType.NATIONAL_EVENT).toBe('NATIONAL_EVENT');
      expect(CalendarEventType.WEATHER_DISRUPTION).toBe('WEATHER_DISRUPTION');
      expect(CalendarEventType.STRIKE_ADVISORY).toBe('STRIKE_ADVISORY');
      expect(CalendarEventType.PROMOTIONAL_CAMPAIGN).toBe('PROMOTIONAL_CAMPAIGN');
    });

    it('should have exactly 6 values', () => {
      const values = Object.values(CalendarEventType);
      expect(values).toHaveLength(6);
    });
  });

  describe('RecurrencePattern enum', () => {
    it('should have correct values', () => {
      expect(RecurrencePattern.NONE).toBe('NONE');
      expect(RecurrencePattern.DAILY).toBe('DAILY');
      expect(RecurrencePattern.WEEKLY).toBe('WEEKLY');
      expect(RecurrencePattern.MONTHLY).toBe('MONTHLY');
      expect(RecurrencePattern.YEARLY).toBe('YEARLY');
      expect(RecurrencePattern.CUSTOM).toBe('CUSTOM');
    });

    it('should have exactly 6 values', () => {
      const values = Object.values(RecurrencePattern);
      expect(values).toHaveLength(6);
    });
  });

  describe('BindingTargetType enum', () => {
    it('should have correct values', () => {
      expect(BindingTargetType.BUSINESS).toBe('BUSINESS');
      expect(BindingTargetType.SACCO).toBe('SACCO');
      expect(BindingTargetType.RIDER).toBe('RIDER');
      expect(BindingTargetType.WORKSPACE).toBe('WORKSPACE');
    });

    it('should have exactly 4 values', () => {
      const values = Object.values(BindingTargetType);
      expect(values).toHaveLength(4);
    });
  });
});
