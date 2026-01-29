import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FormationStatusEntity } from './entities/formation-status.entity';
import { RequirementEntity } from './entities/requirement.entity';
import { CreateRequirementCommandHandler } from './handlers/create-requirement.handler';
import { EvaluateFormationCommandHandler } from './handlers/evaluate-formation.handler';
import { SatisfyRequirementCommandHandler } from './handlers/satisfy-requirement.handler';
import { FormationService } from './services/formation.service';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([FormationStatusEntity, RequirementEntity])],
  providers: [
    FormationService,
    EvaluateFormationCommandHandler,
    CreateRequirementCommandHandler,
    SatisfyRequirementCommandHandler,
  ],
  exports: [FormationService, TypeOrmModule],
})
export class FormationModule implements OnModuleInit {
  private readonly logger = new Logger(FormationModule.name);

  async onModuleInit(): Promise<void> {
    this.logger.log('FormationModule initialized');
  }
}
