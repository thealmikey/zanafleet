import {
  Controller,
  Get,
  Patch,
  Query,
  Param,
  Body,
  Req,
  UseGuards,
  Header,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  LocationData,
  VehicleType,
  BusinessType,
  DeliveryStatus,
  PolicyTrigger,
} from '@zanafleet/contracts';

import { CapabilityGuard, PolicyGuard } from '@api/core/api/guards';
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
  ADMIN_SCOPED_BUSINESS_IDS,
  ADMIN_SCOPED_SACCO_IDS,
  ADMIN_SCOPED_RIDER_IDS,
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

export class UpdateBusinessHierarchyDto {
  businessName?: string;
  phone?: string;
  location?: LocationData;
  businessType?: BusinessType;
  email?: string | null;
}

export class UpdateSaccoHierarchyDto {
  name?: string;
  location?: LocationData;
  contactPhone?: string;
}

export class UpdateRiderHierarchyDto {
  fullName?: string;
  nationalId?: string;
  phone?: string;
  location?: LocationData | null;
  vehicleType?: VehicleType;
  saccoId?: string | null;
  email?: string | null;
}

export class UpdateOrderHierarchyDto {
  businessId?: string;
  itemSummary?: string;
  itemMetadata?: Record<string, unknown>;
  customerName?: string;
  customerPhone?: string;
  scheduledTime?: Date;
}

export class UpdateDeliveryHierarchyDto {
  assignedRiderId?: string;
  status?: DeliveryStatus;
  scheduledPickupTime?: Date;
  scheduledDropoffTime?: Date;
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
    const actorId = req.user?.actorId ?? null;

    const businessIds = await this.queryBusinessIdsInScope(workspaceId, actorId);

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
    const actorId = req.user?.actorId ?? null;

    const saccoIds = await this.querySaccoIdsInScope(workspaceId, actorId);

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
    const actorId = req.user?.actorId ?? null;
    const { saccoId, businessId, riderId } = query;

    let riderIds: string[];

    if (riderId) {
      riderIds = [riderId];
    } else {
      riderIds = await this.queryRiderIdsInScope(workspaceId, saccoId ?? null, actorId);
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
    const actorId = req.user?.actorId ?? null;
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
        const scopedBusinessIds = await this.queryBusinessIdsInScope(workspaceId, actorId);
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
        businessIds = await this.queryBusinessIdsInScope(workspaceId, actorId);
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
    const actorId = req.user?.actorId ?? null;
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
      const businessIds = await this.queryBusinessIdsInScope(workspaceId, actorId);
      const riderIds = await this.queryAllRiderIdsInScope(workspaceId, actorId);

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

  @Patch('businesses/:id')
  @RequireCapability('admin.hierarchy.write', 'business.manage')
  async updateBusiness(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessHierarchyDto
  ): Promise<ReturnType<BusinessEntity['toDomain']>> {
    const workspaceId = req.user?.workspaceId ?? null;
    const actorId = req.user?.actorId ?? null;

    const scopedIds = await this.queryBusinessIdsInScope(workspaceId, actorId);
    if (!scopedIds.includes(id)) {
      throw new ForbiddenException(`Business "${id}" is not within your administrative scope`);
    }

    const existing = await this.businessRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Business with ID "${id}" not found`);
    }

    await this.businessRepository.update(id, dto as Record<string, unknown>);
    const updated = await this.businessRepository.findOne({ where: { id } });
    return updated!.toDomain();
  }

  @Patch('saccos/:id')
  @RequireCapability('admin.hierarchy.write', 'sacco.manage')
  async updateSacco(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSaccoHierarchyDto
  ): Promise<ReturnType<SaccoEntity['toDomain']>> {
    const workspaceId = req.user?.workspaceId ?? null;
    const actorId = req.user?.actorId ?? null;

    const scopedIds = await this.querySaccoIdsInScope(workspaceId, actorId);
    if (!scopedIds.includes(id)) {
      throw new ForbiddenException(`Sacco "${id}" is not within your administrative scope`);
    }

    const existing = await this.saccoRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Sacco with ID "${id}" not found`);
    }

    await this.saccoRepository.update(id, dto as Record<string, unknown>);
    const updated = await this.saccoRepository.findOne({ where: { id } });
    return updated!.toDomain();
  }

  @Patch('riders/:id')
  @RequireCapability('admin.hierarchy.write', 'rider.manage')
  async updateRider(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateRiderHierarchyDto
  ): Promise<ReturnType<RiderEntity['toDomain']>> {
    const workspaceId = req.user?.workspaceId ?? null;
    const actorId = req.user?.actorId ?? null;

    const scopedIds = await this.queryRiderIdsInScope(workspaceId, null, actorId);
    if (!scopedIds.includes(id)) {
      throw new ForbiddenException(`Rider "${id}" is not within your administrative scope`);
    }

    const existing = await this.riderRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Rider with ID "${id}" not found`);
    }

    await this.riderRepository.update(id, dto as Partial<RiderEntity> as Record<string, unknown>);
    const updated = await this.riderRepository.findOne({ where: { id } });
    return updated!.toDomain();
  }

  @Patch('orders/:id')
  @RequireCapability('admin.hierarchy.write', 'order.manage')
  async updateOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrderHierarchyDto
  ): Promise<ReturnType<OrderEntity['toDomain']>> {
    const workspaceId = req.user?.workspaceId ?? null;
    const actorId = req.user?.actorId ?? null;

    const existing = await this.orderRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    const scopedBusinessIds = await this.queryBusinessIdsInScope(workspaceId, actorId);
    if (!scopedBusinessIds.includes(existing.businessId)) {
      throw new ForbiddenException(`Order "${id}" is not within your administrative scope`);
    }

    await this.orderRepository.update(id, dto as Record<string, unknown>);
    const updated = await this.orderRepository.findOne({ where: { id } });
    return updated!.toDomain();
  }

  @Patch('deliveries/:id')
  @RequireCapability('admin.hierarchy.write', 'delivery.manage')
  @UseGuards(
    CapabilityGuard,
    PolicyGuard({
      trigger: PolicyTrigger.STATUS_TRANSITION,
      buildContext: (req) => ({
        deliveryId: (req.params as Record<string, string>)?.id,
      }),
      failOpen: false,
    })
  )
  async updateDelivery(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryHierarchyDto
  ): Promise<ReturnType<DeliveryEntity['toDomain']>> {
    const workspaceId = req.user?.workspaceId ?? null;
    const actorId = req.user?.actorId ?? null;

    const existing = await this.deliveryRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Delivery with ID "${id}" not found`);
    }

    const scopedBusinessIds = await this.queryBusinessIdsInScope(workspaceId, actorId);
    if (!scopedBusinessIds.includes(existing.businessId)) {
      throw new ForbiddenException(`Delivery "${id}" is not within your administrative scope`);
    }

    await this.deliveryRepository.update(id, dto as Record<string, unknown>);
    const updated = await this.deliveryRepository.findOne({ where: { id } });
    return updated!.toDomain();
  }

  /**
   * Query business IDs scoped to admin actor or workspace.
   * Prefers actor-scoped query when actorId is available.
   */
  private async queryBusinessIdsInScope(
    workspaceId: string | null,
    actorId?: string | null
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
      const result = await session.run(BUSINESSES_IN_WORKSPACE_SCOPE, { workspaceId });
      return result.records.map((r) => r.get('businessId') as string);
    } catch (error) {
      this.logger.warn(`Neo4j query failed for businesses, returning empty: ${(error as Error).message}`);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Query sacco IDs scoped to admin actor or workspace.
   * Prefers actor-scoped query when actorId is available.
   */
  private async querySaccoIdsInScope(
    workspaceId: string | null,
    actorId?: string | null
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
      const result = await session.run(SACCOS_IN_WORKSPACE_SCOPE, { workspaceId });
      return result.records.map((r) => r.get('saccoId') as string);
    } catch (error) {
      this.logger.warn(`Neo4j query failed for saccos, returning empty: ${(error as Error).message}`);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Query rider IDs scoped to admin actor or workspace, optionally filtered by saccoId.
   * Prefers actor-scoped query when actorId is available.
   */
  private async queryRiderIdsInScope(
    workspaceId: string | null,
    saccoId: string | null,
    actorId?: string | null
  ): Promise<string[]> {
    const session = this.neo4jService.getReadSession();
    try {
      if (actorId) {
        const result = await session.run(ADMIN_SCOPED_RIDER_IDS, { actorId, saccoId });
        const ids = result.records.map((r) => r.get('riderId') as string);
        if (ids.length > 0) {
          return ids;
        }
      }
      const result = await session.run(RIDERS_IN_WORKSPACE_SCOPE, { workspaceId, saccoId });
      return result.records.map((r) => r.get('riderId') as string);
    } catch (error) {
      this.logger.warn(`Neo4j query failed for riders, returning empty: ${(error as Error).message}`);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Query all rider IDs in scope (without sacco filter).
   */
  private async queryAllRiderIdsInScope(
    workspaceId: string | null,
    actorId?: string | null
  ): Promise<string[]> {
    const session = this.neo4jService.getReadSession();
    try {
      if (actorId) {
        const result = await session.run(ADMIN_SCOPED_RIDER_IDS, { actorId, saccoId: null });
        const ids = result.records.map((r) => r.get('riderId') as string);
        if (ids.length > 0) {
          return ids;
        }
      }
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
