import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

import { CapabilityAuditEntity } from '../entities/capability-audit.entity';
import {
  CapabilityUsedEventV1,
  CapabilityExecutionResult,
} from '../events/capability-used.event';

/**
 * Simple UUID generator
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Usage statistics result
 */
export interface UsageStats {
  totalExecutions: number;
  successfulExecutions: number;
  deniedExecutions: number;
  failedExecutions: number;
  consentRequiredExecutions: number;
}

/**
 * CapabilityAuditService
 *
 * Manages the audit trail for capability usage.
 * Handles persistence, querying, and statistics of capability executions.
 */
@Injectable()
export class CapabilityAuditService {
  private readonly logger = new Logger(CapabilityAuditService.name);

  constructor(
    @InjectRepository(CapabilityAuditEntity)
    private readonly auditRepository: Repository<CapabilityAuditEntity>,
  ) {}

  /**
   * Record a capability usage event
   * Called when a capability is executed (success or failure)
   */
  async recordCapabilityUsage(event: CapabilityUsedEventV1): Promise<CapabilityAuditEntity> {
    const auditRecord = this.auditRepository.create({
      id: generateId(),

      // Actor
      actorId: event.actorId,
      actorType: event.actorType ?? null,

      // Capability
      capabilityName: event.capabilityName,
      capabilityId: event.capabilityId ?? null,

      // Context
      contextId: event.contextId ?? null,
      contextType: event.contextType ?? null,
      workspaceId: event.workspaceId ?? null,

      // Result
      result: event.result,
      reason: event.reason ?? null,

      // Payload
      payload: event.payload ?? null,

      // Consent
      consentObtained: event.consentObtained ?? null,
      consentId: event.consentId ?? null,

      // Tracing
      correlationId: event.correlationId ?? null,
      causationId: event.causationId ?? null,

      // Timing
      executionTimeMs: event.executionTimeMs ?? null,

      // Metadata
      metadata: event.metadata ?? null,
    });

    const saved = await this.auditRepository.save(auditRecord);

    this.logger.log(
      `Capability usage recorded: ${event.actorId} executed ${event.capabilityName} - ${event.result}`,
    );

    return saved;
  }

  /**
   * Find all audit records for an actor
   */
  async findByActorId(actorId: string, limit = 100, offset = 0): Promise<CapabilityAuditEntity[]> {
    return this.auditRepository.find({
      where: { actorId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Find all audit records for a capability
   */
  async findByCapabilityName(
    capabilityName: string,
    limit = 100,
    offset = 0,
  ): Promise<CapabilityAuditEntity[]> {
    return this.auditRepository.find({
      where: { capabilityName },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Find all audit records for a context
   */
  async findByContextId(
    contextId: string,
    limit = 100,
    offset = 0,
  ): Promise<CapabilityAuditEntity[]> {
    return this.auditRepository.find({
      where: { contextId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Find audit record by correlation ID (for idempotency checks)
   */
  async findByCorrelationId(correlationId: string): Promise<CapabilityAuditEntity | null> {
    return this.auditRepository.findOne({
      where: { correlationId },
    });
  }

  /**
   * Get usage statistics for a capability
   */
  async getUsageStats(
    capabilityName?: string,
    startDate?: string,
    endDate?: string,
    result?: CapabilityExecutionResult,
  ): Promise<UsageStats> {
    // Get total count
    const queryBuilder = this.auditRepository.createQueryBuilder('audit');

    if (capabilityName) {
      queryBuilder.andWhere('audit.capabilityName = :capabilityName', { capabilityName });
    }

    if (startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    if (result) {
      queryBuilder.andWhere('audit.result = :result', { result });
    }

    const total = await queryBuilder.getCount();

    // Get counts by result type using separate queries
    const baseWhere: Record<string, unknown> = {};
    if (capabilityName) baseWhere.capabilityName = capabilityName;
    if (startDate) baseWhere.createdAt = MoreThanOrEqual(new Date(startDate));
    if (endDate) {
      if (baseWhere.createdAt) {
        // Combine with between
        baseWhere.createdAt = Between(new Date(startDate!), new Date(endDate));
      } else {
        baseWhere.createdAt = LessThanOrEqual(new Date(endDate));
      }
    }

    const successCount = await this.auditRepository.count({
      where: { ...baseWhere, result: CapabilityExecutionResult.SUCCESS },
    });

    const deniedCount = await this.auditRepository.count({
      where: { ...baseWhere, result: CapabilityExecutionResult.DENIED },
    });

    const failedCount = await this.auditRepository.count({
      where: { ...baseWhere, result: CapabilityExecutionResult.FAILED },
    });

    const consentRequiredCount = await this.auditRepository.count({
      where: { ...baseWhere, result: CapabilityExecutionResult.CONSENT_REQUIRED },
    });

    return {
      totalExecutions: total,
      successfulExecutions: successCount,
      deniedExecutions: deniedCount,
      failedExecutions: failedCount,
      consentRequiredExecutions: consentRequiredCount,
    };
  }

  /**
   * Handle CapabilityUsedEvent
   * Called by the event subscriber when a capability is used
   */
  async handleCapabilityUsed(event: CapabilityUsedEventV1): Promise<void> {
    await this.recordCapabilityUsage(event);
  }
}
