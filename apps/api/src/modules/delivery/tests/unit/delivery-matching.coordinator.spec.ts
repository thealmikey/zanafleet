import { EventBusService } from '@api/core/event-bus';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeliveryStatus, PolicyEffect, VehicleType } from '@zanafleet/contracts';
import { Repository } from 'typeorm';

import { PolicyEvaluationEngineService } from '../../../policy/services/policy-evaluation-engine.service';
import {
  DeliveryMatchingCoordinator,
  DeliveryNotFoundError,
  MatchingCandidate,
  MatchingConfig,
} from '../../coordinators/delivery-matching.coordinator';
import { DeliveryEntity } from '../../entities/delivery.entity';
import { AssignmentRulesService } from '../../services/assignment-rules.service';
import { CandidateSelectionService } from '../../services/candidate-selection.service';
import { DeliveryService } from '../../services/delivery.service';

describe('DeliveryMatchingCoordinator', () => {
  let coordinator: DeliveryMatchingCoordinator;
  let mockDeliveryRepository: jest.Mocked<Repository<DeliveryEntity>>;
  let mockCandidateSelectionService: jest.Mocked<CandidateSelectionService>;
  let mockAssignmentRulesService: jest.Mocked<AssignmentRulesService>;
  let mockPolicyEngine: jest.Mocked<PolicyEvaluationEngineService>;
  let mockDeliveryService: jest.Mocked<DeliveryService>;
  let mockEventBus: jest.Mocked<EventBusService>;

  const mockDelivery: Partial<DeliveryEntity> = {
    id: 'delivery-123',
    businessId: 'business-123',
    pickupLocationId: 'location-123',
    dropoffLocationId: 'location-456',
    assignedRiderId: null,
    status: DeliveryStatus.Requested,
    isScheduled: false,
    scheduledPickupTime: null,
    scheduledDropoffTime: null,
  };

  const mockCandidates: MatchingCandidate[] = [
    { riderId: 'rider-1', saccoId: 'sacco-1', distanceMeters: 500, score: 90, vehicleType: VehicleType.Bike },
    { riderId: 'rider-2', saccoId: 'sacco-2', distanceMeters: 800, score: 85, vehicleType: VehicleType.Bike },
    { riderId: 'rider-3', saccoId: 'sacco-1', distanceMeters: 1200, score: 80, vehicleType: VehicleType.TukTuk },
  ];

  beforeEach(async () => {
    mockDeliveryRepository = {
      findOneBy: jest.fn(),
    } as unknown as jest.Mocked<Repository<DeliveryEntity>>;

    mockCandidateSelectionService = {
      findAndRankCandidates: jest.fn(),
    } as unknown as jest.Mocked<CandidateSelectionService>;

    mockAssignmentRulesService = {
      evaluateForMatching: jest.fn(),
    } as unknown as jest.Mocked<AssignmentRulesService>;

    mockPolicyEngine = {
      evaluate: jest.fn(),
    } as unknown as jest.Mocked<PolicyEvaluationEngineService>;

    mockDeliveryService = {
      assignRider: jest.fn(),
    } as unknown as jest.Mocked<DeliveryService>;

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBusService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryMatchingCoordinator,
        { provide: getRepositoryToken(DeliveryEntity), useValue: mockDeliveryRepository },
        { provide: CandidateSelectionService, useValue: mockCandidateSelectionService },
        { provide: AssignmentRulesService, useValue: mockAssignmentRulesService },
        { provide: PolicyEvaluationEngineService, useValue: mockPolicyEngine },
        { provide: DeliveryService, useValue: mockDeliveryService },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    coordinator = module.get<DeliveryMatchingCoordinator>(DeliveryMatchingCoordinator);
  });

  describe('findAndAssignRider', () => {
    beforeEach(() => {
      mockDeliveryRepository.findOneBy.mockResolvedValue(mockDelivery as DeliveryEntity);
      mockCandidateSelectionService.findAndRankCandidates.mockResolvedValue(mockCandidates as never);
      mockAssignmentRulesService.evaluateForMatching.mockReturnValue({
        decision: 'MATCH_NOW',
        reason: 'NOT_SCHEDULED',
      });
      mockPolicyEngine.evaluate.mockResolvedValue({
        finalDecision: { effect: PolicyEffect.ALLOW },
        evaluatedPolicies: [],
        processingTimeMs: 10,
        evaluationFailed: false,
      } as never);
      mockDeliveryService.assignRider.mockResolvedValue({
        deliveryId: 'delivery-123',
        status: DeliveryStatus.Assigned,
      } as never);
    });

    it('should successfully assign the top-ranked rider', async () => {
      const result = await coordinator.findAndAssignRider('delivery-123');

      expect(result.success).toBe(true);
      expect(result.assignedRiderId).toBe('rider-1');
      expect(result.score).toBe(90);
      expect(result.distanceMeters).toBe(500);
      expect(mockDeliveryService.assignRider).toHaveBeenCalledWith('delivery-123', 'rider-1');
    });

    it('should emit RiderAssignedEventV1 on successful assignment', async () => {
      await coordinator.findAndAssignRider('delivery-123');

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'delivery.events.rider-assigned-v1',
        expect.objectContaining({
          eventType: 'RiderAssignedEvent-V1',
          deliveryId: 'delivery-123',
          riderId: 'rider-1',
          score: 90,
          distanceMeters: 500,
        }),
      );
    });

    it('should throw DeliveryNotFoundError when delivery does not exist', async () => {
      mockDeliveryRepository.findOneBy.mockResolvedValue(null);

      await expect(coordinator.findAndAssignRider('nonexistent')).rejects.toThrow(
        DeliveryNotFoundError,
      );
    });

    it('should return failure when no candidates are found', async () => {
      mockCandidateSelectionService.findAndRankCandidates.mockResolvedValue([]);

      const result = await coordinator.findAndAssignRider('delivery-123');

      expect(result.success).toBe(false);
      expect(result.reason).toBe('No nearby riders available');
    });

    it('should return no candidates when delivery is scheduled for later', async () => {
      mockAssignmentRulesService.evaluateForMatching.mockReturnValue({
        decision: 'SCHEDULE_FOR_LATER',
        reason: 'FUTURE_OUTSIDE_WINDOW',
        scheduleAt: new Date(),
      });

      const result = await coordinator.findAndAssignRider('delivery-123');

      expect(result.success).toBe(false);
      expect(result.reason).toBe('No riders passed eligibility checks');
    });

    it('should skip riders blocked by policy and retry with next candidate', async () => {
      mockPolicyEngine.evaluate
        .mockResolvedValueOnce({
          finalDecision: { effect: PolicyEffect.BLOCK },
          evaluatedPolicies: [],
          processingTimeMs: 10,
          evaluationFailed: false,
        } as never)
        .mockResolvedValueOnce({
          finalDecision: { effect: PolicyEffect.ALLOW },
          evaluatedPolicies: [],
          processingTimeMs: 10,
          evaluationFailed: false,
        } as never);

      const result = await coordinator.findAndAssignRider('delivery-123');

      expect(result.success).toBe(true);
      expect(result.assignedRiderId).toBe('rider-2');
    });
  });

  describe('Fairness Rules', () => {
    beforeEach(() => {
      mockDeliveryRepository.findOneBy.mockResolvedValue(mockDelivery as DeliveryEntity);
      mockAssignmentRulesService.evaluateForMatching.mockReturnValue({
        decision: 'MATCH_NOW',
        reason: 'NOT_SCHEDULED',
      });
      mockPolicyEngine.evaluate.mockResolvedValue({
        finalDecision: { effect: PolicyEffect.ALLOW },
        evaluatedPolicies: [],
        processingTimeMs: 10,
        evaluationFailed: false,
      } as never);
      mockDeliveryService.assignRider.mockResolvedValue({
        deliveryId: 'delivery-123',
        status: DeliveryStatus.Assigned,
      } as never);
    });

    it('should penalize saccos with consecutive assignments', async () => {
      const sameSaccoCandidates: MatchingCandidate[] = [
        { riderId: 'rider-1', saccoId: 'sacco-1', distanceMeters: 500, score: 90 },
        { riderId: 'rider-2', saccoId: 'sacco-2', distanceMeters: 500, score: 89 },
      ];
      mockCandidateSelectionService.findAndRankCandidates.mockResolvedValue(sameSaccoCandidates as never);

      const result1 = await coordinator.findAndAssignRider('delivery-123');
      expect(result1.assignedRiderId).toBe('rider-1');
      expect(coordinator.getSaccoAssignmentCount('sacco-1')).toBe(1);

      mockDeliveryRepository.findOneBy.mockResolvedValue({
        ...mockDelivery,
        id: 'delivery-456',
      } as DeliveryEntity);

      const result2 = await coordinator.findAndAssignRider('delivery-456');

      // Fairness penalty applied: rider-1 score becomes 90-10=80, rider-2 stays at 89
      // So rider-2 (sacco-2) gets selected for the second delivery
      expect(result2.assignedRiderId).toBe('rider-2');
      // Consecutive tracking: sacco-1 resets to 0, sacco-2 becomes 1
      expect(coordinator.getSaccoAssignmentCount('sacco-1')).toBe(0);
      expect(coordinator.getSaccoAssignmentCount('sacco-2')).toBe(1);
    });

    it('should prefer riders from different saccos for fairness after max consecutive', async () => {
      const config: Partial<MatchingConfig> = {
        maxConsecutiveSaccoAssignments: 1,
      };

      const fairnessCandidates: MatchingCandidate[] = [
        { riderId: 'rider-1', saccoId: 'sacco-1', distanceMeters: 500, score: 90 },
        { riderId: 'rider-2', saccoId: 'sacco-2', distanceMeters: 500, score: 85 },
      ];
      mockCandidateSelectionService.findAndRankCandidates.mockResolvedValue(fairnessCandidates as never);

      await coordinator.findAndAssignRider('delivery-123', config);

      mockDeliveryRepository.findOneBy.mockResolvedValue({
        ...mockDelivery,
        id: 'delivery-456',
      } as DeliveryEntity);

      const result = await coordinator.findAndAssignRider('delivery-456', config);

      expect(result.assignedRiderId).toBe('rider-2');
    });

    it('should apply round-robin within same distance tier', async () => {
      const sameTierCandidates: MatchingCandidate[] = [
        { riderId: 'rider-1', saccoId: null, distanceMeters: 450, score: 90 },
        { riderId: 'rider-2', saccoId: null, distanceMeters: 480, score: 90 },
        { riderId: 'rider-3', saccoId: null, distanceMeters: 420, score: 90 },
      ];
      mockCandidateSelectionService.findAndRankCandidates.mockResolvedValue(sameTierCandidates as never);

      const result = await coordinator.findAndAssignRider('delivery-123');

      expect(result.success).toBe(true);
      expect(['rider-1', 'rider-2', 'rider-3']).toContain(result.assignedRiderId);
    });
  });

  describe('handleAssignmentTimeout', () => {
    beforeEach(() => {
      mockDeliveryRepository.findOneBy.mockResolvedValue(mockDelivery as DeliveryEntity);
      mockCandidateSelectionService.findAndRankCandidates.mockResolvedValue(mockCandidates as never);
      mockAssignmentRulesService.evaluateForMatching.mockReturnValue({
        decision: 'MATCH_NOW',
        reason: 'NOT_SCHEDULED',
      });
      mockPolicyEngine.evaluate.mockResolvedValue({
        finalDecision: { effect: PolicyEffect.ALLOW },
        evaluatedPolicies: [],
        processingTimeMs: 10,
        evaluationFailed: false,
      } as never);
      mockDeliveryService.assignRider.mockResolvedValue({
        deliveryId: 'delivery-123',
        status: DeliveryStatus.Assigned,
      } as never);
    });

    it('should expand search radius on timeout', async () => {
      mockCandidateSelectionService.findAndRankCandidates.mockResolvedValueOnce([]);

      await coordinator.findAndAssignRider('delivery-123');

      await coordinator.handleAssignmentTimeout('delivery-123');

      const state = coordinator.getMatchingState('delivery-123');
      expect(state).toBeUndefined();
    });

    it('should emit MatchingTimeoutEventV1', async () => {
      await coordinator.findAndAssignRider('delivery-123');
      mockEventBus.publish.mockClear();

      mockCandidateSelectionService.findAndRankCandidates.mockResolvedValueOnce([]);

      await coordinator.handleAssignmentTimeout('delivery-123');

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'delivery.events.matching-timeout-v1',
        expect.objectContaining({
          eventType: 'MatchingTimeoutEvent-V1',
          deliveryId: 'delivery-123',
        }),
      );
    });

    it('should respect max radius limit', async () => {
      const config: Partial<MatchingConfig> = {
        initialRadiusMeters: 8000,
        maxRadiusMeters: 10000,
        radiusExpansionFactor: 2,
      };

      mockCandidateSelectionService.findAndRankCandidates.mockResolvedValue([]);

      await coordinator.findAndAssignRider('delivery-123', config);
      await coordinator.handleAssignmentTimeout('delivery-123', config);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'delivery.events.matching-timeout-v1',
        expect.objectContaining({
          expandedRadiusMeters: 10000,
        }),
      );
    });
  });

  describe('handleRiderRejection', () => {
    beforeEach(() => {
      mockDeliveryRepository.findOneBy.mockResolvedValue(mockDelivery as DeliveryEntity);
      mockCandidateSelectionService.findAndRankCandidates.mockResolvedValue(mockCandidates as never);
      mockAssignmentRulesService.evaluateForMatching.mockReturnValue({
        decision: 'MATCH_NOW',
        reason: 'NOT_SCHEDULED',
      });
      mockPolicyEngine.evaluate.mockResolvedValue({
        finalDecision: { effect: PolicyEffect.ALLOW },
        evaluatedPolicies: [],
        processingTimeMs: 10,
        evaluationFailed: false,
      } as never);
      mockDeliveryService.assignRider.mockResolvedValue({
        deliveryId: 'delivery-123',
        status: DeliveryStatus.Assigned,
      } as never);
    });

    it('should exclude rejected rider and find next candidate', async () => {
      const result = await coordinator.handleRiderRejection(
        'delivery-123',
        'rider-1',
        'Rider declined',
      );

      expect(result.success).toBe(true);
      expect(result.assignedRiderId).toBe('rider-2');
    });

    it('should emit RiderRejectedEventV1', async () => {
      await coordinator.handleRiderRejection('delivery-123', 'rider-1', 'Rider busy');

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'delivery.events.rider-rejected-v1',
        expect.objectContaining({
          eventType: 'RiderRejectedEvent-V1',
          deliveryId: 'delivery-123',
          riderId: 'rider-1',
          reason: 'Rider busy',
        }),
      );
    });

    it('should accumulate excluded riders across multiple rejections', async () => {
      await coordinator.handleRiderRejection('delivery-123', 'rider-1', 'Declined');

      mockEventBus.publish.mockClear();

      await coordinator.handleRiderRejection('delivery-123', 'rider-2', 'Declined');

      const state = coordinator.getMatchingState('delivery-123');
      expect(state).toBeUndefined();
    });
  });

  describe('reassignDelivery', () => {
    it('should unassign current rider and trigger new matching', async () => {
      const assignedDelivery = {
        ...mockDelivery,
        assignedRiderId: 'rider-1',
        status: DeliveryStatus.Assigned,
      };
      mockDeliveryRepository.findOneBy.mockResolvedValue(assignedDelivery as DeliveryEntity);
      mockCandidateSelectionService.findAndRankCandidates.mockResolvedValue(mockCandidates as never);
      mockAssignmentRulesService.evaluateForMatching.mockReturnValue({
        decision: 'MATCH_NOW',
        reason: 'NOT_SCHEDULED',
      });
      mockPolicyEngine.evaluate.mockResolvedValue({
        finalDecision: { effect: PolicyEffect.ALLOW },
        evaluatedPolicies: [],
        processingTimeMs: 10,
        evaluationFailed: false,
      } as never);
      mockDeliveryService.assignRider.mockResolvedValue({
        deliveryId: 'delivery-123',
        status: DeliveryStatus.Assigned,
      } as never);

      const result = await coordinator.reassignDelivery('delivery-123', 'Customer complaint');

      expect(result.success).toBe(true);
      expect(result.assignedRiderId).toBe('rider-2');
    });

    it('should emit rejection event for previously assigned rider', async () => {
      const assignedDelivery = {
        ...mockDelivery,
        assignedRiderId: 'rider-1',
        status: DeliveryStatus.Assigned,
      };
      mockDeliveryRepository.findOneBy.mockResolvedValue(assignedDelivery as DeliveryEntity);
      mockCandidateSelectionService.findAndRankCandidates.mockResolvedValue(mockCandidates as never);
      mockAssignmentRulesService.evaluateForMatching.mockReturnValue({
        decision: 'MATCH_NOW',
        reason: 'NOT_SCHEDULED',
      });
      mockPolicyEngine.evaluate.mockResolvedValue({
        finalDecision: { effect: PolicyEffect.ALLOW },
        evaluatedPolicies: [],
        processingTimeMs: 10,
        evaluationFailed: false,
      } as never);
      mockDeliveryService.assignRider.mockResolvedValue({
        deliveryId: 'delivery-123',
        status: DeliveryStatus.Assigned,
      } as never);

      await coordinator.reassignDelivery('delivery-123', 'Customer complaint');

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'delivery.events.rider-rejected-v1',
        expect.objectContaining({
          riderId: 'rider-1',
          reason: 'Reassignment: Customer complaint',
        }),
      );
    });
  });
});
