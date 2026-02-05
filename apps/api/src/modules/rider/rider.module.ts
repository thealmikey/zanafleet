import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SaccoEntity } from '../sacco/entities/sacco.entity';

import { RiderController } from './controllers/rider.controller';
import { RiderEntity } from './entities/rider.entity';
import { CreateRiderCommandHandler } from './handlers/create-rider.handler';
import { RiderNeo4jInitializer, RiderNeo4jProjection } from './projections/rider-neo4j.projection';

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
  imports: [CqrsModule, TypeOrmModule.forFeature([RiderEntity, SaccoEntity])],
  controllers: [RiderController],
  providers: [CreateRiderCommandHandler, RiderNeo4jProjection, RiderNeo4jInitializer],
  exports: [RiderNeo4jInitializer],
})
export class RiderModule implements OnModuleInit {
  constructor(private readonly riderNeo4jInitializer: RiderNeo4jInitializer) {}

  async onModuleInit(): Promise<void> {
    await this.riderNeo4jInitializer.initialize();
  }
}
