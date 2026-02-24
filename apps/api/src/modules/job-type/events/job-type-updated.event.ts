/**
 * JobTypeUpdatedEventV1
 *
 * Append-only event emitted when a job type is successfully updated.
 */

import { JobTypeMode, JobTypeStatus, Vertical } from '../dto/job-type.enums';
import {
  AssignmentStrategyConfig,
  PricingStrategyConfig,
  UILayoutConfig,
  SLARulesConfig,
} from '../dto/job-type.response.dto';

export class JobTypeUpdatedEventV1 {
  readonly eventId: string;
  readonly eventType = 'JobType.UpdatedV1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'JobType' as const;

  readonly jobTypeId: string;
  readonly workspaceId: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly vertical?: Vertical;
  readonly mode?: JobTypeMode;
  readonly status?: JobTypeStatus;
  readonly workflowDefinitionId?: string | null;
  readonly assignmentStrategy?: AssignmentStrategyConfig;
  readonly pricingStrategy?: PricingStrategyConfig;
  readonly uiLayoutConfig?: UILayoutConfig;
  readonly slaRules?: SLARulesConfig;
  readonly supportsMultipleWorkers?: boolean;
  readonly supportsMultipleDestinations?: boolean;
  readonly verticalSpecificSettings?: Record<string, unknown> | null;
  readonly updatedAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    jobTypeId: string;
    workspaceId: string;
    name?: string;
    description?: string | null;
    vertical?: Vertical;
    mode?: JobTypeMode;
    status?: JobTypeStatus;
    workflowDefinitionId?: string | null;
    assignmentStrategy?: AssignmentStrategyConfig;
    pricingStrategy?: PricingStrategyConfig;
    uiLayoutConfig?: UILayoutConfig;
    slaRules?: SLARulesConfig;
    supportsMultipleWorkers?: boolean;
    supportsMultipleDestinations?: boolean;
    verticalSpecificSettings?: Record<string, unknown> | null;
    updatedAt: Date;
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
    this.updatedAt = data.updatedAt;
    this.occurredAt = data.occurredAt || new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      jobTypeId: this.jobTypeId,
      workspaceId: this.workspaceId,
      updatedAt: this.updatedAt.toISOString(),
    };

    if (this.name !== undefined) json.name = this.name;
    if (this.description !== undefined) json.description = this.description;
    if (this.vertical !== undefined) json.vertical = this.vertical;
    if (this.mode !== undefined) json.mode = this.mode;
    if (this.status !== undefined) json.status = this.status;
    if (this.workflowDefinitionId !== undefined) json.workflowDefinitionId = this.workflowDefinitionId;
    if (this.assignmentStrategy !== undefined) json.assignmentStrategy = this.assignmentStrategy;
    if (this.pricingStrategy !== undefined) json.pricingStrategy = this.pricingStrategy;
    if (this.uiLayoutConfig !== undefined) json.uiLayoutConfig = this.uiLayoutConfig;
    if (this.slaRules !== undefined) json.slaRules = this.slaRules;
    if (this.supportsMultipleWorkers !== undefined) json.supportsMultipleWorkers = this.supportsMultipleWorkers;
    if (this.supportsMultipleDestinations !== undefined) json.supportsMultipleDestinations = this.supportsMultipleDestinations;
    if (this.verticalSpecificSettings !== undefined) json.verticalSpecificSettings = this.verticalSpecificSettings;
    if (this.correlationId !== undefined) json.correlationId = this.correlationId;
    if (this.causationId !== undefined) json.causationId = this.causationId;

    return json;
  }

  static fromJSON(data: Record<string, unknown>): JobTypeUpdatedEventV1 {
    return new JobTypeUpdatedEventV1({
      eventId: data.eventId as string,
      jobTypeId: data.jobTypeId as string,
      workspaceId: data.workspaceId as string,
      name: data.name as string | undefined,
      description: data.description as string | null | undefined,
      vertical: data.vertical as Vertical | undefined,
      mode: data.mode as JobTypeMode | undefined,
      status: data.status as JobTypeStatus | undefined,
      workflowDefinitionId: data.workflowDefinitionId as string | null | undefined,
      assignmentStrategy: data.assignmentStrategy as AssignmentStrategyConfig | undefined,
      pricingStrategy: data.pricingStrategy as PricingStrategyConfig | undefined,
      uiLayoutConfig: data.uiLayoutConfig as UILayoutConfig | undefined,
      slaRules: data.slaRules as SLARulesConfig | undefined,
      supportsMultipleWorkers: data.supportsMultipleWorkers as boolean | undefined,
      supportsMultipleDestinations: data.supportsMultipleDestinations as boolean | undefined,
      verticalSpecificSettings: data.verticalSpecificSettings as Record<string, unknown> | null | undefined,
      updatedAt: new Date(data.updatedAt as string),
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}
