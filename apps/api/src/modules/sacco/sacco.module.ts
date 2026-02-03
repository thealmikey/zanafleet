import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SaccoController } from './controllers/sacco.controller';
import { SaccoEntity } from './entities/sacco.entity';
import { CreateSaccoCommandHandler } from './handlers/create-sacco.handler';
import { SaccoNeo4jInitializer, SaccoNeo4jProjection } from './projections/sacco-neo4j.projection';

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
  imports: [CqrsModule, TypeOrmModule.forFeature([SaccoEntity])],
  controllers: [SaccoController],
  providers: [CreateSaccoCommandHandler, SaccoNeo4jProjection, SaccoNeo4jInitializer],
  exports: [SaccoNeo4jInitializer],
})
export class SaccoModule implements OnModuleInit {
  constructor(private readonly saccoNeo4jInitializer: SaccoNeo4jInitializer) {}

  async onModuleInit(): Promise<void> {
    await this.saccoNeo4jInitializer.initialize();
  }
}
