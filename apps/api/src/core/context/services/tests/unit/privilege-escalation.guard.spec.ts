import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MembershipRole } from '@api/modules/workspace/dto/workspace.enums';
import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';

import { PrivilegeEscalationGuard } from '../../privilege-escalation.guard';

describe('PrivilegeEscalationGuard', () => {
  let guard: PrivilegeEscalationGuard;
  let membershipRepository: jest.Mocked<Repository<MembershipEntity>>;

  const mockMembershipRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const actorId = 'actor-123';
  const workspaceId = 'workspace-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivilegeEscalationGuard,
        {
          provide: getRepositoryToken(MembershipEntity),
          useValue: mockMembershipRepository,
        },
      ],
    }).compile();

    guard = module.get<PrivilegeEscalationGuard>(PrivilegeEscalationGuard);
    membershipRepository = module.get(getRepositoryToken(MembershipEntity));

    jest.clearAllMocks();
  });

  describe('checkRoleSwitch', () => {
    describe('when actor does not have target role', () => {
      it('should deny role switch if membership does not exist', async () => {
        membershipRepository.findOne.mockResolvedValue(null);

        const result = await guard.checkRoleSwitch(
          actorId,
          MembershipRole.RIDER,
          MembershipRole.ADMIN,
          workspaceId
        );

        expect(result.allowed).toBe(false);
        expect(result.code).toBe('INVALID_ROLE_ASSIGNMENT');
        expect(result.reason).toContain('does not have ADMIN role');
      });

      it('should deny role switch if actor has different role', async () => {
        membershipRepository.findOne.mockResolvedValue({
          actorId,
          workspaceId,
          role: MembershipRole.RIDER,
          since: new Date(),
          defaultWorkspace: false,
        } as MembershipEntity);

        const result = await guard.checkRoleSwitch(
          actorId,
          MembershipRole.CUSTOMER,
          MembershipRole.ADMIN,
          workspaceId
        );

        expect(result.allowed).toBe(false);
        expect(result.code).toBe('INVALID_ROLE_ASSIGNMENT');
      });
    });

    describe('when actor has target role', () => {
      beforeEach(() => {
        // Setup membership with old "since" date to pass hold time check
        membershipRepository.findOne.mockResolvedValue({
          actorId,
          workspaceId,
          role: MembershipRole.ADMIN,
          since: new Date(Date.now() - 10000), // 10 seconds ago
          defaultWorkspace: false,
        } as MembershipEntity);
      });

      it('should allow non-escalation role switch (same level)', async () => {
        // ADMIN -> OPS is NOT an escalation (same precedence level in our logic)
        // But we need to mock membership with OPS role for the target role check
        membershipRepository.findOne.mockResolvedValue({
          actorId,
          workspaceId,
          role: MembershipRole.OPS,
          since: new Date(Date.now() - 10000),
          defaultWorkspace: false,
        } as MembershipEntity);

        const result = await guard.checkRoleSwitch(
          actorId,
          MembershipRole.ADMIN,
          MembershipRole.OPS,
          workspaceId
        );

        expect(result.allowed).toBe(true);
      });

      it('should allow downward role switch', async () => {
        // ADMIN -> RIDER is downward
        membershipRepository.findOne.mockResolvedValue({
          actorId,
          workspaceId,
          role: MembershipRole.RIDER,
          since: new Date(Date.now() - 10000),
          defaultWorkspace: false,
        } as MembershipEntity);

        const result = await guard.checkRoleSwitch(
          actorId,
          MembershipRole.ADMIN,
          MembershipRole.RIDER,
          workspaceId
        );

        expect(result.allowed).toBe(true);
      });

      it('should allow same role switch', async () => {
        // The membership already has ADMIN role set
        const result = await guard.checkRoleSwitch(
          actorId,
          MembershipRole.ADMIN,
          MembershipRole.ADMIN,
          workspaceId
        );

        expect(result.allowed).toBe(true);
      });
    });

    describe('privilege escalation detection', () => {
      it('should detect RIDER -> ADMIN as escalation', () => {
        const isEscalation = guard.isRoleEscalation(
          MembershipRole.RIDER,
          MembershipRole.ADMIN
        );

        expect(isEscalation).toBe(true);
      });

      it('should detect CUSTOMER -> RIDER as escalation', () => {
        const isEscalation = guard.isRoleEscalation(
          MembershipRole.CUSTOMER,
          MembershipRole.RIDER
        );

        expect(isEscalation).toBe(true);
      });

      it('should detect OPS -> ADMIN as escalation', () => {
        const isEscalation = guard.isRoleEscalation(
          MembershipRole.OPS,
          MembershipRole.ADMIN
        );

        expect(isEscalation).toBe(true);
      });

      it('should NOT detect RIDER -> CUSTOMER as escalation', () => {
        const isEscalation = guard.isRoleEscalation(
          MembershipRole.RIDER,
          MembershipRole.CUSTOMER
        );

        expect(isEscalation).toBe(false);
      });

      it('should NOT detect ADMIN -> ADMIN as escalation', () => {
        const isEscalation = guard.isRoleEscalation(
          MembershipRole.ADMIN,
          MembershipRole.ADMIN
        );

        expect(isEscalation).toBe(false);
      });
    });

    describe('escalation with rate limiting', () => {
      beforeEach(() => {
        // Setup membership with old "since" date to pass hold time check
        membershipRepository.findOne.mockResolvedValue({
          actorId,
          workspaceId,
          role: MembershipRole.ADMIN,
          since: new Date(Date.now() - 60000), // 1 minute ago
          defaultWorkspace: false,
        } as MembershipEntity);
      });

      it('should deny when rate limit exceeded', async () => {
        // Record many role switches to exceed limit
        for (let i = 0; i < 5; i++) {
          await guard.recordRoleSwitch(
            actorId,
            MembershipRole.RIDER,
            MembershipRole.ADMIN
          );
        }

        const result = await guard.checkRoleSwitch(
          actorId,
          MembershipRole.RIDER,
          MembershipRole.ADMIN,
          workspaceId
        );

        expect(result.allowed).toBe(false);
        expect(result.code).toBe('RATE_LIMIT_EXCEEDED');
      });
    });
  });

  describe('recordRoleSwitch', () => {
    it('should record role switches', async () => {
      await guard.recordRoleSwitch(
        actorId,
        MembershipRole.RIDER,
        MembershipRole.ADMIN
      );

      const switches = await guard['getRecentRoleSwitches'](actorId);
      expect(switches.length).toBe(1);
      expect(switches[0].fromRole).toBe('RIDER');
      expect(switches[0].toRole).toBe('ADMIN');
    });

    it('should limit stored switches to 10', async () => {
      for (let i = 0; i < 15; i++) {
        await guard.recordRoleSwitch(
          actorId,
          i % 2 === 0 ? MembershipRole.RIDER : MembershipRole.ADMIN,
          i % 2 === 0 ? MembershipRole.ADMIN : MembershipRole.RIDER
        );
      }

      const switches = await guard['getRecentRoleSwitches'](actorId);
      expect(switches.length).toBe(10);
    });
  });

  describe('validateRoleAssumption', () => {
    it('should deny if actor not in workspace', async () => {
      membershipRepository.findOne.mockResolvedValue(null);

      const result = await guard.validateRoleAssumption(
        actorId,
        MembershipRole.ADMIN,
        workspaceId
      );

      expect(result.allowed).toBe(false);
      expect(result.code).toBe('NOT_IN_WORKSPACE');
    });

    it('should deny if actor has insufficient role', async () => {
      membershipRepository.findOne.mockResolvedValue({
        actorId,
        workspaceId,
        role: MembershipRole.RIDER,
        since: new Date(),
        defaultWorkspace: false,
      } as MembershipEntity);

      const result = await guard.validateRoleAssumption(
        actorId,
        MembershipRole.ADMIN,
        workspaceId
      );

      expect(result.allowed).toBe(false);
      expect(result.code).toBe('INSUFFICIENT_ROLE');
    });

    it('should allow if actor has required role', async () => {
      membershipRepository.findOne.mockResolvedValue({
        actorId,
        workspaceId,
        role: MembershipRole.ADMIN,
        since: new Date(),
        defaultWorkspace: false,
      } as MembershipEntity);

      const result = await guard.validateRoleAssumption(
        actorId,
        MembershipRole.ADMIN,
        workspaceId
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('getEscalationRiskLevel', () => {
    it('should return low risk for single membership with no recent switches', async () => {
      membershipRepository.find.mockResolvedValue([
        {
          actorId,
          workspaceId,
          role: MembershipRole.RIDER,
          since: new Date(),
          defaultWorkspace: false,
        },
      ] as MembershipEntity[]);

      const result = await guard.getEscalationRiskLevel(actorId);

      expect(result.level).toBe('low');
      expect(result.factors).toHaveLength(0);
    });

    it('should return medium risk for multiple memberships', async () => {
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
          defaultWorkspace: false,
        },
        {
          actorId,
          workspaceId: 'ws-3',
          role: MembershipRole.RIDER,
          since: new Date(),
          defaultWorkspace: false,
        },
        {
          actorId,
          workspaceId: 'ws-4',
          role: MembershipRole.RIDER,
          since: new Date(),
          defaultWorkspace: false,
        },
        {
          actorId,
          workspaceId: 'ws-5',
          role: MembershipRole.RIDER,
          since: new Date(),
          defaultWorkspace: false,
        },
        {
          actorId,
          workspaceId: 'ws-6',
          role: MembershipRole.RIDER,
          since: new Date(),
          defaultWorkspace: false,
        },
        {
          actorId,
          workspaceId: 'ws-7',
          role: MembershipRole.ADMIN, // Add admin role to push risk to medium
          since: new Date(),
          defaultWorkspace: false,
        },
      ] as MembershipEntity[]);

      const result = await guard.getEscalationRiskLevel(actorId);

      // With 7 memberships (>5) AND admin role, should be medium
      expect(result.level).toBe('medium');
      expect(result.factors).toContain('Multiple workspace memberships (7)');
    });

    it('should return high risk for admin with many switches', async () => {
      membershipRepository.find.mockResolvedValue([
        {
          actorId,
          workspaceId,
          role: MembershipRole.ADMIN,
          since: new Date(),
          defaultWorkspace: false,
        },
      ] as MembershipEntity[]);

      // Record many recent switches
      for (let i = 0; i < 4; i++) {
        await guard.recordRoleSwitch(
          actorId,
          MembershipRole.RIDER,
          MembershipRole.ADMIN
        );
      }

      const result = await guard.getEscalationRiskLevel(actorId);

      expect(result.level).toBe('high');
      expect(result.factors).toContain('Has ADMIN role');
      expect(result.factors).toContain('Recent role switches (4)');
    });
  });

  describe('edge cases', () => {
    it('should handle switching to the same role gracefully', async () => {
      membershipRepository.findOne.mockResolvedValue({
        actorId,
        workspaceId,
        role: MembershipRole.RIDER,
        since: new Date(Date.now() - 10000),
        defaultWorkspace: false,
      } as MembershipEntity);

      const result = await guard.checkRoleSwitch(
        actorId,
        MembershipRole.RIDER,
        MembershipRole.RIDER,
        workspaceId
      );

      expect(result.allowed).toBe(true);
    });

    it('should handle business owner to admin escalation', async () => {
      membershipRepository.findOne.mockResolvedValue({
        actorId,
        workspaceId,
        role: MembershipRole.ADMIN,
        since: new Date(Date.now() - 10000),
        defaultWorkspace: false,
      } as MembershipEntity);

      const result = await guard.checkRoleSwitch(
        actorId,
        MembershipRole.BUSINESS_OWNER,
        MembershipRole.ADMIN,
        workspaceId
      );

      // Should allow because they have admin role in DB
      expect(result.allowed).toBe(true);
    });

    it('should handle all role precedence levels correctly', () => {
      // ADMIN > OPS > BUSINESS_OWNER > RIDER > CUSTOMER
      expect(guard.isRoleEscalation(MembershipRole.CUSTOMER, MembershipRole.RIDER)).toBe(true);
      expect(guard.isRoleEscalation(MembershipRole.RIDER, MembershipRole.BUSINESS_OWNER)).toBe(true);
      expect(guard.isRoleEscalation(MembershipRole.BUSINESS_OWNER, MembershipRole.OPS)).toBe(true);
      expect(guard.isRoleEscalation(MembershipRole.OPS, MembershipRole.ADMIN)).toBe(true);

      // Reverse should not be escalation
      expect(guard.isRoleEscalation(MembershipRole.ADMIN, MembershipRole.OPS)).toBe(false);
      expect(guard.isRoleEscalation(MembershipRole.OPS, MembershipRole.BUSINESS_OWNER)).toBe(false);
      expect(guard.isRoleEscalation(MembershipRole.BUSINESS_OWNER, MembershipRole.RIDER)).toBe(false);
      expect(guard.isRoleEscalation(MembershipRole.RIDER, MembershipRole.CUSTOMER)).toBe(false);
    });
  });
});
