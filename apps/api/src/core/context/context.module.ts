import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationEntity } from '@api/modules/communication/entities/notification.entity';
import { DeliveryEntity } from '@api/modules/delivery/entities/delivery.entity';
import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';
import { WorkspaceEntity } from '@api/modules/workspace/entities/workspace.entity';

import { WorkspaceContextGuard } from './guards/workspace-context.guard';
import { ContextResolutionService } from './services/context-resolution.service';
import { NotificationContextService } from './services/notification-context.service';
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
 * 4. NotificationContextService - Handles notification disambiguation
 *
 * Guards:
 * - WorkspaceContextGuard - Enforces workspace-based authorization
 *
 * Usage:
 * - Import this module to enable seamless multi-workspace experience
 * - Use ContextResolutionService to resolve workspace from events/jobs
 * - Use RoleProjectionService to infer roles without manual selection
 * - Use UnifiedJobFeedService for cross-workspace job aggregation
 * - Use WorkspaceContextGuard on routes requiring workspace authorization
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      MembershipEntity,
      WorkspaceEntity,
      DeliveryEntity,
      NotificationEntity,
    ]),
  ],
  providers: [
    ContextResolutionService,
    RoleProjectionService,
    UnifiedJobFeedService,
    NotificationContextService,
    WorkspaceContextGuard,
  ],
  exports: [
    ContextResolutionService,
    RoleProjectionService,
    UnifiedJobFeedService,
    NotificationContextService,
    WorkspaceContextGuard,
  ],
})
export class ContextModule {
  private readonly logger = new Logger(ContextModule.name);

  constructor() {
    this.logger.log('ContextModule initialized - multi-workspace support enabled');
  }
}
