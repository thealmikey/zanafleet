import {
  Repository,
  FindOptionsWhere,
  FindOptionsSelect,
  FindOptionsRelations,
  DeepPartial,
  SelectQueryBuilder,
  DeleteResult,
  UpdateResult,
} from 'typeorm';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { TenantAware } from './interfaces/tenant-aware.interface';

/**
 * TenantScopedRepository<T>
 * 
 * Base repository that enforces workspaceId filtering on ALL queries.
 * All tenant-scoped entities MUST use this repository.
 * 
 * KEY FEATURES:
 * - Auto-injects workspaceId into ALL queries
 * - Throws if workspaceId is missing
 * - Provides scoped variants of all standard TypeORM methods
 * 
 * Usage:
 * ```typescript
 * @EntityRepository(OrderEntity)
 * export class OrderRepository extends TenantScopedRepository<OrderEntity> {
 *   // Custom methods that call super methods
 * }
 * ```
 */
@Injectable()
export abstract class TenantScopedRepository<T extends TenantAware> 
  extends Repository<T> {
  
  protected readonly logger = new Logger(TenantScopedRepository.name);

  /**
   * Validates workspaceId is provided.
   * Throws BadRequestException if missing.
   */
  protected validateWorkspaceId(workspaceId: string | null | undefined): string {
    if (!workspaceId) {
      const error = 'Tenant isolation violation: workspaceId is required for all queries';
      this.logger.error(error);
      throw new BadRequestException(error);
    }
    return workspaceId;
  }

  /**
   * Find one entity scoped to workspace.
   * AUTO-INJECTS workspaceId filter.
   */
  async findOneScoped(
    workspaceId: string,
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    options?: {
      select?: FindOptionsSelect<T>;
      relations?: FindOptionsRelations<T>;
    }
  ): Promise<T | null> {
    const ws = this.validateWorkspaceId(workspaceId);
    return this.findOne({
      where: {
        ...where,
        workspaceId: ws,
      } as FindOptionsWhere<T>,
      ...options,
    });
  }

  /**
   * Find many entities scoped to workspace.
   * AUTO-INJECTS workspaceId filter.
   */
  async findScoped(
    workspaceId: string,
    options?: {
      where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
      select?: FindOptionsSelect<T>;
      relations?: FindOptionsRelations<T>;
      order?: Record<string, 'ASC' | 'DESC'>;
      skip?: number;
      take?: number;
    }
  ): Promise<T[]> {
    const ws = this.validateWorkspaceId(workspaceId);
    return this.find({
      where: {
        ...options?.where,
        workspaceId: ws,
      } as FindOptionsWhere<T>,
      select: options?.select,
      relations: options?.relations,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      order: options?.order as any,
      skip: options?.skip,
      take: options?.take,
    });
  }

  /**
   * Find and count scoped to workspace.
   * AUTO-INJECTS workspaceId filter.
   */
  async findAndCountScoped(
    workspaceId: string,
    options?: {
      where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
      select?: FindOptionsSelect<T>;
      relations?: FindOptionsRelations<T>;
      order?: Record<string, 'ASC' | 'DESC'>;
      skip?: number;
      take?: number;
    }
  ): Promise<[T[], number]> {
    const ws = this.validateWorkspaceId(workspaceId);
    return this.findAndCount({
      where: {
        ...options?.where,
        workspaceId: ws,
      } as FindOptionsWhere<T>,
      select: options?.select,
      relations: options?.relations,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      order: options?.order as any,
      skip: options?.skip,
      take: options?.take,
    });
  }

  /**
   * CreateQueryBuilder with workspaceId auto-injected.
   * USE THIS for complex queries.
   */
  createScopedQueryBuilder(
    workspaceId: string,
    alias: string,
    additionalConditions?: Record<string, unknown>
  ): SelectQueryBuilder<T> {
    const ws = this.validateWorkspaceId(workspaceId);
    let query = this.createQueryBuilder(alias)
      .andWhere(`"${alias}"."workspace_id" = :workspaceId`, { workspaceId: ws });

    if (additionalConditions) {
      Object.entries(additionalConditions).forEach(([key, value]) => {
        query = query.andWhere(`"${alias}"."${key}" = :${key}`, { [key]: value });
      });
    }

    return query;
  }

  /**
   * Save with workspaceId auto-injected.
   */
  async saveScoped(
    workspaceId: string,
    entity: DeepPartial<T>
  ): Promise<T> {
    const ws = this.validateWorkspaceId(workspaceId);
    const entityToSave = {
      ...entity,
      workspaceId: ws,
    } as DeepPartial<T>;
    return this.save(entityToSave);
  }

  /**
   * Count entities scoped to workspace.
   * AUTO-INJECTS workspaceId filter.
   */
  async countScoped(
    workspaceId: string,
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[]
  ): Promise<number> {
    const ws = this.validateWorkspaceId(workspaceId);
    return this.count({
      where: {
        ...where,
        workspaceId: ws,
      } as FindOptionsWhere<T>,
    });
  }

  /**
   * Delete scoped to workspace.
   * AUTO-INJECTS workspaceId filter.
   */
  async deleteScoped(
    workspaceId: string,
    criteria: FindOptionsWhere<T> | FindOptionsWhere<T>[]
  ): Promise<DeleteResult> {
    const ws = this.validateWorkspaceId(workspaceId);
    return this.delete({
      ...criteria,
      workspaceId: ws,
    } as FindOptionsWhere<T>);
  }

  /**
   * Update scoped to workspace.
   * AUTO-INJECTS workspaceId filter.
   */
  async updateScoped(
    workspaceId: string,
    criteria: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    partialEntity: any
  ): Promise<UpdateResult> {
    const ws = this.validateWorkspaceId(workspaceId);
    return this.update(
      {
        ...criteria,
        workspaceId: ws,
      } as FindOptionsWhere<T>,
      partialEntity
    );
  }
}