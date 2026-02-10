import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  Header,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { CapabilityGuard } from '@api/core/api/guards';
import { RequireCapability } from '@api/core/api/decorators';
import {
  parseQueryParams,
  createPaginationMeta,
  RawQueryParams,
} from '@api/core/api/utils';
import { Neo4jService } from '@api/core/neo4j';
import {
  BUSINESSES_IN_WORKSPACE_SCOPE,
  SACCOS_IN_WORKSPACE_SCOPE,
  RIDERS_IN_WORKSPACE_SCOPE,
  ALL_BUSINESS_IDS_IN_SCOPE,
  ALL_RIDER_IDS_IN_SCOPE,
} from '@api/core/neo4j/queries';

import { BusinessEntity } from '../../business/entities/business.entity';
import { SaccoEntity } from '../../sacco/entities/sacco.entity';
import { RiderEntity } from '../../rider/entities/rider.entity';
import { OrderEntity } from '../../order/entities/order.entity';
import { DeliveryEntity } from '../../delivery/entities/delivery.entity';

interface AuthenticatedRequest {
  user?: {
    actorId?: string;
    workspaceId?: string;
  };
}

interface HierarchyQueryParams extends RawQueryParams {
  saccoId?: string;
  businessId?: string;
  riderId?: string;
}

@Controller('dashboards/admin/hierarchy')
@UseGuards(CapabilityGuard)
@RequireCapability('admin.hierarchy.read')
export class AdminHierarchyController {
  private readonly logger = new Logger(AdminHierarchyController.name);

  constructor(
    private readonly neo4jService: Neo4jService,
    @InjectRepository(BusinessEntity)
    private readonly businessRepository: Repository<BusinessEntity>,
    @InjectRepository(SaccoEntity)
    private readonly saccoRepository: Repository<SaccoEntity>,
    @InjectRepository(RiderEntity)
    private readonly riderRepository: Repository<RiderEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepository: Repository<DeliveryEntity>
  ) {}

  @Get('businesses')
  @Header('Cache-Control', 'private, max-age=30')
  async getBusinesses(
    @Req() req: AuthenticatedRequest,
    @Query() query: RawQueryParams
  ): Promise<{
    data: ReturnType<BusinessEntity['toDomain']>[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);
    const workspaceId = req.user?.workspaceId ?? null;

    const businessIds = await this.queryBusinessIdsInScope(workspaceId);

    if (businessIds.length === 0) {
      return {
        data: [],
        meta: createPaginationMeta(pagination, 0),
      };
    }

    const order = sort ? { [sort.field]: sort.order } : undefined;

    const [entities, total] = await this.businessRepository.findAndCount({
      where: {
        ...(filter as Record<string, unknown>),
        id: In(businessIds),
      },
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    return {
      data: entities.map((e) => e.toDomain()),
      meta: createPaginationMeta(pagination, total),
    };
  }

  @Get('saccos')
  @Header('Cache-Control', 'private, max-age=30')
  async getSaccos(
    @Req() req: AuthenticatedRequest,
    @Query() query: RawQueryParams
  ): Promise<{
    data: ReturnType<SaccoEntity['toDomain']>[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);
    const workspaceId = req.user?.workspaceId ?? null;

    const saccoIds = await this.querySaccoIdsInScope(workspaceId);

    if (saccoIds.length === 0) {
      return {
        data: [],
        meta: createPaginationMeta(pagination, 0),
      };
    }

    const order = sort ? { [sort.field]: sort.order } : undefined;

    const [entities, total] = await this.saccoRepository.findAndCount({
      where: {
        ...(filter as Record<string, unknown>),
        id: In(saccoIds),
      },
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    return {
      data: entities.map((e) => e.toDomain()),
      meta: createPaginationMeta(pagination, total),
    };
  }

  @Get('riders')
  @Header('Cache-Control', 'private, max-age=30')
  async getRiders(
    @Req() req: AuthenticatedRequest,
    @Query() query: HierarchyQueryParams
  ): Promise<{
    data: ReturnType<RiderEntity['toDomain']>[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);
    const workspaceId = req.user?.workspaceId ?? null;
    const { saccoId, businessId, riderId } = query;

    let riderIds: string[];

    if (riderId) {
      riderIds = [riderId];
    } else {
      riderIds = await this.queryRiderIdsInScope(workspaceId, saccoId ?? null);
    }

    if (riderIds.length === 0) {
      return {
        data: [],
        meta: createPaginationMeta(pagination, 0),
      };
    }

    const order = sort ? { [sort.field]: sort.order } : undefined;

    const whereClause: Record<string, unknown> = {
      ...(filter as Record<string, unknown>),
      id: In(riderIds),
    };

    if (businessId) {
      this.logger.debug(`Filtering riders by businessId: ${businessId} (no direct relation)`);
    }

    const [entities, total] = await this.riderRepository.findAndCount({
      where: whereClause,
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    return {
      data: entities.map((e) => e.toDomain()),
      meta: createPaginationMeta(pagination, total),
    };
  }

  @Get('orders')
  @Header('Cache-Control', 'private, max-age=30')
  async getOrders(
    @Req() req: AuthenticatedRequest,
    @Query() query: HierarchyQueryParams
  ): Promise<{
    data: ReturnType<OrderEntity['toDomain']>[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);
    const workspaceId = req.user?.workspaceId ?? null;
    const { businessId, riderId } = query;

    const order = sort ? { [sort.field]: sort.order } : { createdAt: 'DESC' as const };

    const whereClause: Record<string, unknown> = {
      ...(filter as Record<string, unknown>),
    };

    if (riderId) {
      this.logger.debug(`Filtering orders by riderId: ${riderId} (via delivery lookup)`);

      const deliveryWhereClause: Record<string, unknown> = {
        assignedRiderId: riderId,
      };

      if (businessId) {
        deliveryWhereClause.businessId = businessId;
      } else {
        const scopedBusinessIds = await this.queryBusinessIdsInScope(workspaceId);
        if (scopedBusinessIds.length > 0) {
          deliveryWhereClause.businessId = In(scopedBusinessIds);
        }
      }

      const deliveries = await this.deliveryRepository.find({
        where: deliveryWhereClause,
        select: ['id'],
      });

      const deliveryIds = deliveries.map((d) => d.id);

      if (deliveryIds.length === 0) {
        return {
          data: [],
          meta: createPaginationMeta(pagination, 0),
        };
      }

      whereClause.deliveryId = In(deliveryIds);
    } else {
      let businessIds: string[];

      if (businessId) {
        businessIds = [businessId];
      } else {
        businessIds = await this.queryBusinessIdsInScope(workspaceId);
      }

      if (businessIds.length === 0) {
        return {
          data: [],
          meta: createPaginationMeta(pagination, 0),
        };
      }

      whereClause.businessId = In(businessIds);
    }

    const [entities, total] = await this.orderRepository.findAndCount({
      where: whereClause,
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    return {
      data: entities.map((e) => e.toDomain()),
      meta: createPaginationMeta(pagination, total),
    };
  }

  @Get('deliveries')
  @Header('Cache-Control', 'private, max-age=30')
  async getDeliveries(
    @Req() req: AuthenticatedRequest,
    @Query() query: HierarchyQueryParams
  ): Promise<{
    data: ReturnType<DeliveryEntity['toDomain']>[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);
    const workspaceId = req.user?.workspaceId ?? null;
    const { businessId, riderId } = query;

    const order = sort ? { [sort.field]: sort.order } : { createdAt: 'DESC' as const };

    const whereClause: Record<string, unknown> = {
      ...(filter as Record<string, unknown>),
    };

    if (riderId) {
      whereClause.assignedRiderId = riderId;
    } else if (businessId) {
      whereClause.businessId = businessId;
    } else {
      const businessIds = await this.queryBusinessIdsInScope(workspaceId);
      const riderIds = await this.queryAllRiderIdsInScope(workspaceId);

      if (businessIds.length === 0 && riderIds.length === 0) {
        return {
          data: [],
          meta: createPaginationMeta(pagination, 0),
        };
      }

      if (businessIds.length > 0) {
        whereClause.businessId = In(businessIds);
      }
    }

    const [entities, total] = await this.deliveryRepository.findAndCount({
      where: whereClause,
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    return {
      data: entities.map((e) => e.toDomain()),
      meta: createPaginationMeta(pagination, total),
    };
  }

  private async queryBusinessIdsInScope(workspaceId: string | null): Promise<string[]> {
    const session = this.neo4jService.getReadSession();
    try {
      const result = await session.run(BUSINESSES_IN_WORKSPACE_SCOPE, { workspaceId });
      return result.records.map((r) => r.get('businessId') as string);
    } catch (error) {
      this.logger.warn(`Neo4j query failed for businesses, returning empty: ${(error as Error).message}`);
      return [];
    } finally {
      await session.close();
    }
  }

  private async querySaccoIdsInScope(workspaceId: string | null): Promise<string[]> {
    const session = this.neo4jService.getReadSession();
    try {
      const result = await session.run(SACCOS_IN_WORKSPACE_SCOPE, { workspaceId });
      return result.records.map((r) => r.get('saccoId') as string);
    } catch (error) {
      this.logger.warn(`Neo4j query failed for saccos, returning empty: ${(error as Error).message}`);
      return [];
    } finally {
      await session.close();
    }
  }

  private async queryRiderIdsInScope(
    workspaceId: string | null,
    saccoId: string | null
  ): Promise<string[]> {
    const session = this.neo4jService.getReadSession();
    try {
      const result = await session.run(RIDERS_IN_WORKSPACE_SCOPE, { workspaceId, saccoId });
      return result.records.map((r) => r.get('riderId') as string);
    } catch (error) {
      this.logger.warn(`Neo4j query failed for riders, returning empty: ${(error as Error).message}`);
      return [];
    } finally {
      await session.close();
    }
  }

  private async queryAllRiderIdsInScope(workspaceId: string | null): Promise<string[]> {
    const session = this.neo4jService.getReadSession();
    try {
      const result = await session.run(ALL_RIDER_IDS_IN_SCOPE, { workspaceId });
      return result.records.map((r) => r.get('riderId') as string);
    } catch (error) {
      this.logger.warn(`Neo4j query failed for all riders, returning empty: ${(error as Error).message}`);
      return [];
    } finally {
      await session.close();
    }
  }
}
