/**
 * JobTypeEnabledEventV1
 *
 * Append-only event emitted when a job type is enabled for a workspace.
 */

export class JobTypeEnabledEventV1 {
  readonly eventId: string;
  readonly eventType = 'JobType.EnabledV1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'JobType' as const;

  readonly jobTypeId: string;
  readonly workspaceId: string;
  readonly enabledAt: Date;
  readonly enabledBy: string | null;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    jobTypeId: string;
    workspaceId: string;
    enabledAt: Date;
    enabledBy: string | null;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.jobTypeId = data.jobTypeId;
    this.aggregateId = `${data.workspaceId}-${data.jobTypeId}`;
    this.workspaceId = data.workspaceId;
    this.enabledAt = data.enabledAt;
    this.enabledBy = data.enabledBy;
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
      jobTypeId: this.jobTypeId,
      workspaceId: this.workspaceId,
      enabledAt: this.enabledAt.toISOString(),
      enabledBy: this.enabledBy,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: Record<string, unknown>): JobTypeEnabledEventV1 {
    return new JobTypeEnabledEventV1({
      eventId: data.eventId as string,
      jobTypeId: data.jobTypeId as string,
      workspaceId: data.workspaceId as string,
      enabledAt: new Date(data.enabledAt as string),
      enabledBy: data.enabledBy as string | null,
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}
