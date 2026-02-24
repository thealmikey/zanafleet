import { EventBusService } from '@api/core/event-bus';
import { Test, TestingModule } from '@nestjs/testing';
import { PolicyEffect } from '@zanafleet/contracts';

import { BillingCalculatorService } from '../../../billing/services/billing-calculator.service';
import { SchedulingConstraintService } from '../../../calendar/services/scheduling-constraint.service';
import { LedgerService } from '../../../ledger/services/ledger.service';
import { PolicyEvaluationEngineService } from '../../../policy/services/policy-evaluation-engine.service';
import {
  CalendarConstraintError,
  CreateDeliveryInput,
  DeliveryLifecycleCoordinator,
  DeliveryStatus,
  PolicyBlockedError,
} from '../../coordinators/delivery-lifecycle.coordinator';
import { DeliveryService } from '../../services/delivery.service';

describe('DeliveryLifecycleCoordinator', () => {
  let coordinator: DeliveryLifecycleCoordinator;
  let mockDeliveryService: jest.Mocked<DeliveryService>;
  let mockPolicyEngine: jest.Mocked<PolicyEvaluationEngineService>;
  let mockBillingCalculator: jest.Mocked<BillingCalculatorService>;
  let mockSchedulingConstraint: jest.Mocked<SchedulingConstraintService>;
  let mockEventBus: jest.Mocked<EventBusService>;
  let mockLedgerService: jest.Mocked<LedgerService>;

  beforeEach(async () => {
    mockDeliveryService = {
      createScheduled: jest.fn(),
      createOnDemand: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<DeliveryService>;

    mockPolicyEngine = {
      evaluate: jest.fn(),
    } as unknown as jest.Mocked<PolicyEvaluationEngineService>;

    mockBillingCalculator = {
      calculateDeliveryChargesWithSignals: jest.fn(),
    } as unknown as jest.Mocked<BillingCalculatorService>;

    mockSchedulingConstraint = {
      evaluate: jest.fn(),
    } as unknown as jest.Mocked<SchedulingConstraintService>;

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBusService>;

    mockLedgerService = {} as unknown as jest.Mocked<LedgerService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryLifecycleCoordinator,
        { provide: DeliveryService, useValue: mockDeliveryService },
        { provide: PolicyEvaluationEngineService, useValue: mockPolicyEngine },
        { provide: BillingCalculatorService, useValue: mockBillingCalculator },
        { provide: SchedulingConstraintService, useValue: mockSchedulingConstraint },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: LedgerService, useValue: mockLedgerService },
      ],
    }).compile();

    coordinator = module.get<DeliveryLifecycleCoordinator>(DeliveryLifecycleCoordinator);
  });

  describe('State Machine', () => {
    describe('isValidTransition', () => {
      it('should allow Requested -> Assigned', () => {
        expect(
          coordinator.isValidTransition(DeliveryStatus.Requested, DeliveryStatus.Assigned)
        ).toBe(true);
      });

      it('should allow Requested -> Cancelled', () => {
        expect(
          coordinator.isValidTransition(DeliveryStatus.Requested, DeliveryStatus.Cancelled)
        ).toBe(true);
      });

      it('should allow Assigned -> PickedUp', () => {
        expect(
          coordinator.isValidTransition(DeliveryStatus.Assigned, DeliveryStatus.PickedUp)
        ).toBe(true);
      });

      it('should allow PickedUp -> InTransit', () => {
        expect(
          coordinator.isValidTransition(DeliveryStatus.PickedUp, DeliveryStatus.InTransit)
        ).toBe(true);
      });

      it('should allow InTransit -> Delivered', () => {
        expect(
          coordinator.isValidTransition(DeliveryStatus.InTransit, DeliveryStatus.Delivered)
        ).toBe(true);
      });

      it('should NOT allow Requested -> Delivered (skip states)', () => {
        expect(
          coordinator.isValidTransition(DeliveryStatus.Requested, DeliveryStatus.Delivered)
        ).toBe(false);
      });

      it('should NOT allow Delivered -> any state (terminal)', () => {
        expect(
          coordinator.isValidTransition(DeliveryStatus.Delivered, DeliveryStatus.Requested)
        ).toBe(false);
        expect(
          coordinator.isValidTransition(DeliveryStatus.Delivered, DeliveryStatus.Cancelled)
        ).toBe(false);
      });

      it('should NOT allow Cancelled -> any state (terminal)', () => {
        expect(
          coordinator.isValidTransition(DeliveryStatus.Cancelled, DeliveryStatus.Requested)
        ).toBe(false);
      });

      it('should NOT allow backward transitions', () => {
        expect(
          coordinator.isValidTransition(DeliveryStatus.Assigned, DeliveryStatus.Requested)
        ).toBe(false);
        expect(
          coordinator.isValidTransition(DeliveryStatus.InTransit, DeliveryStatus.PickedUp)
        ).toBe(false);
      });
    });

    describe('getValidNextStates', () => {
      it('should return valid next states for Requested', () => {
        const states = coordinator.getValidNextStates(DeliveryStatus.Requested);
        expect(states).toContain(DeliveryStatus.Assigned);
        expect(states).toContain(DeliveryStatus.Cancelled);
      });

      it('should return empty array for terminal states', () => {
        expect(coordinator.getValidNextStates(DeliveryStatus.Delivered)).toEqual([]);
        expect(coordinator.getValidNextStates(DeliveryStatus.Cancelled)).toEqual([]);
      });
    });

    describe('canCancel', () => {
      it('should allow cancellation from pre-delivery states', () => {
        expect(coordinator.canCancel(DeliveryStatus.Requested)).toBe(true);
        expect(coordinator.canCancel(DeliveryStatus.Assigned)).toBe(true);
        expect(coordinator.canCancel(DeliveryStatus.PickedUp)).toBe(true);
        expect(coordinator.canCancel(DeliveryStatus.InTransit)).toBe(true);
      });

      it('should NOT allow cancellation from Delivered', () => {
        expect(coordinator.canCancel(DeliveryStatus.Delivered)).toBe(false);
      });

      it('should NOT allow cancellation from Cancelled', () => {
        expect(coordinator.canCancel(DeliveryStatus.Cancelled)).toBe(false);
      });
    });
  });

  describe('createDelivery', () => {
    const validInput: CreateDeliveryInput = {
      businessId: 'business-123',
      workspaceId: 'workspace-123',
      actorId: 'actor-123',
      distanceKm: 10,
    };

    beforeEach(() => {
      mockPolicyEngine.evaluate.mockResolvedValue({
        finalDecision: {
          effect: PolicyEffect.ALLOW,
          policyId: '',
          policyName: '',
          reason: 'Allowed',
        },
        evaluatedPolicies: [],
        processingTimeMs: 10,
        evaluationFailed: false,
      } as never);

      mockSchedulingConstraint.evaluate.mockResolvedValue({
        allowed: true,
        reason: 'Available',
      } as never);

      mockBillingCalculator.calculateDeliveryChargesWithSignals.mockResolvedValue({
        baseFee: 5,
        distanceFee: 15,
        serviceFee: 2,
        tax: 3.52,
        grandTotal: 25.52,
        pricingSignals: {
          surgeMultiplier: 1.0,
          isOffPeak: false,
          isHoliday: false,
          dynamicAdjustments: [],
          evaluatedAt: new Date(),
        },
      } as never);

      mockDeliveryService.createOnDemand.mockResolvedValue({
        deliveryId: 'delivery-123',
        status: DeliveryStatus.Requested,
      } as never);
    });

    it('should create delivery when all validations pass', async () => {
      const result = await coordinator.createDelivery(validInput);

      expect(result.deliveryId).toBe('delivery-123');
      expect(result.estimatedCharges).toBe(25.52);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should throw PolicyBlockedError when policy denies', async () => {
      mockPolicyEngine.evaluate.mockResolvedValue({
        finalDecision: {
          effect: PolicyEffect.BLOCK,
          policyId: 'policy-123',
          policyName: 'Test Policy',
          reason: 'Blocked by policy',
        },
        evaluatedPolicies: [
          { policyId: 'policy-123', matched: true, priority: 1, scope: 'Workspace' },
        ],
        processingTimeMs: 10,
        evaluationFailed: false,
      } as never);

      await expect(coordinator.createDelivery(validInput)).rejects.toThrow(PolicyBlockedError);
      expect(mockDeliveryService.createOnDemand).not.toHaveBeenCalled();
    });

    it('should throw CalendarConstraintError when calendar blocks', async () => {
      mockSchedulingConstraint.evaluate.mockResolvedValue({
        allowed: false,
        reason: 'Business closed on weekends',
        suggestedTime: new Date('2024-01-08T09:00:00Z'),
      } as never);

      await expect(coordinator.createDelivery(validInput)).rejects.toThrow(CalendarConstraintError);
      expect(mockDeliveryService.createOnDemand).not.toHaveBeenCalled();
    });

    it('should create scheduled delivery when isScheduled is true', async () => {
      mockDeliveryService.createScheduled.mockResolvedValue({
        deliveryId: 'scheduled-delivery-123',
        status: DeliveryStatus.Requested,
      } as never);

      const scheduledInput: CreateDeliveryInput = {
        ...validInput,
        isScheduled: true,
        scheduledPickupTime: new Date('2024-01-15T10:00:00Z'),
      };

      const result = await coordinator.createDelivery(scheduledInput);

      expect(result.deliveryId).toBe('scheduled-delivery-123');
      expect(mockDeliveryService.createScheduled).toHaveBeenCalled();
      expect(mockDeliveryService.createOnDemand).not.toHaveBeenCalled();
    });

    it('should emit DeliveryCreatedEventV1 with correct data', async () => {
      await coordinator.createDelivery(validInput);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'delivery.events.created-v1',
        expect.objectContaining({
          eventType: 'DeliveryCreatedEvent-V1',
          deliveryId: 'delivery-123',
          businessId: validInput.businessId,
          workspaceId: validInput.workspaceId,
        })
      );
    });
  });

  describe('transitionState', () => {
    it('should transition state and emit event', async () => {
      mockDeliveryService.updateStatus.mockResolvedValue({
        deliveryId: 'delivery-123',
        status: DeliveryStatus.Requested,
      } as never);

      const result = await coordinator.transitionState(
        'delivery-123',
        DeliveryStatus.Assigned,
        'actor-123'
      );

      expect(result.success).toBe(true);
      expect(result.deliveryId).toBe('delivery-123');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'delivery.events.state-transitioned-v1',
        expect.objectContaining({
          eventType: 'DeliveryStateTransitionedEvent-V1',
          deliveryId: 'delivery-123',
          newState: DeliveryStatus.Assigned,
        })
      );
    });
  });

  describe('cancelDelivery', () => {
    it('should cancel delivery and emit event', async () => {
      mockDeliveryService.updateStatus.mockResolvedValue({
        deliveryId: 'delivery-123',
        status: DeliveryStatus.Requested,
      } as never);

      const result = await coordinator.cancelDelivery(
        'delivery-123',
        'Customer request',
        'actor-123'
      );

      expect(result.success).toBe(true);
      expect(result.reason).toBe('Customer request');
      expect(result.ledgerReservationReleased).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'delivery.events.cancelled-v1',
        expect.objectContaining({
          eventType: 'DeliveryCancelledEvent-V1',
          deliveryId: 'delivery-123',
          reason: 'Customer request',
        })
      );
    });
  });

  describe('applyPricing', () => {
    it('should calculate and emit pricing event', async () => {
      mockBillingCalculator.calculateDeliveryChargesWithSignals.mockResolvedValue({
        baseFee: 5,
        distanceFee: 15,
        serviceFee: 2,
        tax: 3.52,
        grandTotal: 25.52,
        pricingSignals: {
          surgeMultiplier: 1.2,
          isOffPeak: false,
          isHoliday: false,
          dynamicAdjustments: [],
          evaluatedAt: new Date(),
        },
      } as never);

      const result = await coordinator.applyPricing('delivery-123', 10);

      expect(result.totalCharges).toBe(25.52);
      expect(result.surgeMultiplier).toBe(1.2);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'delivery.events.pricing-applied-v1',
        expect.objectContaining({
          eventType: 'DeliveryPricingAppliedEvent-V1',
          deliveryId: 'delivery-123',
          totalCharges: 25.52,
          surgeMultiplier: 1.2,
        })
      );
    });

    it('should use default surge multiplier when not provided', async () => {
      mockBillingCalculator.calculateDeliveryChargesWithSignals.mockResolvedValue({
        baseFee: 5,
        distanceFee: 15,
        serviceFee: 2,
        tax: 3.52,
        grandTotal: 25.52,
        pricingSignals: undefined,
      } as never);

      const result = await coordinator.applyPricing('delivery-123', 10);

      expect(result.surgeMultiplier).toBe(1.0);
    });
  });
});
