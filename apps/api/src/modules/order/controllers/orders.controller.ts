import { RequireCapability } from '@api/core/api/decorators';
import { CapabilityGuard } from '@api/core/api/guards';
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
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
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

import { CreateOrderCommand } from '../commands/create-order.command';
import {
  CustomerOrderOrchestrator,
  PlaceCustomerOrderInput,
} from '../coordinators/customer-order.orchestrator';
import { OrderEntity } from '../entities/order.entity';

export class CreateOrderDto {
  @ApiProperty({ description: 'Business ID' })
  businessId!: string;

  @ApiPropertyOptional({ description: 'Summary of items in the order' })
  itemSummary?: string;

  @ApiPropertyOptional({ description: 'Additional metadata for the order items' })
  itemMetadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Customer name' })
  customerName?: string;

  @ApiPropertyOptional({ description: 'Customer phone number' })
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Scheduled delivery time', type: Date })
  scheduledTime?: Date;
}

export class UpdateOrderDto {
  @ApiPropertyOptional({ description: 'Business ID' })
  businessId?: string;

  @ApiPropertyOptional({ description: 'Summary of items in the order' })
  itemSummary?: string;

  @ApiPropertyOptional({ description: 'Additional metadata for the order items' })
  itemMetadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Customer name' })
  customerName?: string;

  @ApiPropertyOptional({ description: 'Customer phone number' })
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Scheduled delivery time', type: Date })
  scheduledTime?: Date;
}

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'workspaceId',
  description: 'Workspace identifier for multi-tenancy',
  required: true,
})
@Controller('orders')
@UseGuards(CapabilityGuard)
export class OrdersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly customerOrderOrchestrator: CustomerOrderOrchestrator,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability('order.manage')
  @ApiOperation({ summary: 'Create a new order', description: 'Create a new order in the system' })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    schema: { example: { id: 'uuid' } },
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  async create(@Body() dto: CreateOrderDto): Promise<{ id: string }> {
    const validated = CreateOrderCommand.validate(dto);
    const id = await this.commandBus.execute(new CreateOrderCommand(validated));
    return { id };
  }

  @Post('customer')
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability('order.place')
  @ApiOperation({
    summary: 'Place customer order',
    description: 'Place an order on behalf of a customer',
  })
  @ApiResponse({ status: 201, description: 'Customer order placed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  async placeCustomerOrder(@Body() dto: PlaceCustomerOrderInput): Promise<any> {
    return this.customerOrderOrchestrator.placeOrder(dto);
  }

  @Get(':id')
  @RequireCapability('order.manage')
  @ApiOperation({
    summary: 'Get order by ID',
    description: 'Retrieve a specific order by its unique identifier',
  })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiParam({ name: 'id', description: 'Order unique identifier (UUID)', type: String })
  async findOne(@Param('id') id: string): Promise<ReturnType<OrderEntity['toDomain']>> {
    const entity = await this.orderRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return entity.toDomain();
  }

  @Get()
  @ApiOperation({
    summary: 'List all orders',
    description: 'Retrieve all orders with pagination, sorting, filtering, and search',
  })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
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
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for customer name, phone, or item summary',
  })
  async findAll(@Query() query: RawQueryParams): Promise<{
    data: ReturnType<OrderEntity['toDomain']>[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : undefined;

    // Handle search parameter
    const search = query.search as string;
    let where: any = filter;

    if (search) {
      where = [
        { ...filter, customerName: ILike(`%${search}%`) },
        { ...filter, customerPhone: ILike(`%${search}%`) },
        { ...filter, itemSummary: ILike(`%${search}%`) },
      ];
    }

    const [entities, total] = await this.orderRepository.findAndCount({
      where,
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
  @RequireCapability('order.manage')
  @ApiOperation({ summary: 'Update an order', description: 'Update an existing order information' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiParam({ name: 'id', description: 'Order unique identifier (UUID)', type: String })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto
  ): Promise<ReturnType<OrderEntity['toDomain']>> {
    const existing = await this.orderRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    await this.orderRepository.update(id, dto as Record<string, unknown>);

    const updated = await this.orderRepository.findOne({ where: { id } });
    return updated!.toDomain();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequireCapability('order.manage')
  @ApiOperation({ summary: 'Delete an order', description: 'Remove an order from the system' })
  @ApiResponse({
    status: 200,
    description: 'Order deleted successfully',
    schema: { example: { deleted: true } },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiParam({ name: 'id', description: 'Order unique identifier (UUID)', type: String })
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    const result = await this.orderRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return { deleted: true };
  }
}
