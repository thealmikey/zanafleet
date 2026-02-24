import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MembershipRole } from '@api/modules/workspace/dto/workspace.enums';
import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';

import { BoundaryCheckResult } from '../context.types';

/**
 * WorkspaceBoundaryGuard
 *
 * Ensures actors cannot access data from one workspace while acting as another.
 * Provides workspace-scoped isolation and prevents cross-workspace data leakage.
 */

@Injectable()
export class WorkspaceBoundaryGuard {
  private readonly logger = new Logger(WorkspaceBoundaryGuard.name);

  // Configuration
  private readonly MAX_CROSS_WORKSPACE_PER_MINUTE = 10;
  private readonly MAX_CROSS_WORKSPACE_PER_HOUR = 50;

  constructor(
    @InjectRepository(MembershipEntity)
    private readonly membershipRepository: Repository<MembershipEntity>
  ) {}

  /**
   * Enforce workspace boundary - ensures actor can only access their own workspaces
   */
  async enforceBoundary(
    actorId: string,
    targetWorkspaceId: string,
    projectedRole: MembershipRole
  ): Promise<BoundaryCheckResult> {
    // 1. Verify membership exists in target workspace
    const membership = await this.membershipRepository.findOne({
      where: { actorId, workspaceId: targetWorkspaceId },
    });

    if (!membership) {
      this.logger.warn(
        `Actor ${actorId} attempted to access workspace ${targetWorkspaceId} without membership`
      );
      return {
        allowed: false,
        reason: 'No membership in target workspace',
        code: 'WORKSPACE_BOUNDARY_VIOLATION',
      };
    }

    // 2. Verify role matches
    if (membership.role !== projectedRole) {
      this.logger.warn(
        `Actor ${actorId} attempted to access workspace ${targetWorkspaceId} with role ${projectedRole} but has role ${membership.role}`
      );
      return {
        allowed: false,
        reason: `Projected role ${projectedRole} does not match membership role ${membership.role}`,
        code: 'ROLE_MISMATCH',
      };
    }

    // 3. Check for suspicious cross-workspace access patterns
    const crossWorkspaceAccess = await this.getCrossWorkspaceAccess(actorId);

    if (crossWorkspaceAccess.perMinute >= this.MAX_CROSS_WORKSPACE_PER_MINUTE) {
      this.logger.warn(
        `Actor ${actorId} exceeded cross-workspace rate limit (${this.MAX_CROSS_WORKSPACE_PER_MINUTE}/min)`
      );
      return {
        allowed: false,
        reason: 'Too many cross-workspace access attempts',
        code: 'CROSS_WORKSPACE_RATE_LIMIT',
      };
    }

    if (crossWorkspaceAccess.perHour >= this.MAX_CROSS_WORKSPACE_PER_HOUR) {
      this.logger.warn(
        `Actor ${actorId} exceeded hourly cross-workspace limit (${this.MAX_CROSS_WORKSPACE_PER_HOUR}/hour)`
      );
      return {
        allowed: false,
        reason: 'Hourly cross-workspace access limit exceeded',
        code: 'CROSS_WORKSPACE_HOURLY_LIMIT',
      };
    }

    // 4. Record this access
    await this.recordCrossWorkspaceAccess(actorId, targetWorkspaceId);

    this.logger.debug(
      `Workspace boundary check passed for actor ${actorId} in workspace ${targetWorkspaceId}`
    );

    return { allowed: true };
  }

  /**
   * Check if actor has access to a specific workspace
   */
  async hasWorkspaceAccess(actorId: string, workspaceId: string): Promise<boolean> {
    const membership = await this.membershipRepository.findOne({
      where: { actorId, workspaceId },
    });

    return !!membership;
  }

  /**
   * Get all workspaces an actor has access to
   */
  async getAccessibleWorkspaces(actorId: string): Promise<string[]> {
    const memberships = await this.membershipRepository.find({
      where: { actorId },
    });

    return memberships.map((m) => m.workspaceId);
  }

  /**
   * Verify actor can only access their own workspaces (for data queries)
   */
  async filterAccessibleWorkspaces(
    actorId: string,
    requestedWorkspaceIds: string[]
  ): Promise<{ allowed: string[]; denied: string[] }> {
    const accessible = await this.getAccessibleWorkspaces(actorId);

    const allowed: string[] = [];
    const denied: string[] = [];

    for (const workspaceId of requestedWorkspaceIds) {
      if (accessible.includes(workspaceId)) {
        allowed.push(workspaceId);
      } else {
        denied.push(workspaceId);
      }
    }

    if (denied.length > 0) {
      this.logger.warn(`Actor ${actorId} denied access to workspaces: ${denied.join(', ')}`);
    }

    return { allowed, denied };
  }

  /**
   * Get cross-workspace access statistics
   */
  private crossWorkspaceAccess: Map<
    string,
    {
      perMinute: number;
      perHour: number;
      lastMinuteReset: number;
      lastHourReset: number;
      accesses: number[];
    }
  > = new Map();

  private async getCrossWorkspaceAccess(actorId: string): Promise<{
    perMinute: number;
    perHour: number;
  }> {
    const now = Date.now();
    const data = this.crossWorkspaceAccess.get(actorId);

    if (!data) {
      return { perMinute: 0, perHour: 0 };
    }

    // Reset counters if needed
    if (now - data.lastMinuteReset > 60000) {
      data.perMinute = 0;
      data.lastMinuteReset = now;
    }

    if (now - data.lastHourReset > 3600000) {
      data.perHour = 0;
      data.lastHourReset = now;
    }

    // Count recent accesses
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    const recentAccesses = data.accesses.filter((t) => t > oneMinuteAgo);
    const hourlyAccesses = data.accesses.filter((t) => t > oneHourAgo);

    return {
      perMinute: recentAccesses.length,
      perHour: hourlyAccesses.length,
    };
  }

  private async recordCrossWorkspaceAccess(actorId: string, workspaceId: string): Promise<void> {
    const now = Date.now();
    let data = this.crossWorkspaceAccess.get(actorId);

    if (!data) {
      data = {
        perMinute: 0,
        perHour: 0,
        lastMinuteReset: now,
        lastHourReset: now,
        accesses: [],
      };
    }

    data.accesses.push(now);

    // Keep only last hour of accesses
    const oneHourAgo = now - 3600000;
    data.accesses = data.accesses.filter((t) => t > oneHourAgo);

    // Update counts
    data.perMinute = data.accesses.filter((t) => t > now - 60000).length;
    data.perHour = data.accesses.length;

    this.crossWorkspaceAccess.set(actorId, data);
  }

  /**
   * Check if two workspaces are related (same organization)
   */
  async areWorkspacesRelated(workspaceId1: string, workspaceId2: string): Promise<boolean> {
    // TODO: Query workspace relationships from Neo4j or Postgres
    // For now, always return false (strict isolation)
    return false;
  }

  /**
   * Get workspace access level for an actor
   */
  async getAccessLevel(
    actorId: string,
    workspaceId: string
  ): Promise<{
    level: 'none' | 'readonly' | 'readwrite' | 'admin';
    role: MembershipRole | null;
  }> {
    const membership = await this.membershipRepository.findOne({
      where: { actorId, workspaceId },
    });

    if (!membership) {
      return { level: 'none', role: null };
    }

    const roleAccessLevel: Record<MembershipRole, 'readonly' | 'readwrite' | 'admin'> = {
      [MembershipRole.CUSTOMER]: 'readonly',
      [MembershipRole.RIDER]: 'readwrite',
      [MembershipRole.BUSINESS_OWNER]: 'readwrite',
      [MembershipRole.OPS]: 'readwrite',
      [MembershipRole.ADMIN]: 'admin',
    };

    return {
      level: roleAccessLevel[membership.role],
      role: membership.role,
    };
  }
}
