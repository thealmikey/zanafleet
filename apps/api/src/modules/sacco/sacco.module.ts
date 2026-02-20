import { createTypeOrmFallbackProviders } from '@api/core/sandbox';
import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SaccoController } from './controllers/sacco.controller';
import { SaccoEntity } from './entities/sacco.entity';
import { CreateSaccoCommandHandler } from './handlers/create-sacco.handler';
import { SaccoNeo4jInitializer, SaccoNeo4jProjection } from './projections/sacco-neo4j.projection';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] SaccoModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([SaccoEntity])];
}

/**
 * SaccoModule
 * Encapsulates all Sacco-related functionality
 *
 * Providers:
 * - CreateSaccoCommandHandler: Handles sacco creation commands
 * - SaccoNeo4jProjection: Syncs sacco data to Neo4j
 * - SaccoNeo4jInitializer: Sets up Neo4j constraints/indexes
 *
 * OnModuleInit triggers Neo4j constraint initialization
 */
@Module({
  imports: [CqrsModule, ...getTypeOrmImports()],
  controllers: [SaccoController],
  providers: [
    CreateSaccoCommandHandler,
    SaccoNeo4jProjection,
    SaccoNeo4jInitializer,
    ...createTypeOrmFallbackProviders(SaccoEntity),
  ],
  exports: [SaccoNeo4jInitializer],
})
export class SaccoModule implements OnModuleInit {
  constructor(private readonly saccoNeo4jInitializer: SaccoNeo4jInitializer) {}

  async onModuleInit(): Promise<void> {
    await this.saccoNeo4jInitializer.initialize();
  }
}
