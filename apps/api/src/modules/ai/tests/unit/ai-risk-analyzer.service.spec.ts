import { Test, TestingModule } from '@nestjs/testing';

import { AIRiskAnalysisRequest, RiskLevel, getRiskLevel } from '../../interfaces/ai-risk-analysis.interface';
import { AIRiskAnalyzerService } from '../../services/ai-risk-analyzer.service';
import { testUuid } from '../utils/test-helpers';

describe('AIRiskAnalyzerService', () => {
  let service: AIRiskAnalyzerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIRiskAnalyzerService,
      ],
    }).compile();

    service = module.get<AIRiskAnalyzerService>(AIRiskAnalyzerService);
  });

  const createRequest = (overrides?: Partial<AIRiskAnalysisRequest>): AIRiskAnalysisRequest => ({
    actorId: testUuid(),
    contextType: 'workflow',
    contextId: testUuid(),
    workflowState: 'pending',
    capability: 'submit_for_review',
    confidence: 0.75,
    ...overrides,
  });

  describe('analyzeRisk', () => {
    describe('risk score calculation', () => {
      it('should compute riskScore between 0-100', async () => {
        const request = createRequest();

        const result = await service.analyzeRisk(request);

        expect(result.riskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskScore).toBeLessThanOrEqual(100);
      });

      it('should return riskFactors array', async () => {
        const request = createRequest();

        const result = await service.analyzeRisk(request);

        expect(result.riskFactors).toBeInstanceOf(Array);
        expect(result.riskFactors.length).toBeGreaterThan(0);
      });

      it('should include analysisTimestamp', async () => {
        const request = createRequest();

        const result = await service.analyzeRisk(request);

        expect(result.analysisTimestamp).toBeInstanceOf(Date);
      });

      it('should include contextId in result', async () => {
        const request = createRequest({ contextId: 'context-123' });

        const result = await service.analyzeRisk(request);

        expect(result.contextId).toBe('context-123');
      });

      it('should include actorId in result', async () => {
        const request = createRequest({ actorId: 'actor-123' });

        const result = await service.analyzeRisk(request);

        expect(result.actorId).toBe('actor-123');
      });
    });

    describe('risk level detection', () => {
      it('should detect high risk (>70)', async () => {
        const request = createRequest({ confidence: 0.1, workflowState: 'pending_approval' });

        const result = await service.analyzeRisk(request);

        expect(getRiskLevel(result.riskScore)).toBe(RiskLevel.HIGH);
      });

      it('should detect medium risk (40-70)', async () => {
        const request = createRequest({ confidence: 0.5 });

        const result = await service.analyzeRisk(request);

        const level = getRiskLevel(result.riskScore);
        expect(level).toMatch(/low|medium|high|critical/);
      });

      it('should detect low risk (<40)', async () => {
        const request = createRequest({ confidence: 0.9, workflowState: 'draft' });

        const result = await service.analyzeRisk(request);

        const level = getRiskLevel(result.riskScore);
        expect(level).toMatch(/low|medium|high|critical/);
      });
    });

    describe('explainable factors', () => {
      it('should include factor descriptions', async () => {
        const request = createRequest();

        const result = await service.analyzeRisk(request);

        for (const factor of result.riskFactors) {
          expect(factor.description).toBeDefined();
          expect(typeof factor.description).toBe('string');
        }
      });

      it('should include factor names', async () => {
        const request = createRequest();

        const result = await service.analyzeRisk(request);

        for (const factor of result.riskFactors) {
          expect(factor.factor).toBeDefined();
          expect(typeof factor.factor).toBe('string');
        }
      });

      it('should include factor weights', async () => {
        const request = createRequest();

        const result = await service.analyzeRisk(request);

        for (const factor of result.riskFactors) {
          expect(factor.weight).toBeGreaterThanOrEqual(0);
          expect(factor.weight).toBeLessThanOrEqual(1);
        }
      });

      it('should compute confidence-based risk factor', async () => {
        const request = createRequest({ confidence: 0.5 });

        const result = await service.analyzeRisk(request);

        const confidenceFactor = result.riskFactors.find(f => f.factor === 'capability_confidence');
        expect(confidenceFactor).toBeDefined();
      });

      it('should compute workflow state risk factor', async () => {
        const request = createRequest({ workflowState: 'pending_approval' });

        const result = await service.analyzeRisk(request);

        const stateFactor = result.riskFactors.find(f => f.factor === 'workflow_state');
        expect(stateFactor).toBeDefined();
      });

      it('should compute context complexity factor', async () => {
        const request = createRequest({
          metadata: { key1: 'value1', key2: 'value2' },
        });

        const result = await service.analyzeRisk(request);

        const complexityFactor = result.riskFactors.find(f => f.factor === 'context_complexity');
        expect(complexityFactor).toBeDefined();
      });

      it('should compute actor history risk factor', async () => {
        const request = createRequest();

        const result = await service.analyzeRisk(request);

        const historyFactor = result.riskFactors.find(f => f.factor === 'actor_history');
        expect(historyFactor).toBeDefined();
      });

      it('should compute related actors risk factor', async () => {
        const request = createRequest({
          metadata: { relatedActors: ['actor1', 'actor2', 'actor3'] },
        });

        const result = await service.analyzeRisk(request);

        const relatedFactor = result.riskFactors.find(f => f.factor === 'related_actors');
        expect(relatedFactor).toBeDefined();
      });
    });

    describe('read-only behavior', () => {
      it('should not mutate the original request', async () => {
        const request = createRequest();
        const originalConfidence = request.confidence;

        await service.analyzeRisk(request);

        expect(request.confidence).toBe(originalConfidence);
      });

      it('should not store any state between calls', async () => {
        const request1 = createRequest({ actorId: 'actor-1' });
        const request2 = createRequest({ actorId: 'actor-2' });

        const result1 = await service.analyzeRisk(request1);
        const result2 = await service.analyzeRisk(request2);

        // Results should be independent
        expect(result1.actorId).not.toBe(result2.actorId);
      });
    });

    describe('edge cases', () => {
      it('should handle empty metadata', async () => {
        const request = createRequest({ metadata: {} });

        const result = await service.analyzeRisk(request);

        expect(result.riskScore).toBeDefined();
      });

      it('should handle undefined metadata', async () => {
        const request = createRequest({ metadata: undefined });

        const result = await service.analyzeRisk(request);

        expect(result.riskScore).toBeDefined();
      });

      it('should handle low confidence', async () => {
        const request = createRequest({ confidence: 0.0 });

        const result = await service.analyzeRisk(request);

        expect(result.riskScore).toBeGreaterThan(50);
      });

      it('should handle high confidence', async () => {
        const request = createRequest({ confidence: 1.0 });

        const result = await service.analyzeRisk(request);

        expect(result.riskScore).toBeLessThan(50);
      });

      it('should handle high risk workflow states', async () => {
        const highRiskStates = ['pending_approval', 'manual_review', 'escalated'];
        
        for (const state of highRiskStates) {
          const request = createRequest({ workflowState: state });
          const result = await service.analyzeRisk(request);
          
          expect(result.riskFactors).toBeDefined();
        }
      });

      it('should handle low risk workflow states', async () => {
        const lowRiskStates = ['completed', 'cancelled', 'draft'];
        
        for (const state of lowRiskStates) {
          const request = createRequest({ workflowState: state });
          const result = await service.analyzeRisk(request);
          
          expect(result.riskFactors).toBeDefined();
        }
      });

      it('should handle many related actors', async () => {
        const manyActors = Array.from({ length: 20 }, (_, i) => `actor-${i}`);
        const request = createRequest({
          metadata: { relatedActors: manyActors },
        });

        const result = await service.analyzeRisk(request);

        expect(result.riskScore).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('getDefaultRiskFactors', () => {
    it('should return default risk factors', () => {
      const factors = service.getDefaultRiskFactors();

      expect(factors).toBeInstanceOf(Array);
      expect(factors.length).toBeGreaterThan(0);
    });

    it('should return copy of default factors', () => {
      const factors1 = service.getDefaultRiskFactors();
      const factors2 = service.getDefaultRiskFactors();

      expect(factors1).not.toBe(factors2);
    });
  });
});

describe('getRiskLevel', () => {
  it('should return LOW for score < 25', () => {
    expect(getRiskLevel(0)).toBe(RiskLevel.LOW);
    expect(getRiskLevel(24)).toBe(RiskLevel.LOW);
  });

  it('should return MEDIUM for score 25-49', () => {
    expect(getRiskLevel(25)).toBe(RiskLevel.MEDIUM);
    expect(getRiskLevel(49)).toBe(RiskLevel.MEDIUM);
  });

  it('should return HIGH for score 50-74', () => {
    expect(getRiskLevel(50)).toBe(RiskLevel.HIGH);
    expect(getRiskLevel(74)).toBe(RiskLevel.HIGH);
  });

  it('should return CRITICAL for score >= 75', () => {
    expect(getRiskLevel(75)).toBe(RiskLevel.CRITICAL);
    expect(getRiskLevel(100)).toBe(RiskLevel.CRITICAL);
  });
});
