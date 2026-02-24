import { Injectable, Logger } from '@nestjs/common';

import { MembershipRole } from '@api/modules/workspace/dto/workspace.enums';

import { ContaminationResult } from '../context.types';

/**
 * Contamination rule definition
 */
interface ContaminationRule {
  sourceRole: MembershipRole;
  targetDataTypes: string[];
  action: 'allow' | 'block' | 'audit';
}

/**
 * ContaminationPreventionService
 *
 * Prevents cross-role data contamination by enforcing strict data access rules.
 * Ensures actors cannot access data types that should be isolated between roles.
 */

@Injectable()
export class ContaminationPreventionService {
  private readonly logger = new Logger(ContaminationPreventionService.name);

  /**
   * Contamination rules - defines what data types each role can access
   */
  private readonly CONTAMINATION_RULES: ContaminationRule[] = [
    // Rider cannot access customer-specific data
    {
      sourceRole: MembershipRole.RIDER,
      targetDataTypes: [
        'customer_profile',
        'customer_payment_methods',
        'customer_addresses',
        'customer_orders',
        'customer_credit_card',
      ],
      action: 'block',
    },

    // Customer cannot access rider-specific data
    {
      sourceRole: MembershipRole.CUSTOMER,
      targetDataTypes: [
        'rider_earnings',
        'rider_stats',
        'rider_location',
        'rider_performance',
        'rider_documents',
      ],
      action: 'block',
    },

    // Rider cannot access business-specific data
    {
      sourceRole: MembershipRole.RIDER,
      targetDataTypes: [
        'business_financials',
        'business_reports',
        'business_analytics',
        'business_team',
        'business_settings',
      ],
      action: 'block',
    },

    // Business owner cannot access rider personal data
    {
      sourceRole: MembershipRole.BUSINESS_OWNER,
      targetDataTypes: [
        'rider_location',
        'rider_personal_info',
        'rider_bank_details',
      ],
      action: 'block',
    },

    // Admin accessing sensitive data requires audit
    {
      sourceRole: MembershipRole.ADMIN,
      targetDataTypes: [
        'rider_bank_details',
        'customer_payment_methods',
        'system_credentials',
      ],
      action: 'audit',
    },

    // OPS accessing operational data requires audit
    {
      sourceRole: MembershipRole.OPS,
      targetDataTypes: [
        'rider_personal_info',
        'customer_payment_methods',
      ],
      action: 'audit',
    },
  ];

  /**
   * Check if a role can access a specific data type
   */
  async checkAccess(
    actorId: string,
    projectedRole: MembershipRole,
    workspaceId: string,
    dataType: string,
    action: 'read' | 'write' | 'delete'
  ): Promise<ContaminationResult> {
    // 1. Find applicable rule
    const rule = this.findRule(projectedRole, dataType);

    // 2. If no rule, allow
    if (!rule) {
      return { allowed: true };
    }

    // 3. Handle based on action
    switch (rule.action) {
      case 'block':
        // Log blocked access
        await this.logBlockedAccess(
          actorId,
          projectedRole,
          workspaceId,
          dataType,
          action
        );
        return {
          allowed: false,
          reason: `Role ${projectedRole} cannot access ${dataType} data`,
          code: 'CONTAMINATION_PREVENTED',
        };

      case 'audit':
        // Log for audit but allow
        await this.createAuditLog(
          actorId,
          projectedRole,
          workspaceId,
          dataType,
          action
        );
        return { allowed: true };

      case 'allow':
      default:
        return { allowed: true };
    }
  }

  /**
   * Batch check for multiple data types
   */
  async checkAccessBatch(
    actorId: string,
    projectedRole: MembershipRole,
    workspaceId: string,
    dataTypes: string[],
    action: 'read' | 'write' | 'delete'
  ): Promise<{
    allowed: boolean;
    results: ContaminationResult[];
    blockedTypes: string[];
  }> {
    const results: ContaminationResult[] = [];
    const blockedTypes: string[] = [];

    for (const dataType of dataTypes) {
      const result = await this.checkAccess(
        actorId,
        projectedRole,
        workspaceId,
        dataType,
        action
      );
      results.push(result);

      if (!result.allowed && result.code === 'CONTAMINATION_PREVENTED') {
        blockedTypes.push(dataType);
      }
    }

    return {
      allowed: blockedTypes.length === 0,
      results,
      blockedTypes,
    };
  }

  /**
   * Find applicable rule for role and data type
   */
  private findRule(role: MembershipRole, dataType: string): ContaminationRule | undefined {
    return this.CONTAMINATION_RULES.find(
      rule =>
        rule.sourceRole === role &&
        rule.targetDataTypes.some(dt =>
          dt === dataType ||
          dataType.startsWith(dt) ||
          dt === '*'
        )
    );
  }

  /**
   * Get all blocked data types for a role
   */
  getBlockedDataTypes(role: MembershipRole): string[] {
    return this.CONTAMINATION_RULES
      .filter(rule => rule.sourceRole === role && rule.action === 'block')
      .flatMap(rule => rule.targetDataTypes);
  }

  /**
   * Get all audited data types for a role
   */
  getAuditedDataTypes(role: MembershipRole): string[] {
    return this.CONTAMINATION_RULES
      .filter(rule => rule.sourceRole === role && rule.action === 'audit')
      .flatMap(rule => rule.targetDataTypes);
  }

  /**
   * Check if data type is sensitive (requires special handling)
   */
  isSensitiveDataType(dataType: string): boolean {
    const sensitiveTypes = [
      'bank_details',
      'payment_methods',
      'credit_card',
      'credentials',
      'password',
      'personal_info',
    ];

    return sensitiveTypes.some(sensitive =>
      dataType.toLowerCase().includes(sensitive)
    );
  }

  /**
   * Log blocked access attempt
   */
  private async logBlockedAccess(
    actorId: string,
    role: MembershipRole,
    workspaceId: string,
    dataType: string,
    action: string
  ): Promise<void> {
    this.logger.warn({
      message: 'Blocked cross-role data access attempt',
      actorId,
      role,
      workspaceId,
      dataType,
      action,
      timestamp: new Date().toISOString(),
    });

    // In production, also write to audit log table
  }

  /**
   * Create audit log for audited access
   */
  private async createAuditLog(
    actorId: string,
    role: MembershipRole,
    workspaceId: string,
    dataType: string,
    action: string
  ): Promise<void> {
    this.logger.debug({
      message: 'Audited cross-role data access',
      actorId,
      role,
      workspaceId,
      dataType,
      action,
      timestamp: new Date().toISOString(),
    });

    // In production, write to audit log table
  }

  /**
   * Add a custom contamination rule
   */
  addRule(rule: ContaminationRule): void {
    // Validate rule
    if (!rule.sourceRole || !rule.targetDataTypes || !rule.action) {
      throw new Error('Invalid contamination rule');
    }

    // Check for duplicates
    const existing = this.CONTAMINATION_RULES.find(
      r => r.sourceRole === rule.sourceRole &&
           r.targetDataTypes.some(dt => rule.targetDataTypes.includes(dt))
    );

    if (existing) {
      this.logger.warn(
        `Overriding existing contamination rule for ${rule.sourceRole}`
      );
      // Replace existing
      const index = this.CONTAMINATION_RULES.indexOf(existing);
      this.CONTAMINATION_RULES[index] = rule;
    } else {
      this.CONTAMINATION_RULES.push(rule);
    }

    this.logger.log(
      `Added contamination rule: ${rule.sourceRole} -> ${rule.targetDataTypes.join(', ')} (${rule.action})`
    );
  }

  /**
   * Remove a contamination rule
   */
  removeRule(sourceRole: MembershipRole, dataType: string): boolean {
    const index = this.CONTAMINATION_RULES.findIndex(
      r => r.sourceRole === sourceRole &&
           r.targetDataTypes.includes(dataType)
    );

    if (index >= 0) {
      this.CONTAMINATION_RULES.splice(index, 1);
      this.logger.log(
        `Removed contamination rule: ${sourceRole} -> ${dataType}`
      );
      return true;
    }

    return false;
  }

  /**
   * Get all rules
   */
  getAllRules(): ContaminationRule[] {
    return [...this.CONTAMINATION_RULES];
  }
}
