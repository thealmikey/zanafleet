import { PersonaEntity } from '@api/modules/persona/entities/persona.entity';
import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CapabilityController } from './controllers/capability.controller';
import { CapabilityAuditEntity } from './entities/capability-audit.entity';
import { CapabilityEntity } from './entities/capability.entity';
import { PersonaCapabilityEntity } from './entities/persona-capability.entity';
import { CreateCapabilityCommandHandler } from './handlers/create-capability.handler';
import { GrantCapabilityToPersonaCommandHandler } from './handlers/grant-capability-to-persona.handler';
import { CapabilityAuditProjection } from './projections/capability-audit.projection';
import { CapabilityGrantNeo4jProjection } from './projections/capability-grant-neo4j.projection';
import {
  CapabilityNeo4jInitializer,
  CapabilityNeo4jProjection,
} from './projections/capability-neo4j.projection';
import { CapabilityQueryHandlers } from './queries/capability.query-handlers';
import { CapabilityRepository } from './repositories/capability.repository';
import { CapabilityAccessController } from './services/capability-access.controller';
import { CapabilityAuditService } from './services/capability-audit.service';
import { CapabilityOrchestrator } from './services/capability-orchestrator';

// Re-export for external use
export { CapabilityOrchestrator } from './services/capability-orchestrator';
export { ICapabilityOrchestrator, OrchestrationRequest, OrchestrationResult } from './services/capability-orchestrator';
export { CapabilityAccessController } from './services/capability-access.controller';
export { CapabilityRepository } from './repositories/capability.repository';
export { CapabilityAuditService } from './services/capability-audit.service';
export { CapabilityExecutionResult, CapabilityUsedEventV1 } from './events/capability-used.event';

// Register command handlers
export const CommandHandlers = [
  CreateCapabilityCommandHandler,
  GrantCapabilityToPersonaCommandHandler,
];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      CapabilityEntity,
      PersonaCapabilityEntity,
      PersonaEntity,
      CapabilityAuditEntity,
    ]),
  ],
  controllers: [
    CapabilityController,
  ],
  providers: [
    // Repositories
    CapabilityRepository,

    // Access Control
    CapabilityAccessController,

    // Orchestration
    CapabilityOrchestrator,

    // Command Handlers
    ...CommandHandlers,

    // Query Handlers
    ...CapabilityQueryHandlers,

    // Projections
    CapabilityNeo4jProjection,
    CapabilityGrantNeo4jProjection,
    CapabilityNeo4jInitializer,
    CapabilityAuditProjection,

    // Services
    CapabilityAuditService,
  ],
  exports: [
    // Repositories
    CapabilityRepository,

    // Access Control
    CapabilityAccessController,

    // Orchestration
    CapabilityOrchestrator,

    // Export TypeOrmModule for entity access
    TypeOrmModule,

    // Command Handlers
    ...CommandHandlers,

    // Services
    CapabilityAuditService,

    // Re-export events
    './events/capability-used.event',
  ],
})
export class CapabilityModule implements OnModuleInit {
  constructor(private readonly capabilityNeo4jInitializer: CapabilityNeo4jInitializer) {}

  async onModuleInit(): Promise<void> {
    await this.capabilityNeo4jInitializer.initialize();
  }
}
