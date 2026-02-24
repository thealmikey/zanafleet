/**
 * JobType Repository
 *
 * Custom repository for JobType queries
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JobTypeEntity } from '../entities/job-type.entity';
import { JobTypeStatus, Vertical } from '../dto/job-type.enums';

@Injectable()
export class JobTypeRepository {
  constructor(
    @InjectRepository(JobTypeEntity)
    private readonly jobTypeRepository: Repository<JobTypeEntity>
  ) {}

  /**
   * Find by ID and workspace
   */
  async findById(id: string, workspaceId: string): Promise<JobTypeEntity | null> {
    return this.jobTypeRepository.findOne({
      where: { id, workspaceId },
      relations: ['workerConfigs', 'metadataFields'],
    });
  }

  /**
   * Find all by workspace
   */
  async findByWorkspace(workspaceId: string): Promise<JobTypeEntity[]> {
    return this.jobTypeRepository.find({
      where: { workspaceId },
      relations: ['workerConfigs', 'metadataFields'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Find active by workspace
   */
  async findActiveByWorkspace(workspaceId: string): Promise<JobTypeEntity[]> {
    return this.jobTypeRepository.find({
      where: { workspaceId, status: JobTypeStatus.ACTIVE },
      relations: ['workerConfigs', 'metadataFields'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Find by vertical and workspace
   */
  async findByVertical(vertical: Vertical, workspaceId: string): Promise<JobTypeEntity[]> {
    return this.jobTypeRepository.find({
      where: { vertical, workspaceId },
      relations: ['workerConfigs', 'metadataFields'],
    });
  }
}
