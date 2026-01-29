import { Test, TestingModule } from '@nestjs/testing';

import {
  NEO4J_MODULE_OPTIONS,
  DEFAULT_NEO4J_URI,
  DEFAULT_NEO4J_DATABASE,
} from '../../neo4j.constants';
import { Neo4jService, Neo4jModuleOptions } from '../../neo4j.service';

const mockSession = {
  run: jest.fn(),
  close: jest.fn(),
};

const mockDriver = {
  verifyConnectivity: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  session: jest.fn().mockReturnValue(mockSession),
};

jest.mock('neo4j-driver', () => ({
  __esModule: true,
  default: {
    driver: jest.fn(() => mockDriver),
    session: {
      READ: 'READ',
      WRITE: 'WRITE',
    },
  },
  auth: {
    basic: jest.fn((user: string, pass: string) => ({
      scheme: 'basic',
      principal: user,
      credentials: pass,
    })),
  },
}));

import neo4j, { auth } from 'neo4j-driver';

describe('Neo4jService', () => {
  let service: Neo4jService;
  let module: TestingModule;

  const createTestingModule = async (
    options: Neo4jModuleOptions = {},
  ): Promise<void> => {
    module = await Test.createTestingModule({
      providers: [
        {
          provide: NEO4J_MODULE_OPTIONS,
          useValue: options,
        },
        Neo4jService,
      ],
    }).compile();

    service = module.get<Neo4jService>(Neo4jService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDriver.verifyConnectivity.mockResolvedValue(undefined);
    mockDriver.close.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('onModuleInit', () => {
    it('should create driver with correct URI and no auth when credentials not provided', async () => {
      await createTestingModule({ uri: 'bolt://test:7687' });

      await service.onModuleInit();

      expect(neo4j.driver).toHaveBeenCalledWith('bolt://test:7687', undefined);
      expect(mockDriver.verifyConnectivity).toHaveBeenCalledWith({
        database: DEFAULT_NEO4J_DATABASE,
      });
    });

    it('should create driver with basic auth when user and password provided', async () => {
      await createTestingModule({
        uri: 'bolt://test:7687',
        user: 'testuser',
        password: 'testpass',
      });

      await service.onModuleInit();

      expect(auth.basic).toHaveBeenCalledWith('testuser', 'testpass');
      expect(neo4j.driver).toHaveBeenCalledWith(
        'bolt://test:7687',
        expect.objectContaining({ scheme: 'basic' }),
      );
    });

    it('should verify connectivity with configured database', async () => {
      await createTestingModule({
        uri: 'bolt://test:7687',
        database: 'testdb',
      });

      await service.onModuleInit();

      expect(mockDriver.verifyConnectivity).toHaveBeenCalledWith({
        database: 'testdb',
      });
    });

    it('should log error and re-throw on connection failure', async () => {
      const error = new Error('Connection failed');
      mockDriver.verifyConnectivity.mockRejectedValueOnce(error);

      await createTestingModule({ uri: 'bolt://test:7687' });

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
    });
  });

  describe('onModuleDestroy', () => {
    it('should close driver when driver exists', async () => {
      await createTestingModule({ uri: 'bolt://test:7687' });
      await service.onModuleInit();

      await service.onModuleDestroy();

      expect(mockDriver.close).toHaveBeenCalled();
    });

    it('should not throw when driver does not exist', async () => {
      await createTestingModule({ uri: 'bolt://test:7687' });

      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('getSession', () => {
    beforeEach(async () => {
      await createTestingModule({ uri: 'bolt://test:7687', database: 'testdb' });
      await service.onModuleInit();
    });

    it('should call driver.session with default database', () => {
      service.getSession();

      expect(mockDriver.session).toHaveBeenCalledWith({ database: 'testdb' });
    });

    it('should merge provided options with defaults', () => {
      service.getSession({ defaultAccessMode: 'READ' as never });

      expect(mockDriver.session).toHaveBeenCalledWith({
        database: 'testdb',
        defaultAccessMode: 'READ',
      });
    });

    it('should allow database override via options', () => {
      service.getSession({ database: 'otherdb' });

      expect(mockDriver.session).toHaveBeenCalledWith({ database: 'otherdb' });
    });
  });

  describe('getReadSession', () => {
    beforeEach(async () => {
      await createTestingModule({ uri: 'bolt://test:7687', database: 'testdb' });
      await service.onModuleInit();
    });

    it('should call driver.session with READ access mode', () => {
      service.getReadSession();

      expect(mockDriver.session).toHaveBeenCalledWith({
        database: 'testdb',
        defaultAccessMode: 'READ',
      });
    });

    it('should use provided database override', () => {
      service.getReadSession('customdb');

      expect(mockDriver.session).toHaveBeenCalledWith({
        database: 'customdb',
        defaultAccessMode: 'READ',
      });
    });
  });

  describe('getWriteSession', () => {
    beforeEach(async () => {
      await createTestingModule({ uri: 'bolt://test:7687', database: 'testdb' });
      await service.onModuleInit();
    });

    it('should call driver.session with WRITE access mode', () => {
      service.getWriteSession();

      expect(mockDriver.session).toHaveBeenCalledWith({
        database: 'testdb',
        defaultAccessMode: 'WRITE',
      });
    });

    it('should use provided database override', () => {
      service.getWriteSession('customdb');

      expect(mockDriver.session).toHaveBeenCalledWith({
        database: 'customdb',
        defaultAccessMode: 'WRITE',
      });
    });
  });

  describe('getDriver', () => {
    it('should return the driver instance', async () => {
      await createTestingModule({ uri: 'bolt://test:7687' });
      await service.onModuleInit();

      const driver = service.getDriver();

      expect(driver).toBe(mockDriver);
    });
  });

  describe('default values', () => {
    it('should use DEFAULT_NEO4J_URI when no URI provided', async () => {
      await createTestingModule({});

      await service.onModuleInit();

      expect(neo4j.driver).toHaveBeenCalledWith(DEFAULT_NEO4J_URI, undefined);
    });

    it('should use DEFAULT_NEO4J_DATABASE when no database provided', async () => {
      await createTestingModule({});

      await service.onModuleInit();

      expect(mockDriver.verifyConnectivity).toHaveBeenCalledWith({
        database: DEFAULT_NEO4J_DATABASE,
      });
    });
  });
});
