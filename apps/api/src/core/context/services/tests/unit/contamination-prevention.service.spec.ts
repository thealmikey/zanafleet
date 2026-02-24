import { Test, TestingModule } from '@nestjs/testing';

import { MembershipRole } from '@api/modules/workspace/dto/workspace.enums';

import { ContaminationPreventionService } from '../../contamination-prevention.service';

describe('ContaminationPreventionService', () => {
  let service: ContaminationPreventionService;

  const actorId = 'actor-123';
  const workspaceId = 'workspace-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContaminationPreventionService],
    }).compile();

    service = module.get<ContaminationPreventionService>(ContaminationPreventionService);
  });

  describe('checkAccess - Rider role blocks', () => {
    it('should block rider from accessing customer_profile data', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        'customer_profile',
        'read'
      );

      expect(result.allowed).toBe(false);
      expect(result.code).toBe('CONTAMINATION_PREVENTED');
      expect(result.reason).toContain('cannot access');
    });

    it('should block rider from accessing customer_payment_methods', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        'customer_payment_methods',
        'read'
      );

      expect(result.allowed).toBe(false);
      expect(result.code).toBe('CONTAMINATION_PREVENTED');
    });

    it('should block rider from accessing customer_addresses', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        'customer_addresses',
        'read'
      );

      expect(result.allowed).toBe(false);
    });

    it('should block rider from accessing customer_orders', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        'customer_orders',
        'read'
      );

      expect(result.allowed).toBe(false);
    });

    it('should block rider from accessing customer_credit_card', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        'customer_credit_card',
        'read'
      );

      expect(result.allowed).toBe(false);
    });

    it('should block rider from accessing business_financials', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        'business_financials',
        'read'
      );

      expect(result.allowed).toBe(false);
    });

    it('should block rider from accessing business_reports', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        'business_reports',
        'read'
      );

      expect(result.allowed).toBe(false);
    });

    it('should block rider from accessing business_team', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        'business_team',
        'read'
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('checkAccess - Customer role blocks', () => {
    it('should block customer from accessing rider_earnings', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.CUSTOMER,
        workspaceId,
        'rider_earnings',
        'read'
      );

      expect(result.allowed).toBe(false);
      expect(result.code).toBe('CONTAMINATION_PREVENTED');
    });

    it('should block customer from accessing rider_stats', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.CUSTOMER,
        workspaceId,
        'rider_stats',
        'read'
      );

      expect(result.allowed).toBe(false);
    });

    it('should block customer from accessing rider_location', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.CUSTOMER,
        workspaceId,
        'rider_location',
        'read'
      );

      expect(result.allowed).toBe(false);
    });

    it('should block customer from accessing rider_performance', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.CUSTOMER,
        workspaceId,
        'rider_performance',
        'read'
      );

      expect(result.allowed).toBe(false);
    });

    it('should block customer from accessing rider_documents', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.CUSTOMER,
        workspaceId,
        'rider_documents',
        'read'
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('checkAccess - Business Owner role blocks', () => {
    it('should block business owner from accessing rider_location', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.BUSINESS_OWNER,
        workspaceId,
        'rider_location',
        'read'
      );

      expect(result.allowed).toBe(false);
    });

    it('should block business owner from accessing rider_personal_info', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.BUSINESS_OWNER,
        workspaceId,
        'rider_personal_info',
        'read'
      );

      expect(result.allowed).toBe(false);
    });

    it('should block business owner from accessing rider_bank_details', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.BUSINESS_OWNER,
        workspaceId,
        'rider_bank_details',
        'read'
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('checkAccess - Admin role audit', () => {
    it('should audit but allow admin to access rider_bank_details', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.ADMIN,
        workspaceId,
        'rider_bank_details',
        'read'
      );

      expect(result.allowed).toBe(true);
    });

    it('should audit but allow admin to access customer_payment_methods', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.ADMIN,
        workspaceId,
        'customer_payment_methods',
        'read'
      );

      expect(result.allowed).toBe(true);
    });

    it('should audit but allow admin to access system_credentials', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.ADMIN,
        workspaceId,
        'system_credentials',
        'read'
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('checkAccess - OPS role audit', () => {
    it('should audit but allow ops to access rider_personal_info', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.OPS,
        workspaceId,
        'rider_personal_info',
        'read'
      );

      expect(result.allowed).toBe(true);
    });

    it('should audit but allow ops to access customer_payment_methods', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.OPS,
        workspaceId,
        'customer_payment_methods',
        'read'
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('checkAccess - Allowed access', () => {
    it('should allow rider to access job data', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        'job_data',
        'read'
      );

      expect(result.allowed).toBe(true);
    });

    it('should allow customer to access their own orders', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.CUSTOMER,
        workspaceId,
        'my_orders',
        'read'
      );

      expect(result.allowed).toBe(true);
    });

    it('should allow business owner to access business analytics', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.BUSINESS_OWNER,
        workspaceId,
        'business_analytics',
        'read'
      );

      expect(result.allowed).toBe(true);
    });

    it('should allow admin to access all workspace data', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.ADMIN,
        workspaceId,
        'workspace_settings',
        'read'
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('checkAccess - write and delete actions', () => {
    it('should block rider from writing to customer_profile', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        'customer_profile',
        'write'
      );

      expect(result.allowed).toBe(false);
    });

    it('should block rider from deleting customer_orders', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        'customer_orders',
        'delete'
      );

      expect(result.allowed).toBe(false);
    });

    it('should allow admin to write to system_settings', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.ADMIN,
        workspaceId,
        'system_credentials',
        'write'
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('checkAccessBatch', () => {
    it('should return all allowed when all data types are accessible', async () => {
      const result = await service.checkAccessBatch(
        actorId,
        MembershipRole.ADMIN,
        workspaceId,
        ['job_data', 'workspace_settings', 'system_settings'],
        'read'
      );

      expect(result.allowed).toBe(true);
      expect(result.blockedTypes).toEqual([]);
    });

    it('should return blocked types when some are restricted', async () => {
      const result = await service.checkAccessBatch(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        ['job_data', 'customer_profile', 'rider_earnings', 'customer_payment_methods'],
        'read'
      );

      expect(result.allowed).toBe(false);
      expect(result.blockedTypes).toContain('customer_profile');
      expect(result.blockedTypes).toContain('customer_payment_methods');
      expect(result.blockedTypes).not.toContain('job_data');
    });

    it('should handle empty data types array', async () => {
      const result = await service.checkAccessBatch(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        [],
        'read'
      );

      expect(result.allowed).toBe(true);
      expect(result.blockedTypes).toEqual([]);
    });
  });

  describe('getBlockedDataTypes', () => {
    it('should return all blocked types for RIDER', () => {
      const blocked = service.getBlockedDataTypes(MembershipRole.RIDER);

      expect(blocked).toContain('customer_profile');
      expect(blocked).toContain('customer_payment_methods');
      expect(blocked).toContain('business_financials');
    });

    it('should return all blocked types for CUSTOMER', () => {
      const blocked = service.getBlockedDataTypes(MembershipRole.CUSTOMER);

      expect(blocked).toContain('rider_earnings');
      expect(blocked).toContain('rider_location');
      expect(blocked).toContain('rider_stats');
    });

    it('should return all blocked types for BUSINESS_OWNER', () => {
      const blocked = service.getBlockedDataTypes(MembershipRole.BUSINESS_OWNER);

      expect(blocked).toContain('rider_location');
      expect(blocked).toContain('rider_personal_info');
      expect(blocked).toContain('rider_bank_details');
    });

    it('should return empty array for ADMIN (no blocks, only audits)', () => {
      const blocked = service.getBlockedDataTypes(MembershipRole.ADMIN);

      expect(blocked).toEqual([]);
    });

    it('should return empty array for OPS (no blocks, only audits)', () => {
      const blocked = service.getBlockedDataTypes(MembershipRole.OPS);

      expect(blocked).toEqual([]);
    });
  });

  describe('getAuditedDataTypes', () => {
    it('should return audited types for ADMIN', () => {
      const audited = service.getAuditedDataTypes(MembershipRole.ADMIN);

      expect(audited).toContain('rider_bank_details');
      expect(audited).toContain('customer_payment_methods');
      expect(audited).toContain('system_credentials');
    });

    it('should return audited types for OPS', () => {
      const audited = service.getAuditedDataTypes(MembershipRole.OPS);

      expect(audited).toContain('rider_personal_info');
      expect(audited).toContain('customer_payment_methods');
    });

    it('should return empty for RIDER (all blocked)', () => {
      const audited = service.getAuditedDataTypes(MembershipRole.RIDER);

      expect(audited).toEqual([]);
    });
  });

  describe('isSensitiveDataType', () => {
    it('should identify bank_details as sensitive', () => {
      expect(service.isSensitiveDataType('bank_details')).toBe(true);
    });

    it('should identify payment_methods as sensitive', () => {
      expect(service.isSensitiveDataType('payment_methods')).toBe(true);
    });

    it('should identify credit_card as sensitive', () => {
      expect(service.isSensitiveDataType('credit_card')).toBe(true);
    });

    it('should identify credentials as sensitive', () => {
      expect(service.isSensitiveDataType('credentials')).toBe(true);
    });

    it('should identify password as sensitive', () => {
      expect(service.isSensitiveDataType('password')).toBe(true);
    });

    it('should identify personal_info as sensitive', () => {
      expect(service.isSensitiveDataType('personal_info')).toBe(true);
    });

    it('should return false for non-sensitive data types', () => {
      expect(service.isSensitiveDataType('job_data')).toBe(false);
      expect(service.isSensitiveDataType('workspace_settings')).toBe(false);
    });
  });

  describe('addRule and removeRule', () => {
    it('should add a new contamination rule', () => {
      const initialRules = service.getAllRules();
      const initialCount = initialRules.length;

      service.addRule({
        sourceRole: MembershipRole.RIDER,
        targetDataTypes: ['custom_data'],
        action: 'block',
      });

      const newRules = service.getAllRules();
      expect(newRules.length).toBe(initialCount + 1);
    });

    it('should return false when removing non-existent rule', () => {
      const removed = service.removeRule(MembershipRole.ADMIN, 'non_existent_data');

      expect(removed).toBe(false);
    });

    it('should throw error for invalid rule', async () => {
      await expect(async () => {
        service.addRule({
          sourceRole: null as unknown as MembershipRole,
          targetDataTypes: [],
          action: 'block',
        });
      }).rejects.toThrow('Invalid contamination rule');
    });
  });

  describe('edge cases', () => {
    it('should handle wildcard matching in rules', async () => {
      // The rule should match prefixes
      const result = await service.checkAccess(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        'customer_profile_v2', // Should match customer_profile
        'read'
      );

      expect(result.allowed).toBe(false);
    });

    it('should handle unknown data types as allowed', async () => {
      const result = await service.checkAccess(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        'completely_unknown_data_type',
        'read'
      );

      expect(result.allowed).toBe(true);
    });
  });
});
