import { PersonaEntity } from '@api/modules/persona/entities/persona.entity';
import { Module, OnModuleInit, Type } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';

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
import { CAPABILITY_REPOSITORY_TOKEN, CapabilityRepository, ICapabilityRepository } from './repositories/capability.repository';
import { CapabilityRepositoryInMemory } from './repositories/capability.repository.in-memory';
import { CapabilityAccessController } from './services/capability-access.controller';
import { CapabilityAuditService } from './services/capability-audit.service';
import { CapabilityOrchestrator } from './services/capability-orchestrator';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

// Re-export for external use
export { CapabilityOrchestrator } from './services/capability-orchestrator';
export { ICapabilityOrchestrator, OrchestrationRequest, OrchestrationResult } from './services/capability-orchestrator';
export { CapabilityAccessController } from './services/capability-access.controller';
export { CapabilityRepository, CAPABILITY_REPOSITORY_TOKEN, ICapabilityRepository } from './repositories/capability.repository';
export { CapabilityAuditService } from './services/capability-audit.service';
export { CapabilityExecutionResult, CapabilityUsedEventV1 } from './events/capability-used.event';

// Register command handlers
export const CommandHandlers = [
  CreateCapabilityCommandHandler,
  GrantCapabilityToPersonaCommandHandler,
];

// Helper to get TypeOrmModule config (only when NOT in sandbox mode)
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] CapabilityModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [
    TypeOrmModule.forFeature([
      CapabilityEntity,
      PersonaCapabilityEntity,
      PersonaEntity,
      CapabilityAuditEntity,
    ]),
  ];
}

// Helper to get the appropriate repository provider with injection token
function getRepositoryProvider() {
  if (isSandBoxMode) {
    console.log('[DEBUG] CapabilityModule: Using CapabilityRepositoryInMemory in sandbox mode');
    return {
      provide: CAPABILITY_REPOSITORY_TOKEN,
      useClass: CapabilityRepositoryInMemory,
    };
  }
  console.log('[DEBUG] CapabilityModule: Using CapabilityRepository (TypeORM) in production mode');
  return {
    provide: CAPABILITY_REPOSITORY_TOKEN,
    useClass: CapabilityRepository,
  };
}

// Helper to get fallback providers for TypeORM entity tokens in sandbox mode
// These are needed because some handlers use @InjectRepository() which expects TypeORM
function getSandboxFallbackProviders(): any[] {
  if (!isSandBoxMode) {
    return [];
  }
  
  // All entities that need fallback providers
  const entities = [
    CapabilityEntity,
    PersonaCapabilityEntity,
    PersonaEntity,
    CapabilityAuditEntity,
  ];
  
  const entityProviders = entities.map(entity => ({
    provide: getRepositoryToken(entity),
    useFactory() {
      // Return a mock repository object
      return {
        manager: { getRepository: () => ({}) },
        metadata: { target: entity, connectionName: 'default' },
        // Add minimal TypeORM repository methods that handlers might use
        find: async () => [],
        findOne: async () => null,
        findAll: async () => [],
        save: async (data: unknown) => data,
        delete: async () => ({ affected: 0 }),
        create: (data: unknown) => data,
        createQueryBuilder: () => ({
          where: () => ({}),
          andWhere: () => ({}),
          getMany: async () => [],
          getOne: async () => null,
        }),
      };
    },
  }));
  
  // Also provide CapabilityRepository class using the in-memory implementation
  const repositoryProviders = [
    {
      provide: CapabilityRepository,
      useClass: CapabilityRepositoryInMemory,
    },
  ];
  
  return [...entityProviders, ...repositoryProviders];
}

// Helper to get exports - export only the repository that's actually provided based on mode
function getExports(): Array<Type<unknown> | string> {
  const moduleExports: Array<Type<unknown> | string> = [
    // Access Control
    CapabilityAccessController,

    // Orchestration
    CapabilityOrchestrator,

    // Command Handlers
    ...CommandHandlers,

    // Services
    CapabilityAuditService,
  ];

  // Export the injection token for the repository (works for both modes)
  moduleExports.push(CAPABILITY_REPOSITORY_TOKEN);

  return moduleExports;
}

@Module({
  imports: [
    CqrsModule,
    ...getTypeOrmImports(),
  ],
  controllers: [
    CapabilityController,
  ],
  providers: [
    // Repositories - use appropriate implementation based on mode
    getRepositoryProvider(),

    // Fallback providers for TypeORM entity tokens in sandbox mode
    ...getSandboxFallbackProviders(),

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
  exports: getExports(),
})
export class CapabilityModule implements OnModuleInit {
  constructor(private readonly capabilityNeo4jInitializer: CapabilityNeo4jInitializer) {}

  async onModuleInit(): Promise<void> {
    await this.capabilityNeo4jInitializer.initialize();
  }
}
