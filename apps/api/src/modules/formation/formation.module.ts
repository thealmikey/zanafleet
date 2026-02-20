import { createTypeOrmFallbackProviders } from '@api/core/sandbox';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FormationStatusEntity } from './entities/formation-status.entity';
import { RequirementEntity } from './entities/requirement.entity';
import { CreateRequirementCommandHandler } from './handlers/create-requirement.handler';
import { EvaluateFormationCommandHandler } from './handlers/evaluate-formation.handler';
import { SatisfyRequirementCommandHandler } from './handlers/satisfy-requirement.handler';
import { FormationService } from './services/formation.service';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] FormationModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([FormationStatusEntity, RequirementEntity])];
}

@Module({
  imports: [CqrsModule, ...getTypeOrmImports()],
  providers: [
    FormationService,
    EvaluateFormationCommandHandler,
    CreateRequirementCommandHandler,
    SatisfyRequirementCommandHandler,
    // Fallback providers for sandbox mode
    ...createTypeOrmFallbackProviders(FormationStatusEntity, RequirementEntity),
  ],
  exports: [FormationService],
})
export class FormationModule implements OnModuleInit {
  private readonly logger = new Logger(FormationModule.name);

  async onModuleInit(): Promise<void> {
    this.logger.log('FormationModule initialized');
  }
}
