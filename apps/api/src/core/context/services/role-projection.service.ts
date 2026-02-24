import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MembershipRole } from '@api/modules/workspace/dto/workspace.enums';
import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';
import { WorkspaceEntity } from '@api/modules/workspace/entities/workspace.entity';

import { ContextIntent, RoleProjection, WorkspaceMembershipInfo } from '../context.types';

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

interface RouteRoleMapping {
  pattern: RegExp;
  inferRole: (match: RegExpMatchArray) => MembershipRole | null;
  inferWorkspace?: (match: RegExpMatchArray) => string | null;
}

const ROUTE_ROLE_MAPPINGS: RouteRoleMapping[] = [
  // Rider routes
  {
    pattern: /^\/api\/v1\/rider(\/.*)?$/,
    inferRole: () => MembershipRole.RIDER,
  },
  {
    pattern: /^\/api\/v1\/rider\/jobs\/([a-f0-9-]+)\/accept$/,
    inferRole: () => MembershipRole.RIDER,
  },

  // Customer routes
  {
    pattern: /^\/api\/v1\/customer(\/.*)?$/,
    inferRole: () => MembershipRole.RIDER, // Would be CUSTOMER but not in enum
  },

  // Admin routes
  {
    pattern: /^\/api\/v1\/admin\/workspaces(\/.*)?$/,
    inferRole: () => MembershipRole.ADMIN,
  },

  // Business owner routes
  {
    pattern: /^\/api\/v1\/business(\/.*)?$/,
    inferRole: () => MembershipRole.BUSINESS_OWNER,
  },
  {
    pattern: /^\/api\/v1\/shops\/([a-f0-9-]+)\/jobs(\/.*)?$/,
    inferRole: () => MembershipRole.BUSINESS_OWNER,
  },
];

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

    // 2. Infer intent from route/action
    const intent = this.inferIntent(route, action, resource);

    // 3. Determine workspace
    let targetWorkspaceId = explicitWorkspaceId;
    let targetRole: MembershipRole | null = null;

    if (route) {
      // Try to infer from route
      for (const mapping of ROUTE_ROLE_MAPPINGS) {
        const match = route.match(mapping.pattern);
        if (match) {
          targetRole = mapping.inferRole(match);
          if (mapping.inferWorkspace) {
            const inferred = mapping.inferWorkspace(match);
            if (inferred) {
              targetWorkspaceId = inferred;
            }
          }
          break;
        }
      }
    }

    // 4. If no explicit workspace, use default or first
    if (!targetWorkspaceId) {
      const defaultMembership = memberships.find((m) => m.defaultWorkspace);
      targetWorkspaceId = defaultMembership?.workspaceId ?? memberships[0].workspaceId;
    }

    // 5. If no role inferred, use membership role
    if (!targetRole) {
      const membership = memberships.find((m) => m.workspaceId === targetWorkspaceId);
      targetRole = membership?.role ?? memberships[0].role;
    }

    // 6. Validate actor has this role in workspace
    const validMembership = memberships.find((m) => m.workspaceId === targetWorkspaceId);
    if (!validMembership) {
      // Fallback to first membership
      targetWorkspaceId = memberships[0].workspaceId;
      targetRole = memberships[0].role;
    } else {
      targetRole = validMembership.role;
    }

    // 7. Get workspace details
    const workspace = await this.workspaceRepository.findOne({
      where: { id: targetWorkspaceId },
    });

    // 8. Build all workspaces info
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
      inferredIntent: intent,
    };
  }

  /**
   * Infer intent from route and action
   */
  private inferIntent(route?: string, action?: string, resource?: string): ContextIntent {
    // Default intent from action
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
   * Get permissions for a role
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
   * Prevent privilege escalation - verify role switch is allowed
   */
  async validateRoleSwitch(
    actorId: string,
    fromWorkspaceId: string,
    toWorkspaceId: string
  ): Promise<boolean> {
    // Actor must be member of target workspace
    const toMembership = await this.membershipRepository.findOne({
      where: { actorId, workspaceId: toWorkspaceId },
    });

    if (!toMembership) {
      return false;
    }

    // Get current memberships count - prevent if too many roles active
    const membershipCount = await this.membershipRepository.count({
      where: { actorId },
    });

    // Allow if already member, or if it's a reasonable role switch
    return membershipCount <= 5; // Configurable limit
  }
}
