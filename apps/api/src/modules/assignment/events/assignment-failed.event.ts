import { BaseEvent } from '../../../core/event-bus/interfaces/base-event.interface';

/**
 * AssignmentFailedEventV1
 *
 * Event emitted when an assignment process fails.
 */
export class AssignmentFailedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'AssignmentFailedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Assignment' as const;

  readonly jobId: string;
  readonly workspaceId: string;
  readonly error: string;
  readonly durationMs: number;

  readonly correlationId?: string;

  constructor(data: {
    eventId: string;
    jobId: string;
    workspaceId: string;
    error: string;
    durationMs: number;
    occurredAt?: Date;
    correlationId?: string;
  }) {
    this.eventId = data.eventId;
    this.jobId = data.jobId;
    this.workspaceId = data.workspaceId;
    this.error = data.error;
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
      workspaceId: this.workspaceId,
      error: this.error,
      durationMs: this.durationMs,
      correlationId: this.correlationId,
    };
  }

  static fromJSON(data: Record<string, unknown>): AssignmentFailedEventV1 {
    return new AssignmentFailedEventV1({
      eventId: data.eventId as string,
      jobId: data.jobId as string,
      workspaceId: data.workspaceId as string,
      error: data.error as string,
      durationMs: data.durationMs as number,
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
    });
  }
}
