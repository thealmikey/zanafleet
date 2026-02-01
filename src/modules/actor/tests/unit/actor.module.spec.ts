import { ActorModule } from '../../actor.module';
import { ActorNeo4jInitializer } from '../../projections/actor-neo4j.projection';

describe('ActorModule', () => {
  describe('onModuleInit', () => {
    let mockInitializer: jest.Mocked<ActorNeo4jInitializer>;
    let actorModule: ActorModule;
    let loggerSpy: jest.SpyInstance;
    let originalStrictMode: string | undefined;

    beforeEach(() => {
      originalStrictMode = process.env.NEO4J_STRICT_MODE;
      delete process.env.NEO4J_STRICT_MODE;

      mockInitializer = {
        initialize: jest.fn(),
      } as unknown as jest.Mocked<ActorNeo4jInitializer>;

      actorModule = new ActorModule(mockInitializer);
      loggerSpy = jest.spyOn(actorModule['logger'], 'error').mockImplementation();
    });

    afterEach(() => {
      loggerSpy.mockRestore();
      if (originalStrictMode !== undefined) {
        process.env.NEO4J_STRICT_MODE = originalStrictMode;
      } else {
        delete process.env.NEO4J_STRICT_MODE;
      }
    });

    it('should call neo4jInitializer.initialize()', async () => {
      mockInitializer.initialize.mockResolvedValue(undefined);

      await actorModule.onModuleInit();

      expect(mockInitializer.initialize).toHaveBeenCalledTimes(1);
    });

    it('should complete without error when initialize() succeeds', async () => {
      mockInitializer.initialize.mockResolvedValue(undefined);

      await expect(actorModule.onModuleInit()).resolves.toBeUndefined();
    });

    it('should throw error when initialize() fails and NEO4J_STRICT_MODE is true', async () => {
      process.env.NEO4J_STRICT_MODE = 'true';
      const error = new Error('Neo4j connection failed');
      mockInitializer.initialize.mockRejectedValue(error);

      await expect(actorModule.onModuleInit()).rejects.toThrow('Neo4j connection failed');
    });

    it('should NOT throw error when initialize() fails and NEO4J_STRICT_MODE is not set', async () => {
      delete process.env.NEO4J_STRICT_MODE;
      const error = new Error('Neo4j connection failed');
      mockInitializer.initialize.mockRejectedValue(error);

      await expect(actorModule.onModuleInit()).resolves.toBeUndefined();
    });

    it('should NOT throw error when initialize() fails and NEO4J_STRICT_MODE is false', async () => {
      process.env.NEO4J_STRICT_MODE = 'false';
      const error = new Error('Neo4j connection failed');
      mockInitializer.initialize.mockRejectedValue(error);

      await expect(actorModule.onModuleInit()).resolves.toBeUndefined();
    });

    it('should NOT throw error when initialize() fails and NEO4J_STRICT_MODE is TRUE (uppercase) - documents case-sensitive behavior', async () => {
      process.env.NEO4J_STRICT_MODE = 'TRUE';
      const error = new Error('Neo4j connection failed');
      mockInitializer.initialize.mockRejectedValue(error);

      // Current implementation is case-sensitive: 'TRUE' !== 'true'
      await expect(actorModule.onModuleInit()).resolves.toBeUndefined();
    });

    it('should log error when initialize() fails', async () => {
      const error = new Error('Neo4j connection failed');
      mockInitializer.initialize.mockRejectedValue(error);

      await actorModule.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith('Failed to initialize Neo4j constraints', error);
    });

    it('should log error when initialize() fails and NEO4J_STRICT_MODE is true', async () => {
      process.env.NEO4J_STRICT_MODE = 'true';
      const error = new Error('Neo4j connection failed');
      mockInitializer.initialize.mockRejectedValue(error);

      await expect(actorModule.onModuleInit()).rejects.toThrow();

      expect(loggerSpy).toHaveBeenCalledWith('Failed to initialize Neo4j constraints', error);
    });

    it('should NOT log error when initialize() succeeds', async () => {
      mockInitializer.initialize.mockResolvedValue(undefined);

      await actorModule.onModuleInit();

      expect(loggerSpy).not.toHaveBeenCalled();
    });
  });
});
