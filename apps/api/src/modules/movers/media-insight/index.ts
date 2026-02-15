/**
 * MediaInsight Module Barrel Export
 *
 * Main entry point for the media-insight module.
 * Exports all interfaces, DTOs, services, providers, and utility functions.
 *
 * @module media-insight
 *
 * @example
 * ```typescript
 * import {
 *   MediaInsight,
 *   MediaInsightResult,
 *   MediaInsightDto,
 *   validateMediaInsight,
 *   createEmptyMediaInsight,
 *   MediaPerceptionAdapter,
 *   IVisionProvider,
 *   AnalyzeMediaCommand,
 *   MediaInsightEvents,
 *   IntelligenceSnapshotService,
 *   MediaPerceptionFeatureService,
 *   mediaPerceptionConfig,
 * } from '@zanafleet/media-insight';
 * ```
 */

// Interfaces
export type {
  DetectedItem,
  ItemCategory,
  MediaInsight,
  MediaInsightErrorCode,
  MediaInsightResult,
  MediaInsightStatus,
  MediaInsightV1,
  SizeClass,
} from './interfaces';

// DTOs
export { DetectedItemDto, MediaInsightDto } from './dto/media-insight.dto';

// Utilities
export {
  createEmptyMediaInsight,
  deserializeMediaInsight,
  isMediaInsightV1,
  serializeMediaInsight,
  validateMediaInsight,
} from './utils';

// Provider Interfaces
export type {
  IVisionProvider,
  VisionAnalysisRequest,
  VisionAnalysisResponse,
  VisionProviderConfig,
} from './providers/vision-provider.interface';

// Providers
export { NoopVisionProvider } from './providers/noop-vision.provider';
export { OpenAIVisionProvider } from './providers/openai-vision.provider';

// Configuration
export {
  mediaPerceptionConfig,
  DEFAULT_MEDIA_PERCEPTION_CONFIG,
  type MediaPerceptionConfig,
} from './config/media-perception.config';

// Services
export {
  MediaPerceptionAdapter,
  type MediaReference,
  type VisionProviderType,
} from './services/media-perception-adapter.service';

export { MediaPerceptionFeatureService } from './services/media-perception-feature.service';

// Commands
export {
  AnalyzeMediaCommand,
  type AnalyzeMediaPayload,
  type MediaReferencePayload,
} from './commands/analyze-media.command';

// Events
export { MediaInsightEvents } from './events/media-insight.events';

// Handlers
export { AnalyzeMediaHandler } from './handlers/analyze-media.handler';

// Entities
export {
  IntelligenceSnapshotEntity,
  type ProfileSource,
  type MediaInsightSummary,
} from './entities/intelligence-snapshot.entity';

// Snapshot Service
export {
  IntelligenceSnapshotService,
  type SnapshotSummary,
} from './services/intelligence-snapshot.service';

// Subscribers
export { MediaInsightSubscriber } from './subscribers/media-insight.subscriber';
