import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperatorEntity } from './entities/operator.entity';
import { ActorEntity } from '../actor/entities/actor.entity';
import { OperatorNeo4jInitializer, OperatorNeo4jProjection } from './projections/operator-neo4j.projection';
import { OperatorService } from './services/operator.service';

import { OperatorController } from './controllers/operator.controller';

@Module({
    imports: [CqrsModule, TypeOrmModule.forFeature([OperatorEntity, ActorEntity])],
    controllers: [OperatorController],
    providers: [OperatorService, OperatorNeo4jProjection, OperatorNeo4jInitializer],
    exports: [TypeOrmModule, OperatorService, OperatorNeo4jInitializer],
})
export class OperatorModule implements OnModuleInit {
    constructor(private readonly operatorNeo4jInitializer: OperatorNeo4jInitializer) { }

    async onModuleInit(): Promise<void> {
        await this.operatorNeo4jInitializer.initialize();
    }
}
