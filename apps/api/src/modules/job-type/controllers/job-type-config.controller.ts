/**
 * JobType Config Controller
 *
 * REST endpoints for UI configuration
 */

import { Controller, Get, Param, Headers, UseGuards, NotFoundException } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CapabilityGuard } from '@api/core/api/guards';

import { JobTypeEntity } from '../entities/job-type.entity';
import { JobTypeStatus } from '../dto/job-type.enums';
import { JobTypeUIConfigResponse } from '../dto/job-type.response.dto';

const UUID_V4_ROUTE_SEGMENT = ':id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})';

@ApiTags('Job Types')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'workspaceId',
  description: 'Workspace identifier for multi-tenancy',
  required: true,
})
@Controller('job-types')
@UseGuards(CapabilityGuard)
export class JobTypeConfigController {
  constructor(
    @InjectRepository(JobTypeEntity)
    private readonly jobTypeRepository: Repository<JobTypeEntity>
  ) {}

  /**
   * GET /job-types/:id/ui-config
   * Returns complete UI configuration for rendering
   */
  @Get(`${UUID_V4_ROUTE_SEGMENT}/ui-config`)
  @ApiOperation({ summary: 'Get job type UI configuration', description: 'Returns UI configuration for frontend rendering' })
  @ApiResponse({ status: 200, description: 'UI config retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Job type not found' })
  @ApiParam({ name: 'id', description: 'Job type unique identifier (UUID)', type: String })
  async getJobTypeUIConfig(
    @Param('id') id: string,
    @Headers('workspaceId') workspaceId: string
  ): Promise<JobTypeUIConfigResponse> {
    const jobType = await this.jobTypeRepository.findOne({
      where: { id, workspaceId },
      relations: ['workerConfigs', 'metadataFields'],
    });

    if (!jobType) {
      throw new NotFoundException(`JobType with ID "${id}" not found`);
    }

    return jobType.toUIConfig() as unknown as JobTypeUIConfigResponse;
  }

  /**
   * GET /job-types/active/ui-configs
   * Returns all active job types for the current workspace
   */
  @Get('active/ui-configs')
  @ApiOperation({ summary: 'Get active job types UI configurations', description: 'Returns all active job types for frontend' })
  @ApiResponse({ status: 200, description: 'UI configs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getActiveJobTypeConfigs(
    @Headers('workspaceId') workspaceId: string
  ): Promise<JobTypeUIConfigResponse[]> {
    const jobTypes = await this.jobTypeRepository.find({
      where: { workspaceId, status: JobTypeStatus.ACTIVE },
      relations: ['workerConfigs', 'metadataFields'],
      order: { name: 'ASC' },
    });

    return jobTypes.map((jt) => jt.toUIConfig()) as unknown as JobTypeUIConfigResponse[];
  }
}
