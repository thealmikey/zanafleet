import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';

import { MembershipRole } from '@api/modules/workspace/dto/workspace.enums';
import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';

import { GuardrailResult, ROLE_PRECEDENCE } from '../context.types';

/**
 * PrivilegeEscalationGuard
 *
 * Prevents privilege escalation by validating role switches.
 * Ensures actors cannot elevate their permissions beyond what they legitimately hold.
 */

@Injectable()
export class PrivilegeEscalationGuard {
  private readonly logger = new Logger(PrivilegeEscalationGuard.name);

  // Configuration
  private readonly MIN_ROLE_HOLD_TIME_MS = 5000; // 5 seconds
  private readonly MAX_ROLE_SWITCHES_PER_MINUTE = 5;
  private readonly ESCALATION_WARNING_THRESHOLD = 3;

  constructor(
    @InjectRepository(MembershipEntity)
    private readonly membershipRepository: Repository<MembershipEntity>
  ) {}

  /**
   * Check if a role switch is allowed
   */
  async checkRoleSwitch(
    actorId: string,
    fromRole: MembershipRole,
    toRole: MembershipRole,
    workspaceId: string
  ): Promise<GuardrailResult> {
    // 1. Check if actor has the target role in this workspace
    const membership = await this.membershipRepository.findOne({
      where: { actorId, workspaceId },
    });

    if (!membership || membership.role !== toRole) {
      this.logger.warn(
        `Actor ${actorId} attempted to switch to role ${toRole} in workspace ${workspaceId} but does not have this role`
      );
      return {
        allowed: false,
        reason: `Actor does not have ${toRole} role in workspace ${workspaceId}`,
        code: 'INVALID_ROLE_ASSIGNMENT',
      };
    }

    // 2. Check if this is an escalation
    const isEscalation = this.isRoleEscalation(fromRole, toRole);

    if (isEscalation) {
      this.logger.debug(
        `Role escalation detected: ${fromRole} -> ${toRole} for actor ${actorId}`
      );

      // 2a. Check for suspicious activity patterns
      const recentSwitches = await this.getRecentRoleSwitches(actorId);

      if (recentSwitches.length >= this.MAX_ROLE_SWITCHES_PER_MINUTE) {
        this.logger.warn(
          `Actor ${actorId} exceeded maximum role switches (${this.MAX_ROLE_SWITCHES_PER_MINUTE})`
        );
        return {
          allowed: false,
          reason: 'Too many role switches detected - possible privilege escalation',
          code: 'RATE_LIMIT_EXCEEDED',
        };
      }

      // 2b. Log for security review
      await this.logSuspiciousActivity(
        actorId,
        fromRole,
        toRole,
        workspaceId,
        'ROLE_ESCALATION'
      );

      // 2c. Check role hold time
      const roleHoldTime = await this.getRoleHoldTime(actorId, workspaceId, toRole);
      if (roleHoldTime < this.MIN_ROLE_HOLD_TIME_MS) {
        this.logger.warn(
          `Actor ${actorId} attempted to use role ${toRole} after only ${roleHoldTime}ms`
        );
        return {
          allowed: false,
          reason: `Role must be held for at least ${this.MIN_ROLE_HOLD_TIME_MS}ms`,
          code: 'ROLE_HOLD_TIME_VIOLATION',
        };
      }

      // 2d. If more than threshold, flag for review but still allow
      if (recentSwitches.length >= this.ESCALATION_WARNING_THRESHOLD) {
        this.logger.warn(
          `Actor ${actorId} has ${recentSwitches.length} recent role switches - flagged for review`
        );
        await this.logSuspiciousActivity(
          actorId,
          fromRole,
          toRole,
          workspaceId,
          'ESCALATION_WARNING'
        );
      }
    }

    this.logger.debug(
      `Role switch allowed: ${fromRole} -> ${toRole} for actor ${actorId} in workspace ${workspaceId}`
    );

    return { allowed: true };
  }

  /**
   * Check if role switch is an escalation
   */
  isRoleEscalation(fromRole: MembershipRole, toRole: MembershipRole): boolean {
    return ROLE_PRECEDENCE[toRole] > ROLE_PRECEDENCE[fromRole];
  }

  /**
   * Get recent role switches for an actor (in-memory for now, would be Redis in production)
   */
  private recentRoleSwitches: Map<string, { timestamp: number; fromRole: string; toRole: string }[]> = new Map();

  private async getRecentRoleSwitches(actorId: string): Promise<{ timestamp: number; fromRole: string; toRole: string }[]> {
    const oneMinuteAgo = Date.now() - 60000;
    const switches = this.recentRoleSwitches.get(actorId) || [];
    return switches.filter(s => s.timestamp > oneMinuteAgo);
  }

  /**
   * Record a role switch
   */
  async recordRoleSwitch(
    actorId: string,
    fromRole: MembershipRole,
    toRole: MembershipRole
  ): Promise<void> {
    const switches = this.recentRoleSwitches.get(actorId) || [];
    switches.push({
      timestamp: Date.now(),
      fromRole,
      toRole,
    });

    // Keep only last 10 switches
    if (switches.length > 10) {
      switches.shift();
    }

    this.recentRoleSwitches.set(actorId, switches);
  }

  /**
   * Get role hold time in milliseconds
   */
  private async getRoleHoldTime(
    actorId: string,
    workspaceId: string,
    role: MembershipRole
  ): Promise<number> {
    const membership = await this.membershipRepository.findOne({
      where: { actorId, workspaceId, role },
    });

    if (!membership) {
      return 0;
    }

    return Date.now() - membership.since.getTime();
  }

  /**
   * Log suspicious activity for security review
   */
  private async logSuspiciousActivity(
    actorId: string,
    fromRole: MembershipRole,
    toRole: MembershipRole,
    workspaceId: string,
    activityType: string
  ): Promise<void> {
    // In production, this would write to an audit log or security event stream
    this.logger.warn({
      message: 'Security event: role switch',
      actorId,
      fromRole,
      toRole,
      workspaceId,
      activityType,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Validate actor can assume a role in a workspace
   */
  async validateRoleAssumption(
    actorId: string,
    targetRole: MembershipRole,
    workspaceId: string
  ): Promise<GuardrailResult> {
    const membership = await this.membershipRepository.findOne({
      where: { actorId, workspaceId },
    });

    if (!membership) {
      return {
        allowed: false,
        reason: `Actor is not a member of workspace ${workspaceId}`,
        code: 'NOT_IN_WORKSPACE',
      };
    }

    if (membership.role !== targetRole) {
      return {
        allowed: false,
        reason: `Actor does not have ${targetRole} role in workspace ${workspaceId}`,
        code: 'INSUFFICIENT_ROLE',
      };
    }

    return { allowed: true };
  }

  /**
   * Get the escalation risk level for an actor
   */
  async getEscalationRiskLevel(actorId: string): Promise<{
    level: 'low' | 'medium' | 'high';
    factors: string[];
  }> {
    const memberships = await this.membershipRepository.find({
      where: { actorId },
    });

    const factors: string[] = [];
    let riskScore = 0;

    // Factor 1: Number of memberships
    if (memberships.length > 5) {
      factors.push(`Multiple workspace memberships (${memberships.length})`);
      riskScore += 1;
    }

    // Factor 2: High-privilege roles
    const hasAdminRole = memberships.some(m => m.role === MembershipRole.ADMIN);
    const hasOpsRole = memberships.some(m => m.role === MembershipRole.OPS);

    if (hasAdminRole) {
      factors.push('Has ADMIN role');
      riskScore += 2;
    }

    if (hasOpsRole) {
      factors.push('Has OPS role');
      riskScore += 1;
    }

    // Factor 3: Recent role switches
    const recentSwitches = await this.getRecentRoleSwitches(actorId);
    if (recentSwitches.length > 3) {
      factors.push(`Recent role switches (${recentSwitches.length})`);
      riskScore += 2;
    }

    let level: 'low' | 'medium' | 'high';
    if (riskScore >= 4) {
      level = 'high';
    } else if (riskScore >= 2) {
      level = 'medium';
    } else {
      level = 'low';
    }

    return { level, factors };
  }
}
