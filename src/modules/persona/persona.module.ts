import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonaEntity } from './entities/persona.entity';
import { ActorPersonaEntity } from './entities/actor-persona.entity';
import { CreatePersonaCommandHandler } from './handlers/create-persona.handler';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([PersonaEntity, ActorPersonaEntity]),
  ],
  providers: [CreatePersonaCommandHandler],
  exports: [TypeOrmModule, CreatePersonaCommandHandler],
})
export class PersonaModule {}
