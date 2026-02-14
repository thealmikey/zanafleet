/**
 * AI Suggestion Interface
 *
 * Represents an AI-generated suggestion that can be accepted, rejected, or expired.
 * All suggestions are advisory only - they cannot automatically mutate state.
 */

export enum AISuggestionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * AI Suggestion
 *
 * Core interface representing an AI-generated suggestion
 */
export interface AISuggestion {
  /** Unique identifier for the suggestion */
  id: string;

  /** The actor this suggestion is for */
  actorId: string;

  /** Type of context (e.g., 'workflow', 'task', 'booking') */
  contextType: string;

  /** ID of the context */
  contextId: string;

  /** Current workflow state */
  workflowState: string;

  /** Suggested capability to execute */
  capability: string;

  /** Human-readable reason for the suggestion */
  reason: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Optional risk score (0-100) */
  riskScore?: number;

  /** Current status of the suggestion */
  status: AISuggestionStatus;

  /** When the suggestion was created */
  createdAt: Date;

  /** When the suggestion expires */
  expiresAt: Date;

  /** Hash for deduplication */
  deduplicationHash?: string;
}

/**
 * AI Suggestion DTO for creating new suggestions
 */
export interface CreateAISuggestionDTO {
  actorId: string;
  contextType: string;
  contextId: string;
  workflowState: string;
  capability: string;
  reason: string;
  confidence: number;
  riskScore?: number;
  expiresAt: Date;
  deduplicationHash?: string;
}

/**
 * AI Suggestion query filters
 */
export interface AISuggestionFilters {
  actorId?: string;
  contextType?: string;
  contextId?: string;
  status?: AISuggestionStatus;
  capability?: string;
  fromDate?: Date;
  toDate?: Date;
}
