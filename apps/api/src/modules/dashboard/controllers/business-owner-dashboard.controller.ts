import { RequireCapability } from '@api/core/api/decorators';
import { CapabilityGuard } from '@api/core/api/guards';
import { createPaginationMeta, parseQueryParams } from '@api/core/api/utils';
import { Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ValidatedUser } from '@zanafleet/contracts';

import {
  BillingSummaryDto,
  BusinessDeliveriesQueryDto,
  BusinessOverviewDto,
  DeliveryDetailDto,
  DeliveryRequestResultDto,
  BusinessDeliveryRequestDto,
} from '../dto';
import { BusinessOwnerDashboardService } from '../services/business-owner-dashboard.service';

interface AuthenticatedRequest {
  user?: ValidatedUser;
}

@Controller()
@UseGuards(CapabilityGuard)
export class BusinessOwnerDashboardController {
  constructor(private readonly service: BusinessOwnerDashboardService) {}

  @Get('businesses/mine')
  @RequireCapability('dashboard.business.read')
  @Header('Cache-Control', 'private, max-age=30')
  async getMyBusinesses(@Req() req: AuthenticatedRequest): Promise<{
    data: { businessId: string; businessName: string }[];
  }> {
    const actorId = req.user?.actorId ?? null;
    const workspaceId = req.user?.workspaceId ?? null;
    const data = await this.service.listMyBusinesses(actorId, workspaceId);
    return { data };
  }

  @Get('businesses/:businessId/stats/overview')
  @RequireCapability('dashboard.business.read')
  @Header('Cache-Control', 'private, max-age=30')
  async getOverview(
    @Req() req: AuthenticatedRequest,
    @Param('businessId') businessId: string
  ): Promise<BusinessOverviewDto> {
    return this.service.getOverview(
      businessId,
      req.user?.actorId ?? null,
      req.user?.workspaceId ?? null
    );
  }

  @Get('businesses/:businessId/deliveries')
  @RequireCapability('dashboard.business.read')
  @Header('Cache-Control', 'private, max-age=15')
  async listDeliveries(
    @Req() req: AuthenticatedRequest,
    @Param('businessId') businessId: string,
    @Query() query: BusinessDeliveriesQueryDto
  ): Promise<{
    data: Awaited<ReturnType<BusinessOwnerDashboardService['listDeliveries']>>['data'];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort } = parseQueryParams(query);
    return this.service.listDeliveries(
      businessId,
      req.user?.actorId ?? null,
      req.user?.workspaceId ?? null,
      pagination,
      sort,
      query
    );
  }

  @Post('businesses/:businessId/deliveries/request')
  @RequireCapability('delivery.manage')
  async requestDelivery(
    @Req() req: AuthenticatedRequest,
    @Param('businessId') businessId: string,
    @Body() body: BusinessDeliveryRequestDto
  ): Promise<DeliveryRequestResultDto> {
    return this.service.requestDelivery(
      businessId,
      req.user?.actorId ?? null,
      req.user?.workspaceId ?? null,
      {
        pickupLocationId: body.pickupLocationId,
        dropoffLocationId: body.dropoffLocationId,
        recipientName: body.recipientName,
        recipientPhone: body.recipientPhone,
        itemDescription: body.itemDescription,
        scheduledPickupTime: body.scheduledPickupTime
          ? new Date(body.scheduledPickupTime)
          : undefined,
        declaredItemValue: body.declaredItemValue,
        specialInstructions: body.specialInstructions,
        distanceKm: body.distanceKm,
      }
    );
  }

  @Get('deliveries/:deliveryId/timeline')
  @RequireCapability('dashboard.business.read')
  @Header('Cache-Control', 'private, max-age=10')
  async getDeliveryTimeline(
    @Req() req: AuthenticatedRequest,
    @Param('deliveryId') deliveryId: string
  ): Promise<{
    data: Awaited<ReturnType<BusinessOwnerDashboardService['getDeliveryTimeline']>>;
  }> {
    const data = await this.service.getDeliveryTimeline(
      deliveryId,
      req.user?.actorId ?? null,
      req.user?.workspaceId ?? null
    );
    return { data };
  }

  @Get('businesses/:businessId/deliveries/:deliveryId')
  @RequireCapability('dashboard.business.read')
  @Header('Cache-Control', 'private, max-age=10')
  async getDeliveryDetail(
    @Req() req: AuthenticatedRequest,
    @Param('businessId') businessId: string,
    @Param('deliveryId') deliveryId: string
  ): Promise<DeliveryDetailDto> {
    return this.service.getDeliveryDetail(
      businessId,
      deliveryId,
      req.user?.actorId ?? null,
      req.user?.workspaceId ?? null
    );
  }

  @Get('businesses/:businessId/billing/summary')
  @RequireCapability('dashboard.business.read')
  @Header('Cache-Control', 'private, max-age=30')
  async getBillingSummary(
    @Req() req: AuthenticatedRequest,
    @Param('businessId') businessId: string
  ): Promise<BillingSummaryDto> {
    return this.service.getBillingSummary(
      businessId,
      req.user?.actorId ?? null,
      req.user?.workspaceId ?? null
    );
  }
}
