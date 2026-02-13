import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntelligenceSnapshotService } from '../../services/intelligence-snapshot.service';
import { IntelligenceSnapshotEntity, ProfileSource } from '../../entities/intelligence-snapshot.entity';
import type { MoveRecommendation } from '../../../../movers/intelligence/intelligence-context';

describe('IntelligenceSnapshotService', () => {
  let service: IntelligenceSnapshotService;
  let mockRepository: jest.Mocked<Repository<IntelligenceSnapshotEntity>>;

  const mockSnapshot = {
    id: 'snapshot-123',
    orderId: 'order-456',
    moveRecommendation: {
      recommendationTimestamp: new Date().toISOString(),
      intelligenceVersion: '1.0.0',
      vehicleRecommendation: {
        selectedVehicle: {} as any,
        matchScore: 90,
        alternativeVehicles: [],
      },
      pricingAdjustment: {
        baseAdjustment: 0,
        demandAdjustment: 0,
        complexityAdjustment: 0,
        totalAdjustment: 0,
        explanation: '',
      },
      riskAssessment: {
        overallRiskScore: 50,
        riskFactors: [],
        requiredPrecautions: [],
        successProbability: 0.9,
      },
      confidenceScore: 0.85,
      reasoningChain: [],
    } as unknown as Record<string, unknown>,
    mediaInsightSummary: { detectedItemCount: 5, estimatedVolumeM3: 10, laborIntensity: 3, fragilityScore: 0.5, confidence: 0.85 },
    mediaInsightFull: null,
    confidenceScore: 0.85,
    intelligenceVersion: '1.0.0',
    profileSource: 'legacy' as ProfileSource,
    isStale: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    toPlainObject: jest.fn(),
  } as unknown as IntelligenceSnapshotEntity;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligenceSnapshotService,
        {
          provide: getRepositoryToken(IntelligenceSnapshotEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<IntelligenceSnapshotService>(IntelligenceSnapshotService);
  });

  describe('createInitialSnapshot', () => {
    it('should create and save a new initial snapshot', async () => {
      mockRepository.create.mockReturnValue(mockSnapshot);
      mockRepository.save.mockResolvedValue(mockSnapshot);

      const recommendation: MoveRecommendation = {
        recommendationTimestamp: new Date().toISOString(),
        intelligenceVersion: '1.0.0',
        vehicleRecommendation: {
          selectedVehicle: {} as any,
          matchScore: 90,
          alternativeVehicles: [],
        },
        pricingAdjustment: {
          baseAdjustment: 0,
          demandAdjustment: 0,
          complexityAdjustment: 0,
          totalAdjustment: 0,
          explanation: '',
        },
        riskAssessment: {
          overallRiskScore: 50,
          riskFactors: [],
          requiredPrecautions: [],
          successProbability: 0.9,
        },
        confidenceScore: 0.85,
        reasoningChain: [],
      };

      const result = await service.createInitialSnapshot('order-456', recommendation, '1.0.0');

      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockSnapshot);
    });
  });

  describe('getSnapshotForOrder', () => {
    it('should return latest snapshot for given order ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockSnapshot);

      const result = await service.getSnapshotForOrder('order-456');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { orderId: 'order-456' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockSnapshot);
    });

    it('should return null when no snapshot found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getSnapshotForOrder('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getSnapshotSummary', () => {
    it('should return snapshot summary for order', async () => {
      mockRepository.findOne.mockResolvedValue(mockSnapshot);

      const result = await service.getSnapshotSummary('order-456');

      expect(result).toEqual(expect.objectContaining({
        snapshotId: 'snapshot-123',
        orderId: 'order-456',
        hasMediaInsight: false,
        confidenceScore: 0.85,
        profileSource: 'legacy',
      }));
    });
  });

  describe('markStale', () => {
    it('should mark snapshot as stale', async () => {
      await service.markStale('order-456');

      expect(mockRepository.update).toHaveBeenCalledWith(
        { orderId: 'order-456' },
        { isStale: true },
      );
    });
  });
});
