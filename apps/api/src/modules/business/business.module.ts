import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { createTypeOrmFallbackProviders } from '@api/core/sandbox';

import { BusinessController } from './controllers/business.controller';
import { BusinessEntity } from './entities/business.entity';
import { CreateBusinessCommandHandler } from './handlers/create-business.handler';
import { BusinessNeo4jInitializer, BusinessNeo4jProjection } from './projections/business-neo4j.projection';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] BusinessModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([BusinessEntity])];
}

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
  imports: [CqrsModule, ...getTypeOrmImports()],
  controllers: [BusinessController],
  providers: [
    CreateBusinessCommandHandler, 
    BusinessNeo4jProjection, 
    BusinessNeo4jInitializer,
    // Use the new sandbox utility for fallback providers
    ...createTypeOrmFallbackProviders(BusinessEntity),
  ],
  exports: [BusinessNeo4jInitializer],
})
export class BusinessModule implements OnModuleInit {
  constructor(private readonly businessNeo4jInitializer: BusinessNeo4jInitializer) {}

  async onModuleInit(): Promise<void> {
    await this.businessNeo4jInitializer.initialize();
  }
}
