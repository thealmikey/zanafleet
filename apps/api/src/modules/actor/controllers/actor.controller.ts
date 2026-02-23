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

import { CreateActorCommand } from '../commands/create-actor.command';
import { ActorType } from '../dto/actor.enums';
import { ActorEntity } from '../entities/actor.entity';

export class CreateActorDto {
  @ApiProperty({ description: 'Actor email address' })
  email!: string;

  @ApiProperty({ description: 'Actor username' })
  username!: string;

  @ApiProperty({ enum: ActorType, description: 'Type of actor' })
  type!: ActorType;

  @ApiPropertyOptional({ description: 'Password hash (for local auth)' })
  passwordHash?: string;

  @ApiPropertyOptional({ description: 'Location data' })
  location?: string | null;

  @ApiPropertyOptional({ description: 'Roles assigned to this actor', type: [String] })
  roles?: string[];

  @ApiPropertyOptional({ description: 'Linked wallet IDs', type: [String] })
  linkedWallets?: string[];

  @ApiPropertyOptional({ description: 'Workspace ID' })
  workspaceId?: string | null;
}

export class UpdateActorDto {
  @ApiPropertyOptional({ description: 'Actor email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Actor username' })
  username?: string;

  @ApiPropertyOptional({ enum: ActorType, description: 'Type of actor' })
  type?: ActorType;

  @ApiPropertyOptional({ description: 'Password hash (for local auth)' })
  passwordHash?: string;

  @ApiPropertyOptional({ description: 'Location data' })
  location?: string | null;

  @ApiPropertyOptional({ description: 'Roles assigned to this actor', type: [String] })
  roles?: string[];

  @ApiPropertyOptional({ description: 'Linked wallet IDs', type: [String] })
  linkedWallets?: string[];

  @ApiPropertyOptional({ description: 'Workspace ID' })
  workspaceId?: string | null;
}

@ApiTags('Actors')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'workspaceId',
  description: 'Workspace identifier for multi-tenancy',
  required: true,
})
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
  @ApiOperation({ summary: 'Create a new actor', description: 'Create a new actor/user in the system' })
  @ApiResponse({ status: 201, description: 'Actor created successfully', schema: { example: { id: 'uuid' } } })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  async create(@Body() dto: CreateActorDto): Promise<{ id: string }> {
    const validated = CreateActorCommand.validate(dto);
    const id = await this.commandBus.execute(new CreateActorCommand(validated));
    return { id };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get actor by ID', description: 'Retrieve a specific actor by their unique identifier' })
  @ApiResponse({ status: 200, description: 'Actor retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Actor not found' })
  @ApiParam({ name: 'id', description: 'Actor unique identifier (UUID)', type: String })
  async findOne(@Param('id') id: string): Promise<ReturnType<ActorEntity['toDomain']>> {
    const entity = await this.actorRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Actor with ID "${id}" not found`);
    }
    return entity.toDomain();
  }

  @Get()
  @ApiOperation({ summary: 'List all actors', description: 'Retrieve all actors with pagination, sorting, and filtering' })
  @ApiResponse({ status: 200, description: 'Actors retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort field and order (e.g., createdAt:desc)' })
  @ApiQuery({ name: 'filter', required: false, description: 'Filter criteria as JSON' })
  async findAll(@Query() query: RawQueryParams): Promise<{
    data: ReturnType<ActorEntity['toDomain']>[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : undefined;

    const [entities, total] = await this.actorRepository.findAndCount({
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
  @ApiOperation({ summary: 'Update an actor', description: 'Update an existing actor information' })
  @ApiResponse({ status: 200, description: 'Actor updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Actor not found' })
  @ApiParam({ name: 'id', description: 'Actor unique identifier (UUID)', type: String })
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
  @ApiOperation({ summary: 'Delete an actor', description: 'Remove an actor from the system' })
  @ApiResponse({ status: 200, description: 'Actor deleted successfully', schema: { example: { deleted: true } } })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Actor not found' })
  @ApiParam({ name: 'id', description: 'Actor unique identifier (UUID)', type: String })
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    const result = await this.actorRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Actor with ID "${id}" not found`);
    }
    return { deleted: true };
  }
}
