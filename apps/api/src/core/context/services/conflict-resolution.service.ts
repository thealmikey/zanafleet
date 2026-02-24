import { Injectable, Logger } from '@nestjs/common';

import { MembershipRole } from '@api/modules/workspace/dto/workspace.enums';
import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';

import {
  ConflictResolutionResult,
  CONTEXT_SOURCE_PRIORITY,
  ResolvedContext,
} from '../context.types';

/**
 * ConflictResolutionService
 *
 * Resolves conflicts when multiple roles could apply to a context.
 * Implements priority-based resolution with configurable rules.
 */

@Injectable()
export class ConflictResolutionService {
  private readonly logger = new Logger(ConflictResolutionService.name);

  /**
   * Resolve conflict when multiple contexts are available
   */
  resolveConflict(
    contexts: ResolvedContext[],
    memberships: MembershipEntity[],
    requestContext?: {
      jobId?: string;
      notificationId?: string;
      route?: string;
    }
  ): ConflictResolutionResult {
    // 1. Filter to valid contexts only
    const validContexts = contexts.filter(c =>
      this.isValidMembership(c.workspaceId, c.role, memberships)
    );

    if (validContexts.length === 0) {
      return this.fallbackToDefault(memberships);
    }

    // 2. Apply priority based on context source
    validContexts.sort((a, b) => {
      const priorityA = CONTEXT_SOURCE_PRIORITY[a.source as keyof typeof CONTEXT_SOURCE_PRIORITY] || 50;
      const priorityB = CONTEXT_SOURCE_PRIORITY[b.source as keyof typeof CONTEXT_SOURCE_PRIORITY] || 50;
      return priorityB - priorityA;
    });

    // 3. If job context exists, use it
    if (requestContext?.jobId) {
      const jobContext = validContexts.find(c => c.source === 'job_event' || c.source === 'active_job');
      if (jobContext) {
        this.logger.debug(
          `Resolved conflict using job context: ${jobContext.workspaceId}/${jobContext.role}`
        );
        return {
          selectedRole: jobContext.role,
          selectedWorkspaceId: jobContext.workspaceId,
          reasoning: `Selected from job context (job: ${requestContext.jobId})`,
        };
      }
    }

    // 4. Return highest priority
    const selected = validContexts[0];
    this.logger.debug(
      `Resolved conflict: ${selected.workspaceId}/${selected.role} (source: ${selected.source})`
    );

    return {
      selectedRole: selected.role,
      selectedWorkspaceId: selected.workspaceId,
      reasoning: `Selected from ${selected.source} context`,
    };
  }

  /**
   * Check if membership is valid
   */
  private isValidMembership(
    workspaceId: string,
    role: MembershipRole,
    memberships: MembershipEntity[]
  ): boolean {
    return memberships.some(
      m => m.workspaceId === workspaceId && m.role === role
    );
  }

  /**
   * Fallback to default workspace/role
   */
  private fallbackToDefault(
    memberships: MembershipEntity[]
  ): ConflictResolutionResult {
    const defaultMembership = memberships.find(m => m.defaultWorkspace);
    const fallback = defaultMembership || memberships[0];

    this.logger.debug(
      `Falling back to default: ${fallback.workspaceId}/${fallback.role}`
    );

    return {
      selectedRole: fallback.role,
      selectedWorkspaceId: fallback.workspaceId,
      reasoning: 'Fallback to default workspace/role',
    };
  }

  /**
   * Resolve when same role exists in multiple workspaces
   */
  resolveMultiWorkspaceConflict(
    role: MembershipRole,
    workspaces: { workspaceId: string; isDefault: boolean }[]
  ): ConflictResolutionResult {
    // 1. Prefer default workspace
    const defaultWorkspace = workspaces.find(w => w.isDefault);
    if (defaultWorkspace) {
      return {
        selectedRole: role,
        selectedWorkspaceId: defaultWorkspace.workspaceId,
        reasoning: `Selected default workspace for ${role} role`,
      };
    }

    // 2. Use first workspace
    const first = workspaces[0];
    return {
      selectedRole: role,
      selectedWorkspaceId: first.workspaceId,
      reasoning: `Selected first workspace for ${role} role`,
    };
  }

  /**
   * Resolve when user has both rider and customer in same workspace
   */
  resolveRoleConflict(
    workspaceId: string,
    roles: MembershipRole[],
    action?: string
  ): ConflictResolutionResult {
    // Use action-based inference
    if (action) {
      const roleFromAction = this.inferRoleFromAction(action, roles);
      if (roleFromAction) {
        return {
          selectedRole: roleFromAction,
          selectedWorkspaceId: workspaceId,
          reasoning: `Inferred role ${roleFromAction} from action: ${action}`,
        };
      }
    }

    // Default: Rider takes precedence for job-related actions
    if (roles.includes(MembershipRole.RIDER)) {
      return {
        selectedRole: MembershipRole.RIDER,
        selectedWorkspaceId: workspaceId,
        reasoning: 'Rider role takes precedence for job actions',
      };
    }

    // Otherwise use first role
    return {
      selectedRole: roles[0],
      selectedWorkspaceId: workspaceId,
      reasoning: 'Using first available role',
    };
  }

  /**
   * Infer role from action
   */
  private inferRoleFromAction(
    action: string,
    availableRoles: MembershipRole[]
  ): MembershipRole | null {
    const actionRoleMap: Record<string, MembershipRole> = {
      'job.accept': MembershipRole.RIDER,
      'job.complete': MembershipRole.RIDER,
      'job.create': MembershipRole.BUSINESS_OWNER,
      'job.cancel': MembershipRole.BUSINESS_OWNER,
      'order.create': MembershipRole.CUSTOMER,
      'order.cancel': MembershipRole.CUSTOMER,
      'member.invite': MembershipRole.ADMIN,
      'workspace.manage': MembershipRole.ADMIN,
    };

    const inferredRole = actionRoleMap[action];
    if (inferredRole && availableRoles.includes(inferredRole)) {
      return inferredRole;
    }

    return null;
  }

  /**
   * Get resolution explanation for UI
   */
  getResolutionExplanation(
    contexts: ResolvedContext[],
    result: ConflictResolutionResult
  ): string {
    if (contexts.length === 0) {
      return 'No valid contexts found, using default workspace';
    }

    if (contexts.length === 1) {
      return `Single context available: ${contexts[0].source}`;
    }

    const sources = contexts.map(c => c.source).join(', ');
    return `Resolved from multiple contexts (${sources}): selected ${result.selectedRole} in ${result.selectedWorkspaceId}`;
  }
}
