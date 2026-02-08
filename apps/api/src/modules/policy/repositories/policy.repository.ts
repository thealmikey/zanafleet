import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';

import { PolicyTrigger, PolicyStatus } from '../dto';
import { PolicyEntity } from '../entities/policy.entity';

export interface FindActivePoliciesContext {
  scopeTargetIds?: string[];
  now?: Date;
}

/**
 * PolicyRepository
 * Provides query methods for policy persistence.
 */
@Injectable()
export class PolicyRepository {
  constructor(
    @InjectRepository(PolicyEntity)
    private readonly repo: Repository<PolicyEntity>
  ) {}

  /**
   * Find all active policies for a given trigger.
   * Filters by:
   * - status = ACTIVE
   * - trigger matches
   * - effectiveFrom is null OR <= now
   * - effectiveUntil is null OR >= now
   * - scopeTargetId is null OR in the provided scopeTargetIds (if any)
   *
   * Returns policies ordered by priority DESC (higher priority first).
   */
  async findActivePoliciesForTrigger(
    trigger: PolicyTrigger,
    context: FindActivePoliciesContext = {}
  ): Promise<PolicyEntity[]> {
    const now = context.now ?? new Date();

    const qb = this.repo
      .createQueryBuilder('policy')
      .where('policy.trigger = :trigger', { trigger })
      .andWhere('policy.status = :status', { status: PolicyStatus.ACTIVE })
      .andWhere(
        new Brackets((qb) => {
          qb.where('policy.effectiveFrom IS NULL').orWhere(
            'policy.effectiveFrom <= :now',
            { now }
          );
        })
      )
      .andWhere(
        new Brackets((qb) => {
          qb.where('policy.effectiveUntil IS NULL').orWhere(
            'policy.effectiveUntil >= :now',
            { now }
          );
        })
      );

    if (context.scopeTargetIds && context.scopeTargetIds.length > 0) {
      qb.andWhere(
        new Brackets((qb) => {
          qb.where('policy.scopeTargetId IS NULL').orWhere(
            'policy.scopeTargetId IN (:...scopeTargetIds)',
            { scopeTargetIds: context.scopeTargetIds }
          );
        })
      );
    }

    qb.orderBy('policy.priority', 'DESC');

    return qb.getMany();
  }

  /**
   * Find a policy by ID
   */
  async findById(id: string): Promise<PolicyEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Find a policy by name
   */
  async findByName(name: string): Promise<PolicyEntity | null> {
    return this.repo.findOne({ where: { name } });
  }

  /**
   * Save a policy entity
   */
  async save(entity: PolicyEntity): Promise<PolicyEntity> {
    return this.repo.save(entity);
  }

  /**
   * Delete a policy by ID
   */
  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
