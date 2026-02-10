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

import { CapabilityGuard } from '@api/core/api/guards';
import { RequireCapability } from '@api/core/api/decorators';
import {
  parseQueryParams,
  createPaginationMeta,
  RawQueryParams,
} from '@api/core/api/utils';

import { CreateActorCommand } from '../commands/create-actor.command';
import { ActorEntity } from '../entities/actor.entity';
import { ActorType } from '../dto/actor.enums';

export class CreateActorDto {
  email!: string;
  username!: string;
  type!: ActorType;
  passwordHash?: string;
  location?: string | null;
  roles?: string[];
  linkedWallets?: string[];
  workspaceId?: string | null;
}

export class UpdateActorDto {
  email?: string;
  username?: string;
  type?: ActorType;
  passwordHash?: string;
  location?: string | null;
  roles?: string[];
  linkedWallets?: string[];
  workspaceId?: string | null;
}

@Controller('actors')
@UseGuards(CapabilityGuard)
@RequireCapability('actor.manage')
export class ActorController {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateActorDto): Promise<{ id: string }> {
    const validated = CreateActorCommand.validate(dto);
    const id = await this.commandBus.execute(new CreateActorCommand(validated));
    return { id };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ReturnType<ActorEntity['toDomain']>> {
    const entity = await this.actorRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Actor with ID "${id}" not found`);
    }
    return entity.toDomain();
  }

  @Get()
  async findAll(@Query() query: RawQueryParams): Promise<{
    data: ReturnType<ActorEntity['toDomain']>[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : undefined;

    const [entities, total] = await this.actorRepository.findAndCount({
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
    @Body() dto: UpdateActorDto
  ): Promise<ReturnType<ActorEntity['toDomain']>> {
    const existing = await this.actorRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Actor with ID "${id}" not found`);
    }

    await this.actorRepository.update(id, dto);

    const updated = await this.actorRepository.findOne({ where: { id } });
    return updated!.toDomain();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    const result = await this.actorRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Actor with ID "${id}" not found`);
    }
    return { deleted: true };
  }
}
