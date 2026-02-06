/**
 * BaseEvent Interface
 *
 * Defines the contract for all domain events in the system.
 * All events must implement this interface to be published via the Event Bus.
 *
 * Event naming convention: <Entity><Action>Event-V<Number>
 * Example: OrganizationCreatedEvent-V1, WalletCreditedEvent-V2
 */
export interface BaseEvent {
  /**
   * Unique identifier for this specific event instance.
   * Used for idempotency checks and event tracing.
   */
  readonly eventId: string;

  /**
   * The type/name of the event (e.g., 'OrganizationCreatedEvent-V1').
   * Used for routing and handler matching.
   */
  readonly eventType: string;

  /**
   * Semantic version of the event schema (e.g., '1.0.0').
   * Enables schema evolution and backward compatibility.
   */
  readonly eventVersion: string;

  /**
   * Timestamp when the event occurred in the domain.
   */
  readonly occurredAt: Date;

  /**
   * Identifier of the aggregate root that emitted this event.
   * For example, the organizationId for organization events.
   */
  readonly aggregateId: string;

  /**
   * Type of the aggregate root (e.g., 'Organization', 'Wallet', 'Transaction').
   */
  readonly aggregateType: string;

  /**
   * Optional correlation ID for tracing related events across services.
   */
  readonly correlationId?: string;

  /**
   * Optional ID of the command/event that caused this event.
   */
  readonly causationId?: string;
}

/**
 * Type guard to check if an object implements BaseEvent
 */
export function isBaseEvent(obj: unknown): obj is BaseEvent {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const event = obj as Record<string, unknown>;

  return (
    typeof event.eventId === 'string' &&
    typeof event.eventType === 'string' &&
    typeof event.eventVersion === 'string' &&
    (event.occurredAt instanceof Date || typeof event.occurredAt === 'string') &&
    typeof event.aggregateId === 'string' &&
    typeof event.aggregateType === 'string'
  );
}

/**
 * Serialized format of BaseEvent for transport
 */
export interface SerializedEvent {
  eventId: string;
  eventType: string;
  eventVersion: string;
  occurredAt: string;
  aggregateId: string;
  aggregateType: string;
  correlationId?: string;
  causationId?: string;
  payload: Record<string, unknown>;
}
