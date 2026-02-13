import { Test, TestingModule } from '@nestjs/testing';
import { MoveIntelligenceEngine, INTELLIGENCE_VERSION } from '../../intelligence/move-intelligence-engine';
import { MoveProfile } from '../../domain/move-profile';
import { VehicleCapabilityProfile } from '../../domain/vehicle-capability-profile';
import { IntelligenceContext } from '../../intelligence/intelligence-context';

describe('MoveIntelligenceEngine', () => {
  let engine: MoveIntelligenceEngine;

  const createMockMoveProfile = (overrides?: Partial<MoveProfile>): MoveProfile => ({
    estimatedVolumeM3: 30,
    fragilityFactor: 'medium',
    laborRequirement: 3,
    specialHandling: ['piano'],
    floorCount: 2,
    packingService: false,
    estimatedWeightKg: 800,
    distanceCategory: 'regional',
    ...overrides,
  });

  const createMockVehicle = (overrides?: Partial<VehicleCapabilityProfile>): VehicleCapabilityProfile => ({
    vehicleId: 'test-vehicle-001',
    maxVolumeM3: 40,
    allowedLoadType: ['standard', 'boxes', 'furniture'],
    crewCapacity: 3,
    supportedMoveTypes: ['2br', '3br'],
    specialFeatures: ['liftgate', 'climate-control'],
    fuelType: 'diesel',
    hasLiftgate: true,
    climateControlled: true,
    ...overrides,
  });

  const createMockContext = (overrides?: Partial<IntelligenceContext>): IntelligenceContext => ({
    moveProfile: createMockMoveProfile(),
    availableVehicles: [createMockVehicle()],
    demandSignals: {
      demandMultiplier: 1.0,
      dayOfWeek: 1,
      month: 5,
      holidayProximity: 30,
      seasonClassification: 'local',
    },
    metadata: {
      requestTimestamp: new Date().toISOString(),
      correlationId: 'test-correlation-001',
      source: 'api',
      quoteVersion: '1.0.0',
    },
    profileSource: 'legacy',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoveIntelligenceEngine],
    }).compile();

    engine = module.get<MoveIntelligenceEngine>(MoveIntelligenceEngine);
  });

  describe('generateRecommendation', () => {
    it('should generate a valid recommendation for feasible move', async () => {
      const context = createMockContext();
      const recommendation = await engine.generateRecommendation(context);

      expect(recommendation).toBeDefined();
      expect(recommendation.intelligenceVersion).toBe(INTELLIGENCE_VERSION);
      expect(recommendation.recommendationTimestamp).toBeDefined();
      expect(recommendation.vehicleRecommendation).toBeDefined();
      expect(recommendation.vehicleRecommendation.selectedVehicle).toBeDefined();
      expect(recommendation.vehicleRecommendation.matchScore).toBeGreaterThanOrEqual(0);
      expect(recommendation.vehicleRecommendation.matchScore).toBeLessThanOrEqual(100);
      expect(recommendation.pricingAdjustment).toBeDefined();
      expect(recommendation.riskAssessment).toBeDefined();
      expect(recommendation.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidenceScore).toBeLessThanOrEqual(1);
      expect(recommendation.reasoningChain).toBeInstanceOf(Array);
      expect(recommendation.reasoningChain.length).toBeGreaterThan(0);
    });

    it('should return infeasible recommendation when no vehicles match', async () => {
      const context = createMockContext({
        moveProfile: createMockMoveProfile({
          estimatedVolumeM3: 100, // Very large volume
          laborRequirement: 10, // Requires more crew than available
        }),
        availableVehicles: [
          createMockVehicle({ vehicleId: 'small-truck', maxVolumeM3: 20, crewCapacity: 2 }),
        ],
      });

      const recommendation = await engine.generateRecommendation(context);

      expect(recommendation.vehicleRecommendation.matchScore).toBe(0);
      expect(recommendation.riskAssessment.overallRiskScore).toBe(100);
      expect(recommendation.riskAssessment.successProbability).toBe(0);
    });

    it('should include alternatives when multiple vehicles are available', async () => {
      const context = createMockContext({
        availableVehicles: [
          createMockVehicle({ vehicleId: 'medium-truck', maxVolumeM3: 35, crewCapacity: 3 }),
          createMockVehicle({ vehicleId: 'large-truck', maxVolumeM3: 50, crewCapacity: 4 }),
          createMockVehicle({ vehicleId: 'small-truck', maxVolumeM3: 20, crewCapacity: 2 }),
        ],
      });

      const recommendation = await engine.generateRecommendation(context);

      expect(recommendation.alternatives).toBeInstanceOf(Array);
      expect(recommendation.alternatives?.length).toBeGreaterThan(0);
    });

    it('should calculate demand adjustment for high demand periods', async () => {
      const context = createMockContext({
        demandSignals: {
          demandMultiplier: 1.5,
          dayOfWeek: 0, // Sunday
          month: 11, // December
          holidayProximity: 2,
          seasonClassification: 'regional',
        },
      });

      const recommendation = await engine.generateRecommendation(context);

      expect(recommendation.pricingAdjustment.demandAdjustment).toBeGreaterThan(0);
    });

    it('should increase complexity adjustment for high fragility moves', async () => {
      const context = createMockContext({
        moveProfile: createMockMoveProfile({ fragilityFactor: 'high' }),
      });

      const recommendation = await engine.generateRecommendation(context);

      expect(recommendation.pricingAdjustment.complexityAdjustment).toBeGreaterThan(0);
      expect(recommendation.riskAssessment.riskFactors).toContainEqual(
        expect.objectContaining({ factorName: 'high_fragility' })
      );
    });

    it('should add precautions for high floor counts', async () => {
      const context = createMockContext({
        moveProfile: createMockMoveProfile({ floorCount: 5 }),
      });

      const recommendation = await engine.generateRecommendation(context);

      expect(recommendation.riskAssessment.requiredPrecautions).toContain('Verify elevator availability');
      expect(recommendation.riskAssessment.requiredPrecautions).toContain('Additional movers for stairs');
    });

    it('should handle special items in risk assessment', async () => {
      const context = createMockContext({
        moveProfile: createMockMoveProfile({
          specialHandling: ['piano', 'art', 'glass'],
        }),
      });

      const recommendation = await engine.generateRecommendation(context);

      expect(recommendation.riskAssessment.riskFactors).toContainEqual(
        expect.objectContaining({ factorName: 'special_items' })
      );
    });
  });

  describe('versioning', () => {
    it('should have a valid version string', () => {
      expect(INTELLIGENCE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
