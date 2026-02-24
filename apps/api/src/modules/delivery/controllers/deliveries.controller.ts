import { RequireCapability } from '@api/core/api/decorators';
import { CapabilityGuard, PolicyGuard } from '@api/core/api/guards';
import { parseQueryParams, createPaginationMeta, RawQueryParams } from '@api/core/api/utils';
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
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

import { DeliveryExecutionCoordinator } from '../coordinators/delivery-execution.coordinator';
import { DeliveryLifecycleCoordinator } from '../coordinators/delivery-lifecycle.coordinator';
import { DeliveryMatchingCoordinator } from '../coordinators/delivery-matching.coordinator';
import {
  DeliveryRequestCoordinator,
  LocationPinInput,
} from '../coordinators/delivery-request.coordinator';
import { DeliveryEntity } from '../entities/delivery.entity';

export class CreateDeliveryDto {
  @ApiProperty({ description: 'Business ID' })
  businessId!: string;

  @ApiProperty({ description: 'Workspace ID' })
  workspaceId!: string;

  @ApiProperty({ description: 'Actor ID' })
  actorId!: string;

  @ApiPropertyOptional({ description: 'Pickup location ID' })
  pickupLocationId?: string;

  @ApiPropertyOptional({ description: 'Dropoff location ID' })
  dropoffLocationId?: string;

  @ApiPropertyOptional({ description: 'Whether this is a scheduled delivery', type: Boolean })
  isScheduled?: boolean;

  @ApiPropertyOptional({ description: 'Scheduled pickup time', type: Date })
  scheduledPickupTime?: Date;

  @ApiPropertyOptional({ description: 'Scheduled dropoff time', type: Date })
  scheduledDropoffTime?: Date;

  @ApiPropertyOptional({ description: 'Distance in kilometers', type: Number })
  distanceKm?: number;
}

export class RequestDeliveryDto {
  @ApiProperty({ description: 'Business ID' })
  businessId!: string;

  @ApiProperty({ description: 'Workspace ID' })
  workspaceId!: string;

  @ApiProperty({ description: 'Actor ID' })
  actorId!: string;

  @ApiProperty({ description: 'Pickup location' })
  pickup!: LocationPinInput;

  @ApiProperty({ description: 'Dropoff location' })
  dropoff!: LocationPinInput;

  @ApiProperty({ description: 'Recipient name' })
  recipientName!: string;

  @ApiProperty({ description: 'Recipient phone number' })
  recipientPhone!: string;

  @ApiPropertyOptional({ description: 'Item ID' })
  itemId?: string;

  @ApiPropertyOptional({ description: 'Item description' })
  itemDescription?: string;

  @ApiPropertyOptional({ description: 'Scheduled pickup time', type: Date })
  scheduledPickupTime?: Date;

  @ApiPropertyOptional({ description: 'Declared item value', type: Number })
  declaredItemValue?: number;

  @ApiPropertyOptional({ description: 'Special instructions' })
  specialInstructions?: string;

  @ApiPropertyOptional({ description: 'Distance in kilometers', type: Number })
  distanceKm?: number;
}

export class UpdateDeliveryDto {
  @ApiPropertyOptional({ description: 'Assigned rider ID' })
  assignedRiderId?: string;

  @ApiPropertyOptional({ enum: DeliveryStatus, description: 'Delivery status' })
  status?: DeliveryStatus;

  @ApiPropertyOptional({ description: 'Scheduled pickup time', type: Date })
  scheduledPickupTime?: Date;

  @ApiPropertyOptional({ description: 'Scheduled dropoff time', type: Date })
  scheduledDropoffTime?: Date;
}

export class AssignRiderDto {}

export class PickupDto {
  @ApiProperty({ description: 'Rider ID' })
  riderId!: string;

  @ApiPropertyOptional({ description: 'Proof data including photo, signature, notes' })
  proofData?: {
    photoUrl?: string;
    signature?: string;
    notes?: string;
  };
}

export class DropoffDto {
  @ApiProperty({ description: 'Rider ID' })
  riderId!: string;

  @ApiPropertyOptional({ description: 'Proof data including photo, signature, recipient name' })
  proofData?: {
    photoUrl?: string;
    signature?: string;
    recipientName?: string;
  };
}

export class TransitionDto {
  @ApiProperty({ enum: DeliveryStatus, description: 'Target delivery status' })
  targetState!: DeliveryStatus;

  @ApiPropertyOptional({ description: 'User who triggered the transition' })
  triggeredBy?: string;
}

@ApiTags('Deliveries')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'workspaceId',
  description: 'Workspace identifier for multi-tenancy',
  required: true,
})
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
    private readonly requestCoordinator: DeliveryRequestCoordinator
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new delivery',
    description: 'Create a new delivery in the system',
  })
  @ApiResponse({
    status: 201,
    description: 'Delivery created successfully',
    schema: { example: { id: 'uuid', estimatedCharges: 500 } },
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  async create(@Body() dto: CreateDeliveryDto): Promise<{ id: string; estimatedCharges: number }> {
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
  @ApiOperation({
    summary: 'Request a new delivery',
    description: 'Request a delivery with pickup and dropoff locations',
  })
  @ApiResponse({ status: 201, description: 'Delivery requested successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  async request(@Body() dto: RequestDeliveryDto): Promise<{
    deliveryId: string;
    orderId: string;
    estimatedCharges: number;
    assignedRiderId: string | null;
  }> {
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
  @ApiOperation({
    summary: 'Get delivery by ID',
    description: 'Retrieve a specific delivery by its unique identifier',
  })
  @ApiResponse({ status: 200, description: 'Delivery retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  @ApiParam({ name: 'id', description: 'Delivery unique identifier (UUID)', type: String })
  async findOne(@Param('id') id: string): Promise<ReturnType<DeliveryEntity['toDomain']>> {
    const entity = await this.deliveryRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Delivery with ID "${id}" not found`);
    }
    return entity.toDomain();
  }

  @Get()
  @ApiOperation({
    summary: 'List all deliveries',
    description: 'Retrieve all deliveries with pagination, sorting, and filtering',
  })
  @ApiResponse({ status: 200, description: 'Deliveries retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort field and order (e.g., createdAt:desc)',
  })
  @ApiQuery({ name: 'filter', required: false, description: 'Filter criteria as JSON' })
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
  @ApiOperation({
    summary: 'Update a delivery',
    description: 'Update an existing delivery information',
  })
  @ApiResponse({ status: 200, description: 'Delivery updated successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  @ApiParam({ name: 'id', description: 'Delivery unique identifier (UUID)', type: String })
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
  @ApiOperation({ summary: 'Delete a delivery', description: 'Remove a delivery from the system' })
  @ApiResponse({
    status: 200,
    description: 'Delivery deleted successfully',
    schema: { example: { deleted: true } },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  @ApiParam({ name: 'id', description: 'Delivery unique identifier (UUID)', type: String })
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    const result = await this.deliveryRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Delivery with ID "${id}" not found`);
    }
    return { deleted: true };
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assign rider to delivery',
    description: 'Automatically find and assign a rider to the delivery',
  })
  @ApiResponse({ status: 200, description: 'Rider assigned successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  @ApiParam({ name: 'id', description: 'Delivery unique identifier (UUID)', type: String })
  async assignRider(@Param('id') id: string): Promise<unknown> {
    const result = await this.matchingCoordinator.findAndAssignRider(id);
    return result;
  }

  @Post(':id/pickup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm pickup',
    description: 'Confirm that the rider has picked up the delivery',
  })
  @ApiResponse({ status: 200, description: 'Pickup confirmed successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  @ApiParam({ name: 'id', description: 'Delivery unique identifier (UUID)', type: String })
  async confirmPickup(@Param('id') id: string, @Body() dto: PickupDto): Promise<unknown> {
    const result = await this.executionCoordinator.confirmPickup(id, dto.riderId, dto.proofData);
    return result;
  }

  @Post(':id/dropoff')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm dropoff',
    description: 'Confirm that the rider has delivered the package',
  })
  @ApiResponse({ status: 200, description: 'Dropoff confirmed successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  @ApiParam({ name: 'id', description: 'Delivery unique identifier (UUID)', type: String })
  async confirmDropoff(@Param('id') id: string, @Body() dto: DropoffDto): Promise<unknown> {
    const result = await this.executionCoordinator.confirmDropoff(id, dto.riderId, dto.proofData);
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
  @ApiOperation({
    summary: 'Transition delivery state',
    description: 'Transition delivery to a new state with policy validation',
  })
  @ApiResponse({ status: 200, description: 'State transition successful' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Missing required capability or policy violation',
  })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  @ApiParam({ name: 'id', description: 'Delivery unique identifier (UUID)', type: String })
  async transitionState(@Param('id') id: string, @Body() dto: TransitionDto): Promise<unknown> {
    const result = await this.lifecycleCoordinator.transitionState(
      id,
      dto.targetState,
      dto.triggeredBy
    );
    return result;
  }
}
