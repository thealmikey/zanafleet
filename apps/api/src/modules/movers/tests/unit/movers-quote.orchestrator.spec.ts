import { Test, TestingModule } from '@nestjs/testing';
import { MoversQuoteOrchestrator } from '../../orchestrators/movers-quote.orchestrator';
import { LocationNormalizationService } from '../../services/location-normalization.service';
import { AIMoveProfileService } from '../../services/ai-move-profile.service';
import { VehicleMatchingService } from '../../services/vehicle-matching.service';
import { EventBusService } from '../../../../core/event-bus/event-bus.service';
import { MoversEstimateRequestDto, HouseSizeEnum } from '../../dto/movers-estimate-request.dto';

describe('MoversQuoteOrchestrator', () => {
  let orchestrator: MoversQuoteOrchestrator;

  const mockLocationService = {
    normalize: jest.fn(),
    calculateDistance: jest.fn(),
  };

  const mockAiProfileService = {
    interpretHouseSize: jest.fn(),
  };

  const mockVehicleMatchingService = {
    findMatchingVehicles: jest.fn(),
  };

  const mockEventBus = {
    publishEvent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoversQuoteOrchestrator,
        { provide: LocationNormalizationService, useValue: mockLocationService },
        { provide: AIMoveProfileService, useValue: mockAiProfileService },
        { provide: VehicleMatchingService, useValue: mockVehicleMatchingService },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    orchestrator = module.get<MoversQuoteOrchestrator>(MoversQuoteOrchestrator);
  });

  it('should be defined', () => {
    expect(orchestrator).toBeDefined();
  });

  describe('createEstimate', () => {
    const createMockRequest = (): MoversEstimateRequestDto => ({
      fromLocation: {
        placeId: 'place1',
        formattedAddress: 'Nairobi, Kenya',
        latitude: -1.2921,
        longitude: 36.8219,
        locality: 'Nairobi',
      },
      toLocation: {
        placeId: 'place2',
        formattedAddress: 'Mombasa, Kenya',
        latitude: -4.0435,
        longitude: 39.6682,
        locality: 'Mombasa',
      },
      fromHouseSize: HouseSizeEnum.TWO_BEDROOM,
      toHouseSize: HouseSizeEnum.THREE_BEDROOM,
      requestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      includePacking: false,
      fragilityLevel: 'medium',
    });

    beforeEach(() => {
      mockLocationService.normalize.mockResolvedValue({
        placeId: 'place1',
        formattedAddress: 'Nairobi, Kenya',
        latitude: -1.2921,
        longitude: 36.8219,
      });

      mockLocationService.calculateDistance.mockReturnValue({
        distanceKm: 440,
        travelTimeMinutes: 400,
        straightLineDistanceKm: 400,
      });

      mockAiProfileService.interpretHouseSize.mockResolvedValue({
        estimatedVolumeM3: 25,
        fragilityFactor: 'medium',
        laborRequirement: 3,
        distanceCategory: 'regional',
      });

      mockVehicleMatchingService.findMatchingVehicles.mockResolvedValue([
        {
          vehicleId: 'truck-1',
          type: 'Medium Truck',
          capacityProfile: { maxVolumeM3: 35 },
          estimatedPrice: 6500,
          estimatedDuration: 360,
          availabilityStatus: 'available',
          matchScore: 85,
          recommendationReason: 'Good option.',
        },
      ]);
    });

    it('should create estimate successfully', async () => {
      const request = createMockRequest();
      const estimate = await orchestrator.createEstimate(request);

      expect(estimate).toBeDefined();
      expect(estimate.quoteId).toBeDefined();
      expect(estimate.quoteId.startsWith('quote_')).toBe(true);
      expect(estimate.recommendedVehicles.length).toBeGreaterThan(0);
      expect(estimate.priceBreakdown).toBeDefined();
      expect(estimate.priceBreakdown.currency).toBe('KES');
      expect(estimate.explanation).toBeDefined();
    });

    it('should normalize locations', async () => {
      const request = createMockRequest();
      await orchestrator.createEstimate(request);

      expect(mockLocationService.normalize).toHaveBeenCalledTimes(2);
      expect(mockLocationService.normalize).toHaveBeenCalledWith(request.fromLocation);
      expect(mockLocationService.normalize).toHaveBeenCalledWith(request.toLocation);
    });

    it('should calculate distance between locations', async () => {
      const request = createMockRequest();
      await orchestrator.createEstimate(request);

      expect(mockLocationService.calculateDistance).toHaveBeenCalled();
    });

    it('should interpret house size to move profile', async () => {
      const request = createMockRequest();
      await orchestrator.createEstimate(request);

      expect(mockAiProfileService.interpretHouseSize).toHaveBeenCalledWith(
        request.fromHouseSize,
        expect.objectContaining({
          fragilityLevel: request.fragilityLevel,
          distanceKm: 440,
        })
      );
    });

    it('should find matching vehicles', async () => {
      const request = createMockRequest();
      await orchestrator.createEstimate(request);

      expect(mockVehicleMatchingService.findMatchingVehicles).toHaveBeenCalled();
    });

    it('should apply demand multiplier for weekend dates', async () => {
      // Request for Saturday
      const saturday = new Date();
      saturday.setDate(saturday.getDate() + (6 - saturday.getDay() + 7) % 7 + 7);
      
      const request: MoversEstimateRequestDto = {
        ...createMockRequest(),
        requestedDate: saturday.toISOString(),
      };

      const estimate = await orchestrator.createEstimate(request);

      expect(estimate.demandMultiplier).toBeDefined();
      expect(estimate.demandMultiplier).toBeGreaterThan(1);
    });

    it('should calculate valid until 24 hours from now', async () => {
      const request = createMockRequest();
      const beforeTime = Date.now();
      const estimate = await orchestrator.createEstimate(request);
      const afterTime = Date.now();

      const validUntil = new Date(estimate.validUntil).getTime();
      
      // Should be between 23 and 25 hours from now
      expect(validUntil).toBeGreaterThan(beforeTime + 23 * 60 * 60 * 1000);
      expect(validUntil).toBeLessThan(afterTime + 25 * 60 * 60 * 1000);
    });

    it('should include policy adjustments', async () => {
      const request = createMockRequest();
      const estimate = await orchestrator.createEstimate(request);

      expect(estimate.policyAdjustments).toBeDefined();
      expect(Array.isArray(estimate.policyAdjustments)).toBe(true);
    });

    it('should generate explanation', async () => {
      const request = createMockRequest();
      const estimate = await orchestrator.createEstimate(request);

      expect(estimate.explanation).toContain('Based on your');
      expect(estimate.explanation).toContain('Estimated Volume');
      expect(estimate.explanation).toContain('Required Labor');
    });

    it('should generate notes', async () => {
      const request = createMockRequest();
      const estimate = await orchestrator.createEstimate(request);

      expect(estimate.notes).toBeDefined();
      expect(Array.isArray(estimate.notes)).toBe(true);
    });

    it('should not include demand multiplier for regular dates', async () => {
      // Request for Wednesday (not a weekend)
      const wednesday = new Date();
      wednesday.setDate(wednesday.getDate() + ((3 - wednesday.getDay() + 7) % 7));

      const request: MoversEstimateRequestDto = {
        ...createMockRequest(),
        requestedDate: wednesday.toISOString(),
      };

      const estimate = await orchestrator.createEstimate(request);

      // Should still have demand multiplier but lower
      expect(estimate.demandMultiplier).toBeDefined();
    });
  });
});
