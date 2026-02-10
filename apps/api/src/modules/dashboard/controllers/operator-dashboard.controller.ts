import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Header,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryStatus, GeoPoint } from '@zanafleet/contracts';

import { CapabilityGuard } from '@api/core/api/guards';
import { RequireCapability } from '@api/core/api/decorators';
import {
  parseQueryParams,
  createPaginationMeta,
  RawQueryParams,
} from '@api/core/api/utils';

import { DeliveryEntity } from '../../delivery/entities/delivery.entity';
import { GeoQueryCoordinator } from '../../location-intelligence/coordinators/geo-query.coordinator';

export interface AssignmentQueueItem {
  deliveryId: string;
  businessId: string;
  status: DeliveryStatus;
  scheduledPickupTime: Date | null;
  attemptCount: number;
  createdAt: Date;
  waitingMinutes: number;
}

export interface CandidateInfo {
  riderId: string;
  distanceMeters?: number;
  score?: number;
  vehicleType?: string;
}

export interface RouteHint {
  origin: GeoPoint;
  destination: GeoPoint;
  estimatedDurationSeconds: number;
  estimatedDistanceMeters: number;
  confidence: string;
}

export interface OperatorMetrics {
  pendingAssignments: number;
  activeDeliveries: number;
  availableRiders: number;
  avgWaitTimeMinutes: number;
}

@Controller('dashboards/operator')
@UseGuards(CapabilityGuard)
@RequireCapability('dashboard.operator.read')
export class OperatorDashboardController {
  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepository: Repository<DeliveryEntity>,
    private readonly geoQueryCoordinator: GeoQueryCoordinator
  ) {}

  @Get('metrics')
  @Header('Cache-Control', 'private, max-age=15')
  async getOperatorMetrics(): Promise<OperatorMetrics> {
    const [pendingDeliveries, pendingAssignments] = await this.deliveryRepository.findAndCount({
      where: { status: DeliveryStatus.Requested },
    });

    const [, activeDeliveries] = await this.deliveryRepository.findAndCount({
      where: [
        { status: DeliveryStatus.Assigned },
        { status: DeliveryStatus.PickedUp },
        { status: DeliveryStatus.InTransit },
      ],
    });

    const now = new Date();
    let totalWaitMinutes = 0;
    for (const d of pendingDeliveries) {
      const waitMs = now.getTime() - d.createdAt.getTime();
      totalWaitMinutes += waitMs / (1000 * 60);
    }
    const avgWaitTimeMinutes = pendingAssignments > 0
      ? Math.round(totalWaitMinutes / pendingAssignments)
      : 0;

    return {
      pendingAssignments,
      activeDeliveries,
      availableRiders: 0,
      avgWaitTimeMinutes,
    };
  }

  @Get('assignment-queue')
  @Header('Cache-Control', 'private, max-age=10')
  async getAssignmentQueue(@Query() query: RawQueryParams): Promise<{
    data: AssignmentQueueItem[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : { createdAt: 'ASC' as const };

    const [entities, total] = await this.deliveryRepository.findAndCount({
      where: { status: DeliveryStatus.Requested },
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    const now = new Date();
    const data: AssignmentQueueItem[] = entities.map((e) => {
      const waitMs = now.getTime() - e.createdAt.getTime();
      return {
        deliveryId: e.id,
        businessId: e.businessId,
        status: e.status,
        scheduledPickupTime: e.scheduledPickupTime,
        attemptCount: e.attemptCount,
        createdAt: e.createdAt,
        waitingMinutes: Math.round(waitMs / (1000 * 60)),
      };
    });

    return {
      data,
      meta: createPaginationMeta(pagination, total),
    };
  }

  @Get('candidates')
  @Header('Cache-Control', 'private, max-age=15')
  async getCandidates(
    @Query('lat') latStr: string,
    @Query('lng') lngStr: string,
    @Query('radius') radiusStr?: string,
    @Query('limit') limitStr?: string
  ): Promise<CandidateInfo[]> {
    const lat = this.parseFloatOrThrow('lat', latStr);
    const lng = this.parseFloatOrThrow('lng', lngStr);
    const radius = radiusStr ? this.parseIntOrThrow('radius', radiusStr) : 3000;
    const limit = limitStr ? this.parseIntOrThrow('limit', limitStr) : 10;

    const candidates = await this.geoQueryCoordinator.findNearbyRiders({
      latitude: lat,
      longitude: lng,
      radiusMeters: radius,
      limit,
    });

    return candidates.map((c) => ({
      riderId: c.riderId,
      distanceMeters: (c as unknown as { distanceMeters?: number }).distanceMeters ?? 0,
      score: (c as unknown as { score?: number }).score ?? 0,
      vehicleType: c.vehicleType,
    }));
  }

  @Get('route-hint')
  @Header('Cache-Control', 'private, max-age=30')
  async getRouteHint(
    @Query('originLat') originLatStr: string,
    @Query('originLng') originLngStr: string,
    @Query('destLat') destLatStr: string,
    @Query('destLng') destLngStr: string
  ): Promise<RouteHint> {
    const origin: GeoPoint = {
      latitude: this.parseFloatOrThrow('originLat', originLatStr),
      longitude: this.parseFloatOrThrow('originLng', originLngStr),
    };
    const destination: GeoPoint = {
      latitude: this.parseFloatOrThrow('destLat', destLatStr),
      longitude: this.parseFloatOrThrow('destLng', destLngStr),
    };

    const eta = await this.geoQueryCoordinator.calculateETA(origin, destination);

    return {
      origin,
      destination,
      estimatedDurationSeconds: eta.durationSeconds,
      estimatedDistanceMeters: eta.distanceMeters,
      confidence: eta.confidence,
    };
  }

  @Get('deliveries/:deliveryId/candidates')
  @Header('Cache-Control', 'private, max-age=15')
  async getDeliveryCandidates(
    @Param('deliveryId') deliveryId: string,
    @Query('radius') radiusStr?: string,
    @Query('limit') limitStr?: string
  ): Promise<CandidateInfo[]> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new BadRequestException(`Delivery ${deliveryId} not found`);
    }

    const defaultLocation: GeoPoint = { latitude: -1.2921, longitude: 36.8219 };
    const radius = radiusStr ? this.parseIntOrThrow('radius', radiusStr) : 3000;
    const limit = limitStr ? this.parseIntOrThrow('limit', limitStr) : 10;

    const candidates = await this.geoQueryCoordinator.findNearbyRiders({
      latitude: defaultLocation.latitude,
      longitude: defaultLocation.longitude,
      radiusMeters: radius,
      limit,
    });

    return candidates.map((c) => ({
      riderId: c.riderId,
      distanceMeters: (c as unknown as { distanceMeters?: number }).distanceMeters ?? 0,
      score: (c as unknown as { score?: number }).score ?? 0,
      vehicleType: c.vehicleType,
    }));
  }

  private parseFloatOrThrow(name: string, value: string | undefined): number {
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException(`Missing required parameter: ${name}`);
    }
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      throw new BadRequestException(`Invalid number for parameter: ${name}`);
    }
    return parsed;
  }

  private parseIntOrThrow(name: string, value: string | undefined): number {
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException(`Missing required parameter: ${name}`);
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new BadRequestException(`Invalid integer for parameter: ${name}`);
    }
    return parsed;
  }
}
