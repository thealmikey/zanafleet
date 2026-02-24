import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventBusModule } from '../../core/event-bus/event-bus.module';
import { JobTypeModule } from '../job-type/job-type.module';

import { AssignmentStrategyRegistry } from './registry/assignment-strategy.registry';

// Strategies
import { FleetMatchingAssignmentStrategy } from './strategies/fleet-matching/fleet-matching.strategy';
import { GeoNearestAssignmentStrategy } from './strategies/geo-nearest/geo-nearest-assignment.strategy';
import { ManualOverrideAssignmentStrategy } from './strategies/manual-override/manual-override-assignment.strategy';
import { MarketplaceBidAssignmentStrategy } from './strategies/marketplace-bid/marketplace-bid-assignment.strategy';
import { MultiWorkerAssignmentStrategy } from './strategies/multi-worker/multi-worker-assignment.strategy';
import { RoundRobinAssignmentStrategy } from './strategies/round-robin/round-robin-assignment.strategy';
import { ScheduledAssignmentStrategy } from './strategies/scheduled/scheduled-assignment.strategy';
import { SingleWorkerAssignmentStrategy } from './strategies/single-worker/single-worker-assignment.strategy';

// Services
import { AssignmentContextService } from './services/assignment-context.service';
import { AssignmentEngineService } from './services/assignment-engine.service';
import { WorkerCandidateService } from './services/worker-candidate.service';

// Entities
import {
  AssignmentAuditLogEntity,
  JobWorkerAssignmentEntity,
} from './entities/job-worker-assignment.entity';

// Repository
import { AssignmentRepository } from './repositories/assignment.repository';

// Controller
import { AssignmentController } from './controllers/assignment.controller';

// Guard
import { AssignmentGuard } from './guards/assignment.guard';

// Metrics
import { AssignmentMetrics } from './metrics/assignment.metrics';

/**
 * Assignment Module
 *
 * Pluggable assignment engine for assigning workers to jobs.
 * Supports multiple assignment strategies through the strategy pattern.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([JobWorkerAssignmentEntity, AssignmentAuditLogEntity]),
    EventBusModule,
    JobTypeModule,
  ],
  controllers: [AssignmentController],
  providers: [
    // Strategy Registry
    AssignmentStrategyRegistry,

    // Strategies
    SingleWorkerAssignmentStrategy,
    MultiWorkerAssignmentStrategy,
    FleetMatchingAssignmentStrategy,
    RoundRobinAssignmentStrategy,
    GeoNearestAssignmentStrategy,
    MarketplaceBidAssignmentStrategy,
    ManualOverrideAssignmentStrategy,
    ScheduledAssignmentStrategy,

    // Services
    AssignmentEngineService,
    AssignmentContextService,
    WorkerCandidateService,

    // Repository
    AssignmentRepository,

    // Guard
    AssignmentGuard,

    // Metrics
    AssignmentMetrics,
  ],
  exports: [
    AssignmentEngineService,
    AssignmentStrategyRegistry,
    AssignmentRepository,
    AssignmentMetrics,
  ],
})
export class AssignmentModule {
  private readonly logger = new Logger(AssignmentModule.name);

  constructor(
    private readonly registry: AssignmentStrategyRegistry,
    private readonly singleWorkerStrategy: SingleWorkerAssignmentStrategy,
    private readonly multiWorkerStrategy: MultiWorkerAssignmentStrategy,
    private readonly fleetMatchingStrategy: FleetMatchingAssignmentStrategy,
    private readonly roundRobinStrategy: RoundRobinAssignmentStrategy,
    private readonly geoNearestStrategy: GeoNearestAssignmentStrategy,
    private readonly marketplaceBidStrategy: MarketplaceBidAssignmentStrategy,
    private readonly manualOverrideStrategy: ManualOverrideAssignmentStrategy,
    private readonly scheduledStrategy: ScheduledAssignmentStrategy
  ) {
    this.registerStrategies();
  }

  private registerStrategies(): void {
    this.registry.register(this.singleWorkerStrategy);
    this.registry.register(this.multiWorkerStrategy);
    this.registry.register(this.fleetMatchingStrategy);
    this.registry.register(this.roundRobinStrategy);
    this.registry.register(this.geoNearestStrategy);
    this.registry.register(this.marketplaceBidStrategy);
    this.registry.register(this.manualOverrideStrategy);
    this.registry.register(this.scheduledStrategy);

    this.logger.log(`Registered ${this.registry.count()} assignment strategies`);
  }
}
