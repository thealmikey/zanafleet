import { RequireCapability } from '@api/core/api/decorators';
import { CapabilityGuard, PolicyGuard } from '@api/core/api/guards';
import {
  parseQueryParams,
  createPaginationMeta,
  RawQueryParams,
} from '@api/core/api/utils';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeliveryStatus, PolicyTrigger } from '@zanafleet/contracts';
import { Repository } from 'typeorm';


import { DeliveryExecutionCoordinator } from '../coordinators/delivery-execution.coordinator';
import { DeliveryLifecycleCoordinator } from '../coordinators/delivery-lifecycle.coordinator';
import { DeliveryMatchingCoordinator } from '../coordinators/delivery-matching.coordinator';
import { DeliveryRequestCoordinator, LocationPinInput } from '../coordinators/delivery-request.coordinator';
import { DeliveryEntity } from '../entities/delivery.entity';

export class CreateDeliveryDto {
  businessId!: string;
  workspaceId!: string;
  actorId!: string;
  pickupLocationId?: string;
  dropoffLocationId?: string;
  isScheduled?: boolean;
  scheduledPickupTime?: Date;
  scheduledDropoffTime?: Date;
  distanceKm?: number;
}

export class RequestDeliveryDto {
  businessId!: string;
  workspaceId!: string;
  actorId!: string;
  pickup!: LocationPinInput;
  dropoff!: LocationPinInput;
  recipientName!: string;
  recipientPhone!: string;
  itemId?: string;
  itemDescription?: string;
  scheduledPickupTime?: Date;
  declaredItemValue?: number;
  specialInstructions?: string;
  distanceKm?: number;
}



export class UpdateDeliveryDto {
  assignedRiderId?: string;
  status?: DeliveryStatus;
  scheduledPickupTime?: Date;
  scheduledDropoffTime?: Date;
}

export class AssignRiderDto { }

export class PickupDto {
  riderId!: string;
  proofData?: {
    photoUrl?: string;
    signature?: string;
    notes?: string;
  };
}

export class DropoffDto {
  riderId!: string;
  proofData?: {
    photoUrl?: string;
    signature?: string;
    recipientName?: string;
  };
}

export class TransitionDto {
  targetState!: DeliveryStatus;
  triggeredBy?: string;
}

@Controller('deliveries')
@UseGuards(CapabilityGuard)
@RequireCapability('delivery.manage')
export class DeliveriesController {
  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepository: Repository<DeliveryEntity>,
    private readonly lifecycleCoordinator: DeliveryLifecycleCoordinator,
    private readonly matchingCoordinator: DeliveryMatchingCoordinator,
    private readonly executionCoordinator: DeliveryExecutionCoordinator,
    private readonly requestCoordinator: DeliveryRequestCoordinator,

  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateDeliveryDto
  ): Promise<{ id: string; estimatedCharges: number }> {
    const result = await this.lifecycleCoordinator.createDelivery({
      businessId: dto.businessId,
      workspaceId: dto.workspaceId,
      actorId: dto.actorId,
      pickupLocationId: dto.pickupLocationId,
      dropoffLocationId: dto.dropoffLocationId,
      isScheduled: dto.isScheduled,
      scheduledPickupTime: dto.scheduledPickupTime,
      scheduledDropoffTime: dto.scheduledDropoffTime,
      distanceKm: dto.distanceKm,
    });
    return { id: result.deliveryId, estimatedCharges: result.estimatedCharges };
  }

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async request(
    @Body() dto: RequestDeliveryDto
  ): Promise<{ deliveryId: string; orderId: string; estimatedCharges: number; assignedRiderId: string | null }> {
    const result = await this.requestCoordinator.requestDelivery({
      businessId: dto.businessId,
      workspaceId: dto.workspaceId,
      actorId: dto.actorId,
      pickup: dto.pickup,
      dropoff: dto.dropoff,
      recipientName: dto.recipientName,
      recipientPhone: dto.recipientPhone,
      itemId: dto.itemId,
      itemDescription: dto.itemDescription,
      scheduledPickupTime: dto.scheduledPickupTime,
      declaredItemValue: dto.declaredItemValue,
      specialInstructions: dto.specialInstructions,
      distanceKm: dto.distanceKm,
    });
    return {
      deliveryId: result.deliveryId,
      orderId: result.orderId,
      estimatedCharges: result.estimatedCharges,
      assignedRiderId: result.assignedRiderId,
    };
  }



  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ReturnType<DeliveryEntity['toDomain']>> {
    const entity = await this.deliveryRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Delivery with ID "${id}" not found`);
    }
    return entity.toDomain();
  }

  @Get()
  async findAll(@Query() query: RawQueryParams): Promise<{
    data: ReturnType<DeliveryEntity['toDomain']>[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : undefined;

    const [entities, total] = await this.deliveryRepository.findAndCount({
      where: filter,
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    return {
      data: entities.map((e) => e.toDomain()),
      meta: createPaginationMeta(pagination, total),
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryDto
  ): Promise<ReturnType<DeliveryEntity['toDomain']>> {
    const existing = await this.deliveryRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Delivery with ID "${id}" not found`);
    }

    await this.deliveryRepository.update(id, dto as Record<string, unknown>);

    const updated = await this.deliveryRepository.findOne({ where: { id } });
    return updated!.toDomain();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    const result = await this.deliveryRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Delivery with ID "${id}" not found`);
    }
    return { deleted: true };
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  async assignRider(@Param('id') id: string): Promise<unknown> {
    const result = await this.matchingCoordinator.findAndAssignRider(id);
    return result;
  }

  @Post(':id/pickup')
  @HttpCode(HttpStatus.OK)
  async confirmPickup(
    @Param('id') id: string,
    @Body() dto: PickupDto
  ): Promise<unknown> {
    const result = await this.executionCoordinator.confirmPickup(
      id,
      dto.riderId,
      dto.proofData
    );
    return result;
  }

  @Post(':id/dropoff')
  @HttpCode(HttpStatus.OK)
  async confirmDropoff(
    @Param('id') id: string,
    @Body() dto: DropoffDto
  ): Promise<unknown> {
    const result = await this.executionCoordinator.confirmDropoff(
      id,
      dto.riderId,
      dto.proofData
    );
    return result;
  }

  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
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
  async transitionState(
    @Param('id') id: string,
    @Body() dto: TransitionDto
  ): Promise<unknown> {
    const result = await this.lifecycleCoordinator.transitionState(
      id,
      dto.targetState,
      dto.triggeredBy
    );
    return result;
  }
}
