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
import { BusinessType, LocationData } from '@zanafleet/contracts';
import { Repository } from 'typeorm';

import { RequireCapability } from '@api/core/api/decorators';
import { CapabilityGuard } from '@api/core/api/guards';
import {
  parseQueryParams,
  createPaginationMeta,
  RawQueryParams,
} from '@api/core/api/utils';

import { CreateBusinessCommand } from '../commands/create-business.command';
import { BusinessEntity } from '../entities/business.entity';

const UUID_V4_ROUTE_SEGMENT =
  ':id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})';

export class CreateBusinessDto {
  @ApiProperty({ description: 'Business name' })
  businessName!: string;

  @ApiProperty({ description: 'Business phone number' })
  phone!: string;

  @ApiProperty({ description: 'Business location data' })
  location!: LocationData;

  @ApiProperty({ enum: BusinessType, description: 'Type of business' })
  businessType!: BusinessType;

  @ApiPropertyOptional({ description: 'Business email address' })
  email?: string | null;
}

export class UpdateBusinessDto {
  @ApiPropertyOptional({ description: 'Business name' })
  businessName?: string;

  @ApiPropertyOptional({ description: 'Business phone number' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Business location data' })
  location?: LocationData;

  @ApiPropertyOptional({ enum: BusinessType, description: 'Type of business' })
  businessType?: BusinessType;

  @ApiPropertyOptional({ description: 'Business email address' })
  email?: string | null;
}

@ApiTags('Businesses')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'workspaceId',
  description: 'Workspace identifier for multi-tenancy',
  required: true,
})
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
  @ApiOperation({ summary: 'Create a new business', description: 'Create a new business entity within the workspace' })
  @ApiResponse({ status: 201, description: 'Business created successfully', schema: { example: { id: 'uuid' } } })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  async create(@Body() dto: CreateBusinessDto): Promise<{ id: string }> {
    const validated = CreateBusinessCommand.validate(dto);
    const id = await this.commandBus.execute(new CreateBusinessCommand(validated));
    return { id };
  }

  @Get(UUID_V4_ROUTE_SEGMENT)
  @ApiOperation({ summary: 'Get business by ID', description: 'Retrieve a specific business by its unique identifier' })
  @ApiResponse({ status: 200, description: 'Business retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  @ApiParam({ name: 'id', description: 'Business unique identifier (UUID)', type: String })
  async findOne(@Param('id') id: string): Promise<ReturnType<BusinessEntity['toDomain']>> {
    const entity = await this.businessRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Business with ID "${id}" not found`);
    }
    return entity.toDomain();
  }

  @Get()
  @ApiOperation({ summary: 'List all businesses', description: 'Retrieve all businesses with pagination, sorting, and filtering' })
  @ApiResponse({ status: 200, description: 'Businesses retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort field and order (e.g., createdAt:desc)' })
  @ApiQuery({ name: 'filter', required: false, description: 'Filter criteria as JSON' })
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

  @Patch(UUID_V4_ROUTE_SEGMENT)
  @ApiOperation({ summary: 'Update a business', description: 'Update an existing business entity' })
  @ApiResponse({ status: 200, description: 'Business updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  @ApiParam({ name: 'id', description: 'Business unique identifier (UUID)', type: String })
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

  @Delete(UUID_V4_ROUTE_SEGMENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a business', description: 'Delete an existing business entity' })
  @ApiResponse({ status: 200, description: 'Business deleted successfully', schema: { example: { deleted: true } } })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  @ApiParam({ name: 'id', description: 'Business unique identifier (UUID)', type: String })
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    const result = await this.businessRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Business with ID "${id}" not found`);
    }
    return { deleted: true };
  }
}
