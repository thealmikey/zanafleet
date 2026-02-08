import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  PolicyDecisionLogEntity,
  EvaluatedPolicyLogEntry,
} from '../entities/policy-decision-log.entity';
import { PolicyEffect, PolicyTrigger, EvaluationContext } from '../dto';

/**
 * Input data for creating a policy decision log entry.
 * Mirrors the domain data structure without the logId (generated externally).
 */
export interface PolicyDecisionLogData {
  logId: string;
  requestId: string;
  trigger: PolicyTrigger;
  workspaceId: string;
  actorId?: string | null;
  subjectType: string;
  subjectId: string;
  contextSnapshot: EvaluationContext;
  evaluatedPolicies: EvaluatedPolicyLogEntry[];
  finalEffect: PolicyEffect;
  finalPolicyId?: string | null;
  finalReason: string;
  modifications?: Record<string, unknown> | null;
  processingTimeMs: number;
  failedOpen?: boolean;
  createdAt: Date;
}

export interface FindBySubjectOptions {
  limit?: number;
}

/**
 * PolicyDecisionLogRepository
 * Provides query methods for policy decision log persistence.
 *
 * This repository is append-only - no update or delete methods are provided
 * to maintain the immutability of audit logs.
 */
@Injectable()
export class PolicyDecisionLogRepository {
  constructor(
    @InjectRepository(PolicyDecisionLogEntity)
    private readonly repo: Repository<PolicyDecisionLogEntity>
  ) {}

  /**
   * Create a new policy decision log entry.
   * This is the only write operation - logs are immutable.
   */
  async create(data: PolicyDecisionLogData): Promise<PolicyDecisionLogEntity> {
    const entity = PolicyDecisionLogEntity.fromDomain(data);
    return this.repo.save(entity);
  }

  /**
   * Find all decision logs for a given request ID.
   * Useful for tracing all policy decisions made during a single request.
   * Returns logs ordered by createdAt DESC (most recent first).
   */
  async findByRequestId(requestId: string): Promise<PolicyDecisionLogEntity[]> {
    return this.repo.find({
      where: { requestId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find decision logs for a specific subject.
   * Useful for reviewing policy history for a delivery, rider, etc.
   * Returns logs ordered by createdAt DESC (most recent first).
   */
  async findBySubject(
    subjectType: string,
    subjectId: string,
    options: FindBySubjectOptions = {}
  ): Promise<PolicyDecisionLogEntity[]> {
    const qb = this.repo
      .createQueryBuilder('log')
      .where('log.subjectType = :subjectType', { subjectType })
      .andWhere('log.subjectId = :subjectId', { subjectId })
      .orderBy('log.createdAt', 'DESC');

    if (options.limit !== undefined && options.limit > 0) {
      qb.limit(options.limit);
    }

    return qb.getMany();
  }

  /**
   * Find a single decision log by ID.
   */
  async findById(id: string): Promise<PolicyDecisionLogEntity | null> {
    return this.repo.findOne({ where: { id } });
  }
}
