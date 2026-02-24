import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActorEntity } from '../actor/entities/actor.entity';

import { OperatorController } from './controllers/operator.controller';
import { OperatorEntity } from './entities/operator.entity';
import {
  OperatorNeo4jInitializer,
  OperatorNeo4jProjection,
} from './projections/operator-neo4j.projection';
import { OperatorService } from './services/operator.service';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([OperatorEntity, ActorEntity])],
  controllers: [OperatorController],
  providers: [OperatorService, OperatorNeo4jProjection, OperatorNeo4jInitializer],
  exports: [TypeOrmModule, OperatorService, OperatorNeo4jInitializer],
})
export class OperatorModule implements OnModuleInit {
  constructor(private readonly operatorNeo4jInitializer: OperatorNeo4jInitializer) {}

  async onModuleInit(): Promise<void> {
    await this.operatorNeo4jInitializer.initialize();
  }
}
