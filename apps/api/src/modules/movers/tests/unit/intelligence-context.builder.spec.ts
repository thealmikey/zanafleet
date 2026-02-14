import { Test, TestingModule } from '@nestjs/testing';
import { IntelligenceContextBuilder } from '../../intelligence/intelligence-context.builder';
import { VehicleMatchingService } from '../../services/vehicle-matching.service';
import { AIMoveProfileService } from '../../services/ai-move-profile.service';
import { LocationNormalizationService } from '../../services/location-normalization.service';
import { MediaPerceptionAdapter } from '../../media-insight/services/media-perception-adapter.service';
import { MediaPerceptionFeatureService } from '../../media-insight/services/media-perception-feature.service';
import { MoveProfile } from '../../domain/move-profile';
import { VehicleCapabilityProfile } from '../../domain/vehicle-capability-profile';

describe('IntelligenceContextBuilder', () => {
  let builder: IntelligenceContextBuilder;
  let vehicleMatchingService: jest.Mocked<VehicleMatchingService>;
  let aiMoveProfileService: jest.Mocked<AIMoveProfileService>;
  let locationNormalizationService: jest.Mocked<LocationNormalizationService>;

  const mockMoveProfile: MoveProfile = {
    estimatedVolumeM3: 30,
    fragilityFactor: 'medium',
    laborRequirement: 3,
    specialHandling: ['piano'],
    floorCount: 2,
    packingService: false,
    estimatedWeightKg: 800,
    distanceCategory: 'regional',
  };

  const mockVehicle: VehicleCapabilityProfile = {
    vehicleId: 'test-vehicle-001',
    maxVolumeM3: 40,
    allowedLoadType: ['standard', 'boxes', 'furniture'],
    crewCapacity: 3,
    supportedMoveTypes: ['2br', '3br'],
    specialFeatures: ['liftgate', 'climate-control'],
    fuelType: 'diesel',
    hasLiftgate: true,
    climateControlled: true,
  };

  const mockNormalizedLocation = {
    placeId: 'test-place-001',
    formattedAddress: '123 Test Street, Nairobi',
    latitude: -1.2921,
    longitude: 36.8219,
    locality: 'Nairobi',
    region: 'Nairobi County',
    country: 'Kenya',
    postalCode: '00100',
    timezone: 'Africa/Nairobi',
    mapsUrl: 'https://maps.google.com/?q=-1.2921,36.8219',
  };

  beforeEach(async () => {
    const mockVehicleMatchingService = {
      findMatchingVehicles: jest.fn().mockResolvedValue([
        {
          vehicleId: 'test-vehicle-001',
          type: 'Medium Truck',
          capacityProfile: mockVehicle,
          estimatedPrice: 6500,
          estimatedDuration: 360,
          availabilityStatus: 'available' as const,
          matchScore: 85,
          recommendationReason: 'Good match',
        },
      ]),
    };

    const mockAIMoveProfileService = {
      interpretMoveRequirements: jest.fn().mockResolvedValue({
        fromProfile: mockMoveProfile,
        toProfile: mockMoveProfile,
        combinedProfile: mockMoveProfile,
      }),
    };

    const mockLocationNormalizationService = {
      normalize: jest.fn().mockResolvedValue(mockNormalizedLocation),
    };

    const mockMediaPerceptionAdapter = {
      analyzeMedia: jest.fn(),
    };

    const mockMediaPerceptionFeatureService = {
      isEnabled: jest.fn(),
      getConfidenceThreshold: jest.fn(),
      shouldProcessMedia: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligenceContextBuilder,
        { provide: VehicleMatchingService, useValue: mockVehicleMatchingService },
        { provide: AIMoveProfileService, useValue: mockAIMoveProfileService },
        { provide: LocationNormalizationService, useValue: mockLocationNormalizationService },
        { provide: MediaPerceptionAdapter, useValue: mockMediaPerceptionAdapter },
        { provide: MediaPerceptionFeatureService, useValue: mockMediaPerceptionFeatureService },
        { provide: 'CONFIG', useValue: { confidenceThreshold: 0.7 } },
      ],
    }).compile();

    builder = module.get<IntelligenceContextBuilder>(IntelligenceContextBuilder);
    vehicleMatchingService = module.get(VehicleMatchingService);
    aiMoveProfileService = module.get(AIMoveProfileService);
    locationNormalizationService = module.get(LocationNormalizationService);
  });

  describe('buildFromEstimateRequest', () => {
    it('should build a complete IntelligenceContext', async () => {
      const fromLocation = {
        placeId: 'origin-001',
        formattedAddress: '123 Origin St, Nairobi',
        latitude: -1.2921,
        longitude: 36.8219,
      };

      const toLocation = {
        placeId: 'dest-001',
        formattedAddress: '456 Destination Ave, Nairobi',
        latitude: -1.3000,
        longitude: 36.8500,
      };

      const result = await builder.buildFromEstimateRequest({
        fromHouseSize: '3br',
        toHouseSize: '2br',
        fromLocation,
        toLocation,
        requestedDate: new Date('2024-06-15'),
        fragilityLevel: 'medium',
        fromFloorCount: 2,
        toFloorCount: 1,
        packingService: false,
        specialItems: ['piano'],
        distanceKm: 25,
      });

      expect(result).toBeDefined();
      expect(result.moveProfile).toBeDefined();
      expect(result.availableVehicles).toBeInstanceOf(Array);
      expect(result.availableVehicles.length).toBeGreaterThan(0);
      expect(result.demandSignals).toBeDefined();
      expect(result.demandSignals.demandMultiplier).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.correlationId).toBeDefined();
      expect(result.metadata.source).toBe('api');
      expect(result.locationContext).toBeDefined();
      expect(result.locationContext?.origin).toBeDefined();
      expect(result.locationContext?.destination).toBeDefined();
    });

    it('should use provided correlationId from options', async () => {
      const fromLocation = {
        placeId: 'origin-001',
        formattedAddress: '123 Origin St, Nairobi',
        latitude: -1.2921,
        longitude: 36.8219,
      };

      const toLocation = {
        placeId: 'dest-001',
        formattedAddress: '456 Destination Ave, Nairobi',
        latitude: -1.3000,
        longitude: 36.8500,
      };

      const result = await builder.buildFromEstimateRequest({
        fromHouseSize: '2br',
        toHouseSize: '1br',
        fromLocation,
        toLocation,
        options: {
          correlationId: 'custom-correlation-id',
          source: 'web',
          quoteVersion: '2.0.0',
        },
      });

      expect(result.metadata.correlationId).toBe('custom-correlation-id');
      expect(result.metadata.source).toBe('web');
      expect(result.metadata.quoteVersion).toBe('2.0.0');
    });

    it('should handle missing location normalization gracefully', async () => {
      locationNormalizationService.normalize.mockRejectedValueOnce(new Error('Invalid coordinates'));

      const fromLocation = {
        placeId: 'origin-001',
        formattedAddress: '123 Origin St',
        latitude: -91, // Invalid latitude
        longitude: 36.8219,
      };

      const toLocation = {
        placeId: 'dest-001',
        formattedAddress: '456 Destination Ave',
        latitude: -1.3000,
        longitude: 36.8500,
      };

      const result = await builder.buildFromEstimateRequest({
        fromHouseSize: 'studio',
        toHouseSize: '1br',
        fromLocation,
        toLocation,
      });

      expect(result.locationContext).toBeUndefined();
    });

    it('should include client preferences when provided', async () => {
      const fromLocation = {
        placeId: 'origin-001',
        formattedAddress: '123 Origin St, Nairobi',
        latitude: -1.2921,
        longitude: 36.8219,
      };

      const toLocation = {
        placeId: 'dest-001',
        formattedAddress: '456 Destination Ave, Nairobi',
        latitude: -1.3000,
        longitude: 36.8500,
      };

      const result = await builder.buildFromEstimateRequest({
        fromHouseSize: '3br',
        toHouseSize: '2br',
        fromLocation,
        toLocation,
        options: {
          clientPreferences: {
            budgetConstraints: { maxBudget: 15000 },
            serviceLevel: 'premium',
            vehiclePreferences: ['liftgate', 'climate-control'],
          },
        },
      });

      expect(result.metadata.clientPreferences).toBeDefined();
      expect(result.metadata.clientPreferences?.budgetConstraints?.maxBudget).toBe(15000);
      expect(result.metadata.clientPreferences?.serviceLevel).toBe('premium');
    });
  });

  describe('buildMoveProfile', () => {
    it('should build move profile using AI service', async () => {
      const result = await builder.buildMoveProfile({
        fromHouseSize: '3br',
        toHouseSize: '2br',
        fragilityLevel: 'high',
        fromFloorCount: 3,
        toFloorCount: 1,
        packingService: true,
        specialItems: ['piano', 'art'],
        distanceKm: 50,
      });

      expect(result).toBeDefined();
      expect(aiMoveProfileService.interpretMoveRequirements).toHaveBeenCalledWith(
        '3br',
        '2br',
        expect.objectContaining({
          fragilityLevel: 'high',
          fromFloorCount: 3,
          toFloorCount: 1,
          packingService: true,
          specialItems: ['piano', 'art'],
          distanceKm: 50,
        })
      );
    });
  });

  describe('buildAvailableVehicles', () => {
    it('should find matching vehicles using vehicle matching service', async () => {
      const moveProfile: MoveProfile = {
        estimatedVolumeM3: 30,
        fragilityFactor: 'medium',
        laborRequirement: 3,
        distanceCategory: 'regional',
      };

      const result = await builder.buildAvailableVehicles(moveProfile);

      expect(result).toBeInstanceOf(Array);
      expect(vehicleMatchingService.findMatchingVehicles).toHaveBeenCalledWith(moveProfile);
      expect(result[0]).toEqual(mockVehicle);
    });
  });

  describe('buildDemandSignals', () => {
    it('should calculate demand multiplier for weekday', () => {
      // A Wednesday (day 3)
      const wednesday = new Date('2024-06-12');
      const result = builder.buildDemandSignals(wednesday);

      expect(result).toBeDefined();
      expect(result.dayOfWeek).toBe(3);
      expect(result.month).toBe(5);
      expect(typeof result.demandMultiplier).toBe('number');
    });

    it('should calculate higher demand multiplier for weekend', () => {
      // A Sunday (day 0)
      const sunday = new Date('2024-06-16');
      const result = builder.buildDemandSignals(sunday);

      expect(result.demandMultiplier).toBeGreaterThanOrEqual(1.25);
    });

    it('should calculate demand multiplier for peak season', () => {
      // December (month 11) - peak season
      const december = new Date('2024-12-20');
      const result = builder.buildDemandSignals(december);

      expect(result.demandMultiplier).toBeGreaterThanOrEqual(1.2);
      expect(result.seasonClassification).toBe('regional');
    });

    it('should use current date when no date provided', () => {
      const result = builder.buildDemandSignals();

      expect(result).toBeDefined();
      expect(result.month).toBeDefined();
    });
  });
});
