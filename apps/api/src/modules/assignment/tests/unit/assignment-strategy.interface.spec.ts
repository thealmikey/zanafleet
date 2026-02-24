import { Test, TestingModule } from '@nestjs/testing';

import {
  AssignmentContext,
  AssignmentResult,
  AssignmentStatus,
  AssignmentStrategyType,
  AssignmentWorkerRole,
  AvailabilityStatus,
  ValidationResult,
  WorkerCandidate,
} from '../../interfaces/assignment-strategy.interface';
import { AssignmentStrategyRegistry } from '../../registry/assignment-strategy.registry';
import { FleetMatchingAssignmentStrategy } from '../../strategies/fleet-matching/fleet-matching.strategy';
import { GeoNearestAssignmentStrategy } from '../../strategies/geo-nearest/geo-nearest-assignment.strategy';
import { ManualOverrideAssignmentStrategy } from '../../strategies/manual-override/manual-override-assignment.strategy';
import { MarketplaceBidAssignmentStrategy } from '../../strategies/marketplace-bid/marketplace-bid-assignment.strategy';
import { MultiWorkerAssignmentStrategy } from '../../strategies/multi-worker/multi-worker-assignment.strategy';
import { RoundRobinAssignmentStrategy } from '../../strategies/round-robin/round-robin-assignment.strategy';
import { ScheduledAssignmentStrategy } from '../../strategies/scheduled/scheduled-assignment.strategy';
import { SingleWorkerAssignmentStrategy } from '../../strategies/single-worker/single-worker-assignment.strategy';

describe('AssignmentStrategyRegistry', () => {
  let registry: AssignmentStrategyRegistry;

  const mockStrategy = {
    type: AssignmentStrategyType.SINGLE_WORKER,
    name: 'Single Worker',
    canHandle: jest.fn().mockResolvedValue(true),
    assign: jest.fn().mockResolvedValue({
      success: true,
      assignments: [],
    }),
    validateCandidate: jest.fn().mockResolvedValue({
      valid: true,
      reasons: [],
    }),
    getPriority: jest.fn().mockReturnValue(10),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentStrategyRegistry,
        {
          provide: SingleWorkerAssignmentStrategy,
          useValue: {
            ...mockStrategy,
            type: AssignmentStrategyType.SINGLE_WORKER,
            name: 'Single Worker',
          },
        },
        {
          provide: MultiWorkerAssignmentStrategy,
          useValue: {
            ...mockStrategy,
            type: AssignmentStrategyType.MULTI_WORKER,
            name: 'Multi Worker',
          },
        },
        {
          provide: RoundRobinAssignmentStrategy,
          useValue: {
            ...mockStrategy,
            type: AssignmentStrategyType.ROUND_ROBIN,
            name: 'Round Robin',
          },
        },
        {
          provide: GeoNearestAssignmentStrategy,
          useValue: {
            ...mockStrategy,
            type: AssignmentStrategyType.GEO_NEAREST,
            name: 'Geo Nearest',
          },
        },
        {
          provide: MarketplaceBidAssignmentStrategy,
          useValue: {
            ...mockStrategy,
            type: AssignmentStrategyType.MARKETPLACE_BID,
            name: 'Marketplace Bid',
          },
        },
        {
          provide: ManualOverrideAssignmentStrategy,
          useValue: {
            ...mockStrategy,
            type: AssignmentStrategyType.MANUAL_OVERRIDE,
            name: 'Manual Override',
          },
        },
        {
          provide: ScheduledAssignmentStrategy,
          useValue: { ...mockStrategy, type: AssignmentStrategyType.SCHEDULED, name: 'Scheduled' },
        },
        {
          provide: FleetMatchingAssignmentStrategy,
          useValue: {
            ...mockStrategy,
            type: AssignmentStrategyType.FLEET_MATCHING,
            name: 'Fleet Matching',
          },
        },
      ],
    }).compile();

    registry = module.get<AssignmentStrategyRegistry>(AssignmentStrategyRegistry);

    // Manually register strategies with the registry
    registry.register({
      ...mockStrategy,
      type: AssignmentStrategyType.SINGLE_WORKER,
      name: 'Single Worker',
    });
    registry.register({
      ...mockStrategy,
      type: AssignmentStrategyType.MULTI_WORKER,
      name: 'Multi Worker',
    });
    registry.register({
      ...mockStrategy,
      type: AssignmentStrategyType.ROUND_ROBIN,
      name: 'Round Robin',
    });
    registry.register({
      ...mockStrategy,
      type: AssignmentStrategyType.GEO_NEAREST,
      name: 'Geo Nearest',
    });
    registry.register({
      ...mockStrategy,
      type: AssignmentStrategyType.MARKETPLACE_BID,
      name: 'Marketplace Bid',
    });
    registry.register({
      ...mockStrategy,
      type: AssignmentStrategyType.MANUAL_OVERRIDE,
      name: 'Manual Override',
    });
    registry.register({
      ...mockStrategy,
      type: AssignmentStrategyType.SCHEDULED,
      name: 'Scheduled',
    });
    registry.register({
      ...mockStrategy,
      type: AssignmentStrategyType.FLEET_MATCHING,
      name: 'Fleet Matching',
    });
  });

  describe('get', () => {
    it('should return single worker strategy for SINGLE_WORKER type', () => {
      // Act
      const strategy = registry.get(AssignmentStrategyType.SINGLE_WORKER);

      // Assert
      expect(strategy).toBeDefined();
      expect(strategy!.type).toBe(AssignmentStrategyType.SINGLE_WORKER);
    });

    it('should return multi worker strategy for MULTI_WORKER type', () => {
      // Act
      const strategy = registry.get(AssignmentStrategyType.MULTI_WORKER);

      // Assert
      expect(strategy).toBeDefined();
      expect(strategy!.type).toBe(AssignmentStrategyType.MULTI_WORKER);
    });

    it('should return round robin strategy for ROUND_ROBIN type', () => {
      // Act
      const strategy = registry.get(AssignmentStrategyType.ROUND_ROBIN);

      // Assert
      expect(strategy).toBeDefined();
      expect(strategy!.type).toBe(AssignmentStrategyType.ROUND_ROBIN);
    });

    it('should return geo nearest strategy for GEO_NEAREST type', () => {
      // Act
      const strategy = registry.get(AssignmentStrategyType.GEO_NEAREST);

      // Assert
      expect(strategy).toBeDefined();
      expect(strategy!.type).toBe(AssignmentStrategyType.GEO_NEAREST);
    });

    it('should return marketplace bid strategy for MARKETPLACE_BID type', () => {
      // Act
      const strategy = registry.get(AssignmentStrategyType.MARKETPLACE_BID);

      // Assert
      expect(strategy).toBeDefined();
      expect(strategy!.type).toBe(AssignmentStrategyType.MARKETPLACE_BID);
    });

    it('should return manual override strategy for MANUAL_OVERRIDE type', () => {
      // Act
      const strategy = registry.get(AssignmentStrategyType.MANUAL_OVERRIDE);

      // Assert
      expect(strategy).toBeDefined();
      expect(strategy!.type).toBe(AssignmentStrategyType.MANUAL_OVERRIDE);
    });

    it('should return scheduled strategy for SCHEDULED type', () => {
      // Act
      const strategy = registry.get(AssignmentStrategyType.SCHEDULED);

      // Assert
      expect(strategy).toBeDefined();
      expect(strategy!.type).toBe(AssignmentStrategyType.SCHEDULED);
    });

    it('should return fleet matching strategy for FLEET_MATCHING type', () => {
      // Act
      const strategy = registry.get(AssignmentStrategyType.FLEET_MATCHING);

      // Assert
      expect(strategy).toBeDefined();
      expect(strategy!.type).toBe(AssignmentStrategyType.FLEET_MATCHING);
    });

    it('should return undefined for unknown type', () => {
      // Act
      const strategy = registry.get('unknown' as AssignmentStrategyType);

      // Assert
      expect(strategy).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered strategies', () => {
      // Act
      const strategies = registry.getAll();

      // Assert
      expect(strategies).toHaveLength(8);
    });
  });
});

describe('AssignmentStrategyType', () => {
  it('should have correct enum values', () => {
    expect(AssignmentStrategyType.SINGLE_WORKER).toBe('single_worker');
    expect(AssignmentStrategyType.MULTI_WORKER).toBe('multi_worker');
    expect(AssignmentStrategyType.FLEET_MATCHING).toBe('fleet_matching');
    expect(AssignmentStrategyType.ROUND_ROBIN).toBe('round_robin');
    expect(AssignmentStrategyType.GEO_NEAREST).toBe('geo_nearest');
    expect(AssignmentStrategyType.MARKETPLACE_BID).toBe('marketplace_bid');
    expect(AssignmentStrategyType.MANUAL_OVERRIDE).toBe('manual_override');
    expect(AssignmentStrategyType.SCHEDULED).toBe('scheduled');
  });
});

describe('AssignmentStatus', () => {
  it('should have correct enum values', () => {
    expect(AssignmentStatus.PENDING).toBe('pending');
    expect(AssignmentStatus.ASSIGNED).toBe('assigned');
    expect(AssignmentStatus.ACCEPTED).toBe('accepted');
    expect(AssignmentStatus.DECLINED).toBe('declined');
    expect(AssignmentStatus.CANCELLED).toBe('cancelled');
    expect(AssignmentStatus.COMPLETED).toBe('completed');
    expect(AssignmentStatus.FAILED).toBe('failed');
  });
});

describe('AssignmentWorkerRole', () => {
  it('should have correct enum values', () => {
    expect(AssignmentWorkerRole.PRIMARY).toBe('primary');
    expect(AssignmentWorkerRole.HELPER).toBe('helper');
    expect(AssignmentWorkerRole.SUPERVISOR).toBe('supervisor');
  });
});

describe('AvailabilityStatus', () => {
  it('should have correct enum values', () => {
    expect(AvailabilityStatus.AVAILABLE).toBe('available');
    expect(AvailabilityStatus.BUSY).toBe('busy');
    expect(AvailabilityStatus.OFFLINE).toBe('offline');
    expect(AvailabilityStatus.ON_DUTY).toBe('on_duty');
    expect(AvailabilityStatus.ON_LEAVE).toBe('on_leave');
  });
});

describe('AssignmentContext', () => {
  it('should create context with required fields', () => {
    // Arrange
    const context: AssignmentContext = {
      jobId: 'job-123',
      jobTypeId: 'jobtype-123',
      jobTypeName: 'Standard Delivery',
      workspaceId: 'workspace-123',
      requiredWorkerTypes: [{ workerType: 'driver', minWorkers: 1, maxWorkers: 1, required: true }],
      currentWorkers: [],
      destinations: [],
      constraints: {},
    };

    // Assert
    expect(context.jobId).toBe('job-123');
    expect(context.workspaceId).toBe('workspace-123');
    expect(context.requiredWorkerTypes).toHaveLength(1);
  });
});

describe('WorkerCandidate', () => {
  it('should create worker candidate with all fields', () => {
    // Arrange
    const candidate: WorkerCandidate = {
      workerId: 'worker-123',
      workerType: 'driver',
      actorId: 'actor-123',
      actorEmail: 'driver@example.com',
      actorUsername: 'driver1',
      location: { latitude: -1.2921, longitude: 36.8219 },
      currentLoad: 2,
      maxCapacity: 5,
      qualifications: [{ license: 'B' }],
      rating: 4.5,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      workspaceId: 'workspace-123',
    };

    // Assert
    expect(candidate.workerId).toBe('worker-123');
    expect(candidate.availabilityStatus).toBe(AvailabilityStatus.AVAILABLE);
    expect(candidate.rating).toBe(4.5);
  });
});

describe('ValidationResult', () => {
  it('should create valid validation result', () => {
    // Arrange
    const result: ValidationResult = {
      valid: true,
      reasons: [],
    };

    // Assert
    expect(result.valid).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('should create invalid validation result with reasons', () => {
    // Arrange
    const result: ValidationResult = {
      valid: false,
      reasons: ['Worker rating below threshold', 'Worker not in workspace'],
    };

    // Assert
    expect(result.valid).toBe(false);
    expect(result.reasons).toHaveLength(2);
  });
});

describe('AssignmentResult', () => {
  it('should create successful assignment result', () => {
    // Arrange
    const result: AssignmentResult = {
      success: true,
      assignments: [
        {
          workerId: 'worker-1',
          workerType: 'driver',
          role: AssignmentWorkerRole.PRIMARY,
          assignedAt: new Date(),
          assignmentMethod: 'auto',
          status: AssignmentStatus.ASSIGNED,
        },
      ],
      errors: [],
    };

    // Assert
    expect(result.success).toBe(true);
    expect(result.assignments).toHaveLength(1);
  });

  it('should create failed assignment result', () => {
    // Arrange
    const result: AssignmentResult = {
      success: false,
      assignments: [],
      errors: ['No available workers found'],
    };

    // Assert
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
  });
});
