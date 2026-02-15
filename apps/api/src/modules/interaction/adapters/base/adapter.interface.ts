import { InteractionEventType, InteractionActorType } from '../../entities/interaction-event.entity';

/**
 * Adapter Input
 * Normalized input from external sources
 */
export interface AdapterInput {
  rawInput: unknown;
  source: string;
  timestamp: Date;
}

/**
 * Normalized Event
 * Normalized representation ready for InteractionEvent creation
 */
export interface NormalizedEvent {
  streamId?: string;
  contextType?: string;
  contextId?: string;
  actorId: string;
  actorType: InteractionActorType;
  eventType: InteractionEventType;
  payload: Record<string, unknown>;
}

/**
 * IInteractionAdapter Interface
 * 
 * Defines the contract for external input adapters.
 * Each adapter normalizes external input into InteractionEvents.
 * 
 * Adapters MUST:
 * - Only normalize input (no business logic)
 * - Validate input before normalization
 * - Handle missing/invalid input gracefully
 * 
 * Adapters MUST NOT:
 * - Call domain services
 * - Modify entities directly
 * - Emit events (handled by the command bus)
 */
export interface IInteractionAdapter {
  /**
   * Unique identifier for this adapter
   */
  readonly adapterId: string;

  /**
   * Human-readable name for this adapter
   */
  readonly adapterName: string;

  /**
   * Supported input types
   */
  readonly supportedInputTypes: string[];

  /**
   * Normalize external input to InteractionEvent format
   * @param input The raw input from external source
   * @returns Normalized event data ready for InteractionEvent creation
   */
  normalize(input: AdapterInput): NormalizedEvent;

  /**
   * Validate input before normalization
   * @param input The raw input from external source
   * @returns true if input is valid for this adapter
   */
  validate(input: AdapterInput): boolean;

  /**
   * Extract context from input (for stream lookup/creation)
   * @param input The raw input from external source
   * @returns Context information for stream identification
   */
  extractContext?(input: AdapterInput): { contextType: string; contextId: string } | null;
}
