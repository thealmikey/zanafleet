import { RequireCapability } from '@api/core/api/decorators';
import { CapabilityGuard, PolicyGuard } from '@api/core/api/guards';
import {
  parseQueryParams,
  createPaginationMeta,
} from '@api/core/api/utils';
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
import {
  PolicyTrigger,
  ValidatedUser,
} from '@zanafleet/contracts';
import { Repository, In } from 'typeorm';


import { BusinessEntity } from '../../business/entities/business.entity';
import { DeliveryEntity } from '../../delivery/entities/delivery.entity';
import { OrderEntity } from '../../order/entities/order.entity';
import { RiderEntity } from '../../rider/entities/rider.entity';
import { SaccoEntity } from '../../sacco/entities/sacco.entity';
import {
  BusinessResponseDto,
  SaccoResponseDto,
  RiderResponseDto,
  OrderResponseDto,
  DeliveryResponseDto,
  PaginatedResponseDto,
  HierarchyQueryDto,
  OrdersQueryDto,
  DeliveriesQueryDto,
  UpdateBusinessHierarchyDto,
  UpdateSaccoHierarchyDto,
  UpdateRiderHierarchyDto,
  UpdateOrderHierarchyDto,
  UpdateDeliveryHierarchyDto,
} from '../dto';
import { AdminScopeService } from '../services/admin-scope.service';

/**
 * Request type for authenticated endpoints.
 * The `user` property is populated by JwtStrategy after successful authentication.
 * CapabilityGuard ensures user.actorId is present before controller methods execute.
 */
interface AuthenticatedRequest {
  user?: ValidatedUser;
}

@Controller('dashboards/admin/hierarchy')
@UseGuards(CapabilityGuard)
@RequireCapability('admin.hierarchy.read')
export class AdminHierarchyController {
  private readonly logger = new Logger(AdminHierarchyController.name);

  constructor(
    private readonly adminScopeService: AdminScopeService,
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
    @Query() query: HierarchyQueryDto
  ): Promise<PaginatedResponseDto<BusinessResponseDto>> {
    const { pagination, sort, filter } = parseQueryParams(query);
    const workspaceId = req.user?.workspaceId ?? null;
    const actorId = req.user?.actorId ?? null;

    const businessIds = await this.adminScopeService.getScopedBusinessIds(actorId, workspaceId);

    if (businessIds.length === 0) {
      return {
        data: [],
        meta: createPaginationMeta(pagination, 0),
      };
    }

    const order = sort ? { [sort.field]: sort.order } : undefined;

    const [entities, total] = await this.businessRepository.findAndCount({
      where: {
        ...(filter ),
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
    @Query() query: HierarchyQueryDto
  ): Promise<PaginatedResponseDto<SaccoResponseDto>> {
    const { pagination, sort, filter } = parseQueryParams(query);
    const workspaceId = req.user?.workspaceId ?? null;
    const actorId = req.user?.actorId ?? null;

    const saccoIds = await this.adminScopeService.getScopedSaccoIds(actorId, workspaceId);

    if (saccoIds.length === 0) {
      return {
        data: [],
        meta: createPaginationMeta(pagination, 0),
      };
    }

    const order = sort ? { [sort.field]: sort.order } : undefined;

    const [entities, total] = await this.saccoRepository.findAndCount({
      where: {
        ...(filter ),
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
    @Query() query: HierarchyQueryDto
  ): Promise<PaginatedResponseDto<RiderResponseDto>> {
    const { pagination, sort, filter } = parseQueryParams(query);
    const workspaceId = req.user?.workspaceId ?? null;
    const actorId = req.user?.actorId ?? null;
    const { saccoId, businessId, riderId } = query;

    let riderIds: string[];

    if (riderId) {
      riderIds = [riderId];
    } else {
      riderIds = await this.adminScopeService.getScopedRiderIds(actorId, workspaceId, saccoId ?? null);
    }

    if (riderIds.length === 0) {
      return {
        data: [],
        meta: createPaginationMeta(pagination, 0),
      };
    }

    const order = sort ? { [sort.field]: sort.order } : undefined;

    const whereClause: Record<string, unknown> = {
      ...(filter ),
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
    @Query() query: OrdersQueryDto
  ): Promise<PaginatedResponseDto<OrderResponseDto>> {
    const { pagination, sort, filter } = parseQueryParams(query);
    const workspaceId = req.user?.workspaceId ?? null;
    const actorId = req.user?.actorId ?? null;
    const { businessId, riderId, status } = query;

    const order = sort ? { [sort.field]: sort.order } : { createdAt: 'DESC' as const };

    const whereClause: Record<string, unknown> = {
      ...(filter ),
    };

    // Apply status filter if provided
    if (status) {
      whereClause.status = status;
    }

    if (riderId) {
      this.logger.debug(`Filtering orders by riderId: ${riderId} (via delivery lookup)`);

      const deliveryWhereClause: Record<string, unknown> = {
        assignedRiderId: riderId,
      };

      if (businessId) {
        deliveryWhereClause.businessId = businessId;
      } else {
        const scopedBusinessIds = await this.adminScopeService.getScopedBusinessIds(
          actorId,
          workspaceId
        );
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
        businessIds = await this.adminScopeService.getScopedBusinessIds(actorId, workspaceId);
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
    @Query() query: DeliveriesQueryDto
  ): Promise<PaginatedResponseDto<DeliveryResponseDto>> {
    const { pagination, sort, filter } = parseQueryParams(query);
    const workspaceId = req.user?.workspaceId ?? null;
    const actorId = req.user?.actorId ?? null;
    const { businessId, riderId, status } = query;

    const order = sort ? { [sort.field]: sort.order } : { createdAt: 'DESC' as const };

    const whereClause: Record<string, unknown> = {
      ...(filter ),
    };

    // Apply status filter if provided
    if (status) {
      whereClause.status = status;
    }

    if (riderId) {
      whereClause.assignedRiderId = riderId;
    } else if (businessId) {
      whereClause.businessId = businessId;
    } else {
      const businessIds = await this.adminScopeService.getScopedBusinessIds(actorId, workspaceId);
      const riderIds = await this.adminScopeService.getAllScopedRiderIds(actorId, workspaceId);

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
  ): Promise<BusinessResponseDto> {
    const workspaceId = req.user?.workspaceId ?? null;
    const actorId = req.user?.actorId ?? null;

    const isInScope = await this.adminScopeService.isBusinessInScope(id, actorId, workspaceId);
    if (!isInScope) {
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
  ): Promise<SaccoResponseDto> {
    const workspaceId = req.user?.workspaceId ?? null;
    const actorId = req.user?.actorId ?? null;

    const isInScope = await this.adminScopeService.isSaccoInScope(id, actorId, workspaceId);
    if (!isInScope) {
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
  ): Promise<RiderResponseDto> {
    const workspaceId = req.user?.workspaceId ?? null;
    const actorId = req.user?.actorId ?? null;

    const isInScope = await this.adminScopeService.isRiderInScope(id, actorId, workspaceId);
    if (!isInScope) {
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
  ): Promise<OrderResponseDto> {
    const workspaceId = req.user?.workspaceId ?? null;
    const actorId = req.user?.actorId ?? null;

    const existing = await this.orderRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    const isBusinessInScope = await this.adminScopeService.isBusinessInScope(
      existing.businessId,
      actorId,
      workspaceId
    );
    if (!isBusinessInScope) {
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
  ): Promise<DeliveryResponseDto> {
    const workspaceId = req.user?.workspaceId ?? null;
    const actorId = req.user?.actorId ?? null;

    const existing = await this.deliveryRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Delivery with ID "${id}" not found`);
    }

    const isBusinessInScope = await this.adminScopeService.isBusinessInScope(
      existing.businessId,
      actorId,
      workspaceId
    );
    if (!isBusinessInScope) {
      throw new ForbiddenException(`Delivery "${id}" is not within your administrative scope`);
    }

    await this.deliveryRepository.update(id, dto as Record<string, unknown>);
    const updated = await this.deliveryRepository.findOne({ where: { id } });
    return updated!.toDomain();
  }
}
