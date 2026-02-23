import { ProcessRelatedEntity } from '../entities/process-instance.entity';

/**
 * ProcessCreatedEventV1
 *
 * Append-only event emitted when a new process instance is created.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Neo4j projection (Process node in graph)
 * 2. Downstream handlers
 */
export class ProcessCreatedEventV1 {
  readonly eventId: string;
  readonly eventType = 'Workflow.Process.CreatedV1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'ProcessInstance' as const;

  readonly instanceId: string;
  readonly definitionId: string;
  readonly name: string;
  readonly initialState: string;
  readonly context: Record<string, unknown>;
  readonly relatedEntities: ProcessRelatedEntity[];
  readonly triggeredBy: string;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    instanceId: string;
    definitionId: string;
    name: string;
    initialState: string;
    context: Record<string, unknown>;
    relatedEntities: ProcessRelatedEntity[];
    triggeredBy: string;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.instanceId = data.instanceId;
    this.aggregateId = data.instanceId;
    this.definitionId = data.definitionId;
    this.name = data.name;
    this.initialState = data.initialState;
    this.context = data.context;
    this.relatedEntities = data.relatedEntities;
    this.triggeredBy = data.triggeredBy;
    this.occurredAt = data.occurredAt || new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'Workflow.Process.CreatedV1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'ProcessInstance';
    instanceId: string;
    definitionId: string;
    name: string;
    initialState: string;
    context: Record<string, unknown>;
    relatedEntities: ProcessRelatedEntity[];
    triggeredBy: string;
    correlationId?: string;
    causationId?: string;
  } {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      instanceId: this.instanceId,
      definitionId: this.definitionId,
      name: this.name,
      initialState: this.initialState,
      context: this.context,
      relatedEntities: this.relatedEntities,
      triggeredBy: this.triggeredBy,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    instanceId: string;
    definitionId: string;
    name: string;
    initialState: string;
    context: Record<string, unknown>;
    relatedEntities: ProcessRelatedEntity[];
    triggeredBy: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): ProcessCreatedEventV1 {
    return new ProcessCreatedEventV1({
      eventId: data.eventId,
      instanceId: data.instanceId,
      definitionId: data.definitionId,
      name: data.name,
      initialState: data.initialState,
      context: data.context,
      relatedEntities: data.relatedEntities,
      triggeredBy: data.triggeredBy,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
