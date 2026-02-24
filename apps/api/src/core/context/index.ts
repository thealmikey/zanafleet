/**
 * Context Module
 *
 * Multi-workspace context resolution, role projection, and unified job feed.
 *
 * @example
 * ```typescript
 * import { ContextModule, ContextResolutionService, RoleProjectionService, UnifiedJobFeedService } from '@api/core/context';
 *
 * // In your module
 * imports: [ContextModule],
 *
 * // In your service
 * constructor(
 *   private readonly contextResolver: ContextResolutionService,
 *   private readonly roleProjection: RoleProjectionService,
 *   private readonly jobFeed: UnifiedJobFeedService,
 * ) {}
 * ```
 */

// Module
export * from './context.module';

// Types
export * from './context.types';

// Services
export * from './services/context-resolution.service';
export * from './services/role-projection.service';
export * from './services/unified-job-feed.service';
