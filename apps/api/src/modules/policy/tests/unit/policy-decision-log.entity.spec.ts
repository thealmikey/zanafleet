import {
  PolicyEffect,
  PolicyScope,
  PolicyTrigger,
  EvaluationContext,
} from '../../dto';
import {
  PolicyDecisionLogEntity,
  EvaluatedPolicyLogEntry,
} from '../../entities/policy-decision-log.entity';

describe('PolicyDecisionLogEntity', () => {
  const sampleContext: EvaluationContext = {
    trigger: PolicyTrigger.DELIVERY_CREATION,
    workspaceId: '123e4567-e89b-12d3-a456-426614174000',
    actorId: 'actor-123',
    deliveryId: 'delivery-456',
    riderId: 'rider-789',
    businessId: 'business-abc',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    location: {
      latitude: -1.2921,
      longitude: 36.8219,
    },
    metadata: { priority: 'high', source: 'api' },
  };

  const sampleEvaluatedPolicies: EvaluatedPolicyLogEntry[] = [
    {
      policyId: 'policy-001',
      policyName: 'Global Allow Policy',
      scope: PolicyScope.GLOBAL,
      priority: 10,
      matched: true,
      matchReason: 'Default allow - no restrictions',
    },
    {
      policyId: 'policy-002',
      policyName: 'Business Hours Block',
      scope: PolicyScope.BUSINESS,
      priority: 100,
      matched: false,
      matchReason: 'Condition not met: current time within business hours',
    },
  ];

  const sampleDomainData = {
    logId: '223e4567-e89b-12d3-a456-426614174001',
    requestId: '323e4567-e89b-12d3-a456-426614174002',
    trigger: PolicyTrigger.DELIVERY_CREATION,
    workspaceId: '123e4567-e89b-12d3-a456-426614174000',
    actorId: 'actor-123',
    subjectType: 'Delivery',
    subjectId: 'delivery-456',
    contextSnapshot: sampleContext,
    evaluatedPolicies: sampleEvaluatedPolicies,
    finalEffect: PolicyEffect.ALLOW,
    finalPolicyId: 'policy-001',
    finalReason: 'Default allow - no restrictions',
    modifications: null,
    processingTimeMs: 5,
    failedOpen: false,
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  describe('fromDomain', () => {
    it('should create an entity from full domain data', () => {
      const entity = PolicyDecisionLogEntity.fromDomain(sampleDomainData);

      expect(entity.id).toBe(sampleDomainData.logId);
      expect(entity.requestId).toBe(sampleDomainData.requestId);
      expect(entity.trigger).toBe(sampleDomainData.trigger);
      expect(entity.workspaceId).toBe(sampleDomainData.workspaceId);
      expect(entity.actorId).toBe(sampleDomainData.actorId);
      expect(entity.subjectType).toBe(sampleDomainData.subjectType);
      expect(entity.subjectId).toBe(sampleDomainData.subjectId);
      expect(entity.contextSnapshot).toEqual(sampleDomainData.contextSnapshot);
      expect(entity.evaluatedPolicies).toEqual(sampleDomainData.evaluatedPolicies);
      expect(entity.finalEffect).toBe(sampleDomainData.finalEffect);
      expect(entity.finalPolicyId).toBe(sampleDomainData.finalPolicyId);
      expect(entity.finalReason).toBe(sampleDomainData.finalReason);
      expect(entity.modifications).toBeNull();
      expect(entity.processingTimeMs).toBe(sampleDomainData.processingTimeMs);
      expect(entity.failedOpen).toBe(false);
      expect(entity.createdAt).toEqual(sampleDomainData.createdAt);
    });

    it('should apply default values for optional fields', () => {
      const minimalData = {
        logId: '223e4567-e89b-12d3-a456-426614174001',
        requestId: '323e4567-e89b-12d3-a456-426614174002',
        trigger: PolicyTrigger.RIDER_ASSIGNMENT,
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        subjectType: 'Rider',
        subjectId: 'rider-789',
        contextSnapshot: {
          trigger: PolicyTrigger.RIDER_ASSIGNMENT,
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          timestamp: new Date(),
        },
        evaluatedPolicies: [],
        finalEffect: PolicyEffect.ALLOW,
        finalReason: 'No policies to evaluate',
        processingTimeMs: 1,
        createdAt: new Date(),
      };

      const entity = PolicyDecisionLogEntity.fromDomain(minimalData);

      expect(entity.actorId).toBeNull();
      expect(entity.finalPolicyId).toBeNull();
      expect(entity.modifications).toBeNull();
      expect(entity.failedOpen).toBe(false);
    });

    it('should handle BLOCK effect with finalPolicyId', () => {
      const blockData = {
        ...sampleDomainData,
        finalEffect: PolicyEffect.BLOCK,
        finalPolicyId: 'policy-block-001',
        finalReason: 'Delivery blocked due to SACCO restriction',
      };

      const entity = PolicyDecisionLogEntity.fromDomain(blockData);

      expect(entity.finalEffect).toBe(PolicyEffect.BLOCK);
      expect(entity.finalPolicyId).toBe('policy-block-001');
    });

    it('should handle MODIFY effect with modifications', () => {
      const modifyData = {
        ...sampleDomainData,
        finalEffect: PolicyEffect.MODIFY,
        modifications: {
          slaExtensionMinutes: 30,
          priorityBoost: 5,
        },
      };

      const entity = PolicyDecisionLogEntity.fromDomain(modifyData);

      expect(entity.finalEffect).toBe(PolicyEffect.MODIFY);
      expect(entity.modifications).toEqual({
        slaExtensionMinutes: 30,
        priorityBoost: 5,
      });
    });

    it('should handle failedOpen = true', () => {
      const failedOpenData = {
        ...sampleDomainData,
        failedOpen: true,
        finalReason: 'Policy evaluation failed - defaulting to ALLOW',
      };

      const entity = PolicyDecisionLogEntity.fromDomain(failedOpenData);

      expect(entity.failedOpen).toBe(true);
    });
  });

  describe('toDomain', () => {
    it('should convert entity to domain object', () => {
      const entity = PolicyDecisionLogEntity.fromDomain(sampleDomainData);
      const domain = entity.toDomain();

      expect(domain.logId).toBe(sampleDomainData.logId);
      expect(domain.requestId).toBe(sampleDomainData.requestId);
      expect(domain.trigger).toBe(sampleDomainData.trigger);
      expect(domain.workspaceId).toBe(sampleDomainData.workspaceId);
      expect(domain.actorId).toBe(sampleDomainData.actorId);
      expect(domain.subjectType).toBe(sampleDomainData.subjectType);
      expect(domain.subjectId).toBe(sampleDomainData.subjectId);
      expect(domain.contextSnapshot).toEqual(sampleDomainData.contextSnapshot);
      expect(domain.evaluatedPolicies).toEqual(sampleDomainData.evaluatedPolicies);
      expect(domain.finalEffect).toBe(sampleDomainData.finalEffect);
      expect(domain.finalPolicyId).toBe(sampleDomainData.finalPolicyId);
      expect(domain.finalReason).toBe(sampleDomainData.finalReason);
      expect(domain.modifications).toBeNull();
      expect(domain.processingTimeMs).toBe(sampleDomainData.processingTimeMs);
      expect(domain.failedOpen).toBe(sampleDomainData.failedOpen);
      expect(domain.createdAt).toEqual(sampleDomainData.createdAt);
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve all data through fromDomain -> toDomain', () => {
      const entity = PolicyDecisionLogEntity.fromDomain(sampleDomainData);
      const domain = entity.toDomain();

      expect(domain.logId).toBe(sampleDomainData.logId);
      expect(domain.requestId).toBe(sampleDomainData.requestId);
      expect(domain.trigger).toBe(sampleDomainData.trigger);
      expect(domain.workspaceId).toBe(sampleDomainData.workspaceId);
      expect(domain.actorId).toBe(sampleDomainData.actorId);
      expect(domain.subjectType).toBe(sampleDomainData.subjectType);
      expect(domain.subjectId).toBe(sampleDomainData.subjectId);
      expect(domain.contextSnapshot).toEqual(sampleDomainData.contextSnapshot);
      expect(domain.evaluatedPolicies).toEqual(sampleDomainData.evaluatedPolicies);
      expect(domain.finalEffect).toBe(sampleDomainData.finalEffect);
      expect(domain.finalPolicyId).toBe(sampleDomainData.finalPolicyId);
      expect(domain.finalReason).toBe(sampleDomainData.finalReason);
      expect(domain.modifications).toBe(sampleDomainData.modifications);
      expect(domain.processingTimeMs).toBe(sampleDomainData.processingTimeMs);
      expect(domain.failedOpen).toBe(sampleDomainData.failedOpen);
      expect(domain.createdAt).toEqual(sampleDomainData.createdAt);
    });

    it('should preserve complex contextSnapshot through round-trip', () => {
      const complexContext: EvaluationContext = {
        trigger: PolicyTrigger.STATUS_TRANSITION,
        actorId: 'actor-complex',
        workspaceId: 'workspace-123',
        deliveryId: 'delivery-complex',
        riderId: 'rider-complex',
        businessId: 'business-complex',
        saccoId: 'sacco-complex',
        timestamp: new Date('2024-02-20T15:30:00Z'),
        location: {
          latitude: -1.3000,
          longitude: 36.8000,
        },
        metadata: {
          previousStatus: 'Requested',
          newStatus: 'Assigned',
          nested: { deep: { value: 42 } },
          tags: ['urgent', 'vip', 'scheduled'],
        },
      };

      const dataWithComplexContext = {
        ...sampleDomainData,
        contextSnapshot: complexContext,
      };

      const entity = PolicyDecisionLogEntity.fromDomain(dataWithComplexContext);
      const domain = entity.toDomain();

      expect(domain.contextSnapshot).toEqual(complexContext);
      expect(domain.contextSnapshot.metadata?.nested).toEqual({ deep: { value: 42 } });
    });

    it('should preserve evaluated policies array through round-trip', () => {
      const manyPolicies: EvaluatedPolicyLogEntry[] = [
        {
          policyId: 'policy-global',
          policyName: 'Global Default',
          scope: PolicyScope.GLOBAL,
          priority: 0,
          matched: true,
          matchReason: 'Catch-all policy',
        },
        {
          policyId: 'policy-national',
          policyName: 'Kenya Regulations',
          scope: PolicyScope.NATIONAL,
          priority: 50,
          matched: false,
          matchReason: 'Country code mismatch',
        },
        {
          policyId: 'policy-sacco',
          policyName: 'SACCO Business Hours',
          scope: PolicyScope.SACCO,
          priority: 100,
          matched: true,
          matchReason: 'SACCO ID matched and time within hours',
        },
        {
          policyId: 'policy-business',
          policyName: 'Business Priority Override',
          scope: PolicyScope.BUSINESS,
          priority: 150,
          matched: false,
          matchReason: 'Business not in priority list',
        },
        {
          policyId: 'policy-rider',
          policyName: 'Rider Certification Check',
          scope: PolicyScope.RIDER,
          priority: 200,
          matched: true,
          matchReason: 'Rider has valid certification',
        },
      ];

      const dataWithManyPolicies = {
        ...sampleDomainData,
        evaluatedPolicies: manyPolicies,
      };

      const entity = PolicyDecisionLogEntity.fromDomain(dataWithManyPolicies);
      const domain = entity.toDomain();

      expect(domain.evaluatedPolicies).toHaveLength(5);
      expect(domain.evaluatedPolicies).toEqual(manyPolicies);
    });

    it('should preserve complex modifications through round-trip', () => {
      const complexModifications = {
        slaAdjustment: { pickupMinutes: 15, dropoffMinutes: 30 },
        priorityOverride: 100,
        tags: ['modified', 'extended-sla'],
        metadata: { reason: 'Weather delay', approvedBy: 'system' },
      };

      const dataWithModifications = {
        ...sampleDomainData,
        finalEffect: PolicyEffect.MODIFY,
        modifications: complexModifications,
      };

      const entity = PolicyDecisionLogEntity.fromDomain(dataWithModifications);
      const domain = entity.toDomain();

      expect(domain.modifications).toEqual(complexModifications);
    });
  });

  describe('edge cases', () => {
    it('should handle all PolicyTrigger values', () => {
      const triggers = [
        PolicyTrigger.DELIVERY_CREATION,
        PolicyTrigger.RIDER_ASSIGNMENT,
        PolicyTrigger.STATUS_TRANSITION,
        PolicyTrigger.SLA_CHECK,
      ];

      for (const trigger of triggers) {
        const data = {
          ...sampleDomainData,
          trigger,
          contextSnapshot: { ...sampleContext, trigger },
        };
        const entity = PolicyDecisionLogEntity.fromDomain(data);
        expect(entity.trigger).toBe(trigger);
        expect(entity.toDomain().trigger).toBe(trigger);
      }
    });

    it('should handle all PolicyEffect values', () => {
      const effects = [
        PolicyEffect.ALLOW,
        PolicyEffect.BLOCK,
        PolicyEffect.MODIFY,
        PolicyEffect.REQUIRE_APPROVAL,
      ];

      for (const finalEffect of effects) {
        const data = { ...sampleDomainData, finalEffect };
        const entity = PolicyDecisionLogEntity.fromDomain(data);
        expect(entity.finalEffect).toBe(finalEffect);
        expect(entity.toDomain().finalEffect).toBe(finalEffect);
      }
    });

    it('should handle empty evaluatedPolicies array', () => {
      const data = { ...sampleDomainData, evaluatedPolicies: [] };
      const entity = PolicyDecisionLogEntity.fromDomain(data);
      expect(entity.evaluatedPolicies).toEqual([]);
      expect(entity.toDomain().evaluatedPolicies).toEqual([]);
    });

    it('should handle zero processingTimeMs', () => {
      const data = { ...sampleDomainData, processingTimeMs: 0 };
      const entity = PolicyDecisionLogEntity.fromDomain(data);
      expect(entity.processingTimeMs).toBe(0);
      expect(entity.toDomain().processingTimeMs).toBe(0);
    });

    it('should handle various subjectType values', () => {
      const subjectTypes = ['Delivery', 'Rider', 'Business', 'Order', 'Sacco'];

      for (const subjectType of subjectTypes) {
        const data = { ...sampleDomainData, subjectType };
        const entity = PolicyDecisionLogEntity.fromDomain(data);
        expect(entity.subjectType).toBe(subjectType);
        expect(entity.toDomain().subjectType).toBe(subjectType);
      }
    });

    it('should handle null actorId for system-initiated evaluations', () => {
      const data = { ...sampleDomainData, actorId: null };
      const entity = PolicyDecisionLogEntity.fromDomain(data);
      expect(entity.actorId).toBeNull();
      expect(entity.toDomain().actorId).toBeNull();
    });

    it('should handle null finalPolicyId when no policy matched', () => {
      const data = {
        ...sampleDomainData,
        finalPolicyId: null,
        finalReason: 'No applicable policies found - using default ALLOW',
      };
      const entity = PolicyDecisionLogEntity.fromDomain(data);
      expect(entity.finalPolicyId).toBeNull();
      expect(entity.toDomain().finalPolicyId).toBeNull();
    });
  });

  describe('immutability contract', () => {
    it('should not have updatedAt field', () => {
      const entity = PolicyDecisionLogEntity.fromDomain(sampleDomainData);
      expect('updatedAt' in entity).toBe(false);
    });

    it('should only expose fromDomain for creation (no update method)', () => {
      expect(PolicyDecisionLogEntity.fromDomain).toBeDefined();
      expect((PolicyDecisionLogEntity as unknown as Record<string, unknown>).update).toBeUndefined();
    });
  });
});
