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
import { Repository } from 'typeorm';
import { LocationData } from '@zanafleet/contracts';

import { CapabilityGuard } from '@api/core/api/guards';
import { RequireCapability } from '@api/core/api/decorators';
import {
  parseQueryParams,
  createPaginationMeta,
  RawQueryParams,
} from '@api/core/api/utils';

import { CreateSaccoCommand } from '../commands/create-sacco.command';
import { SaccoEntity } from '../entities/sacco.entity';

export class CreateSaccoDto {
  name!: string;
  location!: LocationData;
  contactPhone!: string;
}

export class UpdateSaccoDto {
  name?: string;
  location?: LocationData;
  contactPhone?: string;
}

@Controller('saccos')
@UseGuards(CapabilityGuard)
@RequireCapability('sacco.manage')
export class SaccoController {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(SaccoEntity)
    private readonly saccoRepository: Repository<SaccoEntity>
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSaccoDto): Promise<{ id: string }> {
    const validated = CreateSaccoCommand.validate(dto);
    const id = await this.commandBus.execute(new CreateSaccoCommand(validated));
    return { id };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ReturnType<SaccoEntity['toDomain']>> {
    const entity = await this.saccoRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Sacco with ID "${id}" not found`);
    }
    return entity.toDomain();
  }

  @Get()
  async findAll(@Query() query: RawQueryParams): Promise<{
    data: ReturnType<SaccoEntity['toDomain']>[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : undefined;

    const [entities, total] = await this.saccoRepository.findAndCount({
      where: filter as Record<string, unknown>,
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
    @Body() dto: UpdateSaccoDto
  ): Promise<ReturnType<SaccoEntity['toDomain']>> {
    const existing = await this.saccoRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Sacco with ID "${id}" not found`);
    }

    await this.saccoRepository.update(id, dto);

    const updated = await this.saccoRepository.findOne({ where: { id } });
    return updated!.toDomain();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    const result = await this.saccoRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Sacco with ID "${id}" not found`);
    }
    return { deleted: true };
  }
}
