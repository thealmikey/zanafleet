import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventBusModule } from '../../core/event-bus/event-bus.module';
import { Neo4jModule } from '../../core/neo4j/neo4j.module';

import { SlackAdapter } from './adapters/slack/slack.adapter';
import { WebChatAdapter } from './adapters/webchat/webchat.adapter';
import { InteractionStreamEntity, InteractionEventEntity } from './entities';
import { CreateInteractionEventCommandHandler } from './handlers/create-interaction-event.handler';
import { CreateInteractionStreamCommandHandler } from './handlers/create-interaction-stream.handler';
import {
  InteractionEventAIOHandler,
  InteractionAIOrchestratorService,
} from './intelligence/interaction-ai-orchestrator';
import { InteractionIntelligenceEngine } from './intelligence/interaction-intelligence-engine';
import {
  InteractionNeo4jProjection,
  InteractionNeo4jInitializer,
} from './projections/interaction-neo4j.projection';
import { InteractionEventRepository } from './repositories/interaction-event.repository';
import { InteractionStreamRepository } from './repositories/interaction-stream.repository';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] InteractionModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([InteractionStreamEntity, InteractionEventEntity])];
}

// Command handlers
export const CommandHandlers = [
  CreateInteractionStreamCommandHandler,
  CreateInteractionEventCommandHandler,
];

// Event handlers
export const EventHandlers = [
  InteractionEventAIOHandler,
];

/**
 * InteractionModule
 * 
 * Provides the Interaction Engine for ZanaFleet.
 * 
 * Core functionality:
 * - InteractionStream: Contextual threads for user interactions
 * - InteractionEvent: Immutable events (messages, AI responses, etc.)
 * - Adapters: Normalize external input (Slack, WebChat, etc.)
 * - Neo4j Projection: Graph relationships
 * 
 * Key principles:
 * - Append-only: Events can only be added, never modified
 * - Event-driven: All state changes emit events
 * - Decoupled: Adapters normalize only, no business logic
 */
@Module({
  imports: [
    CqrsModule,
    EventBusModule.forFeature(),
    Neo4jModule,
    ...getTypeOrmImports(),
  ],
  providers: [
    // Repositories
    InteractionStreamRepository,
    InteractionEventRepository,
    // Command handlers
    ...CommandHandlers,
    // Event handlers
    ...EventHandlers,
    // Neo4j projections
    InteractionNeo4jProjection,
    InteractionNeo4jInitializer,
    // Intelligence
    {
      provide: InteractionIntelligenceEngine,
      useFactory: () => new InteractionIntelligenceEngine(),
    },
    {
      provide: InteractionAIOrchestratorService,
      useFactory: (
        intelligenceEngine: InteractionIntelligenceEngine,
        eventRepository: InteractionEventRepository,
        streamRepository: InteractionStreamRepository,
      ) => new InteractionAIOrchestratorService(
        intelligenceEngine,
        eventRepository,
        streamRepository,
      ),
      inject: [
        InteractionIntelligenceEngine,
        InteractionEventRepository,
        InteractionStreamRepository,
      ],
    },
    // Adapters
    SlackAdapter,
    WebChatAdapter,
  ],
  exports: [
    InteractionStreamRepository,
    InteractionEventRepository,
    SlackAdapter,
    WebChatAdapter,
    InteractionIntelligenceEngine,
    InteractionAIOrchestratorService,
  ],
})
export class InteractionModule implements OnModuleInit {
  private readonly logger = new Logger(InteractionModule.name);

  constructor(private readonly neo4jInitializer: InteractionNeo4jInitializer) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Interaction Module...');
    
    try {
      await this.neo4jInitializer.initialize();
      this.logger.log('Interaction Module initialized - Neo4j constraints created');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to initialize Neo4j: ${err.message}`, err.stack);
      // Don't throw - allow module to start even if Neo4j init fails
    }
  }
}
