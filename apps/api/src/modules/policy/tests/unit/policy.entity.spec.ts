import {
  PolicyScope,
  PolicyEffect,
  PolicyStatus,
  PolicyTrigger,
  PolicyCondition,
} from '../../dto';
import { PolicyEntity } from '../../entities/policy.entity';

describe('PolicyEntity', () => {
  const sampleCondition: PolicyCondition = {
    field: 'delivery.status',
    operator: 'eq',
    value: 'Requested',
  };

  const sampleDomainData = {
    policyId: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Policy',
    description: 'A test policy for unit testing',
    scope: PolicyScope.SACCO,
    scopeTargetId: '223e4567-e89b-12d3-a456-426614174001',
    trigger: PolicyTrigger.DELIVERY_CREATION,
    priority: 100,
    conditions: sampleCondition,
    effect: PolicyEffect.ALLOW,
    modifications: null,
    approvalRoles: null,
    status: PolicyStatus.ACTIVE,
    effectiveFrom: new Date('2024-01-01T00:00:00Z'),
    effectiveUntil: new Date('2024-12-31T23:59:59Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
  };

  describe('fromDomain', () => {
    it('should create an entity from full domain data', () => {
      const entity = PolicyEntity.fromDomain(sampleDomainData);

      expect(entity.id).toBe(sampleDomainData.policyId);
      expect(entity.name).toBe(sampleDomainData.name);
      expect(entity.description).toBe(sampleDomainData.description);
      expect(entity.scope).toBe(sampleDomainData.scope);
      expect(entity.scopeTargetId).toBe(sampleDomainData.scopeTargetId);
      expect(entity.trigger).toBe(sampleDomainData.trigger);
      expect(entity.priority).toBe(sampleDomainData.priority);
      expect(entity.conditions).toEqual(sampleDomainData.conditions);
      expect(entity.effect).toBe(sampleDomainData.effect);
      expect(entity.modifications).toBeNull();
      expect(entity.approvalRoles).toBeNull();
      expect(entity.status).toBe(sampleDomainData.status);
      expect(entity.effectiveFrom).toEqual(sampleDomainData.effectiveFrom);
      expect(entity.effectiveUntil).toEqual(sampleDomainData.effectiveUntil);
      expect(entity.createdAt).toEqual(sampleDomainData.createdAt);
      expect(entity.updatedAt).toEqual(sampleDomainData.updatedAt);
    });

    it('should apply default values for optional fields', () => {
      const minimalData = {
        policyId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Minimal Policy',
        scope: PolicyScope.GLOBAL,
        trigger: PolicyTrigger.RIDER_ASSIGNMENT,
        conditions: sampleCondition,
        effect: PolicyEffect.BLOCK,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      const entity = PolicyEntity.fromDomain(minimalData);

      expect(entity.description).toBeNull();
      expect(entity.scopeTargetId).toBeNull();
      expect(entity.priority).toBe(0);
      expect(entity.modifications).toBeNull();
      expect(entity.approvalRoles).toBeNull();
      expect(entity.status).toBe(PolicyStatus.ACTIVE);
      expect(entity.effectiveFrom).toBeNull();
      expect(entity.effectiveUntil).toBeNull();
      expect(entity.updatedAt).toEqual(minimalData.createdAt);
    });

    it('should handle MODIFY effect with modifications', () => {
      const modifyData = {
        ...sampleDomainData,
        effect: PolicyEffect.MODIFY,
        modifications: { etaAdjustmentMinutes: 15, priorityBoost: 10 },
      };

      const entity = PolicyEntity.fromDomain(modifyData);

      expect(entity.effect).toBe(PolicyEffect.MODIFY);
      expect(entity.modifications).toEqual({
        etaAdjustmentMinutes: 15,
        priorityBoost: 10,
      });
    });

    it('should handle REQUIRE_APPROVAL effect with approvalRoles', () => {
      const approvalData = {
        ...sampleDomainData,
        effect: PolicyEffect.REQUIRE_APPROVAL,
        approvalRoles: ['sacco_admin', 'operations_manager'],
      };

      const entity = PolicyEntity.fromDomain(approvalData);

      expect(entity.effect).toBe(PolicyEffect.REQUIRE_APPROVAL);
      expect(entity.approvalRoles).toEqual(['sacco_admin', 'operations_manager']);
    });
  });

  describe('toDomain', () => {
    it('should convert entity to domain object', () => {
      const entity = PolicyEntity.fromDomain(sampleDomainData);
      const domain = entity.toDomain();

      expect(domain.policyId).toBe(sampleDomainData.policyId);
      expect(domain.name).toBe(sampleDomainData.name);
      expect(domain.description).toBe(sampleDomainData.description);
      expect(domain.scope).toBe(sampleDomainData.scope);
      expect(domain.scopeTargetId).toBe(sampleDomainData.scopeTargetId);
      expect(domain.trigger).toBe(sampleDomainData.trigger);
      expect(domain.priority).toBe(sampleDomainData.priority);
      expect(domain.conditions).toEqual(sampleDomainData.conditions);
      expect(domain.effect).toBe(sampleDomainData.effect);
      expect(domain.modifications).toBeNull();
      expect(domain.approvalRoles).toBeNull();
      expect(domain.status).toBe(sampleDomainData.status);
      expect(domain.effectiveFrom).toEqual(sampleDomainData.effectiveFrom);
      expect(domain.effectiveUntil).toEqual(sampleDomainData.effectiveUntil);
      expect(domain.createdAt).toEqual(sampleDomainData.createdAt);
      expect(domain.updatedAt).toEqual(sampleDomainData.updatedAt);
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve all data through fromDomain -> toDomain', () => {
      const entity = PolicyEntity.fromDomain(sampleDomainData);
      const domain = entity.toDomain();

      expect(domain.policyId).toBe(sampleDomainData.policyId);
      expect(domain.name).toBe(sampleDomainData.name);
      expect(domain.description).toBe(sampleDomainData.description);
      expect(domain.scope).toBe(sampleDomainData.scope);
      expect(domain.scopeTargetId).toBe(sampleDomainData.scopeTargetId);
      expect(domain.trigger).toBe(sampleDomainData.trigger);
      expect(domain.priority).toBe(sampleDomainData.priority);
      expect(domain.conditions).toEqual(sampleDomainData.conditions);
      expect(domain.effect).toBe(sampleDomainData.effect);
      expect(domain.modifications).toBe(sampleDomainData.modifications);
      expect(domain.approvalRoles).toBe(sampleDomainData.approvalRoles);
      expect(domain.status).toBe(sampleDomainData.status);
      expect(domain.effectiveFrom).toEqual(sampleDomainData.effectiveFrom);
      expect(domain.effectiveUntil).toEqual(sampleDomainData.effectiveUntil);
      expect(domain.createdAt).toEqual(sampleDomainData.createdAt);
      expect(domain.updatedAt).toEqual(sampleDomainData.updatedAt);
    });

    it('should preserve nested conditions through round-trip', () => {
      const nestedCondition: PolicyCondition = {
        field: 'delivery.businessId',
        operator: 'exists',
        value: true,
        logic: 'AND',
        children: [
          {
            field: 'rider.vehicleType',
            operator: 'in',
            value: ['Bike', 'TukTuk'],
          },
          {
            field: 'delivery.isScheduled',
            operator: 'eq',
            value: true,
            logic: 'OR',
            children: [
              {
                field: 'delivery.priority',
                operator: 'gt',
                value: 5,
              },
            ],
          },
        ],
      };

      const dataWithNestedConditions = {
        ...sampleDomainData,
        conditions: nestedCondition,
      };

      const entity = PolicyEntity.fromDomain(dataWithNestedConditions);
      const domain = entity.toDomain();

      expect(domain.conditions).toEqual(nestedCondition);
      expect(domain.conditions.children).toHaveLength(2);
      expect(domain.conditions.children![1].children).toHaveLength(1);
    });

    it('should preserve complex modifications through round-trip', () => {
      const complexModifications = {
        etaAdjustmentMinutes: 15,
        slaExtensionHours: 2,
        priorityOverride: { base: 10, multiplier: 1.5 },
        tags: ['urgent', 'vip'],
      };

      const dataWithModifications = {
        ...sampleDomainData,
        effect: PolicyEffect.MODIFY,
        modifications: complexModifications,
      };

      const entity = PolicyEntity.fromDomain(dataWithModifications);
      const domain = entity.toDomain();

      expect(domain.modifications).toEqual(complexModifications);
    });
  });

  describe('edge cases', () => {
    it('should handle all PolicyScope values', () => {
      const scopes = [
        PolicyScope.GLOBAL,
        PolicyScope.NATIONAL,
        PolicyScope.SACCO,
        PolicyScope.BUSINESS,
        PolicyScope.RIDER,
      ];

      for (const scope of scopes) {
        const data = { ...sampleDomainData, scope };
        const entity = PolicyEntity.fromDomain(data);
        expect(entity.scope).toBe(scope);
        expect(entity.toDomain().scope).toBe(scope);
      }
    });

    it('should handle all PolicyEffect values', () => {
      const effects = [
        PolicyEffect.ALLOW,
        PolicyEffect.BLOCK,
        PolicyEffect.MODIFY,
        PolicyEffect.REQUIRE_APPROVAL,
      ];

      for (const effect of effects) {
        const data = { ...sampleDomainData, effect };
        const entity = PolicyEntity.fromDomain(data);
        expect(entity.effect).toBe(effect);
        expect(entity.toDomain().effect).toBe(effect);
      }
    });

    it('should handle all PolicyStatus values', () => {
      const statuses = [
        PolicyStatus.ACTIVE,
        PolicyStatus.INACTIVE,
        PolicyStatus.DRAFT,
        PolicyStatus.ARCHIVED,
      ];

      for (const status of statuses) {
        const data = { ...sampleDomainData, status };
        const entity = PolicyEntity.fromDomain(data);
        expect(entity.status).toBe(status);
        expect(entity.toDomain().status).toBe(status);
      }
    });

    it('should handle all PolicyTrigger values', () => {
      const triggers = [
        PolicyTrigger.DELIVERY_CREATION,
        PolicyTrigger.RIDER_ASSIGNMENT,
        PolicyTrigger.STATUS_TRANSITION,
        PolicyTrigger.SLA_CHECK,
      ];

      for (const trigger of triggers) {
        const data = { ...sampleDomainData, trigger };
        const entity = PolicyEntity.fromDomain(data);
        expect(entity.trigger).toBe(trigger);
        expect(entity.toDomain().trigger).toBe(trigger);
      }
    });

    it('should handle empty approvalRoles array', () => {
      const data = { ...sampleDomainData, approvalRoles: [] };
      const entity = PolicyEntity.fromDomain(data);
      expect(entity.approvalRoles).toEqual([]);
      expect(entity.toDomain().approvalRoles).toEqual([]);
    });

    it('should handle zero priority', () => {
      const data = { ...sampleDomainData, priority: 0 };
      const entity = PolicyEntity.fromDomain(data);
      expect(entity.priority).toBe(0);
      expect(entity.toDomain().priority).toBe(0);
    });

    it('should handle negative priority', () => {
      const data = { ...sampleDomainData, priority: -10 };
      const entity = PolicyEntity.fromDomain(data);
      expect(entity.priority).toBe(-10);
      expect(entity.toDomain().priority).toBe(-10);
    });
  });
});
