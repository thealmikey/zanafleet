import { BaseEvent, CalendarEventType, CalendarScope, BindingTargetType } from '@zanafleet/contracts';
import { v4 as uuidv4 } from 'uuid';

/**
 * CalendarCreatedEventV1
 * Emitted when a new calendar is created.
 */
export class CalendarCreatedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'Calendar.Calendar.CreatedV1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Calendar' as const;

  readonly calendarId: string;
  readonly name: string;
  readonly timezone: string;
  readonly ownerScope: CalendarScope;
  readonly ownerScopeId: string | null;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId?: string;
    calendarId: string;
    name: string;
    timezone: string;
    ownerScope: CalendarScope;
    ownerScopeId: string | null;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId || uuidv4();
    this.calendarId = data.calendarId;
    this.aggregateId = data.calendarId;
    this.name = data.name;
    this.timezone = data.timezone;
    this.ownerScope = data.ownerScope;
    this.ownerScopeId = data.ownerScopeId;
    this.occurredAt = data.occurredAt || new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      calendarId: this.calendarId,
      name: this.name,
      timezone: this.timezone,
      ownerScope: this.ownerScope,
      ownerScopeId: this.ownerScopeId,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: Record<string, unknown>): CalendarCreatedEventV1 {
    return new CalendarCreatedEventV1({
      eventId: data.eventId as string,
      calendarId: data.calendarId as string,
      name: data.name as string,
      timezone: data.timezone as string,
      ownerScope: data.ownerScope as CalendarScope,
      ownerScopeId: data.ownerScopeId as string | null,
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}

/**
 * CalendarEventAddedEventV1
 * Emitted when a calendar event (holiday, closure, etc.) is added.
 */
export class CalendarEventAddedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'Calendar.Event.AddedV1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'CalendarEvent' as const;

  readonly calendarEventId: string;
  readonly calendarEventType: CalendarEventType;
  readonly title: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly regionCountry?: string;
  readonly regionAdministrativeArea?: string;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId?: string;
    calendarEventId: string;
    calendarEventType: CalendarEventType;
    title: string;
    startTime: Date;
    endTime: Date;
    regionCountry?: string;
    regionAdministrativeArea?: string;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId || uuidv4();
    this.calendarEventId = data.calendarEventId;
    this.aggregateId = data.calendarEventId;
    this.calendarEventType = data.calendarEventType;
    this.title = data.title;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.regionCountry = data.regionCountry;
    this.regionAdministrativeArea = data.regionAdministrativeArea;
    this.occurredAt = data.occurredAt || new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      calendarEventId: this.calendarEventId,
      calendarEventType: this.calendarEventType,
      title: this.title,
      startTime: this.startTime.toISOString(),
      endTime: this.endTime.toISOString(),
      regionCountry: this.regionCountry,
      regionAdministrativeArea: this.regionAdministrativeArea,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: Record<string, unknown>): CalendarEventAddedEventV1 {
    return new CalendarEventAddedEventV1({
      eventId: data.eventId as string,
      calendarEventId: data.calendarEventId as string,
      calendarEventType: data.calendarEventType as CalendarEventType,
      title: data.title as string,
      startTime: new Date(data.startTime as string),
      endTime: new Date(data.endTime as string),
      regionCountry: data.regionCountry as string | undefined,
      regionAdministrativeArea: data.regionAdministrativeArea as string | undefined,
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}

/**
 * HolidayDeclaredEventV1
 * Emitted when a new public holiday is declared.
 */
export class HolidayDeclaredEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'Calendar.Holiday.DeclaredV1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'CalendarEvent' as const;

  readonly holidayId: string;
  readonly title: string;
  readonly holidayDate: Date;
  readonly regionCountry: string;
  readonly regionAdministrativeArea?: string;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId?: string;
    holidayId: string;
    title: string;
    holidayDate: Date;
    regionCountry: string;
    regionAdministrativeArea?: string;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId || uuidv4();
    this.holidayId = data.holidayId;
    this.aggregateId = data.holidayId;
    this.title = data.title;
    this.holidayDate = data.holidayDate;
    this.regionCountry = data.regionCountry;
    this.regionAdministrativeArea = data.regionAdministrativeArea;
    this.occurredAt = data.occurredAt || new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      holidayId: this.holidayId,
      title: this.title,
      holidayDate: this.holidayDate.toISOString(),
      regionCountry: this.regionCountry,
      regionAdministrativeArea: this.regionAdministrativeArea,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: Record<string, unknown>): HolidayDeclaredEventV1 {
    return new HolidayDeclaredEventV1({
      eventId: data.eventId as string,
      holidayId: data.holidayId as string,
      title: data.title as string,
      holidayDate: new Date(data.holidayDate as string),
      regionCountry: data.regionCountry as string,
      regionAdministrativeArea: data.regionAdministrativeArea as string | undefined,
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}

/**
 * OverrideAppliedEventV1
 * Emitted when a calendar override is activated.
 */
export class OverrideAppliedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'Calendar.Override.AppliedV1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'CalendarOverride' as const;

  readonly overrideId: string;
  readonly targetScope: CalendarScope;
  readonly targetScopeId: string | null;
  readonly exceptionType: string;
  readonly reason: string | null;
  readonly validFrom: Date;
  readonly validUntil: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId?: string;
    overrideId: string;
    targetScope: CalendarScope;
    targetScopeId: string | null;
    exceptionType: string;
    reason: string | null;
    validFrom: Date;
    validUntil: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId || uuidv4();
    this.overrideId = data.overrideId;
    this.aggregateId = data.overrideId;
    this.targetScope = data.targetScope;
    this.targetScopeId = data.targetScopeId;
    this.exceptionType = data.exceptionType;
    this.reason = data.reason;
    this.validFrom = data.validFrom;
    this.validUntil = data.validUntil;
    this.occurredAt = data.occurredAt || new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      overrideId: this.overrideId,
      targetScope: this.targetScope,
      targetScopeId: this.targetScopeId,
      exceptionType: this.exceptionType,
      reason: this.reason,
      validFrom: this.validFrom.toISOString(),
      validUntil: this.validUntil.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: Record<string, unknown>): OverrideAppliedEventV1 {
    return new OverrideAppliedEventV1({
      eventId: data.eventId as string,
      overrideId: data.overrideId as string,
      targetScope: data.targetScope as CalendarScope,
      targetScopeId: data.targetScopeId as string | null,
      exceptionType: data.exceptionType as string,
      reason: data.reason as string | null,
      validFrom: new Date(data.validFrom as string),
      validUntil: new Date(data.validUntil as string),
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}

/**
 * ConstraintBlockedActionEventV1
 * Emitted when a scheduling constraint blocks an operation.
 */
export class ConstraintBlockedActionEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'Calendar.Constraint.BlockedV1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'SchedulingConstraint' as const;

  readonly targetType: BindingTargetType;
  readonly targetId: string;
  readonly operationType: string;
  readonly blockedByType: string;
  readonly blockedByName: string;
  readonly blockedById: string;
  readonly reason: string;
  readonly timestamp: Date;
  readonly suggestedReschedule: Date | null;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId?: string;
    targetType: BindingTargetType;
    targetId: string;
    operationType: string;
    blockedByType: string;
    blockedByName: string;
    blockedById: string;
    reason: string;
    timestamp: Date;
    suggestedReschedule: Date | null;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId || uuidv4();
    this.targetType = data.targetType;
    this.targetId = data.targetId;
    this.aggregateId = data.targetId;
    this.operationType = data.operationType;
    this.blockedByType = data.blockedByType;
    this.blockedByName = data.blockedByName;
    this.blockedById = data.blockedById;
    this.reason = data.reason;
    this.timestamp = data.timestamp;
    this.suggestedReschedule = data.suggestedReschedule;
    this.occurredAt = data.occurredAt || new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      targetType: this.targetType,
      targetId: this.targetId,
      operationType: this.operationType,
      blockedByType: this.blockedByType,
      blockedByName: this.blockedByName,
      blockedById: this.blockedById,
      reason: this.reason,
      timestamp: this.timestamp.toISOString(),
      suggestedReschedule: this.suggestedReschedule?.toISOString() ?? null,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: Record<string, unknown>): ConstraintBlockedActionEventV1 {
    return new ConstraintBlockedActionEventV1({
      eventId: data.eventId as string,
      targetType: data.targetType as BindingTargetType,
      targetId: data.targetId as string,
      operationType: data.operationType as string,
      blockedByType: data.blockedByType as string,
      blockedByName: data.blockedByName as string,
      blockedById: data.blockedById as string,
      reason: data.reason as string,
      timestamp: new Date(data.timestamp as string),
      suggestedReschedule: data.suggestedReschedule ? new Date(data.suggestedReschedule as string) : null,
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}
