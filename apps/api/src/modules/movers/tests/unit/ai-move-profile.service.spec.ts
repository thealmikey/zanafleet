import { Test, TestingModule } from '@nestjs/testing';

import { HouseSizeEnum } from '../../dto/movers-estimate-request.dto';
import { AIMoveProfileService } from '../../services/ai-move-profile.service';

describe('AIMoveProfileService', () => {
  let service: AIMoveProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AIMoveProfileService],
    }).compile();

    service = module.get<AIMoveProfileService>(AIMoveProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('interpretHouseSize', () => {
    it('should return correct profile for studio apartment', async () => {
      const profile = await service.interpretHouseSize(HouseSizeEnum.STUDIO);

      expect(profile.estimatedVolumeM3).toBe(8);
      expect(profile.laborRequirement).toBe(2);
      expect(profile.distanceCategory).toBe('local');
    });

    it('should return correct profile for 1 bedroom', async () => {
      const profile = await service.interpretHouseSize(HouseSizeEnum.ONE_BEDROOM);

      expect(profile.estimatedVolumeM3).toBe(15);
      expect(profile.laborRequirement).toBe(2);
    });

    it('should return correct profile for 2 bedroom', async () => {
      const profile = await service.interpretHouseSize(HouseSizeEnum.TWO_BEDROOM);

      expect(profile.estimatedVolumeM3).toBe(25);
      expect(profile.laborRequirement).toBe(3);
    });

    it('should return correct profile for 3 bedroom', async () => {
      const profile = await service.interpretHouseSize(HouseSizeEnum.THREE_BEDROOM);

      expect(profile.estimatedVolumeM3).toBe(40);
      expect(profile.laborRequirement).toBe(4);
    });

    it('should return correct profile for 4+ bedroom', async () => {
      const profile = await service.interpretHouseSize(HouseSizeEnum.FOUR_PLUS);

      expect(profile.estimatedVolumeM3).toBe(60);
      expect(profile.laborRequirement).toBe(5);
    });

    it('should apply fragility level when provided', async () => {
      const profile = await service.interpretHouseSize(HouseSizeEnum.TWO_BEDROOM, {
        fragilityLevel: 'high',
      });

      expect(profile.fragilityFactor).toBe('high');
    });

    it('should increase labor for high floor count', async () => {
      const profile = await service.interpretHouseSize(HouseSizeEnum.ONE_BEDROOM, {
        floorCount: 5,
      });

      expect(profile.laborRequirement).toBe(5); // 2 base + 3 extra for floor
    });

    it('should add packing service to profile', async () => {
      const profile = await service.interpretHouseSize(HouseSizeEnum.STUDIO, {
        packingService: true,
      });

      expect(profile.packingService).toBe(true);
      expect(profile.estimatedVolumeM3).toBeGreaterThan(8); // 10% increase for packing
    });

    it('should add special items to handling requirements', async () => {
      const profile = await service.interpretHouseSize(HouseSizeEnum.THREE_BEDROOM, {
        specialItems: ['piano', 'art'],
      });

      expect(profile.specialHandling).toBeDefined();
      expect(profile.specialHandling?.some((h: string) => h.includes('piano'))).toBe(true);
    });

    it('should update distance category for long distance moves', async () => {
      const profile = await service.interpretHouseSize(HouseSizeEnum.STUDIO, {
        distanceKm: 150,
      });

      expect(profile.distanceCategory).toBe('long-distance');
    });
  });

  describe('interpretMoveRequirements', () => {
    it('should return combined profile for both locations', async () => {
      const result = await service.interpretMoveRequirements(
        HouseSizeEnum.ONE_BEDROOM,
        HouseSizeEnum.THREE_BEDROOM
      );

      // Should take the larger values
      expect(result.combinedProfile.estimatedVolumeM3).toBe(40);
      expect(result.combinedProfile.laborRequirement).toBe(4);
    });
  });

  describe('estimateDuration', () => {
    it('should estimate duration based on volume and distance', async () => {
      const profile = await service.interpretHouseSize(HouseSizeEnum.TWO_BEDROOM);
      const duration = await service.estimateDuration(profile, 30);

      expect(duration).toBeGreaterThan(0);
      expect(typeof duration).toBe('number');
    });
  });
});
