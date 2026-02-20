import { createTypeOrmFallbackProviders } from '@api/core/sandbox';
import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SaccoEntity } from '../sacco/entities/sacco.entity';

import { RiderController } from './controllers/rider.controller';
import { RiderEntity } from './entities/rider.entity';
import { CreateRiderCommandHandler } from './handlers/create-rider.handler';
import { RiderNeo4jInitializer, RiderNeo4jProjection } from './projections/rider-neo4j.projection';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] RiderModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([RiderEntity, SaccoEntity])];
}

/**
 * RiderModule
 * Encapsulates all Rider-related functionality
 *
 * Providers:
 * - CreateRiderCommandHandler: Handles rider creation commands
 * - RiderNeo4jProjection: Syncs rider data to Neo4j
 * - RiderNeo4jInitializer: Sets up Neo4j constraints/indexes
 *
 * OnModuleInit triggers Neo4j constraint initialization
 */
@Module({
  imports: [CqrsModule, ...getTypeOrmImports()],
  controllers: [RiderController],
  providers: [
    CreateRiderCommandHandler,
    RiderNeo4jProjection,
    RiderNeo4jInitializer,
    ...createTypeOrmFallbackProviders(RiderEntity, SaccoEntity),
  ],
  exports: [RiderNeo4jInitializer],
})
export class RiderModule implements OnModuleInit {
  constructor(private readonly riderNeo4jInitializer: RiderNeo4jInitializer) {}

  async onModuleInit(): Promise<void> {
    await this.riderNeo4jInitializer.initialize();
  }
}
