import { IntelligenceContextBuilder } from '@api/modules/movers/intelligence/intelligence-context.builder';
import { MediaPerceptionAdapter } from '@api/modules/movers/media-insight/services/media-perception-adapter.service';
import { MediaPerceptionFeatureService } from '@api/modules/movers/media-insight/services/media-perception-feature.service';
import { AIMoveProfileService } from '@api/modules/movers/services/ai-move-profile.service';
import { LocationNormalizationService } from '@api/modules/movers/services/location-normalization.service';
import { VehicleMatchingService } from '@api/modules/movers/services/vehicle-matching.service';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

describe('Intelligence Context with Media Insight - Integration', () => {
  let module: TestingModule;
  let contextBuilder: IntelligenceContextBuilder;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.example',
        }),
      ],
      providers: [
        IntelligenceContextBuilder,
        {
          provide: MediaPerceptionFeatureService,
          useValue: {
            isEnabled: jest.fn().mockReturnValue(true),
            getConfidenceThreshold: jest.fn().mockReturnValue(0.7),
            shouldProcessMedia: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: MediaPerceptionAdapter,
          useValue: {
            analyzeMedia: jest.fn().mockResolvedValue({
              status: 'success',
              insight: {
                schemaVersion: '1.0.0',
                detectedItems: [
                  { label: 'sofa', category: 'furniture', sizeClass: 'large', quantity: 1, confidence: 0.9 },
                  { label: 'fridge', category: 'appliance', sizeClass: 'large', quantity: 1, confidence: 0.85 },
                ],
                estimatedTotalVolumeM3: 15.5,
                estimatedLaborIntensity: 4,
                fragilityScore: 0.6,
                specialHandlingRequired: true,
                perceptionConfidence: 0.85,
                modelVersion: 'gpt-4o',
                analyzedAt: new Date().toISOString(),
                mediaReferences: ['https://example.com/image.jpg'],
              },
            }),
          },
        },
        {
          provide: VehicleMatchingService,
          useValue: {
            findMatchingVehicles: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: AIMoveProfileService,
          useValue: {
            interpretMoveRequirements: jest.fn().mockResolvedValue({
              combinedProfile: {
                estimatedVolumeM3: 10,
                laborRequirement: 2,
                fragilityFactor: 'low',
                specialHandling: [],
              },
            }),
          },
        },
        {
          provide: LocationNormalizationService,
          useValue: {
            normalize: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    contextBuilder = module.get<IntelligenceContextBuilder>(IntelligenceContextBuilder);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Context Building with Media Insight', () => {
    it('should build context with merged profile when media insight available', async () => {
      const order = {
        fromHouseSize: '2br',
        toHouseSize: '2br',
        fromLocation: {
          placeId: '123',
          formattedAddress: '123 Main St',
          latitude: 0,
          longitude: 0,
        },
        toLocation: {
          placeId: '456',
          formattedAddress: '456 Oak Ave',
          latitude: 0,
          longitude: 0,
        },
        mediaRefs: [
          { url: 'https://example.com/image.jpg', type: 'image' as const },
        ],
      };

      const context = await contextBuilder.buildFromEstimateRequest(order);

      expect(context).toBeDefined();
      expect(context.moveProfile).toBeDefined();

      // Verify media enhanced profile
      expect(context.moveProfile.estimatedVolumeM3).toBeGreaterThan(0);
      expect(context.moveProfile.laborRequirement).toBeGreaterThan(0);
      expect(context.moveProfile.fragilityFactor).not.toBe('low'); // Should be medium from media insight
      expect(context.profileSource).toEqual('media-enhanced');
    });

    it('should build legacy context when media analysis fails', async () => {
      const order = {
        fromHouseSize: '2br',
        toHouseSize: '2br',
        fromLocation: {
          placeId: '123',
          formattedAddress: '123 Main St',
          latitude: 0,
          longitude: 0,
        },
        toLocation: {
          placeId: '456',
          formattedAddress: '456 Oak Ave',
          latitude: 0,
          longitude: 0,
        },
      };

      const context = await contextBuilder.buildFromEstimateRequest(order);

      expect(context).toBeDefined();
      expect(context.profileSource).toEqual('legacy');
    });
  });
});
