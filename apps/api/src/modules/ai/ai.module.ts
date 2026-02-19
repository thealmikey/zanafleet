import { EventBusModule } from '@api/core/event-bus';
import { Neo4jModule } from '@api/core/neo4j';
import { Module, Type } from '@nestjs/common';
import { CqrsModule, ICommandHandler, IEventHandler } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AIFeedbackEntity } from './entities/ai-feedback.entity';
import { AISuggestionEntity } from './entities/ai-suggestion.entity';
import { AITelemetryEntity } from './entities/ai-telemetry.entity';
import { AISuggestionNeo4jProjection } from './projections/ai-suggestion.neo4j.projection';
import { AIEventListenerService } from './services/ai-event-listener.service';
import { AIReminderEngineService } from './services/ai-reminder-engine.service';
import { AIRiskAnalyzerService } from './services/ai-risk-analyzer.service';
import { AISuggestionFeedbackService } from './services/ai-suggestion-feedback.service';
import { AISuggestionStoreService } from './services/ai-suggestion-store.service';
import { HangingStateDetectorService } from './services/hanging-state-detector.service';

// Re-export for external use
export { AIEventListenerService } from './services/ai-event-listener.service';
export { AISuggestionStoreService } from './services/ai-suggestion-store.service';
export { AIRiskAnalyzerService } from './services/ai-risk-analyzer.service';
export { AISuggestionFeedbackService } from './services/ai-suggestion-feedback.service';
export { HangingStateDetectorService } from './services/hanging-state-detector.service';
export { AIReminderEngineService } from './services/ai-reminder-engine.service';
export * from './events';
export * from './interfaces';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] AIModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([
    AISuggestionEntity,
    AIFeedbackEntity,
    AITelemetryEntity,
  ])];
}

// Command handlers - none in Phase 1 (suggestions are auto-generated)
const CommandHandlers: Type<ICommandHandler>[] = [];

// Event handlers
const EventHandlers: Type<IEventHandler>[] = [
  AISuggestionNeo4jProjection,
];

@Module({
  imports: [
    CqrsModule,
    EventBusModule.forFeature(),
    Neo4jModule,
    ...getTypeOrmImports(),
  ],
  providers: [
    ...CommandHandlers,
    ...EventHandlers,
    AIEventListenerService,
    HangingStateDetectorService,
    AIReminderEngineService,
    AIRiskAnalyzerService,
    AISuggestionStoreService,
    AISuggestionFeedbackService,
  ],
  exports: [
    AIEventListenerService,
    AISuggestionStoreService,
    AIRiskAnalyzerService,
    AISuggestionFeedbackService,
    HangingStateDetectorService,
    AIReminderEngineService,
  ],
})
export class AIModule {}
