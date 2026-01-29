import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { FormationState, RequirementType } from '../dto/formation.enums';
import { FormationStatusEntity } from '../entities/formation-status.entity';
import { RequirementEntity } from '../entities/requirement.entity';

@Injectable()
export class FormationService {
  constructor(
    @InjectRepository(FormationStatusEntity)
    private readonly formationStatusRepository: Repository<FormationStatusEntity>,
    @InjectRepository(RequirementEntity)
    private readonly requirementRepository: Repository<RequirementEntity>
  ) {}

  async evaluateState(entityType: string, entityId: string): Promise<FormationState> {
    const hasCycle = await this.detectCycle(entityType, entityId);
    if (hasCycle) {
      return FormationState.BLOCKED;
    }

    const [unsatisfiedRequirements, blockingRequirements] = await Promise.all([
      this.getUnsatisfiedRequirements(entityType, entityId),
      this.getBlockingRequirements(entityType, entityId),
    ]);

    if (blockingRequirements.length > 0) {
      return FormationState.PENDING;
    }

    if (unsatisfiedRequirements.length > 0) {
      return FormationState.PARTIAL;
    }

    return FormationState.ACTIVE;
  }

  async detectCycle(entityType: string, entityId: string): Promise<boolean> {
    const startKey = this.buildNodeKey(entityType, entityId);
    const visited = new Set<string>();
    const relationshipCache = new Map<string, RequirementEntity[]>();

    const stack: Array<{
      entityType: string;
      entityId: string;
      path: Set<string>;
    }> = [
      {
        entityType,
        entityId,
        path: new Set([startKey]),
      },
    ];

    while (stack.length > 0) {
      const current = stack.pop()!;
      const currentKey = this.buildNodeKey(current.entityType, current.entityId);

      let requirements = relationshipCache.get(currentKey);
      if (!requirements) {
        requirements = await this.requirementRepository.find({
          where: {
            entityType: current.entityType,
            entityId: current.entityId,
            type: RequirementType.RELATIONSHIP,
          },
        });
        relationshipCache.set(currentKey, requirements);
      }

      for (const requirement of requirements) {
        if (!requirement.targetEntityId) {
          continue;
        }

        const targetType = requirement.entityType;
        const targetKey = this.buildNodeKey(targetType, requirement.targetEntityId);

        if (current.path.has(targetKey)) {
          return true;
        }

        if (!visited.has(targetKey)) {
          const nextPath = new Set(current.path);
          nextPath.add(targetKey);

          stack.push({
            entityType: targetType,
            entityId: requirement.targetEntityId,
            path: nextPath,
          });
        }
      }

      visited.add(currentKey);
    }

    return false;
  }

  async getUnsatisfiedRequirements(
    entityType: string,
    entityId: string
  ): Promise<RequirementEntity[]> {
    return this.requirementRepository.find({
      where: {
        entityType,
        entityId,
        satisfied: false,
      },
    });
  }

  async getBlockingRequirements(
    entityType: string,
    entityId: string
  ): Promise<RequirementEntity[]> {
    return this.requirementRepository.find({
      where: {
        entityType,
        entityId,
        blocking: true,
        satisfied: false,
      },
    });
  }

  async initializeFormationStatus(
    entityType: string,
    entityId: string,
    initialState: FormationState
  ): Promise<FormationStatusEntity> {
    const entity = FormationStatusEntity.fromDomain({
      formationStatusId: uuidv4(),
      entityType,
      entityId,
      state: initialState,
      lastEvaluatedAt: new Date(),
    });

    return this.formationStatusRepository.save(entity);
  }

  private buildNodeKey(entityType: string, entityId: string): string {
    return `${entityType}:${entityId}`;
  }
}
