import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { MediaPerceptionConfig } from '../../config/media-perception.config';
import { MediaPerceptionFeatureService } from '../../services/media-perception-feature.service';

describe('MediaPerceptionFeatureService', () => {
  const createMockConfig = (overrides?: Partial<MediaPerceptionConfig>): MediaPerceptionConfig => ({
    enabled: false,
    confidenceThreshold: 0.7,
    overrideThreshold: 0.85,
    analysisTimeoutMs: 30000,
    asyncProcessing: true,
    provider: 'noop',
    openai: { apiKey: '', model: 'gpt-4o', maxTokens: 4096 },
    features: {
      volumeEstimation: true,
      laborEstimation: true,
      fragilityDetection: true,
      itemDetection: true,
    },
    ...overrides,
  });

  describe('isEnabled', () => {
    it('should return false by default', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(createMockConfig()),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaPerceptionFeatureService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const service = module.get<MediaPerceptionFeatureService>(MediaPerceptionFeatureService);
      expect(service.isEnabled()).toBe(false);
    });

    it('should return true when enabled in config', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(createMockConfig({ enabled: true })),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaPerceptionFeatureService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const service = module.get<MediaPerceptionFeatureService>(MediaPerceptionFeatureService);
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('shouldProcessMedia', () => {
    it('should return false when hasMedia is false', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(createMockConfig({ enabled: true })),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaPerceptionFeatureService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const service = module.get<MediaPerceptionFeatureService>(MediaPerceptionFeatureService);
      expect(service.shouldProcessMedia(false)).toBe(false);
    });

    it('should return false when feature is disabled', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(createMockConfig({ enabled: false })),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaPerceptionFeatureService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const service = module.get<MediaPerceptionFeatureService>(MediaPerceptionFeatureService);
      expect(service.shouldProcessMedia(true)).toBe(false);
    });

    it('should return true when feature enabled and has media', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(createMockConfig({ enabled: true })),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaPerceptionFeatureService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const service = module.get<MediaPerceptionFeatureService>(MediaPerceptionFeatureService);
      expect(service.shouldProcessMedia(true)).toBe(true);
    });
  });

  describe('shouldOverrideLegacy', () => {
    it('should return false when feature is disabled', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(createMockConfig({ enabled: false })),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaPerceptionFeatureService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const service = module.get<MediaPerceptionFeatureService>(MediaPerceptionFeatureService);
      expect(service.shouldOverrideLegacy(0.9)).toBe(false);
    });

    it('should return false when confidence below threshold', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(createMockConfig({ enabled: true, overrideThreshold: 0.85 })),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaPerceptionFeatureService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const service = module.get<MediaPerceptionFeatureService>(MediaPerceptionFeatureService);
      expect(service.shouldOverrideLegacy(0.8)).toBe(false);
    });

    it('should return true when confidence meets threshold', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(createMockConfig({ enabled: true, overrideThreshold: 0.85 })),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaPerceptionFeatureService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const service = module.get<MediaPerceptionFeatureService>(MediaPerceptionFeatureService);
      expect(service.shouldOverrideLegacy(0.85)).toBe(true);
      expect(service.shouldOverrideLegacy(0.9)).toBe(true);
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return false when main feature is disabled', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(createMockConfig({ enabled: false })),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaPerceptionFeatureService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const service = module.get<MediaPerceptionFeatureService>(MediaPerceptionFeatureService);
      expect(service.isFeatureEnabled('volumeEstimation')).toBe(false);
    });

    it('should return true when main feature and sub-feature are enabled', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(createMockConfig({ enabled: true })),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaPerceptionFeatureService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const service = module.get<MediaPerceptionFeatureService>(MediaPerceptionFeatureService);
      expect(service.isFeatureEnabled('volumeEstimation')).toBe(true);
    });

    it('should return false when sub-feature is disabled', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(createMockConfig({
          enabled: true,
          features: {
            volumeEstimation: false,
            laborEstimation: true,
            fragilityDetection: true,
            itemDetection: true,
          },
        })),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaPerceptionFeatureService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const service = module.get<MediaPerceptionFeatureService>(MediaPerceptionFeatureService);
      expect(service.isFeatureEnabled('volumeEstimation')).toBe(false);
    });
  });
});
