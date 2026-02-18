import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActorEntity } from '../actor/entities/actor.entity';

import { OperatorController } from './controllers/operator.controller';
import { OperatorEntity } from './entities/operator.entity';
import { OperatorNeo4jInitializer, OperatorNeo4jProjection } from './projections/operator-neo4j.projection';
import { OperatorService } from './services/operator.service';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] OperatorModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([OperatorEntity, ActorEntity])];
}

@Module({
    imports: [CqrsModule, ...getTypeOrmImports()],
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
