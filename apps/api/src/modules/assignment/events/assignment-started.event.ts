import { BaseEvent } from '../../../core/event-bus/interfaces/base-event.interface';

/**
 * AssignmentStartedEventV1
 *
 * Event emitted when an assignment process starts.
 */
export class AssignmentStartedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'AssignmentStartedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Assignment' as const;

  readonly jobId: string;
  readonly jobTypeId: string;
  readonly workspaceId: string;
  readonly strategyType: string;
  readonly strategyName: string;
  readonly requiredWorkerCount: number;

  readonly correlationId?: string;

  constructor(data: {
    eventId: string;
    jobId: string;
    jobTypeId: string;
    workspaceId: string;
    strategyType: string;
    strategyName: string;
    requiredWorkerCount: number;
    occurredAt?: Date;
    correlationId?: string;
  }) {
    this.eventId = data.eventId;
    this.jobId = data.jobId;
    this.jobTypeId = data.jobTypeId;
    this.workspaceId = data.workspaceId;
    this.strategyType = data.strategyType;
    this.strategyName = data.strategyName;
    this.requiredWorkerCount = data.requiredWorkerCount;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.jobId;
    this.correlationId = data.correlationId;
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      jobId: this.jobId,
      jobTypeId: this.jobTypeId,
      workspaceId: this.workspaceId,
      strategyType: this.strategyType,
      strategyName: this.strategyName,
      requiredWorkerCount: this.requiredWorkerCount,
      correlationId: this.correlationId,
    };
  }

  static fromJSON(data: Record<string, unknown>): AssignmentStartedEventV1 {
    return new AssignmentStartedEventV1({
      eventId: data.eventId as string,
      jobId: data.jobId as string,
      jobTypeId: data.jobTypeId as string,
      workspaceId: data.workspaceId as string,
      strategyType: data.strategyType as string,
      strategyName: data.strategyName as string,
      requiredWorkerCount: data.requiredWorkerCount as number,
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
    });
  }
}
