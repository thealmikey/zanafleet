import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';
import { WorkspaceEntity } from '@api/modules/workspace/entities/workspace.entity';
import { MembershipRole } from '@api/modules/workspace/dto/workspace.enums';

import {
  ContextResolutionRequest,
  ContextResolutionResult,
  ContextSource,
  WorkspaceContext,
} from '../context.types';

/**
 * ContextResolutionService
 *
 * Automatically determines the correct workspace context based on:
 * - Incoming job events
 * - Assignments
 * - Notification origins
 * - User actions
 * - Active job context
 *
 * This enables seamless multi-workspace experience without manual switching.
 */
@Injectable()
export class ContextResolutionService {
  private readonly logger = new Logger(ContextResolutionService.name);

  constructor(
    @InjectRepository(MembershipEntity)
    private readonly membershipRepository: Repository<MembershipEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
  ) {}

  /**
   * Resolve workspace context for an actor based on various sources
   */
  async resolve(request: ContextResolutionRequest): Promise<ContextResolutionResult> {
    const { actorId, source, explicitWorkspaceId, jobWorkspaceId, route } = request;

    try {
      // 1. If explicit workspace provided, validate membership
      if (explicitWorkspaceId) {
        return this.validateWorkspaceMembership(actorId, explicitWorkspaceId, source);
      }

      // 2. Resolve based on source type
      switch (source) {
        case 'job_event':
        case 'assignment':
          // Extract workspace from job
          if (jobWorkspaceId) {
            return this.validateWorkspaceMembership(actorId, jobWorkspaceId, source);
          }
          break;

        case 'notification':
          // Would extract from notification metadata in real implementation
          break;

        case 'active_job':
          // Find workspace from actor's active job assignment
          const activeJobWorkspace = await this.findActiveJobWorkspace(actorId);
          if (activeJobWorkspace) {
            return this.validateWorkspaceMembership(actorId, activeJobWorkspace, source);
          }
          break;

        case 'route_access':
          // Infer from route pattern
          const inferredWorkspace = await this.inferWorkspaceFromRoute(actorId, route);
          if (inferredWorkspace) {
            return { success: true, context: inferredWorkspace };
          }
          break;
      }

      // 3. Fallback to default workspace
      return this.getDefaultWorkspace(actorId, source);

    } catch (error) {
      this.logger.error(`Context resolution failed for actor ${actorId}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate that actor has membership in the specified workspace
   */
  private async validateWorkspaceMembership(
    actorId: string,
    workspaceId: string,
    source: ContextSource,
  ): Promise<ContextResolutionResult> {
    const membership = await this.membershipRepository.findOne({
      where: { actorId, workspaceId },
    });

    if (!membership) {
      return {
        success: false,
        error: `Actor ${actorId} is not a member of workspace ${workspaceId}`,
      };
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return {
        success: false,
        error: `Workspace ${workspaceId} not found`,
      };
    }

    const context: WorkspaceContext = {
      actorId,
      workspaceId,
      workspaceName: workspace.name,
      roles: [membership.role],
      primaryRole: membership.role,
      source,
      isMultiWorkspace: await this.isMultiWorkspaceActor(actorId),
    };

    return { success: true, context };
  }

  /**
   * Get actor's default workspace (where defaultWorkspace = true)
   */
  private async getDefaultWorkspace(
    actorId: string,
    source: ContextSource,
  ): Promise<ContextResolutionResult> {
    const defaultMembership = await this.membershipRepository.findOne({
      where: { actorId, defaultWorkspace: true },
    });

    if (defaultMembership) {
      return this.validateWorkspaceMembership(actorId, defaultMembership.workspaceId, source);
    }

    // Fallback: first membership
    const firstMembership = await this.membershipRepository.findOne({
      where: { actorId },
      order: { since: 'ASC' },
    });

    if (!firstMembership) {
      return {
        success: false,
        error: `Actor ${actorId} has no workspace memberships`,
      };
    }

    return this.validateWorkspaceMembership(actorId, firstMembership.workspaceId, source);
  }

  /**
   * Find workspace from actor's active job assignment
   * This queries delivery/order tables for active assignments
   */
  private async findActiveJobWorkspace(actorId: string): Promise<string | null> {
    // Query active deliveries where actor is assigned
    // In production, this would be a unified job query
    // For now, return null to fall back to default workspace
    this.logger.debug(`Finding active job workspace for actor ${actorId}`);

    // TODO: Implement with actual job queries
    // const delivery = await this.deliveryRepository.findOne({
    //   where: { assignedRiderId: actorId, status: In([DeliveryStatus.Assigned, ...]) },
    //   order: { updatedAt: 'DESC' },
    // });
    // return delivery?.workspaceId ?? null;

    return null;
  }

  /**
   * Infer workspace from route pattern
   *
   * Route patterns:
   * - /rider/* → RIDER role, find workspace from active job or default
   * - /customer/* → CUSTOMER role, use order's workspace
   * - /admin/workspaces/:id → ADMIN role, use route workspace
   * - /shops/:shopId/* → infer from shop's workspace
   */
  private async inferWorkspaceFromRoute(
    actorId: string,
    route?: string,
  ): Promise<WorkspaceContext | null> {
    if (!route) {
      return null;
    }

    // Extract workspace from route patterns
    const workspaceIdMatch = route.match(/\/workspaces\/([a-f0-9-]+)/i);
    if (workspaceIdMatch) {
      const workspaceId = workspaceIdMatch[1];
      const result = await this.resolve({
        actorId,
        source: 'route_access',
        explicitWorkspaceId: workspaceId,
      });
      return result.success ? result.context! : null;
    }

    // Route-based role inference will be handled by RoleProjectionService
    return null;
  }

  /**
   * Check if actor is member of multiple workspaces
   */
  async isMultiWorkspaceActor(actorId: string): Promise<boolean> {
    const count = await this.membershipRepository.count({
      where: { actorId },
    });
    return count > 1;
  }

  /**
   * Get all workspaces for an actor with their roles
   */
  async getActorWorkspaces(actorId: string) {
    const memberships = await this.membershipRepository.find({
      where: { actorId },
      relations: ['workspace'],
    });

    return memberships.map((m) => ({
      workspaceId: m.workspaceId,
      workspaceName: m.workspaceId, // Would join workspace entity
      role: m.role,
      isDefault: m.defaultWorkspace,
    }));
  }

  /**
   * Set default workspace for an actor
   */
  async setDefaultWorkspace(actorId: string, workspaceId: string): Promise<boolean> {
    // Clear existing default
    await this.membershipRepository.update(
      { actorId, defaultWorkspace: true },
      { defaultWorkspace: false },
    );

    // Set new default
    const result = await this.membershipRepository.update(
      { actorId, workspaceId },
      { defaultWorkspace: true },
    );

    return (result.affected ?? 0) > 0;
  }
}
