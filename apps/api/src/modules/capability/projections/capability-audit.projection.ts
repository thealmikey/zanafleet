import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CapabilityAuditEntity } from '../entities/capability-audit.entity';
import { CapabilityUsedEventV1 } from '../events/capability-used.event';

/**
 * CapabilityAuditProjection
 *
 * Event handler that persists capability usage events to the audit log.
 * This provides:
 * - Complete audit trail for compliance
 * - Queryable history for debugging
 * - Analytics data for capability usage patterns
 */
@EventsHandler(CapabilityUsedEventV1)
@Injectable()
export class CapabilityAuditProjection implements IEventHandler<CapabilityUsedEventV1> {
  private readonly logger = new Logger(CapabilityAuditProjection.name);

  constructor(
    @InjectRepository(CapabilityAuditEntity)
    private readonly auditRepository: Repository<CapabilityAuditEntity>
  ) {}

  async handle(event: CapabilityUsedEventV1): Promise<void> {
    this.logger.debug(
      `Persisting capability usage audit: actor=${event.actorId}, capability=${event.capabilityName}, result=${event.result}`
    );

    try {
      const auditEntity = CapabilityAuditEntity.fromDomain({
        id: event.eventId,
        actorId: event.actorId,
        actorType: event.actorType,
        capabilityName: event.capabilityName,
        capabilityId: event.capabilityId,
        contextId: event.contextId,
        contextType: event.contextType,
        workspaceId: event.workspaceId,
        result: event.result,
        reason: event.reason,
        payload: event.payload,
        consentObtained: event.consentObtained,
        consentId: event.consentId,
        correlationId: event.correlationId,
        causationId: event.causationId,
        executionTimeMs: event.executionTimeMs,
        metadata: event.metadata,
      });

      await this.auditRepository.save(auditEntity);

      this.logger.debug(`Capability usage audit persisted: ${event.eventId}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to persist capability usage audit: ${err.message}`,
        err.stack
      );
      // Don't re-throw - audit failures shouldn't break the main flow
    }
  }
}

/**
 * CapabilityAuditService
 *
 * Service for querying audit records.
 * Provides methods to retrieve usage history for debugging and compliance.
 */
@Injectable()
export class CapabilityAuditService {
  private readonly logger = new Logger(CapabilityAuditService.name);

  constructor(
    @InjectRepository(CapabilityAuditEntity)
    private readonly auditRepository: Repository<CapabilityAuditEntity>
  ) {}

  /**
   * Find audit records for an actor
   */
  async findByActor(actorId: string, limit = 100): Promise<CapabilityAuditEntity[]> {
    return this.auditRepository.find({
      where: { actorId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find audit records for a specific capability
   */
  async findByCapability(capabilityName: string, limit = 100): Promise<CapabilityAuditEntity[]> {
    return this.auditRepository.find({
      where: { capabilityName },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find audit records for a workspace
   */
  async findByWorkspace(workspaceId: string, limit = 100): Promise<CapabilityAuditEntity[]> {
    return this.auditRepository.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find audit records by correlation ID (trace a request across services)
   */
  async findByCorrelationId(correlationId: string): Promise<CapabilityAuditEntity[]> {
    return this.auditRepository.find({
      where: { correlationId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Find denied capability attempts
   */
  async findDeniedAttempts(limit = 100): Promise<CapabilityAuditEntity[]> {
    return this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.result = :result', { result: 'denied' })
      .orderBy('audit.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Get usage statistics for a capability
   */
  async getUsageStats(capabilityName: string): Promise<{
    total: number;
    success: number;
    denied: number;
    failed: number;
  }> {
    const stats = await this.auditRepository
      .createQueryBuilder('audit')
      .select('audit.result', 'result')
      .addSelect('COUNT(*)', 'count')
      .where('audit.capabilityName = :capabilityName', { capabilityName })
      .groupBy('audit.result')
      .getRawMany();

    const result = {
      total: 0,
      success: 0,
      denied: 0,
      failed: 0,
    };

    for (const stat of stats) {
      const count = parseInt(stat.count, 10);
      result.total += count;

      switch (stat.result) {
        case 'success':
          result.success = count;
          break;
        case 'denied':
          result.denied = count;
          break;
        case 'failed':
          result.failed = count;
          break;
      }
    }

    return result;
  }

  /**
   * Get actor's capability usage history
   */
  async getActorUsageHistory(
    actorId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<CapabilityAuditEntity[]> {
    const query = this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.actorId = :actorId', { actorId });

    if (fromDate) {
      query.andWhere('audit.createdAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('audit.createdAt <= :toDate', { toDate });
    }

    return query.orderBy('audit.createdAt', 'DESC').getMany();
  }
}
