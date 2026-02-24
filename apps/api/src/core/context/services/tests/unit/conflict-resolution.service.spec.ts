import { Test, TestingModule } from '@nestjs/testing';

import { MembershipRole } from '@api/modules/workspace/dto/workspace.enums';
import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';

import { ContextSource, ResolvedContext } from '@api/core/context/context.types';
import { ConflictResolutionService } from '../../conflict-resolution.service';

describe('ConflictResolutionService', () => {
  let service: ConflictResolutionService;

  const workspaceId = 'workspace-456';
  const workspaceId2 = 'workspace-789';

  const createMembership = (
    actorId: string,
    workspaceId: string,
    role: MembershipRole,
    defaultWorkspace = false
  ): MembershipEntity =>
    ({
      actorId,
      workspaceId,
      role,
      since: new Date(),
      defaultWorkspace,
    } as MembershipEntity);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConflictResolutionService],
    }).compile();

    service = module.get<ConflictResolutionService>(ConflictResolutionService);
  });

  describe('resolveConflict', () => {
    const memberships = [
      createMembership('actor-1', workspaceId, MembershipRole.RIDER, true),
      createMembership('actor-1', workspaceId2, MembershipRole.CUSTOMER, false),
    ];

    it('should return empty result when no valid contexts', () => {
      const result = service.resolveConflict([], memberships);

      expect(result.selectedRole).toBe(MembershipRole.RIDER); // Default fallback
      expect(result.reasoning).toContain('Fallback');
    });

    it('should select job context when jobId is provided', () => {
      const contexts: ResolvedContext[] = [
        {
          workspaceId,
          role: MembershipRole.RIDER,
          source: 'route_access' as ContextSource,
          reasoning: 'from route',
        },
        {
          workspaceId,
          role: MembershipRole.RIDER,
          source: 'job_event' as ContextSource,
          reasoning: 'from job',
        },
      ];

      const result = service.resolveConflict(contexts, memberships, { jobId: 'job-123' });

      expect(result.selectedRole).toBe(MembershipRole.RIDER);
      expect(result.reasoning).toContain('job');
    });

    it('should prioritize contexts by source priority', () => {
      const contexts: ResolvedContext[] = [
        {
          workspaceId,
          role: MembershipRole.RIDER,
          source: 'route_access' as ContextSource,
          reasoning: 'from route',
        },
        {
          workspaceId: workspaceId2,
          role: MembershipRole.CUSTOMER,
          source: 'notification' as ContextSource,
          reasoning: 'from notification',
        },
      ];

      const result = service.resolveConflict(contexts, memberships);

      // Notification has higher priority than route_access
      expect(result.selectedRole).toBe(MembershipRole.CUSTOMER);
    });

    it('should filter out invalid contexts', () => {
      const contexts: ResolvedContext[] = [
        {
          workspaceId: 'invalid-workspace',
          role: MembershipRole.ADMIN,
          source: 'route_access' as ContextSource,
          reasoning: 'invalid',
        },
        {
          workspaceId,
          role: MembershipRole.RIDER,
          source: 'route_access' as ContextSource,
          reasoning: 'valid',
        },
      ];

      const result = service.resolveConflict(contexts, memberships);

      expect(result.selectedRole).toBe(MembershipRole.RIDER);
    });

    it('should use default workspace when no valid contexts', () => {
      const membershipsWithDefault = [
        createMembership('actor-1', workspaceId, MembershipRole.RIDER, true),
      ];

      const result = service.resolveConflict([], membershipsWithDefault);

      expect(result.selectedRole).toBe(MembershipRole.RIDER);
      expect(result.selectedWorkspaceId).toBe(workspaceId);
    });
  });

  describe('resolveMultiWorkspaceConflict', () => {
    it('should prefer default workspace', () => {
      const workspaces = [
        { workspaceId: 'ws-1', isDefault: false },
        { workspaceId: 'ws-2', isDefault: true },
        { workspaceId: 'ws-3', isDefault: false },
      ];

      const result = service.resolveMultiWorkspaceConflict(MembershipRole.RIDER, workspaces);

      expect(result.selectedWorkspaceId).toBe('ws-2');
      expect(result.reasoning).toContain('default');
    });

    it('should use first workspace when no default', () => {
      const workspaces = [
        { workspaceId: 'ws-1', isDefault: false },
        { workspaceId: 'ws-2', isDefault: false },
      ];

      const result = service.resolveMultiWorkspaceConflict(MembershipRole.RIDER, workspaces);

      expect(result.selectedWorkspaceId).toBe('ws-1');
      expect(result.reasoning).toContain('first');
    });

    it('should handle single workspace', () => {
      const workspaces = [{ workspaceId: 'ws-1', isDefault: false }];

      const result = service.resolveMultiWorkspaceConflict(MembershipRole.ADMIN, workspaces);

      expect(result.selectedWorkspaceId).toBe('ws-1');
    });
  });

  describe('resolveRoleConflict', () => {
    it('should infer role from action for job.accept', () => {
      const roles = [MembershipRole.RIDER, MembershipRole.CUSTOMER];

      const result = service.resolveRoleConflict(workspaceId, roles, 'job.accept');

      expect(result.selectedRole).toBe(MembershipRole.RIDER);
      expect(result.reasoning).toContain('job.accept');
    });

    it('should infer role from action for job.complete', () => {
      const roles = [MembershipRole.RIDER, MembershipRole.CUSTOMER];

      const result = service.resolveRoleConflict(workspaceId, roles, 'job.complete');

      expect(result.selectedRole).toBe(MembershipRole.RIDER);
    });

    it('should infer role from action for job.create', () => {
      const roles = [MembershipRole.RIDER, MembershipRole.BUSINESS_OWNER];

      const result = service.resolveRoleConflict(workspaceId, roles, 'job.create');

      expect(result.selectedRole).toBe(MembershipRole.BUSINESS_OWNER);
      expect(result.reasoning).toContain('job.create');
    });

    it('should infer role from action for order.create', () => {
      const roles = [MembershipRole.RIDER, MembershipRole.CUSTOMER];

      const result = service.resolveRoleConflict(workspaceId, roles, 'order.create');

      expect(result.selectedRole).toBe(MembershipRole.CUSTOMER);
    });

    it('should infer role from action for member.invite', () => {
      const roles = [MembershipRole.RIDER, MembershipRole.ADMIN];

      const result = service.resolveRoleConflict(workspaceId, roles, 'member.invite');

      expect(result.selectedRole).toBe(MembershipRole.ADMIN);
    });

    it('should fallback to rider precedence when no action match', () => {
      const roles = [MembershipRole.CUSTOMER, MembershipRole.RIDER];

      const result = service.resolveRoleConflict(workspaceId, roles, 'unknown.action');

      // Rider takes precedence
      expect(result.selectedRole).toBe(MembershipRole.RIDER);
      expect(result.reasoning).toContain('precedence');
    });

    it('should use first role when no rider in list', () => {
      const roles = [MembershipRole.CUSTOMER, MembershipRole.BUSINESS_OWNER];

      const result = service.resolveRoleConflict(workspaceId, roles, 'unknown.action');

      expect(result.selectedRole).toBe(MembershipRole.CUSTOMER);
      expect(result.reasoning).toContain('first');
    });

    it('should handle empty roles array', () => {
      const result = service.resolveRoleConflict(workspaceId, []);

      expect(result.selectedRole).toBeUndefined();
    });
  });

  describe('getResolutionExplanation', () => {
    it('should return message for empty contexts', () => {
      const contexts: ResolvedContext[] = [];
      const result = {
        selectedRole: MembershipRole.RIDER,
        selectedWorkspaceId: workspaceId,
        reasoning: 'test',
      };

      const explanation = service.getResolutionExplanation(contexts, result);

      expect(explanation).toContain('No valid contexts');
    });

    it('should return message for single context', () => {
      const contexts: ResolvedContext[] = [
        {
          workspaceId,
          role: MembershipRole.RIDER,
          source: 'route_access' as ContextSource,
          reasoning: 'from route',
        },
      ];
      const result = {
        selectedRole: MembershipRole.RIDER,
        selectedWorkspaceId: workspaceId,
        reasoning: 'test',
      };

      const explanation = service.getResolutionExplanation(contexts, result);

      expect(explanation).toContain('Single context');
    });

    it('should return message for multiple contexts', () => {
      const contexts: ResolvedContext[] = [
        {
          workspaceId,
          role: MembershipRole.RIDER,
          source: 'route_access' as ContextSource,
          reasoning: 'from route',
        },
        {
          workspaceId: workspaceId2,
          role: MembershipRole.CUSTOMER,
          source: 'notification' as ContextSource,
          reasoning: 'from notification',
        },
      ];
      const result = {
        selectedRole: MembershipRole.RIDER,
        selectedWorkspaceId: workspaceId,
        reasoning: 'test',
      };

      const explanation = service.getResolutionExplanation(contexts, result);

      expect(explanation).toContain('multiple contexts');
      expect(explanation).toContain('route_access');
      expect(explanation).toContain('notification');
    });
  });

  describe('edge cases', () => {
    it('should handle all role types in resolveRoleConflict', () => {
      const roles = [
        MembershipRole.ADMIN,
        MembershipRole.OPS,
        MembershipRole.BUSINESS_OWNER,
        MembershipRole.RIDER,
        MembershipRole.CUSTOMER,
      ];

      // Test each action mapping
      const testCases = [
        { action: 'job.accept', expected: MembershipRole.RIDER },
        { action: 'job.complete', expected: MembershipRole.RIDER },
        { action: 'job.create', expected: MembershipRole.BUSINESS_OWNER },
        { action: 'job.cancel', expected: MembershipRole.BUSINESS_OWNER },
        { action: 'order.create', expected: MembershipRole.CUSTOMER },
        { action: 'order.cancel', expected: MembershipRole.CUSTOMER },
        { action: 'member.invite', expected: MembershipRole.ADMIN },
        { action: 'workspace.manage', expected: MembershipRole.ADMIN },
      ];

      testCases.forEach(({ action, expected }) => {
        const result = service.resolveRoleConflict(workspaceId, roles, action);
        expect(result.selectedRole).toBe(expected);
      });
    });

    it('should handle unknown action by falling back to rider', () => {
      const roles = [MembershipRole.RIDER, MembershipRole.CUSTOMER];

      const result = service.resolveRoleConflict(workspaceId, roles, 'random_action');

      expect(result.selectedRole).toBe(MembershipRole.RIDER);
    });

    it('should use action inference even when rider is not first in array', () => {
      const roles = [MembershipRole.CUSTOMER, MembershipRole.RIDER];

      const result = service.resolveRoleConflict(workspaceId, roles, 'job.accept');

      // Should still pick RIDER based on action, not array order
      expect(result.selectedRole).toBe(MembershipRole.RIDER);
    });

    it('should not infer role when action specifies a role actor does not have', () => {
      const roles = [MembershipRole.CUSTOMER]; // No RIDER role

      const result = service.resolveRoleConflict(workspaceId, roles, 'job.accept');

      // Should fallback to CUSTOMER since they don't have RIDER
      expect(result.selectedRole).toBe(MembershipRole.CUSTOMER);
    });
  });
});
