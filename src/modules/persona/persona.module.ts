import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonaEntity } from './entities/persona.entity';
import { ActorPersonaEntity } from './entities/actor-persona.entity';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([PersonaEntity, ActorPersonaEntity]),
  ],
  exports: [TypeOrmModule],
})
export class PersonaModule {}
