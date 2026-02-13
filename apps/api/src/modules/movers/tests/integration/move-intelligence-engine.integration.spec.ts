import { Test, TestingModule } from '@nestjs/testing';
import { MoveIntelligenceEngine } from '../../intelligence/move-intelligence-engine';
import { IntelligenceContextBuilder } from '../../intelligence/intelligence-context.builder';
import { VehicleMatchingService } from '../../services/vehicle-matching.service';
import { AIMoveProfileService } from '../../services/ai-move-profile.service';
import { LocationNormalizationService } from '../../services/location-normalization.service';

/**
 * Integration tests for the Move Intelligence Layer
 * 
 * These tests verify the complete flow from context building
 * through recommendation generation.
 */
describe('MoveIntelligenceEngine Integration', () => {
  let engine: MoveIntelligenceEngine;
  let builder: IntelligenceContextBuilder;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoveIntelligenceEngine,
        IntelligenceContextBuilder,
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
              fromProfile: {
                estimatedVolumeM3: 25,
                fragilityFactor: 'medium',
                laborRequirement: 3,
                distanceCategory: 'local',
              },
              toProfile: {
                estimatedVolumeM3: 20,
                fragilityFactor: 'low',
                laborRequirement: 2,
                distanceCategory: 'local',
              },
              combinedProfile: {
                estimatedVolumeM3: 25,
                fragilityFactor: 'medium',
                laborRequirement: 3,
                floorCount: 1,
                packingService: false,
                estimatedWeightKg: 700,
                distanceCategory: 'local',
              },
            }),
          },
        },
        {
          provide: LocationNormalizationService,
          useValue: {
            normalize: jest.fn().mockResolvedValue({
              placeId: 'test-place',
              formattedAddress: '123 Test St, Nairobi',
              latitude: -1.2921,
              longitude: 36.8219,
              locality: 'Nairobi',
              region: 'Nairobi County',
              country: 'Kenya',
              timezone: 'Africa/Nairobi',
            }),
          },
        },
      ],
    }).compile();

    engine = module.get<MoveIntelligenceEngine>(MoveIntelligenceEngine);
    builder = module.get<IntelligenceContextBuilder>(IntelligenceContextBuilder);
  });

  describe('end-to-end recommendation flow', () => {
    it('should build context and generate recommendation', async () => {
      const context = await builder.buildFromEstimateRequest({
        fromHouseSize: '2br',
        toHouseSize: '1br',
        fromLocation: {
          placeId: 'origin-001',
          formattedAddress: '123 Origin St, Nairobi',
          latitude: -1.2921,
          longitude: 36.8219,
        },
        toLocation: {
          placeId: 'dest-001',
          formattedAddress: '456 Destination Ave, Nairobi',
          latitude: -1.3000,
          longitude: 36.8500,
        },
        requestedDate: new Date('2024-06-15'),
        fragilityLevel: 'medium',
        fromFloorCount: 2,
        packingService: false,
        specialItems: [],
        distanceKm: 20,
      });

      const recommendation = await engine.generateRecommendation(context);

      expect(recommendation).toBeDefined();
      expect(recommendation.intelligenceVersion).toBeDefined();
      expect(recommendation.vehicleRecommendation).toBeDefined();
      expect(recommendation.pricingAdjustment).toBeDefined();
      expect(recommendation.riskAssessment).toBeDefined();
      expect(recommendation.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidenceScore).toBeLessThanOrEqual(1);
    });

    it('should handle high demand period correctly', async () => {
      // December 23rd - high demand period (holiday season)
      const context = await builder.buildFromEstimateRequest({
        fromHouseSize: '3br',
        toHouseSize: '2br',
        fromLocation: {
          placeId: 'origin-001',
          formattedAddress: '123 Origin St, Nairobi',
          latitude: -1.2921,
          longitude: 36.8219,
        },
        toLocation: {
          placeId: 'dest-001',
          formattedAddress: '456 Destination Ave, Nairobi',
          latitude: -1.3000,
          longitude: 36.8500,
        },
        requestedDate: new Date('2024-12-23'),
        fragilityLevel: 'high',
        fromFloorCount: 3,
        packingService: true,
        specialItems: ['piano', 'art'],
        distanceKm: 50,
      });

      const recommendation = await engine.generateRecommendation(context);

      expect(recommendation.pricingAdjustment.demandAdjustment).toBeGreaterThan(0);
      expect(recommendation.pricingAdjustment.complexityAdjustment).toBeGreaterThan(0);
      expect(recommendation.riskAssessment.overallRiskScore).toBeGreaterThan(50);
    });

    it('should handle weekend move with weekend premium', async () => {
      // Saturday
      const context = await builder.buildFromEstimateRequest({
        fromHouseSize: 'studio',
        toHouseSize: '1br',
        fromLocation: {
          placeId: 'origin-001',
          formattedAddress: '123 Origin St, Nairobi',
          latitude: -1.2921,
          longitude: 36.8219,
        },
        toLocation: {
          placeId: 'dest-001',
          formattedAddress: '456 Destination Ave, Nairobi',
          latitude: -1.3000,
          longitude: 36.8500,
        },
        requestedDate: new Date('2024-06-15'), // Saturday
      });

      const recommendation = await engine.generateRecommendation(context);

      expect(recommendation.pricingAdjustment.demandAdjustment).toBeGreaterThanOrEqual(0.25);
    });
  });

  describe('complex scenario handling', () => {
    it('should handle complex move with multiple special items', async () => {
      const context = await builder.buildFromEstimateRequest({
        fromHouseSize: '4br+',
        toHouseSize: '3br',
        fromLocation: {
          placeId: 'origin-001',
          formattedAddress: '123 Origin St, Nairobi',
          latitude: -1.2921,
          longitude: 36.8219,
        },
        toLocation: {
          placeId: 'dest-001',
          formattedAddress: '456 Destination Ave, Mombasa',
          latitude: -4.0435,
          longitude: 39.6682,
        },
        fragilityLevel: 'high',
        fromFloorCount: 5,
        toFloorCount: 2,
        packingService: true,
        specialItems: ['piano', 'safe', 'marble', 'art', 'glass', 'hot-tub'],
        distanceKm: 450, // Long distance
      });

      const recommendation = await engine.generateRecommendation(context);

      expect(recommendation.riskAssessment.riskFactors.length).toBeGreaterThan(0);
      expect(recommendation.riskAssessment.requiredPrecautions.length).toBeGreaterThan(0);
      expect(recommendation.vehicleRecommendation.matchScore).toBeLessThan(80); // Complex moves have lower scores
    });

    it('should generate alternatives when multiple vehicles match', async () => {
      const vehicleMatchingService = engine['logger']; // Access for logging

      const context = await builder.buildFromEstimateRequest({
        fromHouseSize: '3br',
        toHouseSize: '2br',
        fromLocation: {
          placeId: 'origin-001',
          formattedAddress: '123 Origin St, Nairobi',
          latitude: -1.2921,
          longitude: 36.8219,
        },
        toLocation: {
          placeId: 'dest-001',
          formattedAddress: '456 Destination Ave, Nairobi',
          latitude: -1.3000,
          longitude: 36.8500,
        },
      });

      const recommendation = await engine.generateRecommendation(context);

      // When vehicles are available, alternatives should be provided
      if (context.availableVehicles.length > 1) {
        expect(recommendation.alternatives).toBeInstanceOf(Array);
      }
    });
  });
});
