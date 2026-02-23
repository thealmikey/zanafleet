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
import { VehicleType, LocationData } from '@zanafleet/contracts';
import { Repository } from 'typeorm';

import { CreateRiderCommand } from '../commands/create-rider.command';
import { RiderEntity } from '../entities/rider.entity';

export class CreateRiderDto {
  @ApiProperty({ description: 'Rider full name' })
  fullName!: string;

  @ApiProperty({ description: 'National ID number' })
  nationalId!: string;

  @ApiProperty({ description: 'Phone number' })
  phone!: string;

  @ApiPropertyOptional({ description: 'Current location data' })
  location?: LocationData | null;

  @ApiProperty({ enum: VehicleType, description: 'Type of vehicle' })
  vehicleType!: VehicleType;

  @ApiPropertyOptional({ description: 'Sacco ID if rider belongs to a sacco' })
  saccoId?: string | null;

  @ApiPropertyOptional({ description: 'Email address' })
  email?: string | null;
}

export class UpdateRiderDto {
  @ApiPropertyOptional({ description: 'Rider full name' })
  fullName?: string;

  @ApiPropertyOptional({ description: 'National ID number' })
  nationalId?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Current location data' })
  location?: LocationData | null;

  @ApiPropertyOptional({ enum: VehicleType, description: 'Type of vehicle' })
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ description: 'Sacco ID if rider belongs to a sacco' })
  saccoId?: string | null;

  @ApiPropertyOptional({ description: 'Email address' })
  email?: string | null;
}

@ApiTags('Riders')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'workspaceId',
  description: 'Workspace identifier for multi-tenancy',
  required: true,
})
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
  @ApiOperation({ summary: 'Create a new rider', description: 'Register a new rider in the workspace' })
  @ApiResponse({ status: 201, description: 'Rider created successfully', schema: { example: { id: 'uuid' } } })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  async create(@Body() dto: CreateRiderDto): Promise<{ id: string }> {
    const validated = CreateRiderCommand.validate(dto);
    const id = await this.commandBus.execute(new CreateRiderCommand(validated));
    return { id };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rider by ID', description: 'Retrieve a specific rider by their unique identifier' })
  @ApiResponse({ status: 200, description: 'Rider retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Rider not found' })
  @ApiParam({ name: 'id', description: 'Rider unique identifier (UUID)', type: String })
  async findOne(@Param('id') id: string): Promise<ReturnType<RiderEntity['toDomain']>> {
    const entity = await this.riderRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Rider with ID "${id}" not found`);
    }
    return entity.toDomain();
  }

  @Get()
  @ApiOperation({ summary: 'List all riders', description: 'Retrieve all riders with pagination, sorting, and filtering' })
  @ApiResponse({ status: 200, description: 'Riders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort field and order (e.g., createdAt:desc)' })
  @ApiQuery({ name: 'filter', required: false, description: 'Filter criteria as JSON' })
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
  @ApiOperation({ summary: 'Update a rider', description: 'Update an existing rider information' })
  @ApiResponse({ status: 200, description: 'Rider updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Rider not found' })
  @ApiParam({ name: 'id', description: 'Rider unique identifier (UUID)', type: String })
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
  @ApiOperation({ summary: 'Delete a rider', description: 'Remove a rider from the system' })
  @ApiResponse({ status: 200, description: 'Rider deleted successfully', schema: { example: { deleted: true } } })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Rider not found' })
  @ApiParam({ name: 'id', description: 'Rider unique identifier (UUID)', type: String })
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    const result = await this.riderRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Rider with ID "${id}" not found`);
    }
    return { deleted: true };
  }
}
