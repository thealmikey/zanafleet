/**
 * JobType Service
 *
 * Main service for JobType CRUD operations
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JobTypeEntity } from '../entities/job-type.entity';
import { JobTypeStatus } from '../dto/job-type.enums';
import { JobTypeResponse, JobTypeUIConfigResponse } from '../dto/job-type.response.dto';

@Injectable()
export class JobTypeService {
  private readonly logger = new Logger(JobTypeService.name);

  constructor(
    @InjectRepository(JobTypeEntity)
    private readonly jobTypeRepository: Repository<JobTypeEntity>
  ) {}

  /**
   * Find job type by ID
   */
  async findById(id: string, workspaceId: string): Promise<JobTypeEntity> {
    const jobType = await this.jobTypeRepository.findOne({
      where: { id, workspaceId },
      relations: ['workerConfigs', 'metadataFields'],
    });

    if (!jobType) {
      throw new NotFoundException(`JobType with ID "${id}" not found`);
    }

    return jobType;
  }

  /**
   * Find all job types for workspace
   */
  async findByWorkspace(workspaceId: string): Promise<JobTypeEntity[]> {
    return this.jobTypeRepository.find({
      where: { workspaceId },
      relations: ['workerConfigs', 'metadataFields'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Find active job types for workspace
   */
  async findActiveByWorkspace(workspaceId: string): Promise<JobTypeEntity[]> {
    return this.jobTypeRepository.find({
      where: { workspaceId, status: JobTypeStatus.ACTIVE },
      relations: ['workerConfigs', 'metadataFields'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Transform to response DTO
   */
  toResponse(entity: JobTypeEntity): JobTypeResponse {
    return entity.toDomain() as unknown as JobTypeResponse;
  }

  /**
   * Transform to UI config
   */
  toUIConfig(entity: JobTypeEntity): JobTypeUIConfigResponse {
    return entity.toUIConfig() as unknown as JobTypeUIConfigResponse;
  }
}
