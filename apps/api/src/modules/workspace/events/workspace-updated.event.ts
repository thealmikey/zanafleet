import { BaseEvent } from '../../../core/event-bus';
import { WorkspaceStatus } from '../dto/workspace.enums';

/**
 * Changes associated with a WorkspaceUpdatedEvent-V1
 */
export type WorkspaceUpdatedEventV1Changes = {
  name?: string;
  status?: WorkspaceStatus;
  roleTemplates?: readonly string[];
};

/**
 * JSON structure for WorkspaceUpdatedEvent-V1
 */
export interface WorkspaceUpdatedEventV1JSON {
  eventId: string;
  eventType: 'WorkspaceUpdatedEvent-V1';
  eventVersion: '1.0.0';
  occurredAt: string;
  aggregateId: string;
  aggregateType: 'Workspace';
  workspaceId: string;
  changes: {
    name?: string;
    status?: WorkspaceStatus;
    roleTemplates?: readonly string[];
  };
  updatedAt: string;
  correlationId?: string;
  causationId?: string;
}

/**
 * WorkspaceUpdatedEventV1
 * Immutable fact that a workspace was updated.
 */
export class WorkspaceUpdatedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'WorkspaceUpdatedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Workspace' as const;

  readonly workspaceId: string;
  readonly changes: Readonly<WorkspaceUpdatedEventV1Changes>;
  readonly updatedAt: Date;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    workspaceId: string;
    changes: WorkspaceUpdatedEventV1Changes;
    updatedAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.workspaceId = data.workspaceId;
    this.aggregateId = data.workspaceId;
    this.changes = Object.freeze({ ...data.changes });
    this.updatedAt = data.updatedAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  /**
   * Serializes event to plain object for transport
   */
  toJSON(): WorkspaceUpdatedEventV1JSON {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      workspaceId: this.workspaceId,
      changes: this.changes,
      updatedAt: this.updatedAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  /**
   * Deserializes event from plain object
   */
  static fromJSON(data: WorkspaceUpdatedEventV1JSON): WorkspaceUpdatedEventV1 {
    return new WorkspaceUpdatedEventV1({
      eventId: data.eventId,
      workspaceId: data.workspaceId,
      changes: data.changes,
      updatedAt: new Date(data.updatedAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
