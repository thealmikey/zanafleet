import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PersonaEntity } from '../persona/entities/persona.entity';

import { CapabilityEntity } from './entities/capability.entity';
import { PersonaCapabilityEntity } from './entities/persona-capability.entity';
import { CreateCapabilityCommandHandler } from './handlers/create-capability.handler';
import { GrantCapabilityToPersonaCommandHandler } from './handlers/grant-capability-to-persona.handler';
import { CapabilityGrantNeo4jProjection } from './projections/capability-grant-neo4j.projection';
import {
  CapabilityNeo4jInitializer,
  CapabilityNeo4jProjection,
} from './projections/capability-neo4j.projection';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      CapabilityEntity,
      PersonaCapabilityEntity,
      PersonaEntity,
    ]),
  ],
  providers: [
    CreateCapabilityCommandHandler,
    GrantCapabilityToPersonaCommandHandler,
    CapabilityNeo4jProjection,
    CapabilityGrantNeo4jProjection,
    CapabilityNeo4jInitializer,
  ],
  exports: [
    TypeOrmModule,
    CreateCapabilityCommandHandler,
    GrantCapabilityToPersonaCommandHandler,
  ],
})
export class CapabilityModule implements OnModuleInit {
  constructor(
    private readonly capabilityNeo4jInitializer: CapabilityNeo4jInitializer,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.capabilityNeo4jInitializer.initialize();
  }
}
