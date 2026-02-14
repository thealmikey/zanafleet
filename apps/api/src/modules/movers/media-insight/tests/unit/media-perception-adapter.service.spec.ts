import { Test, TestingModule } from '@nestjs/testing';

import { MediaInsight } from '../../interfaces';
import { NoopVisionProvider } from '../../providers/noop-vision.provider';
import { MediaPerceptionAdapter, MediaReference } from '../../services/media-perception-adapter.service';
import { MediaPerceptionFeatureService } from '../../services/media-perception-feature.service';

describe('MediaPerceptionAdapter', () => {
  let adapter: MediaPerceptionAdapter;
  let mockFeatureService: jest.Mocked<MediaPerceptionFeatureService>;
  let mockNoopProvider: jest.Mocked<NoopVisionProvider>;

  const mockMediaInsight: MediaInsight = {
    schemaVersion: '1.0.0',
    detectedItems: [{ label: 'sofa', category: 'furniture', sizeClass: 'large', quantity: 1, confidence: 0.9 }],
    estimatedTotalVolumeM3: 5.5,
    estimatedLaborIntensity: 3,
    fragilityScore: 0.3,
    specialHandlingRequired: false,
    perceptionConfidence: 0.85,
    modelVersion: 'gpt-4o',
    analyzedAt: new Date().toISOString(),
    mediaReferences: ['https://example.com/image.jpg'],
  };

  beforeEach(async () => {
    mockFeatureService = {
      isEnabled: jest.fn().mockReturnValue(true),
      getConfidenceThreshold: jest.fn().mockReturnValue(0.7),
      shouldProcessMedia: jest.fn().mockReturnValue(true),
    } as any;

    mockNoopProvider = {
      name: 'noop',
      isAvailable: true,
      initialize: jest.fn().mockResolvedValue(undefined),
      analyze: jest.fn(),
      healthCheck: jest.fn().mockResolvedValue(true),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaPerceptionAdapter,
        {
          provide: NoopVisionProvider,
          useValue: mockNoopProvider,
        },
        {
          provide: MediaPerceptionFeatureService,
          useValue: mockFeatureService,
        },
      ],
    }).compile();

    adapter = module.get<MediaPerceptionAdapter>(MediaPerceptionAdapter);
  });

  describe('analyzeMedia', () => {
    it('should return skipped result when feature is disabled', async () => {
      mockFeatureService.isEnabled.mockReturnValue(false);

      const mediaRefs: MediaReference[] = [{ url: 'https://example.com/image.jpg', type: 'image' }];
      const result = await adapter.analyzeMedia(mediaRefs);

      expect(result.status).toBe('skipped');
      expect(result.errorCode).toBe('FEATURE_DISABLED');
      expect(result.insight).toBeNull();
    });

    it('should return null insight when no media references provided', async () => {
      mockFeatureService.isEnabled.mockReturnValue(true);

      const result = await adapter.analyzeMedia([]);

      expect(result.status).toBe('skipped');
      expect(result.insight).toBeNull();
      expect(result.errorCode).toBe('NO_MEDIA_PROVIDED');
    });

    it('should return success result with valid insight', async () => {
      mockFeatureService.isEnabled.mockReturnValue(true);
      mockNoopProvider.analyze.mockResolvedValue({
        rawResponse: '{}',
        parsedInsight: mockMediaInsight,
        processingTimeMs: 1000,
        modelVersion: 'gpt-4o',
      });

      const mediaRefs: MediaReference[] = [{ url: 'https://example.com/image.jpg', type: 'image' }];
      const result = await adapter.analyzeMedia(mediaRefs);

      expect(result.status).toBe('success');
      expect(result.insight).toEqual(expect.objectContaining({
        schemaVersion: '1.0.0',
        detectedItems: expect.any(Array),
        estimatedTotalVolumeM3: 5.5,
      }));
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return failed result when vision provider fails', async () => {
      mockFeatureService.isEnabled.mockReturnValue(true);
      mockNoopProvider.analyze.mockRejectedValue(new Error('API Error'));

      const mediaRefs: MediaReference[] = [{ url: 'https://example.com/image.jpg', type: 'image' }];
      const result = await adapter.analyzeMedia(mediaRefs);

      expect(result.status).toBe('failed');
      expect(result.errorCode).toBe('PROVIDER_TIMEOUT');
      expect(result.insight).toBeNull();
    });

    it('should return success result even when confidence is below threshold', async () => {
      mockFeatureService.isEnabled.mockReturnValue(true);
      mockFeatureService.getConfidenceThreshold.mockReturnValue(0.7);

      const lowConfidenceInsight: MediaInsight = {
        ...mockMediaInsight,
        perceptionConfidence: 0.5, // Below threshold
      };

      mockNoopProvider.analyze.mockResolvedValue({
        rawResponse: '{}',
        parsedInsight: lowConfidenceInsight,
        processingTimeMs: 1000,
        modelVersion: 'gpt-4o',
      });

      const mediaRefs: MediaReference[] = [{ url: 'https://example.com/image.jpg', type: 'image' }];
      const result = await adapter.analyzeMedia(mediaRefs);

      // The adapter returns success but with the low confidence insight
      // The caller (IntelligenceContextBuilder) is responsible for checking threshold
      expect(result.status).toBe('success');
      expect(result.insight?.perceptionConfidence).toBe(0.5);
    });

    it('should never throw exceptions - always return result object', async () => {
      mockFeatureService.isEnabled.mockReturnValue(true);
      mockNoopProvider.analyze.mockRejectedValue(new Error('Critical failure'));

      const mediaRefs: MediaReference[] = [{ url: 'https://example.com/image.jpg', type: 'image' }];
      
      // Should not throw
      await expect(adapter.analyzeMedia(mediaRefs)).resolves.toBeDefined();
    });

    it('should return failed result when provider is unavailable', async () => {
      mockFeatureService.isEnabled.mockReturnValue(true);
      // Create a new mock with isAvailable false from the start
      const unavailableProvider = {
        ...mockNoopProvider,
        isAvailable: false,
      };
      // Recreate the service with the new mock
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaPerceptionAdapter,
          {
            provide: NoopVisionProvider,
            useValue: unavailableProvider,
          },
          {
            provide: MediaPerceptionFeatureService,
            useValue: mockFeatureService,
          },
        ],
      }).compile();

      const adapterWithUnavailableProvider = module.get<MediaPerceptionAdapter>(MediaPerceptionAdapter);
      
      const mediaRefs: MediaReference[] = [{ url: 'https://example.com/image.jpg', type: 'image' }];
      const result = await adapterWithUnavailableProvider.analyzeMedia(mediaRefs);

      expect(result.status).toBe('failed');
      expect(result.errorCode).toBe('PROVIDER_UNAVAILABLE');
    });

    it('should return skipped result when no valid image URLs found', async () => {
      mockFeatureService.isEnabled.mockReturnValue(true);

      // Video type without URL
      const mediaRefs: MediaReference[] = [{ type: 'video' }];
      const result = await adapter.analyzeMedia(mediaRefs);

      expect(result.status).toBe('skipped');
      expect(result.errorCode).toBe('NO_MEDIA_PROVIDED');
    });

    it('should return failed result when provider returns invalid response', async () => {
      mockFeatureService.isEnabled.mockReturnValue(true);
      mockNoopProvider.analyze.mockResolvedValue({
        rawResponse: 'invalid',
        parsedInsight: null, // Invalid - no parsed insight
        processingTimeMs: 1000,
        modelVersion: 'gpt-4o',
      });

      const mediaRefs: MediaReference[] = [{ url: 'https://example.com/image.jpg', type: 'image' }];
      const result = await adapter.analyzeMedia(mediaRefs);

      expect(result.status).toBe('failed');
      expect(result.errorCode).toBe('INVALID_RESPONSE');
    });

    it('should filter to only image type media references', async () => {
      mockFeatureService.isEnabled.mockReturnValue(true);
      mockNoopProvider.analyze.mockResolvedValue({
        rawResponse: '{}',
        parsedInsight: mockMediaInsight,
        processingTimeMs: 1000,
        modelVersion: 'gpt-4o',
      });

      const mediaRefs: MediaReference[] = [
        { url: 'https://example.com/image1.jpg', type: 'image' },
        { url: 'https://example.com/video.mp4', type: 'video' },
        { url: 'https://example.com/image2.jpg', type: 'image' },
      ];
      
      await adapter.analyzeMedia(mediaRefs);

      // Verify analyze was called with only image URLs
      expect(mockNoopProvider.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrls: expect.arrayContaining([
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg',
          ]),
        })
      );
    });
  });

  describe('isEnabled', () => {
    it('should return false when config is disabled', () => {
      mockFeatureService.isEnabled.mockReturnValue(false);
      
      expect(adapter.isEnabled()).toBe(false);
    });

    it('should return false when provider is unavailable', async () => {
      mockFeatureService.isEnabled.mockReturnValue(true);
      // Create a new mock with isAvailable false from the start
      const unavailableProvider = {
        ...mockNoopProvider,
        isAvailable: false,
      };
      // Recreate the service with the new mock
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaPerceptionAdapter,
          {
            provide: NoopVisionProvider,
            useValue: unavailableProvider,
          },
          {
            provide: MediaPerceptionFeatureService,
            useValue: mockFeatureService,
          },
        ],
      }).compile();

      const adapterWithUnavailableProvider = module.get<MediaPerceptionAdapter>(MediaPerceptionAdapter);
      
      expect(adapterWithUnavailableProvider.isEnabled()).toBe(false);
    });
  });

  describe('getProviderName', () => {
    it('should return the provider name', () => {
      expect(adapter.getProviderName()).toBe('noop');
    });
  });

  describe('healthCheck', () => {
    it('should return true when disabled (considered healthy)', async () => {
      mockFeatureService.isEnabled.mockReturnValue(false);
      
      const result = await adapter.healthCheck();
      expect(result).toBe(true);
    });

    it('should delegate to provider healthCheck when enabled', async () => {
      mockFeatureService.isEnabled.mockReturnValue(true);
      mockNoopProvider.healthCheck.mockResolvedValue(true);
      
      // Initialize with enabled config
      await adapter.initialize({
        enabled: true,
        confidenceThreshold: 0.7,
        provider: {
          type: 'noop',
        },
      });
      
      const result = await adapter.healthCheck();
      expect(mockNoopProvider.healthCheck).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should initialize with config and use noop provider when disabled', async () => {
      await adapter.initialize({
        enabled: false,
        confidenceThreshold: 0.7,
        provider: {
          type: 'noop',
        },
      });

      expect(adapter.getProviderName()).toBe('noop');
    });

    it('should initialize provider when enabled', async () => {
      await adapter.initialize({
        enabled: true,
        confidenceThreshold: 0.8,
        provider: {
          type: 'noop',
          apiKey: 'test-key',
          model: 'gpt-4o',
        },
      });

      expect(mockNoopProvider.initialize).toHaveBeenCalled();
    });
  });
});
