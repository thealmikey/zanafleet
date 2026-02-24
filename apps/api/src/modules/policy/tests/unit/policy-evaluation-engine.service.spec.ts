import { Logger } from '@nestjs/common';

import { EventBusService } from '../../../../core/event-bus/event-bus.service';
import {
  PolicyScope,
  PolicyEffect,
  PolicyStatus,
  PolicyTrigger,
  EvaluationContext,
  PolicyCondition,
} from '../../dto';
import { PolicyEntity } from '../../entities/policy.entity';
import { PolicyDecisionLogRepository } from '../../repositories/policy-decision-log.repository';
import { PolicyRepository } from '../../repositories/policy.repository';
import { JsonLogicEvaluatorService } from '../../services/json-logic-evaluator.service';
import { PolicyEvaluationEngineService } from '../../services/policy-evaluation-engine.service';

describe('PolicyEvaluationEngineService', () => {
  let service: PolicyEvaluationEngineService;
  let policyRepository: jest.Mocked<PolicyRepository>;
  let evaluator: JsonLogicEvaluatorService;
  let decisionLogRepository: jest.Mocked<PolicyDecisionLogRepository>;
  let eventBus: jest.Mocked<EventBusService>;

  const createMockPolicy = (
    overrides: Partial<ReturnType<PolicyEntity['toDomain']>> = {}
  ): PolicyEntity => {
    const condition: PolicyCondition = {
      field: 'trigger',
      operator: '==',
      value: 'DELIVERY_CREATION',
    };

    return PolicyEntity.fromDomain({
      policyId: overrides.policyId ?? 'policy-123',
      name: overrides.name ?? 'Test Policy',
      description: overrides.description ?? null,
      scope: overrides.scope ?? PolicyScope.GLOBAL,
      scopeTargetId: overrides.scopeTargetId ?? null,
      trigger: overrides.trigger ?? PolicyTrigger.DELIVERY_CREATION,
      priority: overrides.priority ?? 0,
      conditions: overrides.conditions ?? condition,
      effect: overrides.effect ?? PolicyEffect.ALLOW,
      modifications: overrides.modifications ?? null,
      approvalRoles: overrides.approvalRoles ?? null,
      status: overrides.status ?? PolicyStatus.ACTIVE,
      effectiveFrom: overrides.effectiveFrom ?? null,
      effectiveUntil: overrides.effectiveUntil ?? null,
      createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00Z'),
      updatedAt: overrides.updatedAt ?? new Date('2024-01-01T00:00:00Z'),
    });
  };

  const createContext = (overrides: Partial<EvaluationContext> = {}): EvaluationContext => ({
    trigger: PolicyTrigger.DELIVERY_CREATION,
    workspaceId: 'workspace-123',
    timestamp: new Date('2024-01-15T14:30:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    policyRepository = {
      findActivePoliciesForTrigger: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<PolicyRepository>;

    evaluator = new JsonLogicEvaluatorService();

    decisionLogRepository = {
      create: jest.fn().mockResolvedValue(undefined),
      findByRequestId: jest.fn(),
      findBySubject: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<PolicyDecisionLogRepository>;

    eventBus = {
      publishEvent: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn(),
      serializeEvent: jest.fn(),
      deserializeEvent: jest.fn(),
      isReady: jest.fn(),
    } as unknown as jest.Mocked<EventBusService>;

    service = new PolicyEvaluationEngineService(
      policyRepository,
      evaluator,
      decisionLogRepository,
      eventBus
    );

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('evaluate', () => {
    it('should return default ALLOW when no policies exist', async () => {
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([]);
      const context = createContext();

      const result = await service.evaluate(context);

      expect(result.finalDecision.effect).toBe(PolicyEffect.ALLOW);
      expect(result.finalDecision.policyId).toBe('');
      expect(result.finalDecision.policyName).toBe('Default Allow');
      expect(result.finalDecision.reason).toContain('No applicable policies matched');
      expect(result.evaluatedPolicies).toHaveLength(0);
      expect(result.evaluationFailed).toBe(false);
    });

    it('should evaluate a single matching policy', async () => {
      const policy = createMockPolicy({
        policyId: 'policy-001',
        name: 'Allow Deliveries',
        effect: PolicyEffect.ALLOW,
        conditions: { field: 'trigger', operator: '==', value: 'DELIVERY_CREATION' },
      });
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([policy]);

      const context = createContext();
      const result = await service.evaluate(context);

      expect(result.finalDecision.effect).toBe(PolicyEffect.ALLOW);
      expect(result.finalDecision.policyId).toBe('policy-001');
      expect(result.finalDecision.policyName).toBe('Allow Deliveries');
      expect(result.evaluatedPolicies).toHaveLength(1);
      expect(result.evaluatedPolicies[0].matched).toBe(true);
      expect(result.evaluationFailed).toBe(false);
    });

    it('should filter out non-matching policies', async () => {
      const matchingPolicy = createMockPolicy({
        policyId: 'policy-match',
        name: 'Matching Policy',
        effect: PolicyEffect.ALLOW,
        conditions: { field: 'trigger', operator: '==', value: 'DELIVERY_CREATION' },
      });
      const nonMatchingPolicy = createMockPolicy({
        policyId: 'policy-no-match',
        name: 'Non-Matching Policy',
        effect: PolicyEffect.BLOCK,
        conditions: { field: 'trigger', operator: '==', value: 'RIDER_ASSIGNMENT' },
      });
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([
        matchingPolicy,
        nonMatchingPolicy,
      ]);

      const context = createContext();
      const result = await service.evaluate(context);

      expect(result.finalDecision.effect).toBe(PolicyEffect.ALLOW);
      expect(result.finalDecision.policyId).toBe('policy-match');
      expect(result.evaluatedPolicies).toHaveLength(2);
      expect(result.evaluatedPolicies.find((p) => p.policyId === 'policy-match')?.matched).toBe(
        true
      );
      expect(result.evaluatedPolicies.find((p) => p.policyId === 'policy-no-match')?.matched).toBe(
        false
      );
    });

    it('should log decision asynchronously', async () => {
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([]);
      const context = createContext();

      await service.evaluate(context, { correlationId: 'test-corr-id' });

      await new Promise((resolve) => setImmediate(resolve));

      expect(decisionLogRepository.create).toHaveBeenCalledTimes(1);
      expect(decisionLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: PolicyTrigger.DELIVERY_CREATION,
          workspaceId: 'workspace-123',
          finalEffect: PolicyEffect.ALLOW,
          evaluationFailed: false,
          correlationId: 'test-corr-id',
        })
      );
    });

    it('should publish event asynchronously', async () => {
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([]);
      const context = createContext();

      await service.evaluate(context);

      await new Promise((resolve) => setImmediate(resolve));

      expect(eventBus.publishEvent).toHaveBeenCalledTimes(1);
      expect(eventBus.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PolicyEvaluatedEvent-V1',
          trigger: PolicyTrigger.DELIVERY_CREATION,
          workspaceId: 'workspace-123',
          finalEffect: PolicyEffect.ALLOW,
          evaluationFailed: false,
        })
      );
    });

    it('should track processing time', async () => {
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([]);
      const context = createContext();

      const result = await service.evaluate(context);

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });
  });

  describe('conflict resolution', () => {
    describe('scope specificity ordering', () => {
      it('should prefer RIDER scope over BUSINESS scope', async () => {
        const riderPolicy = createMockPolicy({
          policyId: 'rider-policy',
          name: 'Rider Policy',
          scope: PolicyScope.RIDER,
          effect: PolicyEffect.BLOCK,
          priority: 0,
          createdAt: new Date('2024-01-02T00:00:00Z'),
        });
        const businessPolicy = createMockPolicy({
          policyId: 'business-policy',
          name: 'Business Policy',
          scope: PolicyScope.BUSINESS,
          effect: PolicyEffect.ALLOW,
          priority: 0,
          createdAt: new Date('2024-01-01T00:00:00Z'),
        });
        policyRepository.findActivePoliciesForTrigger.mockResolvedValue([
          businessPolicy,
          riderPolicy,
        ]);

        const context = createContext();
        const result = await service.evaluate(context);

        expect(result.finalDecision.policyId).toBe('rider-policy');
        expect(result.finalDecision.effect).toBe(PolicyEffect.BLOCK);
      });

      it('should prefer BUSINESS scope over SACCO scope', async () => {
        const businessPolicy = createMockPolicy({
          policyId: 'business-policy',
          scope: PolicyScope.BUSINESS,
          effect: PolicyEffect.ALLOW,
        });
        const saccoPolicy = createMockPolicy({
          policyId: 'sacco-policy',
          scope: PolicyScope.SACCO,
          effect: PolicyEffect.BLOCK,
        });
        policyRepository.findActivePoliciesForTrigger.mockResolvedValue([
          saccoPolicy,
          businessPolicy,
        ]);

        const result = await service.evaluate(createContext());

        expect(result.finalDecision.policyId).toBe('business-policy');
      });

      it('should prefer SACCO scope over NATIONAL scope', async () => {
        const saccoPolicy = createMockPolicy({
          policyId: 'sacco-policy',
          scope: PolicyScope.SACCO,
          effect: PolicyEffect.ALLOW,
        });
        const nationalPolicy = createMockPolicy({
          policyId: 'national-policy',
          scope: PolicyScope.NATIONAL,
          effect: PolicyEffect.BLOCK,
        });
        policyRepository.findActivePoliciesForTrigger.mockResolvedValue([
          nationalPolicy,
          saccoPolicy,
        ]);

        const result = await service.evaluate(createContext());

        expect(result.finalDecision.policyId).toBe('sacco-policy');
      });

      it('should prefer NATIONAL scope over GLOBAL scope', async () => {
        const nationalPolicy = createMockPolicy({
          policyId: 'national-policy',
          scope: PolicyScope.NATIONAL,
          effect: PolicyEffect.ALLOW,
        });
        const globalPolicy = createMockPolicy({
          policyId: 'global-policy',
          scope: PolicyScope.GLOBAL,
          effect: PolicyEffect.BLOCK,
        });
        policyRepository.findActivePoliciesForTrigger.mockResolvedValue([
          globalPolicy,
          nationalPolicy,
        ]);

        const result = await service.evaluate(createContext());

        expect(result.finalDecision.policyId).toBe('national-policy');
      });

      it('should respect full scope hierarchy: RIDER > BUSINESS > SACCO > NATIONAL > GLOBAL', async () => {
        const policies = [
          createMockPolicy({
            policyId: 'global',
            scope: PolicyScope.GLOBAL,
            effect: PolicyEffect.ALLOW,
          }),
          createMockPolicy({
            policyId: 'national',
            scope: PolicyScope.NATIONAL,
            effect: PolicyEffect.ALLOW,
          }),
          createMockPolicy({
            policyId: 'sacco',
            scope: PolicyScope.SACCO,
            effect: PolicyEffect.ALLOW,
          }),
          createMockPolicy({
            policyId: 'business',
            scope: PolicyScope.BUSINESS,
            effect: PolicyEffect.ALLOW,
          }),
          createMockPolicy({
            policyId: 'rider',
            scope: PolicyScope.RIDER,
            effect: PolicyEffect.BLOCK,
          }),
        ];
        policyRepository.findActivePoliciesForTrigger.mockResolvedValue(policies);

        const result = await service.evaluate(createContext());

        expect(result.finalDecision.policyId).toBe('rider');
        expect(result.finalDecision.effect).toBe(PolicyEffect.BLOCK);
      });
    });

    describe('priority ordering', () => {
      it('should prefer higher priority within same scope', async () => {
        const highPriorityPolicy = createMockPolicy({
          policyId: 'high-priority',
          scope: PolicyScope.GLOBAL,
          priority: 100,
          effect: PolicyEffect.BLOCK,
        });
        const lowPriorityPolicy = createMockPolicy({
          policyId: 'low-priority',
          scope: PolicyScope.GLOBAL,
          priority: 10,
          effect: PolicyEffect.ALLOW,
        });
        policyRepository.findActivePoliciesForTrigger.mockResolvedValue([
          lowPriorityPolicy,
          highPriorityPolicy,
        ]);

        const result = await service.evaluate(createContext());

        expect(result.finalDecision.policyId).toBe('high-priority');
        expect(result.finalDecision.effect).toBe(PolicyEffect.BLOCK);
      });

      it('should not override scope specificity with priority', async () => {
        const highPriorityGlobal = createMockPolicy({
          policyId: 'high-priority-global',
          scope: PolicyScope.GLOBAL,
          priority: 1000,
          effect: PolicyEffect.ALLOW,
        });
        const lowPriorityBusiness = createMockPolicy({
          policyId: 'low-priority-business',
          scope: PolicyScope.BUSINESS,
          priority: 1,
          effect: PolicyEffect.BLOCK,
        });
        policyRepository.findActivePoliciesForTrigger.mockResolvedValue([
          highPriorityGlobal,
          lowPriorityBusiness,
        ]);

        const result = await service.evaluate(createContext());

        expect(result.finalDecision.policyId).toBe('low-priority-business');
        expect(result.finalDecision.effect).toBe(PolicyEffect.BLOCK);
      });
    });

    describe('BLOCK precedence over ALLOW', () => {
      it('should prefer BLOCK over ALLOW at same scope and priority', async () => {
        const allowPolicy = createMockPolicy({
          policyId: 'allow-policy',
          scope: PolicyScope.GLOBAL,
          priority: 50,
          effect: PolicyEffect.ALLOW,
          createdAt: new Date('2024-01-01T00:00:00Z'),
        });
        const blockPolicy = createMockPolicy({
          policyId: 'block-policy',
          scope: PolicyScope.GLOBAL,
          priority: 50,
          effect: PolicyEffect.BLOCK,
          createdAt: new Date('2024-01-02T00:00:00Z'),
        });
        policyRepository.findActivePoliciesForTrigger.mockResolvedValue([allowPolicy, blockPolicy]);

        const result = await service.evaluate(createContext());

        expect(result.finalDecision.policyId).toBe('block-policy');
        expect(result.finalDecision.effect).toBe(PolicyEffect.BLOCK);
      });

      it('should not override priority with BLOCK precedence', async () => {
        const lowPriorityBlock = createMockPolicy({
          policyId: 'low-priority-block',
          scope: PolicyScope.GLOBAL,
          priority: 10,
          effect: PolicyEffect.BLOCK,
        });
        const highPriorityAllow = createMockPolicy({
          policyId: 'high-priority-allow',
          scope: PolicyScope.GLOBAL,
          priority: 100,
          effect: PolicyEffect.ALLOW,
        });
        policyRepository.findActivePoliciesForTrigger.mockResolvedValue([
          lowPriorityBlock,
          highPriorityAllow,
        ]);

        const result = await service.evaluate(createContext());

        expect(result.finalDecision.policyId).toBe('high-priority-allow');
        expect(result.finalDecision.effect).toBe(PolicyEffect.ALLOW);
      });
    });

    describe('createdAt ordering', () => {
      it('should prefer oldest policy when all else is equal', async () => {
        const olderPolicy = createMockPolicy({
          policyId: 'older-policy',
          scope: PolicyScope.GLOBAL,
          priority: 50,
          effect: PolicyEffect.ALLOW,
          createdAt: new Date('2024-01-01T00:00:00Z'),
        });
        const newerPolicy = createMockPolicy({
          policyId: 'newer-policy',
          scope: PolicyScope.GLOBAL,
          priority: 50,
          effect: PolicyEffect.ALLOW,
          createdAt: new Date('2024-01-15T00:00:00Z'),
        });
        policyRepository.findActivePoliciesForTrigger.mockResolvedValue([newerPolicy, olderPolicy]);

        const result = await service.evaluate(createContext());

        expect(result.finalDecision.policyId).toBe('older-policy');
      });
    });

    describe('MODIFY and REQUIRE_APPROVAL effects', () => {
      it('should include modifications when MODIFY effect wins', async () => {
        const modifyPolicy = createMockPolicy({
          policyId: 'modify-policy',
          scope: PolicyScope.BUSINESS,
          effect: PolicyEffect.MODIFY,
          modifications: { slaExtensionMinutes: 30 },
        });
        policyRepository.findActivePoliciesForTrigger.mockResolvedValue([modifyPolicy]);

        const result = await service.evaluate(createContext());

        expect(result.finalDecision.effect).toBe(PolicyEffect.MODIFY);
        expect(result.finalDecision.modifications).toEqual({ slaExtensionMinutes: 30 });
      });

      it('should include approvalRoles when REQUIRE_APPROVAL effect wins', async () => {
        const approvalPolicy = createMockPolicy({
          policyId: 'approval-policy',
          scope: PolicyScope.SACCO,
          effect: PolicyEffect.REQUIRE_APPROVAL,
          approvalRoles: ['sacco_admin', 'ops_manager'],
        });
        policyRepository.findActivePoliciesForTrigger.mockResolvedValue([approvalPolicy]);

        const result = await service.evaluate(createContext());

        expect(result.finalDecision.effect).toBe(PolicyEffect.REQUIRE_APPROVAL);
        expect(result.finalDecision.requiresApprovalFrom).toEqual(['sacco_admin', 'ops_manager']);
      });
    });
  });

  describe('fail-open behavior', () => {
    it('should return ALLOW with failedOpen=true when repository throws and failOpen=true', async () => {
      policyRepository.findActivePoliciesForTrigger.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await service.evaluate(createContext(), { failOpen: true });

      expect(result.finalDecision.effect).toBe(PolicyEffect.ALLOW);
      expect(result.finalDecision.policyName).toBe('Fail-Open Default');
      expect(result.finalDecision.reason).toContain('Database connection failed');
      expect(result.evaluationFailed).toBe(true);
      expect(result.failMode).toBe('open');
      expect(result.evaluatedPolicies).toHaveLength(0);
    });

    it('should default to failOpen=true when not specified', async () => {
      policyRepository.findActivePoliciesForTrigger.mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await service.evaluate(createContext());

      expect(result.finalDecision.effect).toBe(PolicyEffect.ALLOW);
      expect(result.evaluationFailed).toBe(true);
      expect(result.failMode).toBe('open');
    });

    it('should still log decision on fail-open', async () => {
      policyRepository.findActivePoliciesForTrigger.mockRejectedValue(new Error('DB error'));

      await service.evaluate(createContext(), { failOpen: true, correlationId: 'fail-open-corr' });
      await new Promise((resolve) => setImmediate(resolve));

      expect(decisionLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          evaluationFailed: true,
          failMode: 'open',
          finalEffect: PolicyEffect.ALLOW,
          correlationId: 'fail-open-corr',
        })
      );
    });

    it('should still publish event on fail-open', async () => {
      policyRepository.findActivePoliciesForTrigger.mockRejectedValue(new Error('DB error'));

      await service.evaluate(createContext(), { failOpen: true });
      await new Promise((resolve) => setImmediate(resolve));

      expect(eventBus.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          evaluationFailed: true,
          failMode: 'open',
          finalEffect: PolicyEffect.ALLOW,
        })
      );
    });
  });

  describe('fail-closed behavior', () => {
    it('should return BLOCK with failedOpen=true when repository throws and failOpen=false', async () => {
      policyRepository.findActivePoliciesForTrigger.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await service.evaluate(createContext(), { failOpen: false });

      expect(result.finalDecision.effect).toBe(PolicyEffect.BLOCK);
      expect(result.finalDecision.policyName).toBe('Fail-Closed Default');
      expect(result.finalDecision.reason).toContain('Database connection failed');
      expect(result.evaluationFailed).toBe(true);
      expect(result.failMode).toBe('closed');
      expect(result.evaluatedPolicies).toHaveLength(0);
    });

    it('should still log decision on fail-closed', async () => {
      policyRepository.findActivePoliciesForTrigger.mockRejectedValue(new Error('DB error'));

      await service.evaluate(createContext(), {
        failOpen: false,
        correlationId: 'fail-closed-corr',
      });
      await new Promise((resolve) => setImmediate(resolve));

      expect(decisionLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          evaluationFailed: true,
          failMode: 'closed',
          finalEffect: PolicyEffect.BLOCK,
          correlationId: 'fail-closed-corr',
        })
      );
    });

    it('should still publish event on fail-closed', async () => {
      policyRepository.findActivePoliciesForTrigger.mockRejectedValue(new Error('DB error'));

      await service.evaluate(createContext(), { failOpen: false });
      await new Promise((resolve) => setImmediate(resolve));

      expect(eventBus.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          evaluationFailed: true,
          failMode: 'closed',
          finalEffect: PolicyEffect.BLOCK,
        })
      );
    });
  });

  describe('error handling resilience', () => {
    it('should not throw when logging fails', async () => {
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([]);
      decisionLogRepository.create.mockRejectedValue(new Error('Log write failed'));

      const result = await service.evaluate(createContext());

      expect(result.finalDecision.effect).toBe(PolicyEffect.ALLOW);
      expect(result.evaluationFailed).toBe(false);
    });

    it('should not throw when event publishing fails', async () => {
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([]);
      eventBus.publishEvent.mockRejectedValue(new Error('NATS unavailable'));

      const result = await service.evaluate(createContext());

      expect(result.finalDecision.effect).toBe(PolicyEffect.ALLOW);
      expect(result.evaluationFailed).toBe(false);
    });

    it('should handle non-Error exceptions gracefully', async () => {
      policyRepository.findActivePoliciesForTrigger.mockRejectedValue('string error');

      const result = await service.evaluate(createContext());

      expect(result.finalDecision.effect).toBe(PolicyEffect.ALLOW);
      expect(result.evaluationFailed).toBe(true);
      expect(result.failMode).toBe('open');
      expect(result.finalDecision.reason).toContain('string error');
    });
  });

  describe('subject determination', () => {
    it('should use deliveryId as subject when present', async () => {
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([]);
      const context = createContext({ deliveryId: 'delivery-123', riderId: 'rider-456' });

      await service.evaluate(context);
      await new Promise((resolve) => setImmediate(resolve));

      expect(decisionLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectType: 'Delivery',
          subjectId: 'delivery-123',
        })
      );
    });

    it('should use riderId as subject when no deliveryId', async () => {
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([]);
      const context = createContext({ riderId: 'rider-456', businessId: 'business-789' });

      await service.evaluate(context);
      await new Promise((resolve) => setImmediate(resolve));

      expect(decisionLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectType: 'Rider',
          subjectId: 'rider-456',
        })
      );
    });

    it('should use businessId as subject when no deliveryId or riderId', async () => {
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([]);
      const context = createContext({ businessId: 'business-789' });

      await service.evaluate(context);
      await new Promise((resolve) => setImmediate(resolve));

      expect(decisionLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectType: 'Business',
          subjectId: 'business-789',
        })
      );
    });

    it('should use workspaceId as subject when no specific entity', async () => {
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([]);
      const context = createContext();

      await service.evaluate(context);
      await new Promise((resolve) => setImmediate(resolve));

      expect(decisionLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectType: 'Workspace',
          subjectId: 'workspace-123',
        })
      );
    });
  });

  describe('violation event publishing', () => {
    it('should publish PolicyViolationDetectedEventV1 when effect is BLOCK', async () => {
      const blockPolicy = createMockPolicy({
        policyId: 'block-policy-001',
        name: 'Block Policy',
        effect: PolicyEffect.BLOCK,
      });
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([blockPolicy]);

      const context = createContext({ deliveryId: 'delivery-violation-test' });
      await service.evaluate(context);
      await new Promise((resolve) => setImmediate(resolve));

      expect(eventBus.publishEvent).toHaveBeenCalledTimes(2);
      expect(eventBus.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PolicyViolationDetectedEvent-V1',
          policyId: 'block-policy-001',
          policyName: 'Block Policy',
          violationType: 'BLOCKED',
          effect: PolicyEffect.BLOCK,
        })
      );
    });

    it('should publish PolicyViolationDetectedEventV1 when effect is REQUIRE_APPROVAL', async () => {
      const approvalPolicy = createMockPolicy({
        policyId: 'approval-policy-001',
        name: 'Approval Policy',
        effect: PolicyEffect.REQUIRE_APPROVAL,
        approvalRoles: ['manager'],
      });
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([approvalPolicy]);

      const context = createContext({ deliveryId: 'delivery-approval-test' });
      await service.evaluate(context);
      await new Promise((resolve) => setImmediate(resolve));

      expect(eventBus.publishEvent).toHaveBeenCalledTimes(2);
      expect(eventBus.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PolicyViolationDetectedEvent-V1',
          policyId: 'approval-policy-001',
          policyName: 'Approval Policy',
          violationType: 'REQUIRES_APPROVAL',
          effect: PolicyEffect.REQUIRE_APPROVAL,
        })
      );
    });

    it('should NOT publish PolicyViolationDetectedEventV1 when effect is ALLOW', async () => {
      const allowPolicy = createMockPolicy({
        policyId: 'allow-policy-001',
        name: 'Allow Policy',
        effect: PolicyEffect.ALLOW,
      });
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([allowPolicy]);

      await service.evaluate(createContext());
      await new Promise((resolve) => setImmediate(resolve));

      expect(eventBus.publishEvent).toHaveBeenCalledTimes(1);
      expect(eventBus.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PolicyEvaluatedEvent-V1',
        })
      );
      expect(eventBus.publishEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PolicyViolationDetectedEvent-V1',
        })
      );
    });

    it('should NOT publish PolicyViolationDetectedEventV1 when effect is MODIFY', async () => {
      const modifyPolicy = createMockPolicy({
        policyId: 'modify-policy-001',
        name: 'Modify Policy',
        effect: PolicyEffect.MODIFY,
        modifications: { slaExtension: 30 },
      });
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([modifyPolicy]);

      await service.evaluate(createContext());
      await new Promise((resolve) => setImmediate(resolve));

      expect(eventBus.publishEvent).toHaveBeenCalledTimes(1);
      expect(eventBus.publishEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PolicyViolationDetectedEvent-V1',
        })
      );
    });

    it('should NOT publish PolicyViolationDetectedEventV1 when no policies match (default ALLOW)', async () => {
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([]);

      await service.evaluate(createContext());
      await new Promise((resolve) => setImmediate(resolve));

      expect(eventBus.publishEvent).toHaveBeenCalledTimes(1);
      expect(eventBus.publishEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PolicyViolationDetectedEvent-V1',
        })
      );
    });

    it('should include correct subject info in violation event', async () => {
      const blockPolicy = createMockPolicy({
        policyId: 'block-policy-002',
        name: 'Block Policy',
        effect: PolicyEffect.BLOCK,
      });
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([blockPolicy]);

      const context = createContext({
        deliveryId: 'delivery-subject-test',
        riderId: 'rider-456',
      });
      await service.evaluate(context);
      await new Promise((resolve) => setImmediate(resolve));

      expect(eventBus.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PolicyViolationDetectedEvent-V1',
          subjectType: 'Delivery',
          subjectId: 'delivery-subject-test',
          workspaceId: 'workspace-123',
          trigger: PolicyTrigger.DELIVERY_CREATION,
        })
      );
    });

    it('should pass correlationId to violation event', async () => {
      const blockPolicy = createMockPolicy({
        policyId: 'block-policy-corr',
        effect: PolicyEffect.BLOCK,
      });
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([blockPolicy]);

      await service.evaluate(createContext(), { correlationId: 'corr-violation-123' });
      await new Promise((resolve) => setImmediate(resolve));

      expect(eventBus.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PolicyViolationDetectedEvent-V1',
          correlationId: 'corr-violation-123',
        })
      );
    });

    it('should include reason in violation event', async () => {
      const blockPolicy = createMockPolicy({
        policyId: 'block-policy-reason',
        name: 'Block With Reason',
        effect: PolicyEffect.BLOCK,
      });
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([blockPolicy]);

      await service.evaluate(createContext());
      await new Promise((resolve) => setImmediate(resolve));

      expect(eventBus.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PolicyViolationDetectedEvent-V1',
          reason: expect.any(String),
        })
      );
    });
  });

  describe('scope target ID collection', () => {
    it('should pass scope target IDs to repository', async () => {
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([]);
      const context = createContext({
        riderId: 'rider-123',
        businessId: 'business-456',
        saccoId: 'sacco-789',
      });

      await service.evaluate(context);

      expect(policyRepository.findActivePoliciesForTrigger).toHaveBeenCalledWith(
        PolicyTrigger.DELIVERY_CREATION,
        expect.objectContaining({
          scopeTargetIds: expect.arrayContaining(['rider-123', 'business-456', 'sacco-789']),
        })
      );
    });

    it('should not pass scopeTargetIds when none present in context', async () => {
      policyRepository.findActivePoliciesForTrigger.mockResolvedValue([]);
      const context = createContext();

      await service.evaluate(context);

      expect(policyRepository.findActivePoliciesForTrigger).toHaveBeenCalledWith(
        PolicyTrigger.DELIVERY_CREATION,
        expect.objectContaining({
          scopeTargetIds: undefined,
        })
      );
    });
  });
});
