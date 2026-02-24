import { AssignmentRulesService } from '../../services/assignment-rules.service';

describe('AssignmentRulesService', () => {
  const service = new AssignmentRulesService();

  const minutesFrom = (base: Date, minutes: number): Date =>
    new Date(base.getTime() + minutes * 60 * 1000);

  it('should MATCH_NOW when not scheduled', () => {
    const now = new Date('2024-01-01T12:00:00.000Z');
    const result = service.evaluateForMatching({ isScheduled: false, now });

    expect(result.decision).toBe('MATCH_NOW');
    expect(result.reason).toBe('NOT_SCHEDULED');
  });

  it('should MATCH_NOW when scheduled time is in the past', () => {
    const now = new Date('2024-01-01T12:00:00.000Z');
    const past = new Date('2024-01-01T10:00:00.000Z');

    const result = service.evaluateForMatching({
      isScheduled: true,
      scheduledPickupTime: past,
      now,
    });

    expect(result.decision).toBe('MATCH_NOW');
    expect(result.reason).toBe('PAST_SCHEDULE');
  });

  it('should SCHEDULE_FOR_LATER when scheduled is far in the future beyond window', () => {
    const now = new Date('2024-01-01T12:00:00.000Z');
    const scheduled = new Date('2024-01-01T14:00:00.000Z');

    const result = service.evaluateForMatching(
      { isScheduled: true, scheduledDropoffTime: scheduled, now },
      { preMatchWindowMinutes: 30 }
    );

    expect(result.decision).toBe('SCHEDULE_FOR_LATER');
    expect(result.reason).toBe('FUTURE_OUTSIDE_WINDOW');
    expect(result.scheduleAt?.toISOString()).toBe(minutesFrom(scheduled, -30).toISOString());
  });

  it('should MATCH_NOW when within the pre-match window', () => {
    const now = new Date('2024-01-01T12:00:00.000Z');
    const scheduled = new Date('2024-01-01T12:10:00.000Z');

    const result = service.evaluateForMatching(
      { isScheduled: true, scheduledPickupTime: scheduled, now },
      { preMatchWindowMinutes: 30 }
    );

    expect(result.decision).toBe('MATCH_NOW');
    expect(result.reason).toBe('WITHIN_WINDOW');
  });

  it('should MATCH_NOW when flagged scheduled but missing times (defensive fallback)', () => {
    const now = new Date('2024-01-01T12:00:00.000Z');
    const result = service.evaluateForMatching({ isScheduled: true, now });

    expect(result.decision).toBe('MATCH_NOW');
    expect(result.reason).toBe('IMMEDIATE');
  });

  it('should request early notification when assigned well before window', () => {
    const scheduled = new Date('2024-01-01T15:00:00.000Z');
    const assignedAt = new Date('2024-01-01T13:00:00.000Z');

    const shouldNotify = service.shouldNotifyEarlyAssignment({
      isScheduled: true,
      scheduledPickupTime: scheduled,
      assignedAt,
      config: { preMatchWindowMinutes: 30 },
    });

    expect(shouldNotify).toBe(true);
  });

  it('should not request early notification when assigned within window', () => {
    const scheduled = new Date('2024-01-01T15:00:00.000Z');
    const assignedAt = new Date('2024-01-01T14:40:00.000Z');

    const shouldNotify = service.shouldNotifyEarlyAssignment({
      isScheduled: true,
      scheduledDropoffTime: scheduled,
      assignedAt,
      config: { preMatchWindowMinutes: 30 },
    });

    expect(shouldNotify).toBe(false);
  });

  it('should not request notification for non-scheduled deliveries', () => {
    const shouldNotify = service.shouldNotifyEarlyAssignment({
      isScheduled: false,
      assignedAt: new Date('2024-01-01T12:00:00.000Z'),
    });

    expect(shouldNotify).toBe(false);
  });
});
