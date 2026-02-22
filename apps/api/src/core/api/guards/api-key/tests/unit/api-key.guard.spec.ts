import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from '../../api-key.guard';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let mockConfigService: {
    get: jest.Mock;
  };

  // Shared request object for tracking mutations
  let mockRequest: { headers: Record<string, string>; user: any };

  const createMockContext = (headers: Record<string, string> = {}) => {
    mockRequest = {
      headers,
      user: undefined,
    };
    
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as any;
  };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
  });

  describe('when no API keys are configured (development mode)', () => {
    it('should allow requests without API keys', () => {
      mockConfigService.get.mockReturnValue(undefined);
      const context = createMockContext({});
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should set a mock user for downstream guards', () => {
      mockConfigService.get.mockReturnValue(undefined);
      const context = createMockContext();
      guard.canActivate(context);
      expect(mockRequest.user).toEqual({
        actorId: 'api-key-auth',
        type: 'external',
      });
    });

    it('should allow requests with any API key', () => {
      mockConfigService.get.mockReturnValue(undefined);
      const context = createMockContext({ 'x-api-key': 'any-key' });
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('when API keys are configured', () => {
    it('should allow requests with valid API key and secret', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ZANAFLEET_API_KEY') return 'test_api_key';
        if (key === 'ZANAFLEET_API_SECRET') return 'test_api_secret';
        return undefined;
      });
      const context = createMockContext({
        'x-api-key': 'test_api_key',
        'x-api-secret': 'test_api_secret',
      });
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should set user on successful authentication', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ZANAFLEET_API_KEY') return 'test_api_key';
        if (key === 'ZANAFLEET_API_SECRET') return 'test_api_secret';
        return undefined;
      });
      const context = createMockContext({
        'x-api-key': 'test_api_key',
        'x-api-secret': 'test_api_secret',
      });
      guard.canActivate(context);
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user.actorId).toBe('api-key-auth');
      expect(mockRequest.user.type).toBe('external');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string API key configuration', () => {
      mockConfigService.get.mockReturnValue('');
      const context = createMockContext({ 'x-api-key': '' });
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });
  });
});
