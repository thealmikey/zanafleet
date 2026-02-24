/**
 * Test Helpers
 *
 * Common test utilities for AI module testing.
 */

import { v4 as uuidv4 } from 'uuid';
import { AISuggestionEntity } from '../../entities/ai-suggestion.entity';
import { AIFeedbackEntity, AIFeedbackType } from '../../entities/ai-feedback.entity';
import { AISuggestionStatus } from '../../interfaces/ai-suggestion.interface';

/**
 * Generate a test UUID
 */
export const testUuid = (): string => uuidv4();

/**
 * Create a mock suggestion entity for testing
 */
export function createMockSuggestionEntity(
  overrides?: Partial<AISuggestionEntity>
): AISuggestionEntity {
  const entity = new AISuggestionEntity();
  entity.id = overrides?.id ?? testUuid();
  entity.actorId = overrides?.actorId ?? testUuid();
  entity.contextType = overrides?.contextType ?? 'workflow';
  entity.contextId = overrides?.contextId ?? testUuid();
  entity.workflowState = overrides?.workflowState ?? 'pending';
  entity.capability = overrides?.capability ?? 'submit_for_review';
  entity.reason = overrides?.reason ?? 'Test suggestion reason';
  entity.confidence = overrides?.confidence ?? 0.75;
  entity.riskScore = overrides?.riskScore ?? 25;
  entity.status = overrides?.status ?? AISuggestionStatus.PENDING;
  entity.expiresAt = overrides?.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
  entity.deduplicationHash =
    overrides?.deduplicationHash ??
    `${entity.actorId}:${entity.contextType}:${entity.contextId}:${entity.workflowState}:${entity.capability}`;
  entity.metadata = overrides?.metadata ?? null;
  entity.correlationId = overrides?.correlationId ?? null;
  entity.causationId = overrides?.causationId ?? null;
  entity.createdAt = overrides?.createdAt ?? new Date();
  entity.updatedAt = overrides?.updatedAt ?? new Date();
  return entity;
}

/**
 * Create a mock feedback entity for testing
 */
export function createMockFeedbackEntity(overrides?: Partial<AIFeedbackEntity>): AIFeedbackEntity {
  const entity = new AIFeedbackEntity();
  entity.id = overrides?.id ?? testUuid();
  entity.actorId = overrides?.actorId ?? testUuid();
  entity.suggestionId = overrides?.suggestionId ?? testUuid();
  entity.feedbackType = overrides?.feedbackType ?? AIFeedbackType.ACCEPTED;
  entity.capability = overrides?.capability ?? 'submit_for_review';
  entity.confidence = overrides?.confidence ?? 0.75;
  entity.riskScore = overrides?.riskScore ?? 25;
  entity.reason = overrides?.reason ?? 'Test feedback reason';
  entity.userComment = overrides?.userComment ?? null;
  entity.contextType = overrides?.contextType ?? 'workflow';
  entity.contextId = overrides?.contextId ?? testUuid();
  entity.workflowState = overrides?.workflowState ?? 'pending';
  entity.metadata = overrides?.metadata ?? null;
  entity.correlationId = overrides?.correlationId ?? null;
  entity.createdAt = overrides?.createdAt ?? new Date();
  return entity;
}

/**
 * Create a mock CreateAISuggestionDTO
 */
export function createMockCreateSuggestionDTO(
  overrides?: Record<string, unknown>
): Record<string, unknown> {
  return {
    actorId: testUuid(),
    contextType: 'workflow',
    contextId: testUuid(),
    workflowState: 'pending',
    capability: 'submit_for_review',
    reason: 'Test suggestion reason',
    confidence: 0.75,
    riskScore: 25,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    deduplicationHash: undefined,
    ...overrides,
  };
}

/**
 * Create mock pending suggestions
 */
export function createMockPendingSuggestions(count: number): AISuggestionEntity[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSuggestionEntity({
      id: testUuid(),
      status: AISuggestionStatus.PENDING,
      createdAt: new Date(Date.now() - i * 60 * 60 * 1000), // Each created 1 hour apart
    })
  );
}

/**
 * Create expired suggestions
 */
export function createMockExpiredSuggestions(count: number): AISuggestionEntity[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSuggestionEntity({
      id: testUuid(),
      status: AISuggestionStatus.EXPIRED,
      expiresAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000), // Expired i+1 days ago
    })
  );
}

/**
 * Create future date helper
 */
export function createFutureDate(hoursFromNow: number): Date {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}

/**
 * Create past date helper
 * @param hoursAgo - Number of hours in the past
 */
export function createPastDate(hoursAgo: number): Date {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
}

/**
 * Create past date helper using minutes
 * @param minutesAgo - Number of minutes in the past
 */
export function createPastDateMinutes(minutesAgo: number): Date {
  return new Date(Date.now() - minutesAgo * 60 * 1000);
}

/**
 * Wait for a specified duration (for testing async behavior)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create test date with specific timezone offset
 */
export function createDateWithTimezone(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  timezoneOffset: number
): Date {
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset() - timezoneOffset);
  return date;
}

/**
 * Create very long string for truncation testing
 */
export function createLongString(length: number): string {
  return 'A'.repeat(length);
}

/**
 * Create unicode string for testing
 */
export function createUnicodeString(): string {
  return 'Hello 🌍 你好 🌟 Émoji 🚀';
}
