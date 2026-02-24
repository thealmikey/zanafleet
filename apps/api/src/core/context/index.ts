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

// Types
export * from './context.types';

// Services
export * from './services';

// Guards
export * from './guards';

// Module
export * from './context.module';
