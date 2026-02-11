import { ExecutionContext, ForbiddenException , Controller, Get, UseGuards } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { RequireCapability, CAPABILITY_KEY } from '../../decorators/require-capability.decorator';
import {
  CapabilityGuard,
  CAPABILITY_ACCESS_CONTROLLER,
  ICapabilityAccessController,
} from '../../guards/capability.guard';

describe('CapabilityGuard', () => {
  let guard: CapabilityGuard;
  let mockCapabilityAccessController: jest.Mocked<ICapabilityAccessController>;

  const createMockExecutionContext = (
    user?: { actorId?: string },
    handlerCapabilities?: string[]
  ): ExecutionContext => {
    const mockRequest = { user };
    const mockHandler = jest.fn();
    const mockClass = class TestController {};

    if (handlerCapabilities) {
      Reflect.defineMetadata(CAPABILITY_KEY, handlerCapabilities, mockHandler);
    }

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
      getHandler: () => mockHandler,
      getClass: () => mockClass,
      getType: () => 'http',
      getArgs: () => [],
      getArgByIndex: () => null,
      switchToRpc: () => ({ getData: jest.fn(), getContext: jest.fn() }),
      switchToWs: () => ({ getData: jest.fn(), getClient: jest.fn() }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    mockCapabilityAccessController = {
      hasCapability: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapabilityGuard,
        Reflector,
        {
          provide: CAPABILITY_ACCESS_CONTROLLER,
          useValue: mockCapabilityAccessController,
        },
      ],
    }).compile();

    guard = module.get<CapabilityGuard>(CapabilityGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when no capabilities are required', async () => {
      const context = createMockExecutionContext({ actorId: 'actor-123' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockCapabilityAccessController.hasCapability).not.toHaveBeenCalled();
    });

    it('should allow access when user has required capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(true);

      const context = createMockExecutionContext({ actorId: 'actor-123' }, ['read_users']);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockCapabilityAccessController.hasCapability).toHaveBeenCalledWith(
        'actor-123',
        'read_users'
      );
    });

    it('should allow access when user has all required capabilities', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(true);

      const context = createMockExecutionContext(
        { actorId: 'actor-123' },
        ['read_users', 'write_users']
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockCapabilityAccessController.hasCapability).toHaveBeenCalledTimes(2);
      expect(mockCapabilityAccessController.hasCapability).toHaveBeenCalledWith(
        'actor-123',
        'read_users'
      );
      expect(mockCapabilityAccessController.hasCapability).toHaveBeenCalledWith(
        'actor-123',
        'write_users'
      );
    });

    it('should deny access when user is missing a required capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      const context = createMockExecutionContext({ actorId: 'actor-123' }, ['admin_access']);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Missing required capability: admin_access'
      );
    });

    it('should deny access when user is missing one of multiple required capabilities', async () => {
      mockCapabilityAccessController.hasCapability
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const context = createMockExecutionContext(
        { actorId: 'actor-123' },
        ['read_users', 'delete_users']
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('Missing required capability: delete_users')
      );
    });

    it('should deny access when user is not authenticated', async () => {
      const context = createMockExecutionContext(undefined, ['read_users']);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Authentication required');
    });

    it('should deny access when user has no actorId', async () => {
      const context = createMockExecutionContext({}, ['read_users']);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Authentication required');
    });
  });

  describe('without CapabilityAccessController', () => {
    let guardWithoutController: CapabilityGuard;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [CapabilityGuard, Reflector],
      }).compile();

      guardWithoutController = module.get<CapabilityGuard>(CapabilityGuard);
    });

    it('should allow access when no capabilities are required', async () => {
      const context = createMockExecutionContext({ actorId: 'actor-123' });

      const result = await guardWithoutController.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw when capabilities are required but controller is not configured', async () => {
      const context = createMockExecutionContext({ actorId: 'actor-123' }, ['read_users']);

      await expect(guardWithoutController.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guardWithoutController.canActivate(context)).rejects.toThrow(
        'Capability access controller not configured'
      );
    });
  });
});

describe('RequireCapability decorator', () => {
  it('should set metadata with single capability', () => {
    @Controller('test')
    class TestController {
      @Get()
      @RequireCapability('read_data')
      getData(): string {
        return 'data';
      }
    }

    const metadata = Reflect.getMetadata(
      CAPABILITY_KEY,
      TestController.prototype.getData
    );

    expect(metadata).toEqual(['read_data']);
  });

  it('should set metadata with multiple capabilities', () => {
    @Controller('test')
    class TestController {
      @Get()
      @RequireCapability('read_data', 'write_data', 'delete_data')
      manageData(): string {
        return 'managed';
      }
    }

    const metadata = Reflect.getMetadata(
      CAPABILITY_KEY,
      TestController.prototype.manageData
    );

    expect(metadata).toEqual(['read_data', 'write_data', 'delete_data']);
  });

  it('should work as class decorator', () => {
    @Controller('admin')
    @RequireCapability('admin_access')
    class AdminController {
      @Get()
      getAdmin(): string {
        return 'admin';
      }
    }

    const metadata = Reflect.getMetadata(CAPABILITY_KEY, AdminController);

    expect(metadata).toEqual(['admin_access']);
  });
});

describe('CapabilityGuard with real controller (integration scaffold)', () => {
  @Controller('test')
  class TestController {
    @Get('public')
    publicEndpoint(): string {
      return 'public';
    }

    @Get('protected')
    @UseGuards(CapabilityGuard)
    @RequireCapability('view_protected')
    protectedEndpoint(): string {
      return 'protected';
    }

    @Get('admin')
    @UseGuards(CapabilityGuard)
    @RequireCapability('admin_read', 'admin_write')
    adminEndpoint(): string {
      return 'admin';
    }
  }

  it('should compile controller with guard and decorator wiring', () => {
    expect(TestController).toBeDefined();
    expect(TestController.prototype.publicEndpoint).toBeDefined();
    expect(TestController.prototype.protectedEndpoint).toBeDefined();
    expect(TestController.prototype.adminEndpoint).toBeDefined();
  });

  it('should have correct metadata on protected endpoints', () => {
    const protectedMeta = Reflect.getMetadata(
      CAPABILITY_KEY,
      TestController.prototype.protectedEndpoint
    );
    const adminMeta = Reflect.getMetadata(
      CAPABILITY_KEY,
      TestController.prototype.adminEndpoint
    );

    expect(protectedMeta).toEqual(['view_protected']);
    expect(adminMeta).toEqual(['admin_read', 'admin_write']);
  });
});
