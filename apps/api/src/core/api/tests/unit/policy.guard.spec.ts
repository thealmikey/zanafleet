import { ExecutionContext, ForbiddenException, Controller, Post, UseGuards } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PolicyEffect, PolicyTrigger } from '@zanafleet/contracts';

import { EvaluationResult } from '../../../../modules/policy/dto/policy.types';
import { PolicyEvaluationEngineService } from '../../../../modules/policy/services/policy-evaluation-engine.service';
import { PolicyGuard, PolicyGuardOptions } from '../../guards/policy.guard';

describe('PolicyGuard', () => {
  let mockPolicyEvaluationEngine: jest.Mocked<PolicyEvaluationEngineService>;
  let mockModuleRef: jest.Mocked<ModuleRef>;

  const createMockEvaluationResult = (
    effect: PolicyEffect,
    reason = 'Test reason'
  ): EvaluationResult => ({
    finalDecision: {
      effect,
      policyId: 'policy-123',
      policyName: 'Test Policy',
      reason,
    },
    evaluatedPolicies: [],
    processingTimeMs: 10,
    evaluationFailed: false,
  });

  const createMockExecutionContext = (user?: {
    actorId?: string;
    workspaceId?: string;
  }): ExecutionContext => {
    const mockRequest: Record<string, unknown> = { user };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
      getHandler: () => jest.fn(),
      getClass: () => class TestController {},
      getType: () => 'http',
      getArgs: () => [],
      getArgByIndex: () => null,
      switchToRpc: () => ({ getData: jest.fn(), getContext: jest.fn() }),
      switchToWs: () => ({ getData: jest.fn(), getClient: jest.fn() }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockPolicyEvaluationEngine = {
      evaluate: jest.fn(),
      enrichWithCalendarContext: jest.fn(),
    } as unknown as jest.Mocked<PolicyEvaluationEngineService>;

    mockModuleRef = {
      get: jest.fn().mockReturnValue(mockPolicyEvaluationEngine),
    } as unknown as jest.Mocked<ModuleRef>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createGuardInstance = async (options: PolicyGuardOptions) => {
    const GuardClass = PolicyGuard(options);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuardClass,
        {
          provide: ModuleRef,
          useValue: mockModuleRef,
        },
      ],
    }).compile();

    return module.get(GuardClass);
  };

  describe('canActivate', () => {
    it('should allow access when policy evaluates to ALLOW', async () => {
      mockPolicyEvaluationEngine.evaluate.mockResolvedValue(
        createMockEvaluationResult(PolicyEffect.ALLOW)
      );

      const guard = await createGuardInstance({
        trigger: PolicyTrigger.DELIVERY_CREATION,
      });

      const context = createMockExecutionContext({
        actorId: 'actor-123',
        workspaceId: 'workspace-456',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPolicyEvaluationEngine.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: PolicyTrigger.DELIVERY_CREATION,
          workspaceId: 'workspace-456',
          actorId: 'actor-123',
        }),
        expect.objectContaining({ failOpen: true })
      );
    });

    it('should allow access when policy evaluates to MODIFY', async () => {
      mockPolicyEvaluationEngine.evaluate.mockResolvedValue(
        createMockEvaluationResult(PolicyEffect.MODIFY)
      );

      const guard = await createGuardInstance({
        trigger: PolicyTrigger.RIDER_ASSIGNMENT,
      });

      const context = createMockExecutionContext({
        actorId: 'actor-123',
        workspaceId: 'workspace-456',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when policy evaluates to BLOCK', async () => {
      mockPolicyEvaluationEngine.evaluate.mockResolvedValue(
        createMockEvaluationResult(PolicyEffect.BLOCK, 'Operation not allowed')
      );

      const guard = await createGuardInstance({
        trigger: PolicyTrigger.DELIVERY_CREATION,
      });

      const context = createMockExecutionContext({
        actorId: 'actor-123',
        workspaceId: 'workspace-456',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Operation not allowed');
    });

    it('should deny access when policy evaluates to REQUIRE_APPROVAL', async () => {
      mockPolicyEvaluationEngine.evaluate.mockResolvedValue(
        createMockEvaluationResult(PolicyEffect.REQUIRE_APPROVAL, 'Manager approval needed')
      );

      const guard = await createGuardInstance({
        trigger: PolicyTrigger.STATUS_TRANSITION,
      });

      const context = createMockExecutionContext({
        actorId: 'actor-123',
        workspaceId: 'workspace-456',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Approval required: Manager approval needed'
      );
    });

    it('should deny access when user is not authenticated', async () => {
      const guard = await createGuardInstance({
        trigger: PolicyTrigger.DELIVERY_CREATION,
      });

      const context = createMockExecutionContext(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Authentication required');
    });

    it('should deny access when user has no workspaceId', async () => {
      const guard = await createGuardInstance({
        trigger: PolicyTrigger.DELIVERY_CREATION,
      });

      const context = createMockExecutionContext({ actorId: 'actor-123' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Authentication required');
    });

    it('should attach policy decision to request', async () => {
      const decision = createMockEvaluationResult(PolicyEffect.ALLOW);
      mockPolicyEvaluationEngine.evaluate.mockResolvedValue(decision);

      const guard = await createGuardInstance({
        trigger: PolicyTrigger.DELIVERY_CREATION,
      });

      const mockRequest: Record<string, unknown> = {
        user: { actorId: 'actor-123', workspaceId: 'workspace-456' },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => ({}),
          getNext: () => jest.fn(),
        }),
        getHandler: () => jest.fn(),
        getClass: () => class TestController {},
        getType: () => 'http',
        getArgs: () => [],
        getArgByIndex: () => null,
        switchToRpc: () => ({ getData: jest.fn(), getContext: jest.fn() }),
        switchToWs: () => ({ getData: jest.fn(), getClient: jest.fn() }),
      } as unknown as ExecutionContext;

      await guard.canActivate(context);

      expect(mockRequest.policyDecision).toEqual(decision.finalDecision);
    });
  });

  describe('failOpen option', () => {
    it('should allow access on evaluation error when failOpen is true (default)', async () => {
      mockPolicyEvaluationEngine.evaluate.mockRejectedValue(new Error('Evaluation failed'));

      const guard = await createGuardInstance({
        trigger: PolicyTrigger.DELIVERY_CREATION,
        failOpen: true,
      });

      const context = createMockExecutionContext({
        actorId: 'actor-123',
        workspaceId: 'workspace-456',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access on evaluation error when failOpen is false', async () => {
      mockPolicyEvaluationEngine.evaluate.mockRejectedValue(new Error('Evaluation failed'));

      const guard = await createGuardInstance({
        trigger: PolicyTrigger.DELIVERY_CREATION,
        failOpen: false,
      });

      const context = createMockExecutionContext({
        actorId: 'actor-123',
        workspaceId: 'workspace-456',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Policy evaluation failed');
    });

    it('should pass failOpen option to evaluation engine', async () => {
      mockPolicyEvaluationEngine.evaluate.mockResolvedValue(
        createMockEvaluationResult(PolicyEffect.ALLOW)
      );

      const guard = await createGuardInstance({
        trigger: PolicyTrigger.DELIVERY_CREATION,
        failOpen: false,
      });

      const context = createMockExecutionContext({
        actorId: 'actor-123',
        workspaceId: 'workspace-456',
      });

      await guard.canActivate(context);

      expect(mockPolicyEvaluationEngine.evaluate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ failOpen: false })
      );
    });
  });

  describe('buildContext option', () => {
    it('should include additional context from buildContext function', async () => {
      mockPolicyEvaluationEngine.evaluate.mockResolvedValue(
        createMockEvaluationResult(PolicyEffect.ALLOW)
      );

      const guard = await createGuardInstance({
        trigger: PolicyTrigger.RIDER_ASSIGNMENT,
        buildContext: (req) => ({
          riderId: (req.params as Record<string, string>)?.riderId,
          deliveryId: (req.body as Record<string, string>)?.deliveryId,
        }),
      });

      const mockRequest: Record<string, unknown> = {
        user: { actorId: 'actor-123', workspaceId: 'workspace-456' },
        params: { riderId: 'rider-789' },
        body: { deliveryId: 'delivery-012' },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => ({}),
          getNext: () => jest.fn(),
        }),
        getHandler: () => jest.fn(),
        getClass: () => class TestController {},
        getType: () => 'http',
        getArgs: () => [],
        getArgByIndex: () => null,
        switchToRpc: () => ({ getData: jest.fn(), getContext: jest.fn() }),
        switchToWs: () => ({ getData: jest.fn(), getClient: jest.fn() }),
      } as unknown as ExecutionContext;

      await guard.canActivate(context);

      expect(mockPolicyEvaluationEngine.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: PolicyTrigger.RIDER_ASSIGNMENT,
          workspaceId: 'workspace-456',
          actorId: 'actor-123',
          riderId: 'rider-789',
          deliveryId: 'delivery-012',
        }),
        expect.anything()
      );
    });
  });

  describe('service unavailability', () => {
    it('should allow access when service unavailable and failOpen is true', async () => {
      mockModuleRef.get.mockImplementation(() => {
        throw new Error('Service not found');
      });

      const guard = await createGuardInstance({
        trigger: PolicyTrigger.DELIVERY_CREATION,
        failOpen: true,
      });

      const context = createMockExecutionContext({
        actorId: 'actor-123',
        workspaceId: 'workspace-456',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when service unavailable and failOpen is false', async () => {
      mockModuleRef.get.mockImplementation(() => {
        throw new Error('Service not found');
      });

      const guard = await createGuardInstance({
        trigger: PolicyTrigger.DELIVERY_CREATION,
        failOpen: false,
      });

      const context = createMockExecutionContext({
        actorId: 'actor-123',
        workspaceId: 'workspace-456',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Policy evaluation service unavailable'
      );
    });
  });
});

describe('PolicyGuard with real controller (integration scaffold)', () => {
  @Controller('deliveries')
  class DeliveryController {
    @Post()
    @UseGuards(PolicyGuard({ trigger: PolicyTrigger.DELIVERY_CREATION }))
    createDelivery(): string {
      return 'created';
    }

    @Post(':id/assign')
    @UseGuards(
      PolicyGuard({
        trigger: PolicyTrigger.RIDER_ASSIGNMENT,
        buildContext: (req) => ({
          deliveryId: (req.params as Record<string, string>)?.id,
        }),
      })
    )
    assignRider(): string {
      return 'assigned';
    }

    @Post(':id/status')
    @UseGuards(
      PolicyGuard({
        trigger: PolicyTrigger.STATUS_TRANSITION,
        failOpen: false,
      })
    )
    updateStatus(): string {
      return 'updated';
    }
  }

  it('should compile controller with policy guard wiring', () => {
    expect(DeliveryController).toBeDefined();
    expect(DeliveryController.prototype.createDelivery).toBeDefined();
    expect(DeliveryController.prototype.assignRider).toBeDefined();
    expect(DeliveryController.prototype.updateStatus).toBeDefined();
  });
});
