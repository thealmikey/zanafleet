import { Test, TestingModule } from '@nestjs/testing';

import { MembershipRole } from '@api/modules/workspace/dto/workspace.enums';
import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';

import { SmartDashboardService } from '../../smart-dashboard.service';

describe('SmartDashboardService', () => {
  let service: SmartDashboardService;

  const actorId = 'actor-123';
  const workspaceId = 'workspace-456';
  const workspaceId2 = 'workspace-789';

  const createMembership = (
    actorId: string,
    workspaceId: string,
    role: MembershipRole,
    defaultWorkspace = false
  ): MembershipEntity => ({
    actorId,
    workspaceId,
    role,
    since: new Date(),
    defaultWorkspace,
  } as MembershipEntity);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmartDashboardService],
    }).compile();

    service = module.get<SmartDashboardService>(SmartDashboardService);
  });

  describe('buildDashboard', () => {
    const memberships = [
      createMembership(actorId, workspaceId, MembershipRole.RIDER, true),
      createMembership(actorId, workspaceId2, MembershipRole.CUSTOMER, false),
    ];

    it('should build dashboard for RIDER role', async () => {
      const result = await service.buildDashboard(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        memberships
      );

      expect(result.role).toBe(MembershipRole.RIDER);
      expect(result.workspaceId).toBe(workspaceId);
      expect(result.layout).toBe('unified');
      expect(result.availableWorkspaces).toHaveLength(2);
    });

    it('should build dashboard for CUSTOMER role', async () => {
      const result = await service.buildDashboard(
        actorId,
        MembershipRole.CUSTOMER,
        workspaceId,
        memberships
      );

      expect(result.role).toBe(MembershipRole.CUSTOMER);
      expect(result.layout).toBe('unified');
    });

    it('should build dashboard for BUSINESS_OWNER role', async () => {
      const result = await service.buildDashboard(
        actorId,
        MembershipRole.BUSINESS_OWNER,
        workspaceId,
        memberships
      );

      expect(result.role).toBe(MembershipRole.BUSINESS_OWNER);
      expect(result.layout).toBe('tabs');
    });

    it('should build dashboard for ADMIN role', async () => {
      const result = await service.buildDashboard(
        actorId,
        MembershipRole.ADMIN,
        workspaceId,
        memberships
      );

      expect(result.role).toBe(MembershipRole.ADMIN);
      expect(result.layout).toBe('sidebar');
    });

    it('should build dashboard for OPS role', async () => {
      const result = await service.buildDashboard(
        actorId,
        MembershipRole.OPS,
        workspaceId,
        memberships
      );

      expect(result.role).toBe(MembershipRole.OPS);
      expect(result.layout).toBe('tabs');
    });
  });

  describe('getMergeConfig', () => {
    it('should return config for RIDER role', () => {
      const config = service.getMergeConfig(MembershipRole.RIDER);

      expect(config.role).toBe(MembershipRole.RIDER);
      expect(config.priority).toBe(10);
      expect(config.dataSources).toHaveLength(4);
      expect(config.dataSources.map(ds => ds.type)).toContain('my_jobs');
      expect(config.dataSources.map(ds => ds.type)).toContain('available_jobs');
    });

    it('should return config for CUSTOMER role', () => {
      const config = service.getMergeConfig(MembershipRole.CUSTOMER);

      expect(config.role).toBe(MembershipRole.CUSTOMER);
      expect(config.dataSources.map(ds => ds.type)).toContain('my_orders');
    });

    it('should return config for BUSINESS_OWNER role', () => {
      const config = service.getMergeConfig(MembershipRole.BUSINESS_OWNER);

      expect(config.role).toBe(MembershipRole.BUSINESS_OWNER);
      expect(config.priority).toBe(20);
      expect(config.layout).toBe('tabs');
    });

    it('should return config for ADMIN role', () => {
      const config = service.getMergeConfig(MembershipRole.ADMIN);

      expect(config.role).toBe(MembershipRole.ADMIN);
      expect(config.priority).toBe(30);
      expect(config.layout).toBe('sidebar');
      expect(config.dataSources.map(ds => ds.type)).toContain('system_settings');
    });

    it('should return config for OPS role', () => {
      const config = service.getMergeConfig(MembershipRole.OPS);

      expect(config.role).toBe(MembershipRole.OPS);
      expect(config.priority).toBe(25);
      expect(config.layout).toBe('tabs');
    });
  });

  describe('getSwitchableWorkspaces', () => {
    it('should return all workspaces from memberships', async () => {
      const memberships = [
        createMembership(actorId, workspaceId, MembershipRole.RIDER, true),
        createMembership(actorId, workspaceId2, MembershipRole.CUSTOMER, false),
      ];

      const result = await service.getSwitchableWorkspaces(memberships);

      expect(result).toHaveLength(2);
      expect(result[0].workspaceId).toBe(workspaceId);
      expect(result[0].role).toBe(MembershipRole.RIDER);
      expect(result[0].isDefault).toBe(true);
      expect(result[1].workspaceId).toBe(workspaceId2);
      expect(result[1].role).toBe(MembershipRole.CUSTOMER);
      expect(result[1].isDefault).toBe(false);
    });

    it('should handle empty memberships', async () => {
      const result = await service.getSwitchableWorkspaces([]);

      expect(result).toEqual([]);
    });
  });

  describe('getAvailableRoleSwitches', () => {
    it('should return role switch options', () => {
      const memberships = [
        createMembership(actorId, workspaceId, MembershipRole.RIDER, true),
        createMembership(actorId, workspaceId2, MembershipRole.CUSTOMER, false),
      ];

      const result = service.getAvailableRoleSwitches(memberships);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe(MembershipRole.RIDER);
      expect(result[0].workspaceId).toBe(workspaceId);
      expect(result[0].label).toContain('Rider');
      expect(result[1].role).toBe(MembershipRole.CUSTOMER);
      expect(result[1].label).toContain('Customer');
    });
  });

  describe('getRoleLabel', () => {
    it('should return correct label for RIDER', () => {
      expect(service.getRoleLabel(MembershipRole.RIDER)).toBe('Rider');
    });

    it('should return correct label for CUSTOMER', () => {
      expect(service.getRoleLabel(MembershipRole.CUSTOMER)).toBe('Customer');
    });

    it('should return correct label for BUSINESS_OWNER', () => {
      expect(service.getRoleLabel(MembershipRole.BUSINESS_OWNER)).toBe('Business Owner');
    });

    it('should return correct label for ADMIN', () => {
      expect(service.getRoleLabel(MembershipRole.ADMIN)).toBe('Admin');
    });

    it('should return correct label for OPS', () => {
      expect(service.getRoleLabel(MembershipRole.OPS)).toBe('Operations');
    });
  });

  describe('shouldShowRoleSwitcher', () => {
    it('should return false for single membership', () => {
      const memberships = [
        createMembership(actorId, workspaceId, MembershipRole.RIDER, true),
      ];

      expect(service.shouldShowRoleSwitcher(memberships)).toBe(false);
    });

    it('should return true for multiple memberships', () => {
      const memberships = [
        createMembership(actorId, workspaceId, MembershipRole.RIDER, true),
        createMembership(actorId, workspaceId2, MembershipRole.CUSTOMER, false),
      ];

      expect(service.shouldShowRoleSwitcher(memberships)).toBe(true);
    });

    it('should return false for empty memberships', () => {
      expect(service.shouldShowRoleSwitcher([])).toBe(false);
    });
  });

  describe('getPrimaryRole', () => {
    it('should return highest priority role', () => {
      const memberships = [
        createMembership(actorId, workspaceId, MembershipRole.RIDER, true),
        createMembership(actorId, workspaceId2, MembershipRole.CUSTOMER, false),
        createMembership(actorId, 'ws-3', MembershipRole.ADMIN, false),
      ];

      const result = service.getPrimaryRole(memberships);

      // ADMIN has highest priority (30)
      expect(result).toBe(MembershipRole.ADMIN);
    });

    it('should handle single membership', () => {
      const memberships = [
        createMembership(actorId, workspaceId, MembershipRole.CUSTOMER, true),
      ];

      const result = service.getPrimaryRole(memberships);

      expect(result).toBe(MembershipRole.CUSTOMER);
    });

    it('should throw for empty memberships', () => {
      expect(() => service.getPrimaryRole([])).toThrow('No memberships found');
    });

    it('should return OPS when admin is not present', () => {
      const memberships = [
        createMembership(actorId, workspaceId, MembershipRole.RIDER, true),
        createMembership(actorId, workspaceId2, MembershipRole.OPS, false),
      ];

      const result = service.getPrimaryRole(memberships);

      // OPS has higher priority (25) than RIDER (10)
      expect(result).toBe(MembershipRole.OPS);
    });
  });

  describe('data sources by role', () => {
    it('should include rider-specific data sources', () => {
      const config = service.getMergeConfig(MembershipRole.RIDER);

      expect(config.dataSources.map(ds => ds.type)).toEqual(
        expect.arrayContaining(['my_jobs', 'available_jobs', 'earnings', 'performance'])
      );
    });

    it('should include customer-specific data sources', () => {
      const config = service.getMergeConfig(MembershipRole.CUSTOMER);

      expect(config.dataSources.map(ds => ds.type)).toEqual(
        expect.arrayContaining(['my_orders', 'addresses', 'payment_methods'])
      );
    });

    it('should include business owner-specific data sources', () => {
      const config = service.getMergeConfig(MembershipRole.BUSINESS_OWNER);

      expect(config.dataSources.map(ds => ds.type)).toEqual(
        expect.arrayContaining(['my_jobs', 'team_members', 'analytics', 'pricing'])
      );
    });

    it('should include admin-specific data sources', () => {
      const config = service.getMergeConfig(MembershipRole.ADMIN);

      expect(config.dataSources.map(ds => ds.type)).toEqual(
        expect.arrayContaining(['workspace_overview', 'member_list', 'system_settings'])
      );
    });

    it('should include ops-specific data sources', () => {
      const config = service.getMergeConfig(MembershipRole.OPS);

      expect(config.dataSources.map(ds => ds.type)).toEqual(
        expect.arrayContaining(['active_jobs', 'rider_overview', 'analytics', 'reassignments'])
      );
    });
  });

  describe('workspace scope configuration', () => {
    it('should use current workspace scope for most data sources', () => {
      const config = service.getMergeConfig(MembershipRole.ADMIN);

      const currentScopeSources = config.dataSources.filter(
        ds => ds.workspaceScope === 'current'
      );

      expect(currentScopeSources.length).toBeGreaterThan(0);
    });

    it('should use all_rider_workspaces scope for rider earnings', () => {
      const config = service.getMergeConfig(MembershipRole.RIDER);

      const earningsSource = config.dataSources.find(ds => ds.type === 'earnings');

      expect(earningsSource?.workspaceScope).toBe('all_rider_workspaces');
    });
  });

  describe('edge cases', () => {
    it('should handle many memberships gracefully', async () => {
      const memberships = [];
      for (let i = 0; i < 10; i++) {
        memberships.push(createMembership(actorId, `ws-${i}`, MembershipRole.RIDER, i === 0));
      }

      const result = await service.buildDashboard(
        actorId,
        MembershipRole.RIDER,
        workspaceId,
        memberships
      );

      expect(result.availableWorkspaces).toHaveLength(10);
    });

    it('should include all workspaces in role switch options even with many', () => {
      const memberships = [];
      for (let i = 0; i < 5; i++) {
        memberships.push(createMembership(actorId, `ws-${i}`, MembershipRole.RIDER, i === 0));
      }

      const result = service.getAvailableRoleSwitches(memberships);

      expect(result).toHaveLength(5);
    });

    it('should handle role priority ordering correctly', () => {
      const memberships = [
        createMembership(actorId, 'ws-1', MembershipRole.CUSTOMER, false),
        createMembership(actorId, 'ws-2', MembershipRole.RIDER, false),
        createMembership(actorId, 'ws-3', MembershipRole.BUSINESS_OWNER, false),
        createMembership(actorId, 'ws-4', MembershipRole.OPS, false),
        createMembership(actorId, 'ws-5', MembershipRole.ADMIN, true),
      ];

      const result = service.getPrimaryRole(memberships);

      // Priority: ADMIN(30) > OPS(25) > BUSINESS_OWNER(20) > RIDER(10) > CUSTOMER(10)
      expect(result).toBe(MembershipRole.ADMIN);
    });
  });
});
