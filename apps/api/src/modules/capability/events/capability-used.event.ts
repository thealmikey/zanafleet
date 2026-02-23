/**
 * Capability Used Event - tracks every capability execution
 *
 * This event provides a complete audit trail for capability usage:
 * - Who executed what capability?
 * - When?
 * - In which context?
 * - With what result?
 */

/**
 * Result of capability execution
 */
export enum CapabilityExecutionResult {
  SUCCESS = 'success',
  DENIED = 'denied',
  FAILED = 'failed',
  CONSENT_REQUIRED = 'consent_required',
}

/**
 * CapabilityUsedEventJSON
 * JSON serialization format
 */
export interface CapabilityUsedEventV1JSON {
  eventId: string;
  eventType: 'CapabilityUsedEvent-V1';
  eventVersion: '1.0.0';
  occurredAt: string;
  aggregateId: string;
  aggregateType: 'CapabilityUsage';
  // Actor information
  actorId: string;
  actorType?: string;
  // Capability information
  capabilityName: string;
  capabilityId?: string;
  // Context information
  contextId?: string;
  contextType?: string;
  workspaceId?: string;
  // Execution details
  result: CapabilityExecutionResult;
  reason?: string;
  // Payload details
  payload?: Record<string, unknown>;
  // Consent information
  consentObtained?: boolean;
  consentId?: string;
  // Tracing
  correlationId?: string;
  causationId?: string;
  // Timing
  executionTimeMs?: number;
  // Additional metadata
  metadata?: Record<string, unknown>;
}

/**
 * CapabilityUsedEventV1
 *
 * Emitted whenever a capability is executed through the system.
 * This includes both successful and failed executions for audit purposes.
 */
export class CapabilityUsedEventV1 {
  readonly eventId: string;
  readonly eventType = 'CapabilityUsedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'CapabilityUsage' as const;

  // Actor information
  readonly actorId: string;
  readonly actorType?: string;

  // Capability information
  readonly capabilityName: string;
  readonly capabilityId?: string;

  // Context information
  readonly contextId?: string;
  readonly contextType?: string;
  readonly workspaceId?: string;

  // Execution details
  readonly result: CapabilityExecutionResult;
  readonly reason?: string;

  // Payload details
  readonly payload?: Record<string, unknown>;

  // Consent information
  readonly consentObtained?: boolean;
  readonly consentId?: string;

  // Tracing
  readonly correlationId?: string;
  readonly causationId?: string;

  // Timing
  readonly executionTimeMs?: number;

  // Additional metadata
  readonly metadata?: Record<string, unknown>;

  constructor(data: {
    eventId: string;
    actorId: string;
    actorType?: string;
    capabilityName: string;
    capabilityId?: string;
    contextId?: string;
    contextType?: string;
    workspaceId?: string;
    result: CapabilityExecutionResult;
    reason?: string;
    payload?: Record<string, unknown>;
    consentObtained?: boolean;
    consentId?: string;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
    executionTimeMs?: number;
    metadata?: Record<string, unknown>;
  }) {
    this.eventId = data.eventId;
    this.actorId = data.actorId;
    this.actorType = data.actorType;
    this.capabilityName = data.capabilityName;
    this.capabilityId = data.capabilityId;
    this.contextId = data.contextId;
    this.contextType = data.contextType;
    this.workspaceId = data.workspaceId;
    this.result = data.result;
    this.reason = data.reason;
    this.payload = data.payload;
    this.consentObtained = data.consentObtained;
    this.consentId = data.consentId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = `${data.actorId}:${data.capabilityName}:${this.occurredAt.getTime()}`;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
    this.executionTimeMs = data.executionTimeMs;
    this.metadata = data.metadata;
  }

  /**
   * Check if execution was successful
   */
  isSuccess(): boolean {
    return this.result === CapabilityExecutionResult.SUCCESS;
  }

  /**
   * Check if execution was denied
   */
  isDenied(): boolean {
    return this.result === CapabilityExecutionResult.DENIED;
  }

  /**
   * Check if execution failed
   */
  isFailed(): boolean {
    return this.result === CapabilityExecutionResult.FAILED;
  }

  /**
   * Check if consent was required
   */
  isConsentRequired(): boolean {
    return this.result === CapabilityExecutionResult.CONSENT_REQUIRED;
  }

  /**
   * Serialize to JSON
   */
  toJSON(): CapabilityUsedEventV1JSON {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      actorId: this.actorId,
      actorType: this.actorType,
      capabilityName: this.capabilityName,
      capabilityId: this.capabilityId,
      contextId: this.contextId,
      contextType: this.contextType,
      workspaceId: this.workspaceId,
      result: this.result,
      reason: this.reason,
      payload: this.payload,
      consentObtained: this.consentObtained,
      consentId: this.consentId,
      correlationId: this.correlationId,
      causationId: this.causationId,
      executionTimeMs: this.executionTimeMs,
      metadata: this.metadata,
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(data: CapabilityUsedEventV1JSON): CapabilityUsedEventV1 {
    return new CapabilityUsedEventV1({
      eventId: data.eventId,
      actorId: data.actorId,
      actorType: data.actorType,
      capabilityName: data.capabilityName,
      capabilityId: data.capabilityId,
      contextId: data.contextId,
      contextType: data.contextType,
      workspaceId: data.workspaceId,
      result: data.result,
      reason: data.reason,
      payload: data.payload,
      consentObtained: data.consentObtained,
      consentId: data.consentId,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
      executionTimeMs: data.executionTimeMs,
      metadata: data.metadata,
    });
  }

  /**
   * Create a success event
   */
  static success(data: {
    eventId: string;
    actorId: string;
    actorType?: string;
    capabilityName: string;
    capabilityId?: string;
    contextId?: string;
    contextType?: string;
    workspaceId?: string;
    payload?: Record<string, unknown>;
    correlationId?: string;
    executionTimeMs?: number;
    metadata?: Record<string, unknown>;
  }): CapabilityUsedEventV1 {
    return new CapabilityUsedEventV1({
      ...data,
      result: CapabilityExecutionResult.SUCCESS,
    });
  }

  /**
   * Create a denied event
   */
  static denied(data: {
    eventId: string;
    actorId: string;
    actorType?: string;
    capabilityName: string;
    contextId?: string;
    contextType?: string;
    workspaceId?: string;
    reason?: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  }): CapabilityUsedEventV1 {
    return new CapabilityUsedEventV1({
      ...data,
      result: CapabilityExecutionResult.DENIED,
    });
  }

  /**
   * Create a consent required event
   */
  static consentRequired(data: {
    eventId: string;
    actorId: string;
    actorType?: string;
    capabilityName: string;
    contextId?: string;
    contextType?: string;
    workspaceId?: string;
    reason?: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  }): CapabilityUsedEventV1 {
    return new CapabilityUsedEventV1({
      ...data,
      result: CapabilityExecutionResult.CONSENT_REQUIRED,
    });
  }

  /**
   * Create a failed event
   */
  static failed(data: {
    eventId: string;
    actorId: string;
    actorType?: string;
    capabilityName: string;
    contextId?: string;
    contextType?: string;
    workspaceId?: string;
    reason?: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  }): CapabilityUsedEventV1 {
    return new CapabilityUsedEventV1({
      ...data,
      result: CapabilityExecutionResult.FAILED,
    });
  }
}
