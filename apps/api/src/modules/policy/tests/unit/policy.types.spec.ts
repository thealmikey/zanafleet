import {
  PolicyScope,
  PolicyEffect,
  PolicyStatus,
  PolicyTrigger,
  PolicyCondition,
  EvaluationContext,
  PolicyDecision,
  EvaluatedPolicy,
  EvaluationResult,
} from '../../dto';

describe('Policy Enums', () => {
  describe('PolicyScope', () => {
    it('should have all required scope values', () => {
      expect(PolicyScope.GLOBAL).toBe('GLOBAL');
      expect(PolicyScope.NATIONAL).toBe('NATIONAL');
      expect(PolicyScope.SACCO).toBe('SACCO');
      expect(PolicyScope.BUSINESS).toBe('BUSINESS');
      expect(PolicyScope.RIDER).toBe('RIDER');
    });

    it('should have exactly 5 scope values', () => {
      const values = Object.values(PolicyScope);
      expect(values).toHaveLength(5);
    });
  });

  describe('PolicyEffect', () => {
    it('should have all required effect values', () => {
      expect(PolicyEffect.ALLOW).toBe('ALLOW');
      expect(PolicyEffect.BLOCK).toBe('BLOCK');
      expect(PolicyEffect.MODIFY).toBe('MODIFY');
      expect(PolicyEffect.REQUIRE_APPROVAL).toBe('REQUIRE_APPROVAL');
    });

    it('should have exactly 4 effect values', () => {
      const values = Object.values(PolicyEffect);
      expect(values).toHaveLength(4);
    });
  });

  describe('PolicyStatus', () => {
    it('should have all required status values', () => {
      expect(PolicyStatus.ACTIVE).toBe('ACTIVE');
      expect(PolicyStatus.INACTIVE).toBe('INACTIVE');
      expect(PolicyStatus.DRAFT).toBe('DRAFT');
      expect(PolicyStatus.ARCHIVED).toBe('ARCHIVED');
    });

    it('should have exactly 4 status values', () => {
      const values = Object.values(PolicyStatus);
      expect(values).toHaveLength(4);
    });
  });

  describe('PolicyTrigger', () => {
    it('should have all required trigger values', () => {
      expect(PolicyTrigger.DELIVERY_CREATION).toBe('DELIVERY_CREATION');
      expect(PolicyTrigger.RIDER_ASSIGNMENT).toBe('RIDER_ASSIGNMENT');
      expect(PolicyTrigger.STATUS_TRANSITION).toBe('STATUS_TRANSITION');
      expect(PolicyTrigger.SLA_CHECK).toBe('SLA_CHECK');
    });

    it('should have exactly 4 trigger values', () => {
      const values = Object.values(PolicyTrigger);
      expect(values).toHaveLength(4);
    });
  });
});

describe('Policy Types', () => {
  describe('PolicyCondition', () => {
    it('should accept a minimal condition', () => {
      const condition: PolicyCondition = {
        field: 'delivery.status',
        operator: 'eq',
        value: 'Requested',
      };

      expect(condition.field).toBe('delivery.status');
      expect(condition.operator).toBe('eq');
      expect(condition.value).toBe('Requested');
    });

    it('should accept a condition with nested children', () => {
      const condition: PolicyCondition = {
        field: 'rider.vehicleType',
        operator: 'in',
        value: ['Bike', 'TukTuk'],
        logic: 'AND',
        children: [
          {
            field: 'delivery.isScheduled',
            operator: 'eq',
            value: true,
          },
        ],
      };

      expect(condition.logic).toBe('AND');
      expect(condition.children).toHaveLength(1);
      expect(condition.children![0].field).toBe('delivery.isScheduled');
    });
  });

  describe('EvaluationContext', () => {
    it('should accept a minimal context', () => {
      const context: EvaluationContext = {
        trigger: PolicyTrigger.DELIVERY_CREATION,
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: new Date(),
      };

      expect(context.trigger).toBe(PolicyTrigger.DELIVERY_CREATION);
      expect(context.workspaceId).toBeDefined();
      expect(context.timestamp).toBeInstanceOf(Date);
    });

    it('should accept a full context with all optional fields', () => {
      const context: EvaluationContext = {
        trigger: PolicyTrigger.RIDER_ASSIGNMENT,
        actorId: 'actor-123',
        workspaceId: 'workspace-456',
        deliveryId: 'delivery-789',
        riderId: 'rider-abc',
        businessId: 'business-def',
        saccoId: 'sacco-ghi',
        timestamp: new Date(),
        location: {
          latitude: -1.2921,
          longitude: 36.8219,
        },
        metadata: { priority: 'high', source: 'api' },
      };

      expect(context.actorId).toBe('actor-123');
      expect(context.location?.latitude).toBe(-1.2921);
      expect(context.metadata?.priority).toBe('high');
    });
  });

  describe('PolicyDecision', () => {
    it('should accept a minimal decision', () => {
      const decision: PolicyDecision = {
        effect: PolicyEffect.ALLOW,
        policyId: 'policy-123',
        policyName: 'Allow all deliveries',
        reason: 'No restrictions apply',
      };

      expect(decision.effect).toBe(PolicyEffect.ALLOW);
      expect(decision.policyId).toBe('policy-123');
    });

    it('should accept a decision with modifications', () => {
      const decision: PolicyDecision = {
        effect: PolicyEffect.MODIFY,
        policyId: 'policy-456',
        policyName: 'Adjust SLA for scheduled deliveries',
        reason: 'Scheduled delivery SLA extension',
        modifications: {
          slaPickupBy: '2024-01-15T12:00:00Z',
        },
      };

      expect(decision.modifications?.slaPickupBy).toBeDefined();
    });

    it('should accept a decision requiring approval', () => {
      const decision: PolicyDecision = {
        effect: PolicyEffect.REQUIRE_APPROVAL,
        policyId: 'policy-789',
        policyName: 'High value delivery approval',
        reason: 'Delivery value exceeds threshold',
        requiresApprovalFrom: ['manager-123', 'admin-456'],
      };

      expect(decision.requiresApprovalFrom).toHaveLength(2);
    });
  });

  describe('EvaluatedPolicy', () => {
    it('should represent a matched policy', () => {
      const evaluated: EvaluatedPolicy = {
        policyId: 'policy-123',
        matched: true,
        priority: 100,
        scope: PolicyScope.BUSINESS,
      };

      expect(evaluated.matched).toBe(true);
      expect(evaluated.scope).toBe(PolicyScope.BUSINESS);
    });

    it('should represent an unmatched policy', () => {
      const evaluated: EvaluatedPolicy = {
        policyId: 'policy-456',
        matched: false,
        priority: 50,
        scope: PolicyScope.GLOBAL,
      };

      expect(evaluated.matched).toBe(false);
    });
  });

  describe('EvaluationResult', () => {
    it('should contain a complete evaluation result', () => {
      const result: EvaluationResult = {
        finalDecision: {
          effect: PolicyEffect.ALLOW,
          policyId: 'policy-123',
          policyName: 'Default allow policy',
          reason: 'No blocking policies matched',
        },
        evaluatedPolicies: [
          {
            policyId: 'policy-123',
            matched: true,
            priority: 10,
            scope: PolicyScope.GLOBAL,
          },
          {
            policyId: 'policy-456',
            matched: false,
            priority: 100,
            scope: PolicyScope.BUSINESS,
          },
        ],
        processingTimeMs: 5,
        evaluationFailed: false,
      };

      expect(result.finalDecision.effect).toBe(PolicyEffect.ALLOW);
      expect(result.evaluatedPolicies).toHaveLength(2);
      expect(result.processingTimeMs).toBe(5);
      expect(result.evaluationFailed).toBe(false);
    });

    it('should support evaluationFailed and failMode for error scenarios', () => {
      const failOpenResult: EvaluationResult = {
        finalDecision: {
          effect: PolicyEffect.ALLOW,
          policyId: '',
          policyName: 'Fail-Open Default',
          reason: 'Policy evaluation failed - defaulting to ALLOW',
        },
        evaluatedPolicies: [],
        processingTimeMs: 2,
        evaluationFailed: true,
        failMode: 'open',
      };

      expect(failOpenResult.evaluationFailed).toBe(true);
      expect(failOpenResult.failMode).toBe('open');
      expect(failOpenResult.evaluatedPolicies).toHaveLength(0);

      const failClosedResult: EvaluationResult = {
        finalDecision: {
          effect: PolicyEffect.BLOCK,
          policyId: '',
          policyName: 'Fail-Closed Default',
          reason: 'Policy evaluation failed - blocking request',
        },
        evaluatedPolicies: [],
        processingTimeMs: 2,
        evaluationFailed: true,
        failMode: 'closed',
      };

      expect(failClosedResult.evaluationFailed).toBe(true);
      expect(failClosedResult.failMode).toBe('closed');
    });

    it('should not have failMode when evaluation succeeds', () => {
      const result: EvaluationResult = {
        finalDecision: {
          effect: PolicyEffect.ALLOW,
          policyId: 'policy-123',
          policyName: 'Default allow policy',
          reason: 'No blocking policies matched',
        },
        evaluatedPolicies: [],
        processingTimeMs: 5,
        evaluationFailed: false,
      };

      expect(result.evaluationFailed).toBe(false);
      expect(result.failMode).toBeUndefined();
    });
  });
});
