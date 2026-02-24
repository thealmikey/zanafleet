import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MembershipRole } from '@api/modules/workspace/dto/workspace.enums';
import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';
import { WorkspaceEntity } from '@api/modules/workspace/entities/workspace.entity';

import {
  CONTEXT_SOURCE_PRIORITY,
  ContextIntent,
  ResolvedContext,
  ROLE_PRECEDENCE,
  RoleProjection,
  RoleProjectionRequest,
  WorkspaceMembershipInfo,
} from '../context.types';

/**
 * Route role mapping with intent
 */
interface RouteRoleMapping {
  pattern: RegExp;
  inferRole: (match: RegExpMatchArray) => MembershipRole | null;
  inferWorkspace?: (match: RegExpMatchArray) => string | null;
  intent?: string;
}

const ENHANCED_ROUTE_ROLE_MAPPINGS: RouteRoleMapping[] = [
  // Rider routes
  {
    pattern: /^\/api\/v1\/rider(\/.*)?$/,
    inferRole: () => MembershipRole.RIDER,
    intent: 'rider.dashboard',
  },
  {
    pattern: /^\/api\/v1\/rider\/jobs\/([a-f0-9-]+)\/accept$/,
    inferRole: () => MembershipRole.RIDER,
    intent: 'job.accept',
  },
  {
    pattern: /^\/api\/v1\/rider\/jobs\/([a-f0-9-]+)\/complete$/,
    inferRole: () => MembershipRole.RIDER,
    intent: 'job.complete',
  },
  {
    pattern: /^\/api\/v1\/rider\/jobs\/([a-f0-9-]+)$/,
    inferRole: () => MembershipRole.RIDER,
    intent: 'job.view',
  },
  {
    pattern: /^\/api\/v1\/rider\/earnings(\/.*)?$/,
    inferRole: () => MembershipRole.RIDER,
    intent: 'earnings.view',
  },

  // Customer routes
  {
    pattern: /^\/api\/v1\/customer(\/.*)?$/,
    inferRole: () => MembershipRole.CUSTOMER,
    intent: 'customer.dashboard',
  },
  {
    pattern: /^\/api\/v1\/customer\/orders(\/.*)?$/,
    inferRole: () => MembershipRole.CUSTOMER,
    intent: 'order.view',
  },
  {
    pattern: /^\/api\/v1\/customer\/orders\/([a-f0-9-]+)$/,
    inferRole: () => MembershipRole.CUSTOMER,
    intent: 'order.view',
  },
  {
    pattern: /^\/api\/v1\/customer\/addresses(\/.*)?$/,
    inferRole: () => MembershipRole.CUSTOMER,
    intent: 'address.manage',
  },

  // Admin routes
  {
    pattern: /^\/api\/v1\/admin\/workspaces(\/.*)?$/,
    inferRole: () => MembershipRole.ADMIN,
    inferWorkspace: (match) => match[1]?.replace('/', ''),
    intent: 'workspace.manage',
  },
  {
    pattern: /^\/api\/v1\/admin\/members(\/.*)?$/,
    inferRole: () => MembershipRole.ADMIN,
    intent: 'member.manage',
  },
  {
    pattern: /^\/api\/v1\/admin\/settings(\/.*)?$/,
    inferRole: () => MembershipRole.ADMIN,
    intent: 'settings.manage',
  },

  // Business owner routes
  {
    pattern: /^\/api\/v1\/business(\/.*)?$/,
    inferRole: () => MembershipRole.BUSINESS_OWNER,
    intent: 'business.dashboard',
  },
  {
    pattern: /^\/api\/v1\/business\/jobs(\/.*)?$/,
    inferRole: () => MembershipRole.BUSINESS_OWNER,
    intent: 'job.manage',
  },
  {
    pattern: /^\/api\/v1\/shops\/([a-f0-9-]+)\/jobs(\/.*)?$/,
    inferRole: () => MembershipRole.BUSINESS_OWNER,
    intent: 'job.manage',
  },
  {
    pattern: /^\/api\/v1\/business\/analytics(\/.*)?$/,
    inferRole: () => MembershipRole.BUSINESS_OWNER,
    intent: 'analytics.view',
  },

  // Ops routes
  {
    pattern: /^\/api\/v1\/ops(\/.*)?$/,
    inferRole: () => MembershipRole.OPS,
    intent: 'ops.dashboard',
  },
  {
    pattern: /^\/api\/v1\/ops\/jobs(\/.*)?$/,
    inferRole: () => MembershipRole.OPS,
    intent: 'job.manage',
  },
  {
    pattern: /^\/api\/v1\/ops\/riders(\/.*)?$/,
    inferRole: () => MembershipRole.OPS,
    intent: 'rider.manage',
  },
];

/**
 * Intent to role mapping
 */
const INTENT_ROLE_MAPPINGS: Record<string, { role: MembershipRole; workspaceSource: string }> = {
  'job.accept': { role: MembershipRole.RIDER, workspaceSource: 'from_resource' },
  'job.complete': { role: MembershipRole.RIDER, workspaceSource: 'from_resource' },
  'job.view': { role: MembershipRole.RIDER, workspaceSource: 'from_context' },
  'job.create': { role: MembershipRole.BUSINESS_OWNER, workspaceSource: 'from_context' },
  'job.manage': { role: MembershipRole.BUSINESS_OWNER, workspaceSource: 'from_context' },
  'job.reassign': { role: MembershipRole.OPS, workspaceSource: 'from_resource' },
  'order.view': { role: MembershipRole.CUSTOMER, workspaceSource: 'from_context' },
  'order.create': { role: MembershipRole.CUSTOMER, workspaceSource: 'from_context' },
  'order.cancel': { role: MembershipRole.CUSTOMER, workspaceSource: 'from_context' },
  'member.invite': { role: MembershipRole.ADMIN, workspaceSource: 'from_context' },
  'member.manage': { role: MembershipRole.ADMIN, workspaceSource: 'from_context' },
  'workspace.manage': { role: MembershipRole.ADMIN, workspaceSource: 'from_context' },
  'settings.manage': { role: MembershipRole.ADMIN, workspaceSource: 'from_context' },
  'analytics.view': { role: MembershipRole.BUSINESS_OWNER, workspaceSource: 'from_context' },
  'rider.manage': { role: MembershipRole.OPS, workspaceSource: 'from_context' },
  'earnings.view': { role: MembershipRole.RIDER, workspaceSource: 'from_context' },
  'address.manage': { role: MembershipRole.CUSTOMER, workspaceSource: 'from_context' },
};

/**
 * RoleProjectionService
 *
 * Infers the correct role based on:
 * - Action intent (view, create, accept, complete)
 * - Route accessed
 * - Active job context
 * - Notification deep link
 *
 * Eliminates the need for users to manually select roles.
 */
@Injectable()
export class RoleProjectionService {
  private readonly logger = new Logger(RoleProjectionService.name);

  constructor(
    @InjectRepository(MembershipEntity)
    private readonly membershipRepository: Repository<MembershipEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>
  ) {}

  /**
   * Project the effective role based on intent and context
   * Enhanced with job, notification, and intent-based resolution
   */
  async projectRole(
    actorId: string,
    route?: string,
    action?: string,
    resource?: string,
    resourceId?: string,
    explicitWorkspaceId?: string
  ): Promise<RoleProjection> {
    // 1. Get all workspace memberships
    const memberships = await this.membershipRepository.find({
      where: { actorId },
    });

    if (memberships.length === 0) {
      throw new Error(`Actor ${actorId} has no workspace memberships`);
    }

    // 2. Try to resolve from different context sources
    const resolvedContexts: ResolvedContext[] = [];

    // 2a. Resolve from job context (highest priority)
    if (resourceId && (resource === 'job' || route?.includes('/jobs/'))) {
      const jobContext = await this.resolveFromJobContext(resourceId, memberships);
      if (jobContext) resolvedContexts.push(jobContext);
    }

    // 2b. Resolve from route pattern
    if (route) {
      const routeContext = this.resolveFromRoute(route, memberships);
      if (routeContext) resolvedContexts.push(routeContext);
    }

    // 2c. Resolve from action intent
    if (action) {
      const intentContext = this.resolveFromIntent(action, memberships);
      if (intentContext) resolvedContexts.push(intentContext);
    }

    // 3. Determine target workspace and role
    let targetWorkspaceId = explicitWorkspaceId;
    let targetRole: MembershipRole | null = null;
    let source: string = 'route_access';

    // 4. Apply priority resolution
    if (resolvedContexts.length > 0) {
      // Sort by source priority
      resolvedContexts.sort(
        (a, b) =>
          CONTEXT_SOURCE_PRIORITY[a.source as keyof typeof CONTEXT_SOURCE_PRIORITY] -
          CONTEXT_SOURCE_PRIORITY[b.source as keyof typeof CONTEXT_SOURCE_PRIORITY]
      );

      const bestContext = resolvedContexts[0];
      targetRole = bestContext.role;
      targetWorkspaceId = bestContext.workspaceId;
      source = bestContext.source;
    }

    // 5. If no explicit workspace, use default or first
    if (!targetWorkspaceId) {
      const defaultMembership = memberships.find((m) => m.defaultWorkspace);
      targetWorkspaceId = defaultMembership?.workspaceId ?? memberships[0].workspaceId;
    }

    // 6. If no role inferred, use membership role
    if (!targetRole) {
      const membership = memberships.find((m) => m.workspaceId === targetWorkspaceId);
      targetRole = membership?.role ?? memberships[0].role;
    }

    // 7. Validate actor has this role in workspace
    const validMembership = memberships.find((m) => m.workspaceId === targetWorkspaceId);
    if (!validMembership) {
      // Fallback to first membership
      targetWorkspaceId = memberships[0].workspaceId;
      targetRole = memberships[0].role;
    } else {
      targetRole = validMembership.role;
    }

    // 8. Get workspace details
    const workspace = await this.workspaceRepository.findOne({
      where: { id: targetWorkspaceId },
    });

    // 9. Infer intent
    const intent = this.inferIntentFromRoute(route, action, resource);

    // 10. Build all workspaces info
    const allWorkspaces: WorkspaceMembershipInfo[] = await Promise.all(
      memberships.map(async (m) => {
        const w = await this.workspaceRepository.findOne({
          where: { id: m.workspaceId },
        });
        return {
          workspaceId: m.workspaceId,
          workspaceName: w?.name ?? 'Unknown',
          role: m.role,
          isDefault: m.defaultWorkspace,
        };
      })
    );

    this.logger.debug(
      `Projected role ${targetRole} for actor ${actorId} in workspace ${targetWorkspaceId} (source: ${source})`
    );

    return {
      actorId,
      currentRole: targetRole!,
      currentWorkspaceId: targetWorkspaceId,
      currentWorkspaceName: workspace?.name ?? 'Unknown',
      effectivePermissions: this.getPermissionsForRole(targetRole!),
      allWorkspaces,
      inferredIntent: intent,
      source: source as any,
    };
  }

  /**
   * Project role from a structured request
   */
  async projectRoleFromRequest(request: RoleProjectionRequest): Promise<RoleProjection> {
    const { actorId, context, explicitWorkspaceId, explicitRole } = request;

    // Get all memberships
    const memberships = await this.membershipRepository.find({
      where: { actorId },
    });

    if (memberships.length === 0) {
      throw new Error(`Actor ${actorId} has no workspace memberships`);
    }

    // Try different resolution strategies
    const resolvedContexts: ResolvedContext[] = [];

    // From job context
    if (context?.jobId) {
      const jobContext = await this.resolveFromJobContext(context.jobId, memberships);
      if (jobContext) resolvedContexts.push(jobContext);
    }

    // From notification context
    if (context?.notificationId) {
      const notifContext = await this.resolveFromNotification(context.notificationId, memberships);
      if (notifContext) resolvedContexts.push(notifContext);
    }

    // From route context
    if (context?.route) {
      const routeContext = this.resolveFromRoute(context.route, memberships);
      if (routeContext) resolvedContexts.push(routeContext);
    }

    // From action intent
    if (context?.action) {
      const intentContext = this.resolveFromIntent(context.action, memberships);
      if (intentContext) resolvedContexts.push(intentContext);
    }

    // Apply explicit overrides
    let targetWorkspaceId = explicitWorkspaceId;
    let targetRole = explicitRole ?? null;
    let source: string = 'explicit';

    // If we have resolved contexts, use highest priority
    if (resolvedContexts.length > 0 && !explicitWorkspaceId && !explicitRole) {
      resolvedContexts.sort(
        (a, b) =>
          CONTEXT_SOURCE_PRIORITY[a.source as keyof typeof CONTEXT_SOURCE_PRIORITY] -
          CONTEXT_SOURCE_PRIORITY[b.source as keyof typeof CONTEXT_SOURCE_PRIORITY]
      );
      const best = resolvedContexts[0];
      targetRole = best.role;
      targetWorkspaceId = best.workspaceId;
      source = best.source;
    }

    // Fallback to defaults
    if (!targetWorkspaceId) {
      const defaultMembership = memberships.find((m) => m.defaultWorkspace);
      targetWorkspaceId = defaultMembership?.workspaceId ?? memberships[0].workspaceId;
    }

    if (!targetRole) {
      const membership = memberships.find((m) => m.workspaceId === targetWorkspaceId);
      targetRole = membership?.role ?? memberships[0].role;
    }

    // Validate membership
    const validMembership = memberships.find((m) => m.workspaceId === targetWorkspaceId);
    if (!validMembership) {
      targetWorkspaceId = memberships[0].workspaceId;
      targetRole = memberships[0].role;
    } else {
      targetRole = validMembership.role;
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: targetWorkspaceId },
    });

    const allWorkspaces: WorkspaceMembershipInfo[] = await Promise.all(
      memberships.map(async (m) => {
        const w = await this.workspaceRepository.findOne({
          where: { id: m.workspaceId },
        });
        return {
          workspaceId: m.workspaceId,
          workspaceName: w?.name ?? 'Unknown',
          role: m.role,
          isDefault: m.defaultWorkspace,
        };
      })
    );

    return {
      actorId,
      currentRole: targetRole!,
      currentWorkspaceId: targetWorkspaceId,
      currentWorkspaceName: workspace?.name ?? 'Unknown',
      effectivePermissions: this.getPermissionsForRole(targetRole!),
      allWorkspaces,
      source: source as any,
    };
  }

  /**
   * Resolve from job context
   */
  private async resolveFromJobContext(
    jobId: string,
    memberships: MembershipEntity[]
  ): Promise<ResolvedContext | null> {
    // TODO: Query job entity to get workspace
    // For now, this is a placeholder that would query the job/delivery entity
    this.logger.debug(`Resolving role from job context: ${jobId}`);

    // Placeholder - would look up job and infer from job state
    return null;
  }

  /**
   * Resolve from notification context
   */
  private async resolveFromNotification(
    notificationId: string,
    memberships: MembershipEntity[]
  ): Promise<ResolvedContext | null> {
    // TODO: Query notification entity to get deep link info
    this.logger.debug(`Resolving role from notification context: ${notificationId}`);

    // Placeholder - would parse notification deep link
    return null;
  }

  /**
   * Resolve from route pattern
   */
  private resolveFromRoute(route: string, memberships: MembershipEntity[]): ResolvedContext | null {
    for (const mapping of ENHANCED_ROUTE_ROLE_MAPPINGS) {
      const match = route.match(mapping.pattern);
      if (match) {
        const role = mapping.inferRole(match);
        if (role) {
          // Check if actor has this role
          const hasRole = memberships.some((m) => m.role === role);
          if (hasRole) {
            const membership = memberships.find((m) => m.role === role);
            return {
              workspaceId: membership!.workspaceId,
              role,
              source: 'route_access',
              reasoning: `Inferred from route pattern: ${mapping.intent ?? 'unknown'}`,
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * Resolve from action intent
   */
  private resolveFromIntent(
    action: string,
    memberships: MembershipEntity[]
  ): ResolvedContext | null {
    const mapping = INTENT_ROLE_MAPPINGS[action];
    if (!mapping) return null;

    const { role } = mapping;
    const hasRole = memberships.some((m) => m.role === role);

    if (hasRole) {
      const membership = memberships.find((m) => m.role === role);
      return {
        workspaceId: membership!.workspaceId,
        role,
        source: 'user_action',
        reasoning: `Inferred from action: ${action}`,
      };
    }

    return null;
  }

  /**
   * Infer intent from route and action
   */
  private inferIntentFromRoute(route?: string, action?: string, resource?: string): ContextIntent {
    const intentAction = this.mapAction(action);
    const intentResource = this.mapResource(route, resource);

    return {
      action: intentAction,
      resource: intentResource,
    };
  }

  private mapAction(action?: string): ContextIntent['action'] {
    const actionMap: Record<string, ContextIntent['action']> = {
      GET: 'view',
      POST: 'create',
      PUT: 'manage',
      PATCH: 'complete',
      DELETE: 'cancel',
      accept: 'accept',
      complete: 'complete',
      cancel: 'cancel',
    };
    return actionMap[action ?? ''] ?? 'view';
  }

  private mapResource(route?: string, resource?: string): ContextIntent['resource'] {
    if (resource) return resource as ContextIntent['resource'];

    if (!route) return 'profile';

    if (route.includes('job')) return 'job';
    if (route.includes('earning')) return 'earnings';
    if (route.includes('workspace')) return 'workspace';
    if (route.includes('notification')) return 'notification';

    return 'profile';
  }

  /**
   * Get permissions for a role - enhanced with CUSTOMER
   */
  private getPermissionsForRole(role: MembershipRole): string[] {
    const permissionsMap: Record<MembershipRole, string[]> = {
      [MembershipRole.RIDER]: [
        'job:view',
        'job:accept',
        'job:complete',
        'earnings:view',
        'profile:view',
        'profile:update',
      ],
      [MembershipRole.CUSTOMER]: [
        'order:view',
        'order:create',
        'order:cancel',
        'address:view',
        'address:manage',
        'payment:view',
        'profile:view',
        'profile:update',
      ],
      [MembershipRole.ADMIN]: [
        'workspace:view',
        'workspace:manage',
        'member:view',
        'member:manage',
        'policy:view',
        'policy:manage',
        'job:view',
        'job:assign',
      ],
      [MembershipRole.OPS]: [
        'job:view',
        'job:assign',
        'job:reassign',
        'rider:view',
        'rider:manage',
        'analytics:view',
      ],
      [MembershipRole.BUSINESS_OWNER]: [
        'workspace:view',
        'job:view',
        'job:create',
        'job:assign',
        'earnings:view',
        'analytics:view',
        'rider:view',
      ],
    };

    return permissionsMap[role] ?? [];
  }

  /**
   * Check if actor can access a resource in a workspace
   */
  async canAccess(actorId: string, workspaceId: string, permission: string): Promise<boolean> {
    const membership = await this.membershipRepository.findOne({
      where: { actorId, workspaceId },
    });

    if (!membership) {
      return false;
    }

    const permissions = this.getPermissionsForRole(membership.role);
    return (
      permissions.includes(permission) || permissions.includes(permission.split(':')[0] + ':*')
    );
  }

  /**
   * Validate role switch - enhanced with precedence checking
   */
  async validateRoleSwitch(
    actorId: string,
    fromWorkspaceId: string,
    toWorkspaceId: string,
    toRole?: MembershipRole
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Actor must be member of target workspace
    const toMembership = await this.membershipRepository.findOne({
      where: { actorId, workspaceId: toWorkspaceId },
    });

    if (!toMembership) {
      return {
        allowed: false,
        reason: `Actor is not a member of workspace ${toWorkspaceId}`,
      };
    }

    // Check role if specified
    if (toRole && toMembership.role !== toRole) {
      return {
        allowed: false,
        reason: `Actor does not have ${toRole} role in workspace ${toWorkspaceId}`,
      };
    }

    // Get current memberships count
    const membershipCount = await this.membershipRepository.count({
      where: { actorId },
    });

    if (membershipCount > 10) {
      this.logger.warn(`Actor ${actorId} has ${membershipCount} workspace memberships`);
    }

    return { allowed: true };
  }

  /**
   * Check if role escalation is occurring
   */
  isRoleEscalation(fromRole: MembershipRole, toRole: MembershipRole): boolean {
    return ROLE_PRECEDENCE[toRole] > ROLE_PRECEDENCE[fromRole];
  }

  /**
   * Get all memberships for an actor
   */
  async getMemberships(actorId: string): Promise<MembershipEntity[]> {
    return this.membershipRepository.find({
      where: { actorId },
    });
  }
}
