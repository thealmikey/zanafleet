import { Test, TestingModule } from '@nestjs/testing';

import { MoveProfile } from '../../domain/move-profile';
import { VehicleMatchingService } from '../../services/vehicle-matching.service';

describe('VehicleMatchingService', () => {
  let service: VehicleMatchingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VehicleMatchingService],
    }).compile();

    service = module.get<VehicleMatchingService>(VehicleMatchingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findMatchingVehicles', () => {
    it('should return vehicles for a small move', async () => {
      const moveProfile: MoveProfile = {
        estimatedVolumeM3: 10,
        fragilityFactor: 'low',
        laborRequirement: 2,
        distanceCategory: 'local',
      };

      const vehicles = await service.findMatchingVehicles(moveProfile);

      expect(vehicles.length).toBeGreaterThan(0);
    });

    it('should return vehicles sorted by match score', async () => {
      const moveProfile: MoveProfile = {
        estimatedVolumeM3: 20,
        fragilityFactor: 'medium',
        laborRequirement: 3,
        distanceCategory: 'local',
      };

      const vehicles = await service.findMatchingVehicles(moveProfile);

      expect(vehicles.length).toBeGreaterThan(0);

      // Verify sorted by match score descending
      for (let i = 1; i < vehicles.length; i++) {
        expect(vehicles[i - 1].matchScore).toBeGreaterThanOrEqual(vehicles[i].matchScore);
      }
    });

    it('should include vehicle capacity profile in recommendations', async () => {
      const moveProfile: MoveProfile = {
        estimatedVolumeM3: 15,
        fragilityFactor: 'medium',
        laborRequirement: 2,
        distanceCategory: 'local',
      };

      const vehicles = await service.findMatchingVehicles(moveProfile);

      expect(vehicles.length).toBeGreaterThan(0);
      expect(vehicles[0].capacityProfile).toBeDefined();
      expect(vehicles[0].capacityProfile.maxVolumeM3).toBeGreaterThanOrEqual(15);
    });

    it('should set availability status based on match score', async () => {
      const moveProfile: MoveProfile = {
        estimatedVolumeM3: 50,
        fragilityFactor: 'high',
        laborRequirement: 4,
        distanceCategory: 'regional',
      };

      const vehicles = await service.findMatchingVehicles(moveProfile);

      expect(vehicles.length).toBeGreaterThan(0);

      // All returned vehicles should be available or limited
      for (const vehicle of vehicles) {
        expect(['available', 'limited']).toContain(vehicle.availabilityStatus);
      }
    });

    it('should include recommendation reason', async () => {
      const moveProfile: MoveProfile = {
        estimatedVolumeM3: 25,
        fragilityFactor: 'medium',
        laborRequirement: 3,
        distanceCategory: 'local',
      };

      const vehicles = await service.findMatchingVehicles(moveProfile);

      expect(vehicles.length).toBeGreaterThan(0);
      expect(vehicles[0].recommendationReason).toBeDefined();
      expect(vehicles[0].recommendationReason?.length).toBeGreaterThan(0);
    });

    it('should estimate price based on vehicle capabilities', async () => {
      const moveProfile: MoveProfile = {
        estimatedVolumeM3: 30,
        fragilityFactor: 'high',
        laborRequirement: 3,
        distanceCategory: 'regional',
      };

      const vehicles = await service.findMatchingVehicles(moveProfile);

      expect(vehicles.length).toBeGreaterThan(0);

      // Climate controlled vehicles should have higher prices
      const climateControlled = vehicles.find((v) => v.capacityProfile.climateControlled);
      if (climateControlled) {
        const nonClimateControlled = vehicles.find((v) => !v.capacityProfile.climateControlled);
        if (nonClimateControlled) {
          expect(climateControlled.estimatedPrice).toBeGreaterThan(
            nonClimateControlled.estimatedPrice
          );
        }
      }
    });

    it('should include estimated duration', async () => {
      const moveProfile: MoveProfile = {
        estimatedVolumeM3: 40,
        fragilityFactor: 'medium',
        laborRequirement: 4,
        distanceCategory: 'regional',
      };

      const vehicles = await service.findMatchingVehicles(moveProfile);

      expect(vehicles.length).toBeGreaterThan(0);
      expect(vehicles[0].estimatedDuration).toBeGreaterThan(0);
    });
  });
});
