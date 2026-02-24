import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';
import { WorkspaceEntity } from '@api/modules/workspace/entities/workspace.entity';
import { DeliveryEntity } from '@api/modules/delivery/entities/delivery.entity';

import { ContextResolutionService } from './services/context-resolution.service';
import { RoleProjectionService } from './services/role-projection.service';
import { UnifiedJobFeedService } from './services/unified-job-feed.service';

/**
 * Context Module
 *
 * Provides multi-workspace context resolution, role projection, and unified job feed.
 *
 * Core services:
 * 1. ContextResolutionService - Resolves workspace context from various sources
 * 2. RoleProjectionService - Infers roles based on intent and route
 * 3. UnifiedJobFeedService - Aggregates jobs from multiple workspaces
 *
 * Usage:
 * - Import this module to enable seamless multi-workspace experience
 * - Use ContextResolutionService to resolve workspace from events/jobs
 * - Use RoleProjectionService to infer roles without manual selection
 * - Use UnifiedJobFeedService for cross-workspace job aggregation
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      MembershipEntity,
      WorkspaceEntity,
      DeliveryEntity,
    ]),
  ],
  providers: [
    ContextResolutionService,
    RoleProjectionService,
    UnifiedJobFeedService,
  ],
  exports: [
    ContextResolutionService,
    RoleProjectionService,
    UnifiedJobFeedService,
  ],
})
export class ContextModule {
  private readonly logger = new Logger(ContextModule.name);

  constructor() {
    this.logger.log('ContextModule initialized - multi-workspace support enabled');
  }
}
