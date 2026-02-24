/**
 * JobType Controller
 *
 * REST endpoints for JobType CRUD operations
 */

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
  Headers,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RequireCapability } from '@api/core/api/decorators';
import { CapabilityGuard } from '@api/core/api/guards';
import {
  parseQueryParams,
  createPaginationMeta,
  RawQueryParams,
} from '@api/core/api/utils';

import { CreateJobTypeCommand } from '../commands/create-job-type.command';
import { UpdateJobTypeCommand } from '../commands/update-job-type.command';
import { JobTypeEntity } from '../entities/job-type.entity';
import { Vertical, JobTypeStatus } from '../dto/job-type.enums';

const UUID_V4_ROUTE_SEGMENT = ':id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})';

/**
 * Create JobType DTO
 */
class CreateJobTypeDto {
  name!: string;
  description?: string | null;
  vertical!: Vertical;
  workflowDefinitionId?: string | null;
  supportsMultipleWorkers?: boolean;
  supportsMultipleDestinations?: boolean;
  workerConfigs?: Array<{
    workerType: string;
    minWorkers: number;
    maxWorkers?: number;
    required?: boolean;
    qualifications?: Record<string, unknown>;
  }>;
  metadataFields?: Array<{
    fieldKey: string;
    displayName: string;
    description?: string;
    fieldType?: string;
    required?: boolean;
    isCustomerEditable?: boolean;
    validationRules?: Record<string, unknown>;
    displayOrder?: number;
    uiConfig?: Record<string, unknown>;
  }>;
}

/**
 * Update JobType DTO
 */
class UpdateJobTypeDto {
  name?: string;
  description?: string | null;
  vertical?: Vertical;
  status?: JobTypeStatus;
  workflowDefinitionId?: string | null;
  supportsMultipleWorkers?: boolean;
  supportsMultipleDestinations?: boolean;
  workerConfigs?: Array<{
    workerType: string;
    minWorkers: number;
    maxWorkers?: number;
    required?: boolean;
    qualifications?: Record<string, unknown>;
  }>;
  metadataFields?: Array<{
    fieldKey: string;
    displayName: string;
    description?: string;
    fieldType?: string;
    required?: boolean;
    isCustomerEditable?: boolean;
    validationRules?: Record<string, unknown>;
    displayOrder?: number;
    uiConfig?: Record<string, unknown>;
  }>;
}

@ApiTags('Job Types')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'workspaceId',
  description: 'Workspace identifier for multi-tenancy',
  required: true,
})
@Controller('job-types')
@UseGuards(CapabilityGuard)
export class JobTypeController {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(JobTypeEntity)
    private readonly jobTypeRepository: Repository<JobTypeEntity>
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new job type', description: 'Create a new job type entity within the workspace' })
  @ApiResponse({ status: 201, description: 'Job type created successfully', schema: { example: { id: 'uuid' } } })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @RequireCapability('jobtype.manage')
  async create(
    @Body() dto: CreateJobTypeDto,
    @Headers('workspaceId') workspaceId: string
  ): Promise<{ id: string }> {
    const validated = CreateJobTypeCommand.validate({
      ...dto,
      workspaceId,
      workerConfigs: dto.workerConfigs ?? [],
      metadataFields: dto.metadataFields ?? [],
    });
    const id = await this.commandBus.execute(new CreateJobTypeCommand(validated));
    return { id };
  }

  @Get(UUID_V4_ROUTE_SEGMENT)
  @ApiOperation({ summary: 'Get job type by ID' })
  @ApiResponse({ status: 200, description: 'Job type retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Job type not found' })
  @ApiParam({ name: 'id', description: 'Job type unique identifier (UUID)', type: String })
  async findOne(
    @Param('id') id: string,
    @Headers('workspaceId') workspaceId: string
  ): Promise<ReturnType<JobTypeEntity['toDomain']>> {
    const entity = await this.jobTypeRepository.findOne({
      where: { id, workspaceId },
      relations: ['workerConfigs', 'metadataFields'],
    });
    if (!entity) {
      throw new NotFoundException(`JobType with ID "${id}" not found`);
    }
    return entity.toDomain();
  }

  @Get()
  @ApiOperation({ summary: 'List all job types', description: 'Retrieve all job types with pagination' })
  @ApiResponse({ status: 200, description: 'Job types retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort field and order' })
  @ApiQuery({ name: 'filter', required: false, description: 'Filter criteria as JSON' })
  async findAll(
    @Query() query: RawQueryParams,
    @Headers('workspaceId') workspaceId: string
  ): Promise<{
    data: ReturnType<JobTypeEntity['toDomain']>[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : undefined;

    const [entities, total] = await this.jobTypeRepository.findAndCount({
      where: { workspaceId, ...filter },
      relations: ['workerConfigs', 'metadataFields'],
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
  @ApiOperation({ summary: 'Update a job type' })
  @ApiResponse({ status: 200, description: 'Job type updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Job type not found' })
  @ApiParam({ name: 'id', description: 'Job type unique identifier (UUID)', type: String })
  @RequireCapability('jobtype.manage')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateJobTypeDto,
    @Headers('workspaceId') workspaceId: string
  ): Promise<ReturnType<JobTypeEntity['toDomain']>> {
    const validated = UpdateJobTypeCommand.validate({
      ...dto,
      jobTypeId: id,
      workspaceId,
      workerConfigs: dto.workerConfigs,
      metadataFields: dto.metadataFields,
    });

    await this.commandBus.execute(new UpdateJobTypeCommand(validated));

    const updated = await this.jobTypeRepository.findOne({
      where: { id, workspaceId },
      relations: ['workerConfigs', 'metadataFields'],
    });

    if (!updated) {
      throw new NotFoundException(`JobType with ID "${id}" not found`);
    }

    return updated.toDomain();
  }

  @Delete(UUID_V4_ROUTE_SEGMENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a job type' })
  @ApiResponse({ status: 200, description: 'Job type deleted successfully', schema: { example: { deleted: true } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Job type not found' })
  @ApiParam({ name: 'id', description: 'Job type unique identifier (UUID)', type: String })
  @RequireCapability('jobtype.manage')
  async remove(
    @Param('id') id: string,
    @Headers('workspaceId') workspaceId: string
  ): Promise<{ deleted: boolean }> {
    const result = await this.jobTypeRepository.delete({ id, workspaceId });
    if (result.affected === 0) {
      throw new NotFoundException(`JobType with ID "${id}" not found`);
    }
    return { deleted: true };
  }
}
