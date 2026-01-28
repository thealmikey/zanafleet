import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActorEntity } from '../actor/entities/actor.entity';
import { WorkspaceEntity } from '../workspace/entities/workspace.entity';
import { ActorPersonaEntity } from './entities/actor-persona.entity';
import { PersonaEntity } from './entities/persona.entity';
import { AssignPersonaToActorCommandHandler } from './handlers/assign-persona-to-actor.handler';
import { CreatePersonaCommandHandler } from './handlers/create-persona.handler';

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
  providers: [CreatePersonaCommandHandler, AssignPersonaToActorCommandHandler],
  exports: [
    TypeOrmModule,
    CreatePersonaCommandHandler,
    AssignPersonaToActorCommandHandler,
  ],
})
export class PersonaModule {}
