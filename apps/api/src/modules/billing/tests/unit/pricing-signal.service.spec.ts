import { PricingSignalService, PricingContext } from '../../services/pricing-signal.service';
import { PolicyEvaluationEngineService } from '@api/modules/policy/services/policy-evaluation-engine.service';
import { SchedulingConstraintService } from '@api/modules/calendar/services/scheduling-constraint.service';
import { BindingTargetType } from '@api/modules/calendar/dto';

describe('PricingSignalService', () => {
  let service: PricingSignalService;
  let mockPolicyEngine: jest.Mocked<PolicyEvaluationEngineService>;
  let mockSchedulingConstraint: jest.Mocked<SchedulingConstraintService>;

  const createContext = (overrides?: Partial<PricingContext>): PricingContext => ({
    workspaceId: '550e8400-e29b-41d4-a716-446655440000',
    businessId: '660e8400-e29b-41d4-a716-446655440001',
    timestamp: new Date('2024-06-15T14:00:00.000Z'),
    timezone: 'Africa/Nairobi',
    ...overrides,
  });

  beforeEach(() => {
    mockPolicyEngine = {
      evaluate: jest.fn(),
      enrichWithCalendarContext: jest.fn(),
    } as unknown as jest.Mocked<PolicyEvaluationEngineService>;

    mockSchedulingConstraint = {
      isWithinWorkingHours: jest.fn(),
      isHoliday: jest.fn(),
      isBlackoutPeriod: jest.fn(),
      evaluate: jest.fn(),
    } as unknown as jest.Mocked<SchedulingConstraintService>;
  });

  describe('without optional services', () => {
    beforeEach(() => {
      service = new PricingSignalService(undefined, undefined);
    });

    it('should return default signals when no services available', async () => {
      const result = await service.getPricingSignals(createContext());

      expect(result.surgeMultiplier).toBe(1.0);
      expect(result.isOffPeak).toBe(false);
      expect(result.isHoliday).toBe(false);
      expect(result.dynamicAdjustments).toHaveLength(0);
      expect(result.metadata?.calendarAvailable).toBe(false);
      expect(result.metadata?.policyAvailable).toBe(false);
    });
  });

  describe('with SchedulingConstraintService only', () => {
    beforeEach(() => {
      service = new PricingSignalService(undefined, mockSchedulingConstraint);
    });

    it('should return isOffPeak=true when outside working hours', async () => {
      mockSchedulingConstraint.isWithinWorkingHours.mockResolvedValue(false);
      mockSchedulingConstraint.isHoliday.mockResolvedValue(false);

      const result = await service.getPricingSignals(createContext());

      expect(result.isOffPeak).toBe(true);
      expect(result.isHoliday).toBe(false);
      expect(result.surgeMultiplier).toBe(0.9);
      expect(result.dynamicAdjustments).toContainEqual(
        expect.objectContaining({
          type: 'DISCOUNT',
          multiplier: 0.9,
          reason: 'Off-peak discount',
        }),
      );
    });

    it('should return isHoliday=true and apply holiday surge', async () => {
      mockSchedulingConstraint.isWithinWorkingHours.mockResolvedValue(true);
      mockSchedulingConstraint.isHoliday.mockResolvedValue(true);

      const result = await service.getPricingSignals(createContext());

      expect(result.isHoliday).toBe(true);
      expect(result.surgeMultiplier).toBe(1.25);
      expect(result.dynamicAdjustments).toContainEqual(
        expect.objectContaining({
          type: 'PREMIUM',
          multiplier: 1.25,
          reason: 'Holiday premium pricing',
        }),
      );
    });

    it('should prioritize holiday surge over off-peak discount', async () => {
      mockSchedulingConstraint.isWithinWorkingHours.mockResolvedValue(false);
      mockSchedulingConstraint.isHoliday.mockResolvedValue(true);

      const result = await service.getPricingSignals(createContext());

      expect(result.isHoliday).toBe(true);
      expect(result.isOffPeak).toBe(true);
      expect(result.surgeMultiplier).toBe(1.25);
    });

    it('should handle calendar service errors gracefully', async () => {
      mockSchedulingConstraint.isWithinWorkingHours.mockRejectedValue(new Error('Service error'));
      mockSchedulingConstraint.isHoliday.mockRejectedValue(new Error('Service error'));

      const result = await service.getPricingSignals(createContext());

      expect(result.isOffPeak).toBe(false);
      expect(result.isHoliday).toBe(false);
      expect(result.surgeMultiplier).toBe(1.0);
    });

    it('should call isWithinWorkingHours with correct parameters', async () => {
      mockSchedulingConstraint.isWithinWorkingHours.mockResolvedValue(true);
      mockSchedulingConstraint.isHoliday.mockResolvedValue(false);

      const context = createContext();
      await service.getPricingSignals(context);

      expect(mockSchedulingConstraint.isWithinWorkingHours).toHaveBeenCalledWith(
        BindingTargetType.BUSINESS,
        context.businessId,
        context.timestamp,
        context.timezone,
      );
    });
  });

  describe('with PolicyEvaluationEngineService only', () => {
    beforeEach(() => {
      service = new PricingSignalService(mockPolicyEngine, undefined);
    });

    it('should apply surge multiplier from policy', async () => {
      mockPolicyEngine.evaluate.mockResolvedValue({
        outputs: { surgeMultiplier: 1.5 },
        matchedPolicies: [{ policyId: 'policy-1', outputs: { surgeMultiplier: 1.5 } }],
      } as never);

      const result = await service.getPricingSignals(createContext());

      expect(result.surgeMultiplier).toBe(1.5);
      expect(result.dynamicAdjustments).toContainEqual(
        expect.objectContaining({
          type: 'SURGE',
          multiplier: 1.5,
          reason: 'Policy-driven demand/supply surge',
          policyId: 'policy-1',
        }),
      );
    });

    it('should handle policy evaluation errors gracefully', async () => {
      mockPolicyEngine.evaluate.mockRejectedValue(new Error('Policy error'));

      const result = await service.getPricingSignals(createContext());

      expect(result.surgeMultiplier).toBe(1.0);
      expect(result.dynamicAdjustments).toHaveLength(0);
    });

    it('should extract additional adjustments from policy', async () => {
      mockPolicyEngine.evaluate.mockResolvedValue({
        matchedPolicies: [
          {
            policyId: 'policy-1',
            outputs: {
              adjustment: {
                type: 'SUBSIDY',
                fixedAmount: 5,
                reason: 'New customer subsidy',
              },
            },
          },
        ],
      } as never);

      const result = await service.getPricingSignals(createContext());

      expect(result.dynamicAdjustments).toContainEqual(
        expect.objectContaining({
          type: 'SUBSIDY',
          fixedAmount: 5,
          reason: 'New customer subsidy',
          policyId: 'policy-1',
        }),
      );
    });
  });

  describe('with both services', () => {
    beforeEach(() => {
      service = new PricingSignalService(mockPolicyEngine, mockSchedulingConstraint);
    });

    it('should prioritize policy surge over calendar signals', async () => {
      mockSchedulingConstraint.isWithinWorkingHours.mockResolvedValue(false);
      mockSchedulingConstraint.isHoliday.mockResolvedValue(false);
      mockPolicyEngine.evaluate.mockResolvedValue({
        outputs: { surgeMultiplier: 2.0 },
        matchedPolicies: [{ policyId: 'policy-1' }],
      } as never);

      const result = await service.getPricingSignals(createContext());

      expect(result.surgeMultiplier).toBe(2.0);
      expect(result.isOffPeak).toBe(true);
    });

    it('should combine all adjustments', async () => {
      mockSchedulingConstraint.isWithinWorkingHours.mockResolvedValue(true);
      mockSchedulingConstraint.isHoliday.mockResolvedValue(false);
      mockPolicyEngine.evaluate.mockResolvedValue({
        outputs: { surgeMultiplier: 1.0 },
        matchedPolicies: [],
      } as never);

      const result = await service.getPricingSignals(createContext());

      expect(result.surgeMultiplier).toBe(1.0);
      expect(result.dynamicAdjustments).toHaveLength(0);
      expect(result.metadata?.calendarAvailable).toBe(true);
      expect(result.metadata?.policyAvailable).toBe(true);
    });
  });
});
