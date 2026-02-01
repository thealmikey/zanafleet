import { MembershipNeo4jInitializer } from '../../projections/membership-neo4j.projection';
import { WorkspaceNeo4jInitializer } from '../../projections/workspace-neo4j.projection';
import { WorkspaceModule } from '../../workspace.module';

describe('WorkspaceModule', () => {
  describe('onModuleInit', () => {
    let mockWorkspaceInitializer: jest.Mocked<WorkspaceNeo4jInitializer>;
    let mockMembershipInitializer: jest.Mocked<MembershipNeo4jInitializer>;
    let workspaceModule: WorkspaceModule;
    let loggerSpy: jest.SpyInstance;
    let originalStrictMode: string | undefined;

    beforeEach(() => {
      originalStrictMode = process.env.NEO4J_STRICT_MODE;
      delete process.env.NEO4J_STRICT_MODE;

      mockWorkspaceInitializer = {
        initialize: jest.fn(),
      } as unknown as jest.Mocked<WorkspaceNeo4jInitializer>;

      mockMembershipInitializer = {
        initialize: jest.fn(),
      } as unknown as jest.Mocked<MembershipNeo4jInitializer>;

      workspaceModule = new WorkspaceModule(
        mockWorkspaceInitializer,
        mockMembershipInitializer
      );
      loggerSpy = jest.spyOn(workspaceModule['logger'], 'error').mockImplementation();
    });

    afterEach(() => {
      loggerSpy.mockRestore();
      if (originalStrictMode !== undefined) {
        process.env.NEO4J_STRICT_MODE = originalStrictMode;
      } else {
        delete process.env.NEO4J_STRICT_MODE;
      }
    });

    it('should call both initializers', async () => {
      mockWorkspaceInitializer.initialize.mockResolvedValue(undefined);
      mockMembershipInitializer.initialize.mockResolvedValue(undefined);

      await workspaceModule.onModuleInit();

      expect(mockWorkspaceInitializer.initialize).toHaveBeenCalledTimes(1);
      expect(mockMembershipInitializer.initialize).toHaveBeenCalledTimes(1);
    });

    it('should complete without error when both initializers succeed', async () => {
      mockWorkspaceInitializer.initialize.mockResolvedValue(undefined);
      mockMembershipInitializer.initialize.mockResolvedValue(undefined);

      await expect(workspaceModule.onModuleInit()).resolves.toBeUndefined();
    });

    it('should throw error when workspaceNeo4jInitializer fails and NEO4J_STRICT_MODE is true', async () => {
      process.env.NEO4J_STRICT_MODE = 'true';
      const error = new Error('Workspace Neo4j init failed');
      mockWorkspaceInitializer.initialize.mockRejectedValue(error);
      mockMembershipInitializer.initialize.mockResolvedValue(undefined);

      await expect(workspaceModule.onModuleInit()).rejects.toThrow('Workspace Neo4j init failed');
    });

    it('should throw error when membershipNeo4jInitializer fails and NEO4J_STRICT_MODE is true', async () => {
      process.env.NEO4J_STRICT_MODE = 'true';
      const error = new Error('Membership Neo4j init failed');
      mockWorkspaceInitializer.initialize.mockResolvedValue(undefined);
      mockMembershipInitializer.initialize.mockRejectedValue(error);

      await expect(workspaceModule.onModuleInit()).rejects.toThrow('Membership Neo4j init failed');
    });

    it('should throw error when both initializers fail and NEO4J_STRICT_MODE is true', async () => {
      process.env.NEO4J_STRICT_MODE = 'true';
      mockWorkspaceInitializer.initialize.mockRejectedValue(new Error('Workspace error'));
      mockMembershipInitializer.initialize.mockRejectedValue(new Error('Membership error'));

      await expect(workspaceModule.onModuleInit()).rejects.toThrow();
    });

    it('should NOT throw error when workspaceNeo4jInitializer fails and NEO4J_STRICT_MODE is not set', async () => {
      delete process.env.NEO4J_STRICT_MODE;
      const error = new Error('Workspace Neo4j init failed');
      mockWorkspaceInitializer.initialize.mockRejectedValue(error);
      mockMembershipInitializer.initialize.mockResolvedValue(undefined);

      await expect(workspaceModule.onModuleInit()).resolves.toBeUndefined();
    });

    it('should NOT throw error when membershipNeo4jInitializer fails and NEO4J_STRICT_MODE is not set', async () => {
      delete process.env.NEO4J_STRICT_MODE;
      const error = new Error('Membership Neo4j init failed');
      mockWorkspaceInitializer.initialize.mockResolvedValue(undefined);
      mockMembershipInitializer.initialize.mockRejectedValue(error);

      await expect(workspaceModule.onModuleInit()).resolves.toBeUndefined();
    });

    it('should throw error when initializer fails and NEO4J_STRICT_MODE is TRUE (uppercase)', async () => {
      process.env.NEO4J_STRICT_MODE = 'TRUE';
      const error = new Error('Workspace Neo4j init failed');
      mockWorkspaceInitializer.initialize.mockRejectedValue(error);
      mockMembershipInitializer.initialize.mockResolvedValue(undefined);

      await expect(workspaceModule.onModuleInit()).rejects.toThrow('Workspace Neo4j init failed');
    });

    it('should throw error when initializer fails and NEO4J_STRICT_MODE is True (mixed case)', async () => {
      process.env.NEO4J_STRICT_MODE = 'True';
      const error = new Error('Workspace Neo4j init failed');
      mockWorkspaceInitializer.initialize.mockRejectedValue(error);
      mockMembershipInitializer.initialize.mockResolvedValue(undefined);

      await expect(workspaceModule.onModuleInit()).rejects.toThrow('Workspace Neo4j init failed');
    });

    it('should invoke both initializers concurrently before either settles (Promise.all starts all promises immediately)', async () => {
      delete process.env.NEO4J_STRICT_MODE;

      let workspaceResolve: () => void;
      const workspacePromise = new Promise<void>((resolve) => {
        workspaceResolve = resolve;
      });

      mockWorkspaceInitializer.initialize.mockReturnValue(workspacePromise);
      mockMembershipInitializer.initialize.mockRejectedValue(new Error('Membership failed'));

      const initPromise = workspaceModule.onModuleInit();

      expect(mockWorkspaceInitializer.initialize).toHaveBeenCalledTimes(1);
      expect(mockMembershipInitializer.initialize).toHaveBeenCalledTimes(1);

      workspaceResolve!();

      await expect(initPromise).resolves.toBeUndefined();
    });

    it('should log error when an initializer fails', async () => {
      const error = new Error('Workspace Neo4j init failed');
      mockWorkspaceInitializer.initialize.mockRejectedValue(error);
      mockMembershipInitializer.initialize.mockResolvedValue(undefined);

      await workspaceModule.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith('Failed to initialize Neo4j constraints', error);
    });

    it('should log error when an initializer fails and NEO4J_STRICT_MODE is true', async () => {
      process.env.NEO4J_STRICT_MODE = 'true';
      const error = new Error('Membership Neo4j init failed');
      mockWorkspaceInitializer.initialize.mockResolvedValue(undefined);
      mockMembershipInitializer.initialize.mockRejectedValue(error);

      await expect(workspaceModule.onModuleInit()).rejects.toThrow();

      expect(loggerSpy).toHaveBeenCalledWith('Failed to initialize Neo4j constraints', error);
    });

    it('should NOT log error when both initializers succeed', async () => {
      mockWorkspaceInitializer.initialize.mockResolvedValue(undefined);
      mockMembershipInitializer.initialize.mockResolvedValue(undefined);

      await workspaceModule.onModuleInit();

      expect(loggerSpy).not.toHaveBeenCalled();
    });
  });
});
