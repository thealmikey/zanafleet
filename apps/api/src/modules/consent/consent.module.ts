import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventBusModule } from '../../core/event-bus/event-bus.module';

import { CapabilityProposalEntity } from './entities/capability-proposal.entity';
import { CapabilityOrchestrator } from './services/capability-orchestrator.service';
import { ConfidenceThresholdService } from './services/confidence-threshold.service';
import { ConsentConfirmationService } from './services/consent-confirmation.service';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] ConsentModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([CapabilityProposalEntity])];
}

/**
 * ConsentModule
 * 
 * Provides the consent-driven navigation architecture for ZanaFleet.
 * This module ensures that AI never auto-executes capabilities and
 * users always confirm before any action is taken.
 * 
 * Core functionality:
 * - CapabilityProposal: Tracks AI-suggested capabilities
 * - ConsentConfirmationService: Handles confirmation workflow
 * - CapabilityOrchestrator: Executes capabilities ONLY after confirmation
 * - ConfidenceThresholdService: Manages confidence thresholds
 * 
 * Key principles:
 * - NEVER auto-execute: CapabilityOrchestrator checks confirmation
 * - Append-only: Proposals are immutable once created
 * - Audit trail: Every action creates interaction event
 * - Page independence: Works without chat context
 */
@Module({
  imports: [
    CqrsModule,
    EventBusModule.forFeature(),
    ...getTypeOrmImports(),
  ],
  providers: [
    ConsentConfirmationService,
    CapabilityOrchestrator,
    ConfidenceThresholdService,
  ],
  exports: [
    ConsentConfirmationService,
    CapabilityOrchestrator,
    ConfidenceThresholdService,
  ],
})
export class ConsentModule {}
