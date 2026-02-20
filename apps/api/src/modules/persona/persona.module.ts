import { createTypeOrmFallbackProviders } from '@api/core/sandbox';
import { ActorEntity } from '@api/modules/actor/entities/actor.entity';
import { WorkspaceEntity } from '@api/modules/workspace/entities/workspace.entity';
import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActorPersonaEntity } from './entities/actor-persona.entity';
import { PersonaEntity } from './entities/persona.entity';
import { AssignPersonaToActorCommandHandler } from './handlers/assign-persona-to-actor.handler';
import { CreatePersonaCommandHandler } from './handlers/create-persona.handler';
import { PersonaAssignmentNeo4jProjection } from './projections/persona-assignment-neo4j.projection';
import {
  PersonaNeo4jInitializer,
  PersonaNeo4jProjection,
} from './projections/persona-neo4j.projection';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] PersonaModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([PersonaEntity, ActorPersonaEntity, ActorEntity, WorkspaceEntity])];
}

@Module({
  imports: [
    CqrsModule,
    ...getTypeOrmImports(),
  ],
  providers: [
    CreatePersonaCommandHandler,
    AssignPersonaToActorCommandHandler,
    PersonaNeo4jProjection,
    PersonaAssignmentNeo4jProjection,
    PersonaNeo4jInitializer,
    // Fallback providers for sandbox mode
    ...createTypeOrmFallbackProviders(PersonaEntity, ActorPersonaEntity, ActorEntity, WorkspaceEntity),
  ],
  exports: isSandBoxMode 
    ? [CreatePersonaCommandHandler, AssignPersonaToActorCommandHandler]
    : [CreatePersonaCommandHandler, AssignPersonaToActorCommandHandler],
})
export class PersonaModule implements OnModuleInit {
  constructor(private readonly personaNeo4jInitializer: PersonaNeo4jInitializer) {}

  async onModuleInit(): Promise<void> {
    await this.personaNeo4jInitializer.initialize();
  }
}
