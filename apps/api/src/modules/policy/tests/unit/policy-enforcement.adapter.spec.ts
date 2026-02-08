import { Test, TestingModule } from '@nestjs/testing';

import {
  PolicyEnforcementAdapter,
  FilterCandidatesContext,
  DeliveryCreationInput,
  RiderAssignmentInput,
} from '../../services/policy-enforcement.adapter';
import { PolicyEvaluationEngineService } from '../../services/policy-evaluation-engine.service';
import {
  PolicyTrigger,
  PolicyEffect,
  PolicyScope,
  EvaluationResult,
  PolicyDecision,
  EvaluationContext,
} from '../../dto';
import { RankedCandidate, GeoPoint } from '../../../delivery/services/candidate-selection.service';

function createMockDecision(
  effect: PolicyEffect,
  overrides?: Partial<PolicyDecision>
): PolicyDecision {
  return {
    effect,
    policyId: 'test-policy-id',
    policyName: 'Test Policy',
    reason: `Policy with ${effect} effect`,
    ...overrides,
  };
}

function createMockEvaluationResult(decision: PolicyDecision): EvaluationResult {
  return {
    finalDecision: decision,
    evaluatedPolicies: [
      {
        policyId: decision.policyId,
        matched: true,
        priority: 1,
        scope: PolicyScope.GLOBAL,
      },
    ],
    processingTimeMs: 5,
    failedOpen: false,
  };
}

function createMockCandidate(riderId: string): RankedCandidate {
  return {
    riderId,
    distanceMeters: 500,
    score: 100,
    lastKnownLocation: { latitude: -1.2921, longitude: 36.8219 },
  };
}

describe('PolicyEnforcementAdapter', () => {
  let adapter: PolicyEnforcementAdapter;
  let mockEngine: jest.Mocked<PolicyEvaluationEngineService>;

  const defaultPickupLocation: GeoPoint = { latitude: -1.2921, longitude: 36.8219 };
  const defaultWorkspaceId = 'workspace-123';
  const defaultDeliveryId = 'delivery-456';
  const defaultBusinessId = 'business-789';
  const defaultRiderId = 'rider-abc';

  beforeEach(async () => {
    mockEngine = {
      evaluate: jest.fn(),
    } as unknown as jest.Mocked<PolicyEvaluationEngineService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyEnforcementAdapter,
        {
          provide: PolicyEvaluationEngineService,
          useValue: mockEngine,
        },
      ],
    }).compile();

    adapter = module.get<PolicyEnforcementAdapter>(PolicyEnforcementAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('filterCandidatesByPolicy', () => {
    const baseContext: FilterCandidatesContext = {
      deliveryId: defaultDeliveryId,
      workspaceId: defaultWorkspaceId,
      pickupLocation: defaultPickupLocation,
    };

    it('should keep candidate in allowed array when effect is ALLOW', async () => {
      const candidate = createMockCandidate('rider-1');
      const decision = createMockDecision(PolicyEffect.ALLOW);
      mockEngine.evaluate.mockResolvedValue(createMockEvaluationResult(decision));

      const result = await adapter.filterCandidatesByPolicy([candidate], baseContext);

      expect(result.allowed).toHaveLength(1);
      expect(result.allowed[0]).toBe(candidate);
      expect(result.blocked).toHaveLength(0);
      expect(result.requiresApproval).toHaveLength(0);
    });

    it('should move candidate to blocked array when effect is BLOCK', async () => {
      const candidate = createMockCandidate('rider-1');
      const decision = createMockDecision(PolicyEffect.BLOCK, {
        reason: 'Rider is restricted in this area',
      });
      mockEngine.evaluate.mockResolvedValue(createMockEvaluationResult(decision));

      const result = await adapter.filterCandidatesByPolicy([candidate], baseContext);

      expect(result.allowed).toHaveLength(0);
      expect(result.blocked).toHaveLength(1);
      expect(result.blocked[0].candidate).toBe(candidate);
      expect(result.blocked[0].reason).toBe('Rider is restricted in this area');
      expect(result.requiresApproval).toHaveLength(0);
    });

    it('should handle multiple candidates with mixed results', async () => {
      const candidate1 = createMockCandidate('rider-1');
      const candidate2 = createMockCandidate('rider-2');
      const candidate3 = createMockCandidate('rider-3');

      mockEngine.evaluate
        .mockResolvedValueOnce(
          createMockEvaluationResult(createMockDecision(PolicyEffect.ALLOW))
        )
        .mockResolvedValueOnce(
          createMockEvaluationResult(
            createMockDecision(PolicyEffect.BLOCK, { reason: 'Blocked rider 2' })
          )
        )
        .mockResolvedValueOnce(
          createMockEvaluationResult(createMockDecision(PolicyEffect.ALLOW))
        );

      const result = await adapter.filterCandidatesByPolicy(
        [candidate1, candidate2, candidate3],
        baseContext
      );

      expect(result.allowed).toHaveLength(2);
      expect(result.allowed).toContain(candidate1);
      expect(result.allowed).toContain(candidate3);
      expect(result.blocked).toHaveLength(1);
      expect(result.blocked[0].candidate).toBe(candidate2);
      expect(result.requiresApproval).toHaveLength(0);
    });

    it('should build correct EvaluationContext for each candidate', async () => {
      const candidate = createMockCandidate('rider-specific');
      const scheduledTime = new Date('2024-06-15T10:00:00Z');
      const contextWithSchedule: FilterCandidatesContext = {
        ...baseContext,
        scheduledTime,
      };

      mockEngine.evaluate.mockResolvedValue(
        createMockEvaluationResult(createMockDecision(PolicyEffect.ALLOW))
      );

      await adapter.filterCandidatesByPolicy([candidate], contextWithSchedule);

      expect(mockEngine.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: PolicyTrigger.RIDER_ASSIGNMENT,
          workspaceId: defaultWorkspaceId,
          deliveryId: defaultDeliveryId,
          riderId: 'rider-specific',
          timestamp: scheduledTime,
          location: {
            latitude: defaultPickupLocation.latitude,
            longitude: defaultPickupLocation.longitude,
          },
        })
      );
    });

    it('should use current time when scheduledTime is not provided', async () => {
      const candidate = createMockCandidate('rider-1');
      const beforeCall = new Date();

      mockEngine.evaluate.mockResolvedValue(
        createMockEvaluationResult(createMockDecision(PolicyEffect.ALLOW))
      );

      await adapter.filterCandidatesByPolicy([candidate], baseContext);

      const afterCall = new Date();
      const calledContext = mockEngine.evaluate.mock.calls[0][0] as EvaluationContext;

      expect(calledContext.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(calledContext.timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });

    it('should allow candidate when effect is MODIFY', async () => {
      const candidate = createMockCandidate('rider-1');
      const decision = createMockDecision(PolicyEffect.MODIFY);
      mockEngine.evaluate.mockResolvedValue(createMockEvaluationResult(decision));

      const result = await adapter.filterCandidatesByPolicy([candidate], baseContext);

      expect(result.allowed).toHaveLength(1);
      expect(result.blocked).toHaveLength(0);
      expect(result.requiresApproval).toHaveLength(0);
    });

    it('should put candidate in requiresApproval array when effect is REQUIRE_APPROVAL', async () => {
      const candidate = createMockCandidate('rider-1');
      const approvalRoles = ['manager', 'supervisor'];
      const decision = createMockDecision(PolicyEffect.REQUIRE_APPROVAL, {
        requiresApprovalFrom: approvalRoles,
      });
      mockEngine.evaluate.mockResolvedValue(createMockEvaluationResult(decision));

      const result = await adapter.filterCandidatesByPolicy([candidate], baseContext);

      expect(result.allowed).toHaveLength(0);
      expect(result.blocked).toHaveLength(0);
      expect(result.requiresApproval).toHaveLength(1);
      expect(result.requiresApproval[0].candidate).toBe(candidate);
      expect(result.requiresApproval[0].approvalRoles).toEqual(approvalRoles);
    });

    it('should handle multiple candidates with all three result categories', async () => {
      const candidate1 = createMockCandidate('rider-1');
      const candidate2 = createMockCandidate('rider-2');
      const candidate3 = createMockCandidate('rider-3');

      mockEngine.evaluate
        .mockResolvedValueOnce(
          createMockEvaluationResult(createMockDecision(PolicyEffect.ALLOW))
        )
        .mockResolvedValueOnce(
          createMockEvaluationResult(
            createMockDecision(PolicyEffect.BLOCK, { reason: 'Blocked rider 2' })
          )
        )
        .mockResolvedValueOnce(
          createMockEvaluationResult(
            createMockDecision(PolicyEffect.REQUIRE_APPROVAL, {
              reason: 'Requires approval',
              requiresApprovalFrom: ['manager'],
            })
          )
        );

      const result = await adapter.filterCandidatesByPolicy(
        [candidate1, candidate2, candidate3],
        baseContext
      );

      expect(result.allowed).toHaveLength(1);
      expect(result.allowed).toContain(candidate1);
      expect(result.blocked).toHaveLength(1);
      expect(result.blocked[0].candidate).toBe(candidate2);
      expect(result.requiresApproval).toHaveLength(1);
      expect(result.requiresApproval[0].candidate).toBe(candidate3);
      expect(result.requiresApproval[0].approvalRoles).toEqual(['manager']);
    });
  });

  describe('evaluateDeliveryCreation', () => {
    const baseInput: DeliveryCreationInput = {
      businessId: defaultBusinessId,
      workspaceId: defaultWorkspaceId,
      isScheduled: false,
    };

    it('should return allowed: true when effect is ALLOW', async () => {
      const decision = createMockDecision(PolicyEffect.ALLOW);
      mockEngine.evaluate.mockResolvedValue(createMockEvaluationResult(decision));

      const result = await adapter.evaluateDeliveryCreation(baseInput);

      expect(result.allowed).toBe(true);
      expect(result.decision).toBe(decision);
      expect(result.requiresApproval).toBeUndefined();
    });

    it('should return allowed: false when effect is BLOCK', async () => {
      const decision = createMockDecision(PolicyEffect.BLOCK);
      mockEngine.evaluate.mockResolvedValue(createMockEvaluationResult(decision));

      const result = await adapter.evaluateDeliveryCreation(baseInput);

      expect(result.allowed).toBe(false);
      expect(result.decision).toBe(decision);
    });

    it('should return allowed: true when effect is MODIFY', async () => {
      const decision = createMockDecision(PolicyEffect.MODIFY, {
        modifications: { priorityBoost: true },
      });
      mockEngine.evaluate.mockResolvedValue(createMockEvaluationResult(decision));

      const result = await adapter.evaluateDeliveryCreation(baseInput);

      expect(result.allowed).toBe(true);
      expect(result.decision).toBe(decision);
    });

    it('should return allowed: false with requiresApproval when effect is REQUIRE_APPROVAL', async () => {
      const approvalRoles = ['manager', 'supervisor'];
      const decision = createMockDecision(PolicyEffect.REQUIRE_APPROVAL, {
        requiresApprovalFrom: approvalRoles,
      });
      mockEngine.evaluate.mockResolvedValue(createMockEvaluationResult(decision));

      const result = await adapter.evaluateDeliveryCreation(baseInput);

      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(true);
      expect(result.approvalRoles).toEqual(approvalRoles);
    });

    it('should build correct EvaluationContext with all fields', async () => {
      const inputWithLocation: DeliveryCreationInput = {
        ...baseInput,
        pickupLocation: defaultPickupLocation,
        isScheduled: true,
      };

      mockEngine.evaluate.mockResolvedValue(
        createMockEvaluationResult(createMockDecision(PolicyEffect.ALLOW))
      );

      await adapter.evaluateDeliveryCreation(inputWithLocation);

      expect(mockEngine.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: PolicyTrigger.DELIVERY_CREATION,
          workspaceId: defaultWorkspaceId,
          businessId: defaultBusinessId,
          location: {
            latitude: defaultPickupLocation.latitude,
            longitude: defaultPickupLocation.longitude,
          },
          metadata: { isScheduled: true },
        })
      );
    });

    it('should not include location when pickupLocation is not provided', async () => {
      mockEngine.evaluate.mockResolvedValue(
        createMockEvaluationResult(createMockDecision(PolicyEffect.ALLOW))
      );

      await adapter.evaluateDeliveryCreation(baseInput);

      const calledContext = mockEngine.evaluate.mock.calls[0][0] as EvaluationContext;
      expect(calledContext.location).toBeUndefined();
    });
  });

  describe('evaluateRiderAssignment', () => {
    const baseInput: RiderAssignmentInput = {
      deliveryId: defaultDeliveryId,
      riderId: defaultRiderId,
      workspaceId: defaultWorkspaceId,
    };

    it('should return allowed: true when effect is ALLOW', async () => {
      const decision = createMockDecision(PolicyEffect.ALLOW);
      mockEngine.evaluate.mockResolvedValue(createMockEvaluationResult(decision));

      const result = await adapter.evaluateRiderAssignment(baseInput);

      expect(result.allowed).toBe(true);
      expect(result.decision).toBe(decision);
      expect(result.modifications).toBeUndefined();
    });

    it('should return allowed: false when effect is BLOCK', async () => {
      const decision = createMockDecision(PolicyEffect.BLOCK);
      mockEngine.evaluate.mockResolvedValue(createMockEvaluationResult(decision));

      const result = await adapter.evaluateRiderAssignment(baseInput);

      expect(result.allowed).toBe(false);
      expect(result.decision).toBe(decision);
    });

    it('should return allowed: true with modifications when effect is MODIFY', async () => {
      const decision = createMockDecision(PolicyEffect.MODIFY, {
        modifications: { notifyAssignment: true },
      });
      mockEngine.evaluate.mockResolvedValue(createMockEvaluationResult(decision));

      const result = await adapter.evaluateRiderAssignment(baseInput);

      expect(result.allowed).toBe(true);
      expect(result.modifications).toEqual({ notifyAssignment: true });
    });

    it('should handle MODIFY effect without notifyAssignment in modifications', async () => {
      const decision = createMockDecision(PolicyEffect.MODIFY, {
        modifications: { someOtherField: 'value' },
      });
      mockEngine.evaluate.mockResolvedValue(createMockEvaluationResult(decision));

      const result = await adapter.evaluateRiderAssignment(baseInput);

      expect(result.allowed).toBe(true);
      expect(result.modifications).toBeUndefined();
    });

    it('should return allowed: false with requiresApproval when effect is REQUIRE_APPROVAL', async () => {
      const approvalRoles = ['fleet-manager'];
      const decision = createMockDecision(PolicyEffect.REQUIRE_APPROVAL, {
        requiresApprovalFrom: approvalRoles,
      });
      mockEngine.evaluate.mockResolvedValue(createMockEvaluationResult(decision));

      const result = await adapter.evaluateRiderAssignment(baseInput);

      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(true);
      expect(result.approvalRoles).toEqual(approvalRoles);
    });

    it('should build correct EvaluationContext', async () => {
      mockEngine.evaluate.mockResolvedValue(
        createMockEvaluationResult(createMockDecision(PolicyEffect.ALLOW))
      );

      await adapter.evaluateRiderAssignment(baseInput);

      expect(mockEngine.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: PolicyTrigger.RIDER_ASSIGNMENT,
          workspaceId: defaultWorkspaceId,
          deliveryId: defaultDeliveryId,
          riderId: defaultRiderId,
        })
      );
    });
  });

  describe('evaluate (generic)', () => {
    it('should pass through to engine.evaluate with full context', async () => {
      const decision = createMockDecision(PolicyEffect.ALLOW);
      const expectedResult = createMockEvaluationResult(decision);
      mockEngine.evaluate.mockResolvedValue(expectedResult);

      const partialContext = {
        workspaceId: defaultWorkspaceId,
        deliveryId: defaultDeliveryId,
        riderId: defaultRiderId,
      };

      const result = await adapter.evaluate(
        PolicyTrigger.STATUS_TRANSITION,
        partialContext
      );

      expect(result).toBe(expectedResult);
      expect(mockEngine.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: PolicyTrigger.STATUS_TRANSITION,
          workspaceId: defaultWorkspaceId,
          deliveryId: defaultDeliveryId,
          riderId: defaultRiderId,
        }),
        undefined
      );
    });

    it('should use provided timestamp from context', async () => {
      const customTimestamp = new Date('2024-01-15T12:00:00Z');
      mockEngine.evaluate.mockResolvedValue(
        createMockEvaluationResult(createMockDecision(PolicyEffect.ALLOW))
      );

      await adapter.evaluate(PolicyTrigger.SLA_CHECK, {
        workspaceId: defaultWorkspaceId,
        timestamp: customTimestamp,
      });

      const calledContext = mockEngine.evaluate.mock.calls[0][0] as EvaluationContext;
      expect(calledContext.timestamp).toEqual(customTimestamp);
    });

    it('should use current time when timestamp is not provided', async () => {
      const beforeCall = new Date();
      mockEngine.evaluate.mockResolvedValue(
        createMockEvaluationResult(createMockDecision(PolicyEffect.ALLOW))
      );

      await adapter.evaluate(PolicyTrigger.SLA_CHECK, {
        workspaceId: defaultWorkspaceId,
      });

      const afterCall = new Date();
      const calledContext = mockEngine.evaluate.mock.calls[0][0] as EvaluationContext;

      expect(calledContext.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(calledContext.timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });

    it('should pass options through to engine', async () => {
      mockEngine.evaluate.mockResolvedValue(
        createMockEvaluationResult(createMockDecision(PolicyEffect.ALLOW))
      );

      const options = {
        failOpen: false,
        requestId: 'req-123',
        correlationId: 'corr-456',
      };

      await adapter.evaluate(
        PolicyTrigger.DELIVERY_CREATION,
        { workspaceId: defaultWorkspaceId },
        options
      );

      expect(mockEngine.evaluate).toHaveBeenCalledWith(expect.any(Object), options);
    });

    it('should include all optional context fields when provided', async () => {
      mockEngine.evaluate.mockResolvedValue(
        createMockEvaluationResult(createMockDecision(PolicyEffect.ALLOW))
      );

      const fullContext = {
        workspaceId: defaultWorkspaceId,
        actorId: 'actor-123',
        deliveryId: defaultDeliveryId,
        riderId: defaultRiderId,
        businessId: defaultBusinessId,
        saccoId: 'sacco-456',
        location: { latitude: -1.2921, longitude: 36.8219 },
        metadata: { customField: 'value' },
      };

      await adapter.evaluate(PolicyTrigger.RIDER_ASSIGNMENT, fullContext);

      expect(mockEngine.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: PolicyTrigger.RIDER_ASSIGNMENT,
          workspaceId: defaultWorkspaceId,
          actorId: 'actor-123',
          deliveryId: defaultDeliveryId,
          riderId: defaultRiderId,
          businessId: defaultBusinessId,
          saccoId: 'sacco-456',
          location: { latitude: -1.2921, longitude: 36.8219 },
          metadata: { customField: 'value' },
        }),
        undefined
      );
    });
  });
});
