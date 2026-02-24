/**
 * JobType Module
 *
 * Encapsulates all JobType-related functionality including:
 * - CRUD operations via controllers
 * - Command handlers for CQRS
 * - Neo4j projections for graph sync
 * - Seed service for initial data
 */

import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JobTypeController } from './controllers/job-type.controller';
import { JobTypeConfigController } from './controllers/job-type-config.controller';
import { JobTypeEntity } from './entities/job-type.entity';
import { JobTypeWorkerConfigEntity } from './entities/job-type-worker-config.entity';
import { JobTypeMetadataFieldEntity } from './entities/job-type-metadata-field.entity';
import { CreateJobTypeHandler } from './handlers/create-job-type.handler';
import { UpdateJobTypeHandler } from './handlers/update-job-type.handler';
import { EnableJobTypeHandler } from './handlers/enable-job-type.handler';
import {
  JobTypeNeo4jProjection,
  JobTypeNeo4jInitializer,
} from './projections/job-type-neo4j.projection';
import { JobTypeService } from './services/job-type.service';
import { JobTypeSeedService } from './services/job-type-seed.service';

/**
 * Command handlers to register
 */
const CommandHandlers = [CreateJobTypeHandler, UpdateJobTypeHandler, EnableJobTypeHandler];

/**
 * JobTypeModule
 */
@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      JobTypeEntity,
      JobTypeWorkerConfigEntity,
      JobTypeMetadataFieldEntity,
    ]),
  ],
  controllers: [JobTypeController, JobTypeConfigController],
  providers: [
    ...CommandHandlers,
    JobTypeNeo4jProjection,
    JobTypeNeo4jInitializer,
    JobTypeService,
    JobTypeSeedService,
  ],
  exports: [JobTypeNeo4jInitializer, JobTypeService, JobTypeSeedService],
})
export class JobTypeModule implements OnModuleInit {
  constructor(private readonly jobTypeNeo4jInitializer: JobTypeNeo4jInitializer) {}

  async onModuleInit(): Promise<void> {
    await this.jobTypeNeo4jInitializer.initialize();
  }
}
