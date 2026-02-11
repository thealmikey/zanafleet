
import { Neo4jService } from '@api/core/neo4j';
import {
  ADMIN_SCOPED_BUSINESS_IDS,
  ADMIN_SCOPED_SACCO_IDS,
  ADMIN_SCOPED_RIDER_IDS,
  BUSINESSES_IN_WORKSPACE_SCOPE,
  SACCOS_IN_WORKSPACE_SCOPE,
  RIDERS_IN_WORKSPACE_SCOPE,
  ALL_RIDER_IDS_IN_SCOPE,
} from '@api/core/neo4j/queries';
import { Injectable, Logger } from '@nestjs/common';

/**
 * AdminScopeService
 *
 * Centralized service for resolving entity IDs scoped to an admin actor's
 * workspace memberships. Uses Neo4j graph traversal to determine visibility.
 *
 * Query Strategy:
 * 1. If actorId is provided, use ADMIN_SCOPED_* queries (traverse from Actor)
 * 2. Falls back to *_IN_WORKSPACE_SCOPE queries if actor-scoped returns empty
 * 3. Returns empty array on Neo4j errors (fail-safe)
 *
 * Usage:
 * ```typescript
 * const businessIds = await adminScopeService.getScopedBusinessIds(actorId, workspaceId);
 * const orders = await orderRepo.find({ where: { businessId: In(businessIds) } });
 * ```
 */
@Injectable()
export class AdminScopeService {
  private readonly logger = new Logger(AdminScopeService.name);

  constructor(private readonly neo4jService: Neo4jService) {}

  /**
   * Get business IDs scoped to an admin actor's workspace memberships.
   * @param actorId - The admin actor's ID (optional, for actor-scoped queries)
   * @param workspaceId - The workspace ID (optional, for workspace-scoped fallback)
   * @returns Array of business IDs within scope
   */
  async getScopedBusinessIds(
    actorId?: string | null,
    workspaceId?: string | null
  ): Promise<string[]> {
    const session = this.neo4jService.getReadSession();
    try {
      if (actorId) {
        const result = await session.run(ADMIN_SCOPED_BUSINESS_IDS, { actorId });
        const ids = result.records.map((r) => r.get('businessId') as string);
        if (ids.length > 0) {
          return ids;
        }
      }
      const result = await session.run(BUSINESSES_IN_WORKSPACE_SCOPE, {
        workspaceId: workspaceId ?? null,
      });
      return result.records.map((r) => r.get('businessId') as string);
    } catch (error) {
      this.logger.warn(
        `Neo4j query failed for businesses, returning empty: ${(error as Error).message}`
      );
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Get sacco IDs scoped to an admin actor's workspace memberships.
   * @param actorId - The admin actor's ID (optional, for actor-scoped queries)
   * @param workspaceId - The workspace ID (optional, for workspace-scoped fallback)
   * @returns Array of sacco IDs within scope
   */
  async getScopedSaccoIds(
    actorId?: string | null,
    workspaceId?: string | null
  ): Promise<string[]> {
    const session = this.neo4jService.getReadSession();
    try {
      if (actorId) {
        const result = await session.run(ADMIN_SCOPED_SACCO_IDS, { actorId });
        const ids = result.records.map((r) => r.get('saccoId') as string);
        if (ids.length > 0) {
          return ids;
        }
      }
      const result = await session.run(SACCOS_IN_WORKSPACE_SCOPE, {
        workspaceId: workspaceId ?? null,
      });
      return result.records.map((r) => r.get('saccoId') as string);
    } catch (error) {
      this.logger.warn(
        `Neo4j query failed for saccos, returning empty: ${(error as Error).message}`
      );
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Get rider IDs scoped to an admin actor's workspace memberships.
   * @param actorId - The admin actor's ID (optional, for actor-scoped queries)
   * @param workspaceId - The workspace ID (optional, for workspace-scoped fallback)
   * @param saccoId - Optional sacco filter (null for all saccos)
   * @returns Array of rider IDs within scope
   */
  async getScopedRiderIds(
    actorId?: string | null,
    workspaceId?: string | null,
    saccoId?: string | null
  ): Promise<string[]> {
    const session = this.neo4jService.getReadSession();
    try {
      if (actorId) {
        const result = await session.run(ADMIN_SCOPED_RIDER_IDS, {
          actorId,
          saccoId: saccoId ?? null,
        });
        const ids = result.records.map((r) => r.get('riderId') as string);
        if (ids.length > 0) {
          return ids;
        }
      }
      const result = await session.run(RIDERS_IN_WORKSPACE_SCOPE, {
        workspaceId: workspaceId ?? null,
        saccoId: saccoId ?? null,
      });
      return result.records.map((r) => r.get('riderId') as string);
    } catch (error) {
      this.logger.warn(
        `Neo4j query failed for riders, returning empty: ${(error as Error).message}`
      );
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Get all rider IDs in scope (without sacco filter).
   * Convenience method for delivery filtering where sacco filter is not needed.
   * @param actorId - The admin actor's ID (optional)
   * @param workspaceId - The workspace ID (optional)
   * @returns Array of rider IDs within scope
   */
  async getAllScopedRiderIds(
    actorId?: string | null,
    workspaceId?: string | null
  ): Promise<string[]> {
    const session = this.neo4jService.getReadSession();
    try {
      if (actorId) {
        const result = await session.run(ADMIN_SCOPED_RIDER_IDS, {
          actorId,
          saccoId: null,
        });
        const ids = result.records.map((r) => r.get('riderId') as string);
        if (ids.length > 0) {
          return ids;
        }
      }
      const result = await session.run(ALL_RIDER_IDS_IN_SCOPE, {
        workspaceId: workspaceId ?? null,
      });
      return result.records.map((r) => r.get('riderId') as string);
    } catch (error) {
      this.logger.warn(
        `Neo4j query failed for all riders, returning empty: ${(error as Error).message}`
      );
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Filter business IDs to only those within the actor's scope.
   * @param businessIds - Array of business IDs to filter
   * @param actorId - The admin actor's ID
   * @param workspaceId - The workspace ID (optional fallback)
   * @returns Filtered array containing only in-scope business IDs
   */
  async filterBusinessIdsByScope(
    businessIds: string[],
    actorId?: string | null,
    workspaceId?: string | null
  ): Promise<string[]> {
    if (businessIds.length === 0) {
      return [];
    }
    const scopedIds = await this.getScopedBusinessIds(actorId, workspaceId);
    const scopedSet = new Set(scopedIds);
    return businessIds.filter((id) => scopedSet.has(id));
  }

  /**
   * Filter sacco IDs to only those within the actor's scope.
   * @param saccoIds - Array of sacco IDs to filter
   * @param actorId - The admin actor's ID
   * @param workspaceId - The workspace ID (optional fallback)
   * @returns Filtered array containing only in-scope sacco IDs
   */
  async filterSaccoIdsByScope(
    saccoIds: string[],
    actorId?: string | null,
    workspaceId?: string | null
  ): Promise<string[]> {
    if (saccoIds.length === 0) {
      return [];
    }
    const scopedIds = await this.getScopedSaccoIds(actorId, workspaceId);
    const scopedSet = new Set(scopedIds);
    return saccoIds.filter((id) => scopedSet.has(id));
  }

  /**
   * Filter rider IDs to only those within the actor's scope.
   * @param riderIds - Array of rider IDs to filter
   * @param actorId - The admin actor's ID
   * @param workspaceId - The workspace ID (optional fallback)
   * @param saccoId - Optional sacco filter
   * @returns Filtered array containing only in-scope rider IDs
   */
  async filterRiderIdsByScope(
    riderIds: string[],
    actorId?: string | null,
    workspaceId?: string | null,
    saccoId?: string | null
  ): Promise<string[]> {
    if (riderIds.length === 0) {
      return [];
    }
    const scopedIds = await this.getScopedRiderIds(actorId, workspaceId, saccoId);
    const scopedSet = new Set(scopedIds);
    return riderIds.filter((id) => scopedSet.has(id));
  }

  /**
   * Check if a single business ID is within the actor's scope.
   * @param businessId - The business ID to check
   * @param actorId - The admin actor's ID
   * @param workspaceId - The workspace ID (optional fallback)
   * @returns true if the business is in scope
   */
  async isBusinessInScope(
    businessId: string,
    actorId?: string | null,
    workspaceId?: string | null
  ): Promise<boolean> {
    const scopedIds = await this.getScopedBusinessIds(actorId, workspaceId);
    return scopedIds.includes(businessId);
  }

  /**
   * Check if a single sacco ID is within the actor's scope.
   * @param saccoId - The sacco ID to check
   * @param actorId - The admin actor's ID
   * @param workspaceId - The workspace ID (optional fallback)
   * @returns true if the sacco is in scope
   */
  async isSaccoInScope(
    saccoId: string,
    actorId?: string | null,
    workspaceId?: string | null
  ): Promise<boolean> {
    const scopedIds = await this.getScopedSaccoIds(actorId, workspaceId);
    return scopedIds.includes(saccoId);
  }

  /**
   * Check if a single rider ID is within the actor's scope.
   * @param riderId - The rider ID to check
   * @param actorId - The admin actor's ID
   * @param workspaceId - The workspace ID (optional fallback)
   * @returns true if the rider is in scope
   */
  async isRiderInScope(
    riderId: string,
    actorId?: string | null,
    workspaceId?: string | null
  ): Promise<boolean> {
    const scopedIds = await this.getScopedRiderIds(actorId, workspaceId, null);
    return scopedIds.includes(riderId);
  }
}
