import { BaseEvent } from '../../../core/event-bus/interfaces/base-event.interface';

/**
 * AssignmentCompletedEventV1
 *
 * Event emitted when an assignment process completes.
 */
export class AssignmentCompletedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'AssignmentCompletedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Assignment' as const;

  readonly jobId: string;
  readonly jobTypeId: string;
  readonly workspaceId: string;
  readonly strategyType: string;
  readonly strategyName: string;
  readonly success: boolean;
  readonly assignedWorkerCount: number;
  readonly errors: string[];
  readonly durationMs: number;

  readonly correlationId?: string;

  constructor(data: {
    eventId: string;
    jobId: string;
    jobTypeId: string;
    workspaceId: string;
    strategyType: string;
    strategyName: string;
    success: boolean;
    assignedWorkerCount: number;
    errors: string[];
    durationMs: number;
    occurredAt?: Date;
    correlationId?: string;
  }) {
    this.eventId = data.eventId;
    this.jobId = data.jobId;
    this.jobTypeId = data.jobTypeId;
    this.workspaceId = data.workspaceId;
    this.strategyType = data.strategyType;
    this.strategyName = data.strategyName;
    this.success = data.success;
    this.assignedWorkerCount = data.assignedWorkerCount;
    this.errors = data.errors;
    this.durationMs = data.durationMs;
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
      success: this.success,
      assignedWorkerCount: this.assignedWorkerCount,
      errors: this.errors,
      durationMs: this.durationMs,
      correlationId: this.correlationId,
    };
  }

  static fromJSON(data: Record<string, unknown>): AssignmentCompletedEventV1 {
    return new AssignmentCompletedEventV1({
      eventId: data.eventId as string,
      jobId: data.jobId as string,
      jobTypeId: data.jobTypeId as string,
      workspaceId: data.workspaceId as string,
      strategyType: data.strategyType as string,
      strategyName: data.strategyName as string,
      success: data.success as boolean,
      assignedWorkerCount: data.assignedWorkerCount as number,
      errors: data.errors as string[],
      durationMs: data.durationMs as number,
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
    });
  }
}

