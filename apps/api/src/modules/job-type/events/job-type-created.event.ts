/**
 * JobTypeCreatedEventV1
 *
 * Append-only event emitted when a job type is successfully created.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Postgres persistence (JobType entity)
 * 2. Neo4j projection (JobType node in graph)
 * 3. Any other downstream event handlers
 */

import { JobTypeMode, JobTypeStatus, Vertical } from '../dto/job-type.enums';
import {
  AssignmentStrategyConfig,
  PricingStrategyConfig,
  UILayoutConfig,
  SLARulesConfig,
} from '../dto/job-type.response.dto';

export class JobTypeCreatedEventV1 {
  readonly eventId: string;
  readonly eventType = 'JobType.CreatedV1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'JobType' as const;

  readonly jobTypeId: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly description: string | null;
  readonly vertical: Vertical;
  readonly mode: JobTypeMode;
  readonly status: JobTypeStatus;
  readonly workflowDefinitionId: string | null;
  readonly assignmentStrategy: AssignmentStrategyConfig;
  readonly pricingStrategy: PricingStrategyConfig;
  readonly uiLayoutConfig: UILayoutConfig;
  readonly slaRules: SLARulesConfig;
  readonly supportsMultipleWorkers: boolean;
  readonly supportsMultipleDestinations: boolean;
  readonly verticalSpecificSettings: Record<string, unknown> | null;
  readonly createdAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    jobTypeId: string;
    workspaceId: string;
    name: string;
    description: string | null;
    vertical: Vertical;
    mode: JobTypeMode;
    status: JobTypeStatus;
    workflowDefinitionId: string | null;
    assignmentStrategy: AssignmentStrategyConfig;
    pricingStrategy: PricingStrategyConfig;
    uiLayoutConfig: UILayoutConfig;
    slaRules: SLARulesConfig;
    supportsMultipleWorkers: boolean;
    supportsMultipleDestinations: boolean;
    verticalSpecificSettings: Record<string, unknown> | null;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.jobTypeId = data.jobTypeId;
    this.aggregateId = data.jobTypeId;
    this.workspaceId = data.workspaceId;
    this.name = data.name;
    this.description = data.description;
    this.vertical = data.vertical;
    this.mode = data.mode;
    this.status = data.status;
    this.workflowDefinitionId = data.workflowDefinitionId;
    this.assignmentStrategy = data.assignmentStrategy;
    this.pricingStrategy = data.pricingStrategy;
    this.uiLayoutConfig = data.uiLayoutConfig;
    this.slaRules = data.slaRules;
    this.supportsMultipleWorkers = data.supportsMultipleWorkers;
    this.supportsMultipleDestinations = data.supportsMultipleDestinations;
    this.verticalSpecificSettings = data.verticalSpecificSettings;
    this.createdAt = data.createdAt;
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
      name: this.name,
      description: this.description,
      vertical: this.vertical,
      mode: this.mode,
      status: this.status,
      workflowDefinitionId: this.workflowDefinitionId,
      assignmentStrategy: this.assignmentStrategy,
      pricingStrategy: this.pricingStrategy,
      uiLayoutConfig: this.uiLayoutConfig,
      slaRules: this.slaRules,
      supportsMultipleWorkers: this.supportsMultipleWorkers,
      supportsMultipleDestinations: this.supportsMultipleDestinations,
      verticalSpecificSettings: this.verticalSpecificSettings,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: Record<string, unknown>): JobTypeCreatedEventV1 {
    return new JobTypeCreatedEventV1({
      eventId: data.eventId as string,
      jobTypeId: data.jobTypeId as string,
      workspaceId: data.workspaceId as string,
      name: data.name as string,
      description: data.description as string | null,
      vertical: data.vertical as Vertical,
      mode: data.mode as JobTypeMode,
      status: data.status as JobTypeStatus,
      workflowDefinitionId: data.workflowDefinitionId as string | null,
      assignmentStrategy: data.assignmentStrategy as AssignmentStrategyConfig,
      pricingStrategy: data.pricingStrategy as PricingStrategyConfig,
      uiLayoutConfig: data.uiLayoutConfig as UILayoutConfig,
      slaRules: data.slaRules as SLARulesConfig,
      supportsMultipleWorkers: data.supportsMultipleWorkers as boolean,
      supportsMultipleDestinations: data.supportsMultipleDestinations as boolean,
      verticalSpecificSettings: data.verticalSpecificSettings as Record<string, unknown> | null,
      createdAt: new Date(data.createdAt as string),
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}
