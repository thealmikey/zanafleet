import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BusinessController } from './controllers/business.controller';
import { BusinessEntity } from './entities/business.entity';
import { CreateBusinessCommandHandler } from './handlers/create-business.handler';
import { BusinessNeo4jInitializer, BusinessNeo4jProjection } from './projections/business-neo4j.projection';

/**
 * BusinessModule
 * Encapsulates all Business-related functionality
 *
 * Providers:
 * - CreateBusinessCommandHandler: Handles business creation commands
 * - BusinessNeo4jProjection: Syncs business data to Neo4j
 * - BusinessNeo4jInitializer: Sets up Neo4j constraints/indexes
 *
 * OnModuleInit triggers Neo4j constraint initialization
 */
@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([BusinessEntity])],
  controllers: [BusinessController],
  providers: [CreateBusinessCommandHandler, BusinessNeo4jProjection, BusinessNeo4jInitializer],
  exports: [BusinessNeo4jInitializer],
})
export class BusinessModule implements OnModuleInit {
  constructor(private readonly businessNeo4jInitializer: BusinessNeo4jInitializer) {}

  async onModuleInit(): Promise<void> {
    await this.businessNeo4jInitializer.initialize();
  }
}
