import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActorEntity } from '../actor/entities/actor.entity';
import { WorkspaceEntity } from '../workspace/entities/workspace.entity';

import { ActorPersonaEntity } from './entities/actor-persona.entity';
import { PersonaEntity } from './entities/persona.entity';
import { AssignPersonaToActorCommandHandler } from './handlers/assign-persona-to-actor.handler';
import { CreatePersonaCommandHandler } from './handlers/create-persona.handler';
import { PersonaAssignmentNeo4jProjection } from './projections/persona-assignment-neo4j.projection';
import {
  PersonaNeo4jInitializer,
  PersonaNeo4jProjection,
} from './projections/persona-neo4j.projection';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      PersonaEntity,
      ActorPersonaEntity,
      ActorEntity,
      WorkspaceEntity,
    ]),
  ],
  providers: [
    CreatePersonaCommandHandler,
    AssignPersonaToActorCommandHandler,
    PersonaNeo4jProjection,
    PersonaAssignmentNeo4jProjection,
    PersonaNeo4jInitializer,
  ],
  exports: [
    TypeOrmModule,
    CreatePersonaCommandHandler,
    AssignPersonaToActorCommandHandler,
  ],
})
export class PersonaModule implements OnModuleInit {
  constructor(
    private readonly personaNeo4jInitializer: PersonaNeo4jInitializer,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.personaNeo4jInitializer.initialize();
  }
}
