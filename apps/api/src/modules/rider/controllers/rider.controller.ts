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
import { VehicleType, LocationData } from '@zanafleet/contracts';
import { Repository } from 'typeorm';


import { CreateRiderCommand } from '../commands/create-rider.command';
import { RiderEntity } from '../entities/rider.entity';

export class CreateRiderDto {
  fullName!: string;
  nationalId!: string;
  phone!: string;
  location?: LocationData | null;
  vehicleType!: VehicleType;
  saccoId?: string | null;
  email?: string | null;
}

export class UpdateRiderDto {
  fullName?: string;
  nationalId?: string;
  phone?: string;
  location?: LocationData | null;
  vehicleType?: VehicleType;
  saccoId?: string | null;
  email?: string | null;
}

@Controller('riders')
@UseGuards(CapabilityGuard)
@RequireCapability('rider.manage')
export class RiderController {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(RiderEntity)
    private readonly riderRepository: Repository<RiderEntity>
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRiderDto): Promise<{ id: string }> {
    const validated = CreateRiderCommand.validate(dto);
    const id = await this.commandBus.execute(new CreateRiderCommand(validated));
    return { id };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ReturnType<RiderEntity['toDomain']>> {
    const entity = await this.riderRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Rider with ID "${id}" not found`);
    }
    return entity.toDomain();
  }

  @Get()
  async findAll(@Query() query: RawQueryParams): Promise<{
    data: ReturnType<RiderEntity['toDomain']>[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : undefined;

    const [entities, total] = await this.riderRepository.findAndCount({
      where: filter ,
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
    @Body() dto: UpdateRiderDto
  ): Promise<ReturnType<RiderEntity['toDomain']>> {
    const existing = await this.riderRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Rider with ID "${id}" not found`);
    }

    await this.riderRepository.update(id, dto as Partial<RiderEntity> as Record<string, unknown>);

    const updated = await this.riderRepository.findOne({ where: { id } });
    return updated!.toDomain();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    const result = await this.riderRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Rider with ID "${id}" not found`);
    }
    return { deleted: true };
  }
}
