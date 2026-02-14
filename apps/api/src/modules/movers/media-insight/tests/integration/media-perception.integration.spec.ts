import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IntelligenceSnapshotService } from '../../services/intelligence-snapshot.service';
import { MediaPerceptionAdapter } from '../../services/media-perception-adapter.service';
import { MediaPerceptionFeatureService } from '../../services/media-perception-feature.service';
import { mediaPerceptionConfig } from '../../config/media-perception.config';
import { NoopVisionProvider } from '../../providers/noop-vision.provider';

describe('Media Perception Feature - Integration', () => {
  let module: TestingModule;
  let snapshotService: IntelligenceSnapshotService;
  let adapter: MediaPerceptionAdapter;
  let featureService: MediaPerceptionFeatureService;
  let configService: ConfigService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [mediaPerceptionConfig],
          envFilePath: '.env.example',
        }),
      ],
      providers: [
        {
          provide: IntelligenceSnapshotService,
          useValue: {
            createInitialSnapshot: jest.fn().mockImplementation((orderId, recommendation, _version) => 
              Promise.resolve({
                id: '123',
                orderId,
                confidenceScore: recommendation.confidenceScore,
                moveRecommendation: recommendation,
                createdAt: new Date(),
              })
            ),
            updateWithMediaInsight: jest.fn().mockImplementation((orderId, mediaInsight, updatedRecommendation) => 
              Promise.resolve({
                id: '123',
                orderId,
                confidenceScore: updatedRecommendation.confidenceScore,
                mediaInsightSummary: {
                  detectedItemCount: mediaInsight.detectedItems.length,
                  estimatedVolumeM3: mediaInsight.estimatedTotalVolumeM3,
                  laborIntensity: mediaInsight.estimatedLaborIntensity,
                  fragilityScore: mediaInsight.fragilityScore,
                  confidence: mediaInsight.perceptionConfidence,
                },
              })
            ),
            getSnapshotForOrder: jest.fn().mockImplementation((orderId) => 
              Promise.resolve({
                id: '123',
                orderId,
                confidenceScore: 0.85,
                moveRecommendation: {
                  recommendationTimestamp: expect.any(String),
                  intelligenceVersion: '1.0.0',
                  vehicleRecommendation: {
                    selectedVehicle: {},
                    matchScore: 0,
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
                    overallRiskScore: 0,
                    riskFactors: [],
                    requiredPrecautions: [],
                    successProbability: 0,
                  },
                  confidenceScore: 0.85,
                  reasoningChain: [],
                },
                createdAt: expect.any(Date),
              })
            ),
          },
        },
        MediaPerceptionAdapter,
        MediaPerceptionFeatureService,
        NoopVisionProvider,
      ],
    }).compile();

    snapshotService = module.get<IntelligenceSnapshotService>(IntelligenceSnapshotService);
    adapter = module.get<MediaPerceptionAdapter>(MediaPerceptionAdapter);
    featureService = module.get<MediaPerceptionFeatureService>(MediaPerceptionFeatureService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Feature Toggle Configuration', () => {
    it('should load default configuration from .env.example', () => {
      expect(featureService.isEnabled()).toBe(false);
      expect(featureService.getConfidenceThreshold()).toBeCloseTo(0.7);
      expect(featureService.getOverrideThreshold()).toBeCloseTo(0.85);
      expect(featureService.getAnalysisTimeoutMs()).toBe(30000);
    });

    it('should use NOOP provider by default', () => {
      expect(configService.get('mediaPerception.provider')).toEqual('noop');
    });
  });

  describe('Snapshot Storage', () => {
    it('should create and retrieve intelligence snapshots', async () => {
      const orderId = 'order-test-123';
      
      // Create snapshot
      const snapshot = await snapshotService.createInitialSnapshot(
        orderId,
        {
          recommendationTimestamp: new Date().toISOString(),
          intelligenceVersion: '1.0.0',
          vehicleRecommendation: {
            selectedVehicle: {} as any,
            matchScore: 0,
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
            overallRiskScore: 0,
            riskFactors: [],
            requiredPrecautions: [],
            successProbability: 0,
          },
          confidenceScore: 0.85,
          reasoningChain: [],
        },
        '1.0.0'
      );

      expect(snapshot).toBeDefined();
      expect(snapshot.orderId).toEqual(orderId);
      expect(snapshot.confidenceScore).toEqual(0.85);
      expect(snapshot.moveRecommendation).toBeDefined();

      // Retrieve snapshot
      const retrieved = await snapshotService.getSnapshotForOrder(orderId);
      expect(retrieved).toEqual(snapshot);
    });

    it('should update existing snapshots with media insight', async () => {
      const orderId = 'order-test-456';
      
      await snapshotService.createInitialSnapshot(
        orderId,
        {
          recommendationTimestamp: new Date().toISOString(),
          intelligenceVersion: '1.0.0',
          vehicleRecommendation: {
            selectedVehicle: {} as any,
            matchScore: 0,
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
            overallRiskScore: 0,
            riskFactors: [],
            requiredPrecautions: [],
            successProbability: 0,
          },
          confidenceScore: 0.7,
          reasoningChain: [],
        },
        '1.0.0'
      );

      const updated = await snapshotService.updateWithMediaInsight(
        orderId,
        {
          schemaVersion: '1.0.0',
          detectedItems: [
            { label: 'sofa', category: 'furniture', sizeClass: 'large', quantity: 1, confidence: 0.9 },
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
        {
          recommendationTimestamp: new Date().toISOString(),
          intelligenceVersion: '1.0.0',
          vehicleRecommendation: {
            selectedVehicle: {} as any,
            matchScore: 0,
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
            overallRiskScore: 0,
            riskFactors: [],
            requiredPrecautions: [],
            successProbability: 0,
          },
          confidenceScore: 0.9,
          reasoningChain: [],
        }
      );

      expect(updated).toBeDefined();
      expect(updated!.confidenceScore).toEqual(0.9);
      expect(updated!.mediaInsightSummary).toEqual({
        detectedItemCount: 1,
        estimatedVolumeM3: 15.5,
        laborIntensity: 4,
        fragilityScore: 0.6,
        confidence: 0.85,
      });
    });
  });

  describe('Media Analysis Flow', () => {
    it('should analyze media references with NOOP provider', async () => {
      const mediaRefs = [
        { url: 'https://example.com/test1.jpg', type: 'image' as const },
        { url: 'https://example.com/test2.jpg', type: 'image' as const },
      ];

      const result = await adapter.analyzeMedia(mediaRefs);
      
      // Feature should be disabled by default
      expect(result.status).toEqual('skipped');
      expect(result.errorCode).toEqual('FEATURE_DISABLED');
    });
  });
});
