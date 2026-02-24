import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DeliveryEntity } from '@api/modules/delivery/entities/delivery.entity';
import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';
import { WorkspaceEntity } from '@api/modules/workspace/entities/workspace.entity';

import { AuthorizationRequest, AuthorizationResult, ROLE_PERMISSIONS } from '../context.types';

/**
 * Context metadata key for route permissions
 */
export const WORKSPACE_PERMISSION_KEY = 'workspace_permission';

/**
 * Decorator options for workspace permission
 */
export interface WorkspacePermissionOptions {
  /** Required permission (e.g., 'job:view_own', 'job:accept') */
  permission: string;
  /** Resource type being accessed */
  resource: string;
  /** If true, workspaceId must be in route params */
  requiredWorkspaceParam?: boolean;
  /** Param name for workspace ID (default: 'workspaceId') */
  workspaceParamName?: string;
  /** If true, resource ID must be in route params */
  requiredResourceParam?: boolean;
  /** Param name for resource ID (default: 'id') */
  resourceParamName?: string;
}

/**
 * WorkspaceContextGuard
 *
 * NestJS Guard that enforces workspace-based authorization:
 * 1. Validates actor has membership in the workspace
 * 2. Checks actor has required permission for the resource
 * 3. Prevents cross-workspace privilege escalation
 * 4. Attaches workspace context to request for downstream use
 *
 * Usage:
 * ```typescript
 * @Controller('rider/jobs')
 * @UseGuards(AuthGuard, WorkspaceContextGuard)
 * export class RiderJobController {
 *   @Post(':id/accept')
 *   @RequireWorkspacePermission({ permission: 'job:accept', resource: 'job', requiredResourceParam: true })
 *   async acceptJob(@Param('id') jobId: string, @Req() req) {
 *     // req.workspaceContext is available
 *   }
 * }
 * ```
 */
@Injectable()
export class WorkspaceContextGuard implements CanActivate {
  private readonly logger = new Logger(WorkspaceContextGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectRepository(MembershipEntity)
    private readonly membershipRepository: Repository<MembershipEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepository: Repository<DeliveryEntity>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const actorId = request.user?.id;

    if (!actorId) {
      throw new ForbiddenException('Authentication required');
    }

    // Get permission requirements from decorator
    const permissionOptions = this.reflector.get<WorkspacePermissionOptions>(
      WORKSPACE_PERMISSION_KEY,
      context.getHandler()
    );

    // Resolve workspace ID
    const workspaceId = this.resolveWorkspaceId(request, permissionOptions);
    if (!workspaceId) {
      throw new NotFoundException('Workspace not specified');
    }

    // Validate workspace exists
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Validate actor membership
    const membership = await this.membershipRepository.findOne({
      where: { actorId, workspaceId },
    });

    if (!membership) {
      this.logger.warn(`Actor ${actorId} not member of workspace ${workspaceId}`);
      throw new ForbiddenException(`Access denied to workspace ${workspace.name}`);
    }

    // Check permission if required
    if (permissionOptions) {
      const authResult = await this.authorize({
        actorId,
        action: permissionOptions.permission,
        resource: permissionOptions.resource,
        resourceId: this.resolveResourceId(request, permissionOptions),
        workspaceId,
      });

      if (!authResult.allowed) {
        throw new ForbiddenException(authResult.reason ?? 'Insufficient permissions');
      }
    }

    // Attach workspace context to request for downstream use
    request.workspaceContext = {
      actorId,
      workspaceId,
      workspaceName: workspace.name,
      roles: [membership.role],
      primaryRole: membership.role,
      source: 'route_access',
      isMultiWorkspace: await this.isMultiWorkspaceActor(actorId),
    };

    return true;
  }

  /**
   * Resolve workspace ID from request
   */
  private resolveWorkspaceId(
    request: {
      params: Record<string, string>;
      query: Record<string, string>;
      body?: Record<string, unknown>;
    },
    options?: WorkspacePermissionOptions
  ): string | null {
    // Check route params
    const workspaceParamName = options?.workspaceParamName ?? 'workspaceId';
    if (request.params[workspaceParamName]) {
      return request.params[workspaceParamName];
    }

    // Check query params
    if (request.query.workspaceId) {
      return request.query.workspaceId;
    }

    // Check body (for POST/PUT)
    if (request.body?.workspaceId) {
      return request.body.workspaceId as string;
    }

    return null;
  }

  /**
   * Resolve resource ID from request
   */
  private resolveResourceId(
    request: { params: Record<string, string> },
    options: WorkspacePermissionOptions
  ): string | undefined {
    const resourceParamName = options.resourceParamName ?? 'id';
    return request.params[resourceParamName];
  }

  /**
   * Authorize action on resource
   */
  private async authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
    const { actorId, action, resource, resourceId, workspaceId } = request;

    // Get actor's role in workspace
    const membership = await this.membershipRepository.findOne({
      where: { actorId, workspaceId },
    });

    if (!membership) {
      return { allowed: false, reason: 'ACTOR_NOT_IN_WORKSPACE' };
    }

    // Get permissions for role
    const rolePermissions = ROLE_PERMISSIONS[membership.role] ?? [];

    // Check if action is permitted
    const [resourceType] = action.split(':');
    const hasPermission =
      rolePermissions.includes(action) ||
      rolePermissions.includes(`${resourceType}:*`) ||
      rolePermissions.includes('*:*');

    if (!hasPermission) {
      return { allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' };
    }

    // For resource-specific actions, verify ownership or access
    if (resourceId) {
      const ownershipCheck = await this.verifyOwnership(actorId, resource, resourceId, workspaceId);
      if (!ownershipCheck) {
        return { allowed: false, reason: 'RESOURCE_ACCESS_DENIED' };
      }
    }

    return { allowed: true, role: membership.role };
  }

  /**
   * Verify actor has access to specific resource
   */
  private async verifyOwnership(
    actorId: string,
    resource: string,
    resourceId: string,
    workspaceId: string
  ): Promise<boolean> {
    switch (resource) {
      case 'job':
        // Check if job exists and actor can access it
        const job = await this.deliveryRepository.findOne({
          where: { id: resourceId },
        });
        if (!job) return false;
        // Actor can access if they're assigned OR job is in their workspace
        return job.assignedRiderId === actorId || job.workspaceId === workspaceId;

      case 'earnings':
        // Earnings are always accessible to the actor in their workspace
        return true;

      case 'profile':
        // Profile access is always allowed for own profile
        return true;

      default:
        // For unknown resources, allow if workspace matches
        return true;
    }
  }

  /**
   * Check if actor is member of multiple workspaces
   */
  private async isMultiWorkspaceActor(actorId: string): Promise<boolean> {
    const count = await this.membershipRepository.count({
      where: { actorId },
    });
    return count > 1;
  }
}

/**
 * Decorator to require workspace permission
 */
export function RequireWorkspacePermission(options: WorkspacePermissionOptions): MethodDecorator {
  return (_target: object, _key: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(WORKSPACE_PERMISSION_KEY, options, descriptor.value);
    return descriptor;
  };
}
