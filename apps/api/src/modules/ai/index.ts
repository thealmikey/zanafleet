/**
 * AI Module Index
 *
 * Public exports for the AI Intelligence Layer
 */

// Re-export everything from ai.module (which includes events and interfaces)
export * from './ai.module';

// Entities
export { AISuggestionEntity } from './entities/ai-suggestion.entity';
export { AIFeedbackEntity, AIFeedbackType } from './entities/ai-feedback.entity';
export { AITelemetryEntity, AITelemetryEventType, AITelemetrySeverity } from './entities/ai-telemetry.entity';
