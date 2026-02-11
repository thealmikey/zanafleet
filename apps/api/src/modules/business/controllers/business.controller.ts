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
import { BusinessType, LocationData } from '@zanafleet/contracts';
import { Repository } from 'typeorm';


import { CreateBusinessCommand } from '../commands/create-business.command';
import { BusinessEntity } from '../entities/business.entity';

export class CreateBusinessDto {
  businessName!: string;
  phone!: string;
  location!: LocationData;
  businessType!: BusinessType;
  email?: string | null;
}

export class UpdateBusinessDto {
  businessName?: string;
  phone?: string;
  location?: LocationData;
  businessType?: BusinessType;
  email?: string | null;
}

@Controller('businesses')
@UseGuards(CapabilityGuard)
@RequireCapability('business.manage')
export class BusinessController {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(BusinessEntity)
    private readonly businessRepository: Repository<BusinessEntity>
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBusinessDto): Promise<{ id: string }> {
    const validated = CreateBusinessCommand.validate(dto);
    const id = await this.commandBus.execute(new CreateBusinessCommand(validated));
    return { id };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ReturnType<BusinessEntity['toDomain']>> {
    const entity = await this.businessRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Business with ID "${id}" not found`);
    }
    return entity.toDomain();
  }

  @Get()
  async findAll(@Query() query: RawQueryParams): Promise<{
    data: ReturnType<BusinessEntity['toDomain']>[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : undefined;

    const [entities, total] = await this.businessRepository.findAndCount({
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
    @Body() dto: UpdateBusinessDto
  ): Promise<ReturnType<BusinessEntity['toDomain']>> {
    const existing = await this.businessRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Business with ID "${id}" not found`);
    }

    await this.businessRepository.update(id, dto);

    const updated = await this.businessRepository.findOne({ where: { id } });
    return updated!.toDomain();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    const result = await this.businessRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Business with ID "${id}" not found`);
    }
    return { deleted: true };
  }
}
