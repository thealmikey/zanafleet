import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ActorEntity } from '../../../actor/entities/actor.entity';
import { OrganizationEntity } from '../../../organization/entities/organization.entity';
import { MembershipEntity } from '../../entities/membership.entity';
import { WorkspaceEntity } from '../../entities/workspace.entity';
import { MembershipNeo4jInitializer } from '../../projections/membership-neo4j.projection';
import { WorkspaceNeo4jInitializer } from '../../projections/workspace-neo4j.projection';
import { WorkspaceModule } from '../../workspace.module';

describe('WorkspaceModule', () => {
  let module: TestingModule;
  let workspaceModule: WorkspaceModule;
  let workspaceInitializer: jest.Mocked<WorkspaceNeo4jInitializer>;
  let membershipInitializer: jest.Mocked<MembershipNeo4jInitializer>;
  let loggerErrorSpy: jest.SpyInstance;

  const mockWorkspaceInitializer = {
    initialize: jest.fn(),
  };

  const mockMembershipInitializer = {
    initialize: jest.fn(),
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.NEO4J_STRICT_MODE;

    mockWorkspaceInitializer.initialize.mockResolvedValue(undefined);
    mockMembershipInitializer.initialize.mockResolvedValue(undefined);

    module = await Test.createTestingModule({
      imports: [],
      providers: [
        WorkspaceModule,
        {
          provide: WorkspaceNeo4jInitializer,
          useValue: mockWorkspaceInitializer,
        },
        {
          provide: MembershipNeo4jInitializer,
          useValue: mockMembershipInitializer,
        },
        {
          provide: getRepositoryToken(WorkspaceEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(MembershipEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(OrganizationEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ActorEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    workspaceModule = module.get<WorkspaceModule>(WorkspaceModule);
    workspaceInitializer = module.get(WorkspaceNeo4jInitializer);
    membershipInitializer = module.get(MembershipNeo4jInitializer);

    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(async () => {
    loggerErrorSpy.mockRestore();
    await module.close();
  });

  describe('onModuleInit', () => {
    it('should call both initializers', async () => {
      await workspaceModule.onModuleInit();

      expect(workspaceInitializer.initialize).toHaveBeenCalledTimes(1);
      expect(membershipInitializer.initialize).toHaveBeenCalledTimes(1);
    });

    it('should call initializers in parallel using Promise.all', async () => {
      const callOrder: string[] = [];

      mockWorkspaceInitializer.initialize.mockImplementation(async () => {
        callOrder.push('workspace-start');
        await new Promise((resolve) => setTimeout(resolve, 10));
        callOrder.push('workspace-end');
      });

      mockMembershipInitializer.initialize.mockImplementation(async () => {
        callOrder.push('membership-start');
        await new Promise((resolve) => setTimeout(resolve, 5));
        callOrder.push('membership-end');
      });

      await workspaceModule.onModuleInit();

      expect(callOrder[0]).toBe('workspace-start');
      expect(callOrder[1]).toBe('membership-start');
      expect(callOrder).toContain('workspace-end');
      expect(callOrder).toContain('membership-end');
    });

    it('should complete successfully when both initializers succeed', async () => {
      await expect(workspaceModule.onModuleInit()).resolves.not.toThrow();

      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    describe('error handling', () => {
      const testError = new Error('Neo4j connection failed');

      it('should log error when workspace initializer fails', async () => {
        mockWorkspaceInitializer.initialize.mockRejectedValue(testError);

        await workspaceModule.onModuleInit();

        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'Failed to initialize Neo4j constraints',
          testError
        );
      });

      it('should log error when membership initializer fails', async () => {
        mockMembershipInitializer.initialize.mockRejectedValue(testError);

        await workspaceModule.onModuleInit();

        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'Failed to initialize Neo4j constraints',
          testError
        );
      });

      it('should not throw error in non-strict mode when initializer fails', async () => {
        mockWorkspaceInitializer.initialize.mockRejectedValue(testError);

        await expect(workspaceModule.onModuleInit()).resolves.not.toThrow();
      });

      it('should throw error in strict mode when workspace initializer fails', async () => {
        process.env.NEO4J_STRICT_MODE = 'true';
        mockWorkspaceInitializer.initialize.mockRejectedValue(testError);

        await expect(workspaceModule.onModuleInit()).rejects.toThrow(testError);
      });

      it('should throw error in strict mode when membership initializer fails', async () => {
        process.env.NEO4J_STRICT_MODE = 'true';
        mockMembershipInitializer.initialize.mockRejectedValue(testError);

        await expect(workspaceModule.onModuleInit()).rejects.toThrow(testError);
      });

      it('should handle both initializers failing', async () => {
        const workspaceError = new Error('Workspace init failed');
        const membershipError = new Error('Membership init failed');

        mockWorkspaceInitializer.initialize.mockRejectedValue(workspaceError);
        mockMembershipInitializer.initialize.mockRejectedValue(membershipError);

        await workspaceModule.onModuleInit();

        expect(loggerErrorSpy).toHaveBeenCalled();
      });

      it('should still attempt membership init even if workspace init fails first in Promise.all', async () => {
        mockWorkspaceInitializer.initialize.mockRejectedValue(testError);

        await workspaceModule.onModuleInit();

        expect(workspaceInitializer.initialize).toHaveBeenCalled();
        expect(membershipInitializer.initialize).toHaveBeenCalled();
      });
    });

    describe('NEO4J_STRICT_MODE environment variable', () => {
      it('should not throw when NEO4J_STRICT_MODE is not set', async () => {
        delete process.env.NEO4J_STRICT_MODE;
        mockWorkspaceInitializer.initialize.mockRejectedValue(new Error('test'));

        await expect(workspaceModule.onModuleInit()).resolves.not.toThrow();
      });

      it('should not throw when NEO4J_STRICT_MODE is false', async () => {
        process.env.NEO4J_STRICT_MODE = 'false';
        mockWorkspaceInitializer.initialize.mockRejectedValue(new Error('test'));

        await expect(workspaceModule.onModuleInit()).resolves.not.toThrow();
      });

      it('should throw when NEO4J_STRICT_MODE is true', async () => {
        process.env.NEO4J_STRICT_MODE = 'true';
        const testError = new Error('test');
        mockWorkspaceInitializer.initialize.mockRejectedValue(testError);

        await expect(workspaceModule.onModuleInit()).rejects.toThrow(testError);
      });
    });
  });
});
