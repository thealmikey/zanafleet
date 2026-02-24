import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MembershipRole } from '@api/modules/workspace/dto/workspace.enums';
import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';

import { WorkspaceBoundaryGuard } from '../../workspace-boundary.guard';

describe('WorkspaceBoundaryGuard', () => {
  let guard: WorkspaceBoundaryGuard;
  let membershipRepository: jest.Mocked<Repository<MembershipEntity>>;

  const mockMembershipRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const actorId = 'actor-123';
  const workspaceId = 'workspace-456';
  const otherWorkspaceId = 'workspace-789';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceBoundaryGuard,
        {
          provide: getRepositoryToken(MembershipEntity),
          useValue: mockMembershipRepository,
        },
      ],
    }).compile();

    guard = module.get<WorkspaceBoundaryGuard>(WorkspaceBoundaryGuard);
    membershipRepository = module.get(getRepositoryToken(MembershipEntity));

    jest.clearAllMocks();
  });

  describe('enforceBoundary', () => {
    describe('when actor is not a member', () => {
      it('should deny access when no membership exists', async () => {
        membershipRepository.findOne.mockResolvedValue(null);

        const result = await guard.enforceBoundary(actorId, workspaceId, MembershipRole.RIDER);

        expect(result.allowed).toBe(false);
        expect(result.code).toBe('WORKSPACE_BOUNDARY_VIOLATION');
        expect(result.reason).toContain('No membership');
      });
    });

    describe('when membership exists but role mismatch', () => {
      it('should deny access when role does not match', async () => {
        membershipRepository.findOne.mockResolvedValue({
          actorId,
          workspaceId,
          role: MembershipRole.RIDER,
          since: new Date(),
          defaultWorkspace: false,
        } as MembershipEntity);

        const result = await guard.enforceBoundary(actorId, workspaceId, MembershipRole.ADMIN);

        expect(result.allowed).toBe(false);
        expect(result.code).toBe('ROLE_MISMATCH');
        expect(result.reason).toContain('does not match');
      });
    });

    describe('when membership and role match', () => {
      beforeEach(() => {
        membershipRepository.findOne.mockResolvedValue({
          actorId,
          workspaceId,
          role: MembershipRole.ADMIN,
          since: new Date(),
          defaultWorkspace: false,
        } as MembershipEntity);
      });

      it('should allow access when membership and role match', async () => {
        const result = await guard.enforceBoundary(actorId, workspaceId, MembershipRole.ADMIN);

        expect(result.allowed).toBe(true);
      });
    });

    describe('rate limiting for cross-workspace access', () => {
      beforeEach(() => {
        membershipRepository.findOne.mockResolvedValue({
          actorId,
          workspaceId,
          role: MembershipRole.ADMIN,
          since: new Date(),
          defaultWorkspace: false,
        } as MembershipEntity);
      });

      it('should deny when per-minute rate limit exceeded', async () => {
        // Simulate many cross-workspace accesses
        for (let i = 0; i < 10; i++) {
          await guard['recordCrossWorkspaceAccess'](actorId, `ws-${i}`);
        }

        const result = await guard.enforceBoundary(actorId, workspaceId, MembershipRole.ADMIN);

        expect(result.allowed).toBe(false);
        expect(result.code).toBe('CROSS_WORKSPACE_RATE_LIMIT');
      });
    });
  });

  describe('hasWorkspaceAccess', () => {
    it('should return true when membership exists', async () => {
      membershipRepository.findOne.mockResolvedValue({
        actorId,
        workspaceId,
        role: MembershipRole.RIDER,
        since: new Date(),
        defaultWorkspace: false,
      } as MembershipEntity);

      const result = await guard.hasWorkspaceAccess(actorId, workspaceId);

      expect(result).toBe(true);
    });

    it('should return false when no membership exists', async () => {
      membershipRepository.findOne.mockResolvedValue(null);

      const result = await guard.hasWorkspaceAccess(actorId, workspaceId);

      expect(result).toBe(false);
    });
  });

  describe('getAccessibleWorkspaces', () => {
    it('should return all workspace IDs where actor is a member', async () => {
      membershipRepository.find.mockResolvedValue([
        {
          actorId,
          workspaceId: 'ws-1',
          role: MembershipRole.RIDER,
          since: new Date(),
          defaultWorkspace: false,
        },
        {
          actorId,
          workspaceId: 'ws-2',
          role: MembershipRole.CUSTOMER,
          since: new Date(),
          defaultWorkspace: true,
        },
        {
          actorId,
          workspaceId: 'ws-3',
          role: MembershipRole.ADMIN,
          since: new Date(),
          defaultWorkspace: false,
        },
      ] as MembershipEntity[]);

      const result = await guard.getAccessibleWorkspaces(actorId);

      expect(result).toContain('ws-1');
      expect(result).toContain('ws-2');
      expect(result).toContain('ws-3');
      expect(result.length).toBe(3);
    });

    it('should return empty array when actor has no memberships', async () => {
      membershipRepository.find.mockResolvedValue([]);

      const result = await guard.getAccessibleWorkspaces(actorId);

      expect(result).toEqual([]);
    });
  });

  describe('filterAccessibleWorkspaces', () => {
    it('should return allowed and denied workspaces correctly', async () => {
      membershipRepository.find.mockResolvedValue([
        {
          actorId,
          workspaceId: 'ws-1',
          role: MembershipRole.RIDER,
          since: new Date(),
          defaultWorkspace: false,
        },
        {
          actorId,
          workspaceId: 'ws-2',
          role: MembershipRole.CUSTOMER,
          since: new Date(),
          defaultWorkspace: true,
        },
      ] as MembershipEntity[]);

      const result = await guard.filterAccessibleWorkspaces(actorId, [
        'ws-1',
        'ws-2',
        'ws-3',
        'ws-4',
      ]);

      expect(result.allowed).toContain('ws-1');
      expect(result.allowed).toContain('ws-2');
      expect(result.denied).toContain('ws-3');
      expect(result.denied).toContain('ws-4');
    });

    it('should handle empty requested workspaces', async () => {
      const result = await guard.filterAccessibleWorkspaces(actorId, []);

      expect(result.allowed).toEqual([]);
      expect(result.denied).toEqual([]);
    });
  });

  describe('getAccessLevel', () => {
    it('should return none when no membership exists', async () => {
      membershipRepository.findOne.mockResolvedValue(null);

      const result = await guard.getAccessLevel(actorId, workspaceId);

      expect(result.level).toBe('none');
      expect(result.role).toBeNull();
    });

    it('should return readonly for CUSTOMER role', async () => {
      membershipRepository.findOne.mockResolvedValue({
        actorId,
        workspaceId,
        role: MembershipRole.CUSTOMER,
        since: new Date(),
        defaultWorkspace: false,
      } as MembershipEntity);

      const result = await guard.getAccessLevel(actorId, workspaceId);

      expect(result.level).toBe('readonly');
      expect(result.role).toBe(MembershipRole.CUSTOMER);
    });

    it('should return readwrite for RIDER role', async () => {
      membershipRepository.findOne.mockResolvedValue({
        actorId,
        workspaceId,
        role: MembershipRole.RIDER,
        since: new Date(),
        defaultWorkspace: false,
      } as MembershipEntity);

      const result = await guard.getAccessLevel(actorId, workspaceId);

      expect(result.level).toBe('readwrite');
      expect(result.role).toBe(MembershipRole.RIDER);
    });

    it('should return readwrite for BUSINESS_OWNER role', async () => {
      membershipRepository.findOne.mockResolvedValue({
        actorId,
        workspaceId,
        role: MembershipRole.BUSINESS_OWNER,
        since: new Date(),
        defaultWorkspace: false,
      } as MembershipEntity);

      const result = await guard.getAccessLevel(actorId, workspaceId);

      expect(result.level).toBe('readwrite');
      expect(result.role).toBe(MembershipRole.BUSINESS_OWNER);
    });

    it('should return readwrite for OPS role', async () => {
      membershipRepository.findOne.mockResolvedValue({
        actorId,
        workspaceId,
        role: MembershipRole.OPS,
        since: new Date(),
        defaultWorkspace: false,
      } as MembershipEntity);

      const result = await guard.getAccessLevel(actorId, workspaceId);

      expect(result.level).toBe('readwrite');
      expect(result.role).toBe(MembershipRole.OPS);
    });

    it('should return admin for ADMIN role', async () => {
      membershipRepository.findOne.mockResolvedValue({
        actorId,
        workspaceId,
        role: MembershipRole.ADMIN,
        since: new Date(),
        defaultWorkspace: false,
      } as MembershipEntity);

      const result = await guard.getAccessLevel(actorId, workspaceId);

      expect(result.level).toBe('admin');
      expect(result.role).toBe(MembershipRole.ADMIN);
    });
  });

  describe('areWorkspacesRelated', () => {
    it('should return false for now (strict isolation)', async () => {
      const result = await guard.areWorkspacesRelated(workspaceId, otherWorkspaceId);

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple rapid workspace access attempts', async () => {
      membershipRepository.findOne.mockResolvedValue({
        actorId,
        workspaceId,
        role: MembershipRole.ADMIN,
        since: new Date(),
        defaultWorkspace: false,
      } as MembershipEntity);

      // Make multiple rapid accesses
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await guard.enforceBoundary(actorId, workspaceId, MembershipRole.ADMIN);
        results.push(result.allowed);
      }

      // First 5 should succeed
      expect(results.filter((r) => r).length).toBe(5);
    });

    it('should handle actor with many workspaces', async () => {
      const memberships = [];
      for (let i = 0; i < 20; i++) {
        memberships.push({
          actorId,
          workspaceId: `ws-${i}`,
          role: MembershipRole.RIDER,
          since: new Date(),
          defaultWorkspace: i === 0,
        });
      }
      membershipRepository.find.mockResolvedValue(memberships as MembershipEntity[]);

      const result = await guard.getAccessibleWorkspaces(actorId);

      expect(result.length).toBe(20);
    });

    it('should maintain isolation between different actors', async () => {
      const otherActorId = 'other-actor';

      membershipRepository.findOne
        .mockResolvedValueOnce({
          actorId,
          workspaceId,
          role: MembershipRole.ADMIN,
          since: new Date(),
          defaultWorkspace: false,
        } as MembershipEntity)
        .mockResolvedValueOnce(null); // Other actor has no access

      const result1 = await guard.enforceBoundary(actorId, workspaceId, MembershipRole.ADMIN);
      const result2 = await guard.enforceBoundary(otherActorId, workspaceId, MembershipRole.ADMIN);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(false);
    });
  });
});
