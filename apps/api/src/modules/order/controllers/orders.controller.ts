import { RequireCapability } from '@api/core/api/decorators';
import { CapabilityGuard } from '@api/core/api/guards';
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
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';


import { CreateOrderCommand } from '../commands/create-order.command';
import { CustomerOrderOrchestrator, PlaceCustomerOrderInput } from '../coordinators/customer-order.orchestrator';
import { OrderEntity } from '../entities/order.entity';

export class CreateOrderDto {
  businessId!: string;
  itemSummary?: string;
  itemMetadata?: Record<string, unknown>;
  customerName?: string;
  customerPhone?: string;
  scheduledTime?: Date;
}

export class UpdateOrderDto {
  businessId?: string;
  itemSummary?: string;
  itemMetadata?: Record<string, unknown>;
  customerName?: string;
  customerPhone?: string;
  scheduledTime?: Date;
}

@Controller('orders')
@UseGuards(CapabilityGuard)
export class OrdersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly customerOrderOrchestrator: CustomerOrderOrchestrator,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>
  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability('order.manage')
  async create(@Body() dto: CreateOrderDto): Promise<{ id: string }> {
    const validated = CreateOrderCommand.validate(dto);
    const id = await this.commandBus.execute(new CreateOrderCommand(validated));
    return { id };
  }

  @Post('customer')
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability('order.place')
  async placeCustomerOrder(@Body() dto: PlaceCustomerOrderInput): Promise<any> {
    return this.customerOrderOrchestrator.placeOrder(dto);
  }

  @Get(':id')
  @RequireCapability('order.manage')
  async findOne(@Param('id') id: string): Promise<ReturnType<OrderEntity['toDomain']>> {
    const entity = await this.orderRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return entity.toDomain();
  }

  @Get()
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
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    const result = await this.orderRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return { deleted: true };
  }
}
