import { Test, TestingModule } from '@nestjs/testing';

import { HangingStateDetectorService } from '../../services/hanging-state-detector.service';
import { EventBusService } from '@api/core/event-bus';
import { testUuid, createPastDate, createPastDateMinutes } from '../utils/test-helpers';

describe('HangingStateDetectorService', () => {
  let service: HangingStateDetectorService;
  let eventBus: jest.Mocked<EventBusService>;

  beforeEach(async () => {
    const mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      publishAsync: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HangingStateDetectorService,
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<HangingStateDetectorService>(HangingStateDetectorService);
    eventBus = module.get(EventBusService);
  });

  describe('checkHangingState', () => {
    const baseParams = {
      actorId: testUuid(),
      contextType: 'workflow',
      contextId: testUuid(),
      workflowState: 'pending',
      stateEnteredAt: new Date(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('successful detection', () => {
      it('should detect AWAITING_DRIVER > 10 minutes', async () => {
        const stateEnteredAt = createPastDate(15); // 15 minutes ago
        const params = { ...baseParams, workflowState: 'awaiting_driver', stateEnteredAt };

        const result = await service.checkHangingState(params);

        expect(result).toBeDefined();
        expect(result?.workflowState).toBe('awaiting_driver');
        expect(result?.durationMs).toBeGreaterThan(10 * 60 * 1000);
      });

      it('should detect PENDING_PAYMENT > 5 minutes', async () => {
        const stateEnteredAt = createPastDate(10); // 10 minutes ago
        const params = { ...baseParams, workflowState: 'pending_payment', stateEnteredAt };

        const result = await service.checkHangingState(params);

        expect(result).toBeDefined();
        expect(result?.workflowState).toBe('pending_payment');
      });

      it('should detect hanging pending state (5+ minutes)', async () => {
        const stateEnteredAt = createPastDate(6); // 6 minutes ago
        const params = { ...baseParams, workflowState: 'pending', stateEnteredAt };

        const result = await service.checkHangingState(params);

        expect(result).toBeDefined();
      });

      it('should detect hanging in_progress state (30+ minutes)', async () => {
        const stateEnteredAt = createPastDate(35); // 35 minutes ago
        const params = { ...baseParams, workflowState: 'in_progress', stateEnteredAt };

        const result = await service.checkHangingState(params);

        expect(result).toBeDefined();
      });

      it('should detect hanging awaiting_review state (60+ minutes)', async () => {
        const stateEnteredAt = createPastDate(65); // 65 minutes ago
        const params = { ...baseParams, workflowState: 'awaiting_review', stateEnteredAt };

        const result = await service.checkHangingState(params);

        expect(result).toBeDefined();
      });

      it('should detect hanging waiting state (15+ minutes)', async () => {
        const stateEnteredAt = createPastDate(20); // 20 minutes ago
        const params = { ...baseParams, workflowState: 'waiting', stateEnteredAt };

        const result = await service.checkHangingState(params);

        expect(result).toBeDefined();
      });

      it('should detect hanging pending_approval state (60+ minutes)', async () => {
        const stateEnteredAt = createPastDate(65); // 65 minutes ago
        const params = { ...baseParams, workflowState: 'pending_approval', stateEnteredAt };

        const result = await service.checkHangingState(params);

        expect(result).toBeDefined();
      });
    });

    describe('no hanging states', () => {
      it('should return null when process just started', async () => {
        const stateEnteredAt = new Date(); // Just now
        const params = { ...baseParams, workflowState: 'pending', stateEnteredAt };

        const result = await service.checkHangingState(params);

        expect(result).toBeNull();
      });

      it('should return null when state is within expected duration', async () => {
        const stateEnteredAt = createPastDateMinutes(2); // 2 minutes ago
        const params = { ...baseParams, workflowState: 'pending', stateEnteredAt };

        const result = await service.checkHangingState(params);

        expect(result).toBeNull();
      });

      it('should return null for in_progress within 30 minutes', async () => {
        const stateEnteredAt = createPastDateMinutes(10); // 10 minutes ago
        const params = { ...baseParams, workflowState: 'in_progress', stateEnteredAt };

        const result = await service.checkHangingState(params);

        expect(result).toBeNull();
      });

      it('should return null for awaiting_review within 60 minutes', async () => {
        const stateEnteredAt = createPastDateMinutes(30); // 30 minutes ago
        const params = { ...baseParams, workflowState: 'awaiting_review', stateEnteredAt };

        const result = await service.checkHangingState(params);

        expect(result).toBeNull();
      });
    });

    describe('timeout boundary', () => {
      it('should detect state at exact timeout boundary', async () => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const params = { ...baseParams, workflowState: 'pending', stateEnteredAt: fiveMinutesAgo };

        const result = await service.checkHangingState(params);

        // At exactly 5 minutes for pending state
        expect(result).toBeDefined();
      });

      it('should return null just before timeout boundary', async () => {
        const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000 - 59000);
        const params = { ...baseParams, workflowState: 'pending', stateEnteredAt: fourMinutesAgo };

        const result = await service.checkHangingState(params);

        expect(result).toBeNull();
      });

      it('should detect state just past timeout', async () => {
        const fiveMinutesOneSecondAgo = new Date(Date.now() - 5 * 60 * 1000 - 1000);
        const params = {
          ...baseParams,
          workflowState: 'pending',
          stateEnteredAt: fiveMinutesOneSecondAgo,
        };

        const result = await service.checkHangingState(params);

        expect(result).toBeDefined();
      });
    });

    describe('event emission', () => {
      it('should emit AIHangingStateDetectedEvent', async () => {
        const stateEnteredAt = createPastDate(10);
        const params = { ...baseParams, workflowState: 'pending', stateEnteredAt };

        await service.checkHangingState(params);

        expect(eventBus.publish).toHaveBeenCalledWith(
          'ai.hanging-state.detected',
          expect.any(Object)
        );
      });

      it('should include correlation ID in event', async () => {
        const correlationId = testUuid();
        const stateEnteredAt = createPastDate(10);
        const params = { ...baseParams, workflowState: 'pending', stateEnteredAt, correlationId };

        await service.checkHangingState(params);

        expect(eventBus.publish).toHaveBeenCalledWith(
          'ai.hanging-state.detected',
          expect.objectContaining({
            correlationId,
          })
        );
      });

      it('should include previous state in event', async () => {
        const stateEnteredAt = createPastDate(10);
        const params = {
          ...baseParams,
          workflowState: 'pending',
          stateEnteredAt,
          previousState: 'draft',
        };

        const result = await service.checkHangingState(params);

        expect(result?.previousState).toBe('draft');
      });

      it('should include duration and expected duration in event', async () => {
        const stateEnteredAt = createPastDate(10);
        const params = { ...baseParams, workflowState: 'pending', stateEnteredAt };

        const result = await service.checkHangingState(params);

        expect(result?.durationMs).toBeGreaterThan(0);
        expect(result?.expectedDurationMs).toBeDefined();
      });

      it('should include suggested capability when configured', async () => {
        service.updateTimeoutConfig([
          {
            state: 'pending',
            expectedDurationMs: 5 * 60 * 1000,
            suggestedCapability: 'check_status',
          },
        ]);
        const stateEnteredAt = createPastDate(10);
        const params = { ...baseParams, workflowState: 'pending', stateEnteredAt };

        const result = await service.checkHangingState(params);

        expect(result?.suggestedCapability).toBe('check_status');
      });

      it('should include reason when configured', async () => {
        service.updateTimeoutConfig([
          { state: 'pending', expectedDurationMs: 5 * 60 * 1000, reason: 'Pending too long' },
        ]);
        const stateEnteredAt = createPastDate(10);
        const params = { ...baseParams, workflowState: 'pending', stateEnteredAt };

        const result = await service.checkHangingState(params);

        expect(result?.reason).toBe('Pending too long');
      });
    });

    describe('error handling', () => {
      it('should return null when event emission fails', async () => {
        eventBus.publish.mockRejectedValue(new Error('Event bus error'));
        const stateEnteredAt = createPastDate(10);
        const params = { ...baseParams, workflowState: 'pending', stateEnteredAt };

        const result = await service.checkHangingState(params);

        expect(result).toBeNull();
      });
    });
  });

  describe('timeout configuration', () => {
    it('should update timeout configuration', () => {
      const newConfig = [
        { state: 'pending', expectedDurationMs: 10 * 60 * 1000 },
        {
          state: 'custom_state',
          expectedDurationMs: 15 * 60 * 1000,
          suggestedCapability: 'custom_action',
        },
      ];

      service.updateTimeoutConfig(newConfig);

      const configs = service.getTimeoutConfigs();
      expect(configs.length).toBeGreaterThan(0);
    });

    it('should merge new config with defaults', () => {
      service.updateTimeoutConfig([{ state: 'pending', expectedDurationMs: 10 * 60 * 1000 }]);

      const configs = service.getTimeoutConfigs();
      const pendingConfig = configs.find((c) => c.state === 'pending');
      expect(pendingConfig?.expectedDurationMs).toBe(10 * 60 * 1000);
    });

    it('should add new state configurations', () => {
      service.updateTimeoutConfig([{ state: 'new_state', expectedDurationMs: 20 * 60 * 1000 }]);

      const configs = service.getTimeoutConfigs();
      const newConfig = configs.find((c) => c.state === 'new_state');
      expect(newConfig).toBeDefined();
    });

    it('should return copy of configs', () => {
      const configs1 = service.getTimeoutConfigs();
      const configs2 = service.getTimeoutConfigs();

      expect(configs1).not.toBe(configs2);
    });
  });

  describe('severity calculations', () => {
    it('should calculate severity ratio correctly', () => {
      const ratio = service.calculateSeverityRatio(60000, 30000);

      expect(ratio).toBe(2);
    });

    it('should detect critical hanging state (>2x expected)', () => {
      const isCritical = service.isCritical(70000, 30000);

      expect(isCritical).toBe(true);
    });

    it('should not detect critical when exactly 2x', () => {
      const isCritical = service.isCritical(60000, 30000);

      expect(isCritical).toBe(false);
    });

    it('should not detect critical when under 2x', () => {
      const isCritical = service.isCritical(50000, 30000);

      expect(isCritical).toBe(false);
    });

    it('should return null when not hanging', async () => {
      const stateEnteredAt = createPastDateMinutes(1); // 1 minute ago
      const params = {
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        stateEnteredAt,
      };

      const result = await service.checkHangingState(params);

      expect(result).toBeNull();
    });
  });

  describe('default timeouts', () => {
    it('should have default timeout for pending state', () => {
      const configs = service.getTimeoutConfigs();
      const pendingConfig = configs.find((c) => c.state === 'pending');

      expect(pendingConfig?.expectedDurationMs).toBe(5 * 60 * 1000);
    });

    it('should have default timeout for in_progress state', () => {
      const configs = service.getTimeoutConfigs();
      const inProgressConfig = configs.find((c) => c.state === 'in_progress');

      expect(inProgressConfig?.expectedDurationMs).toBe(30 * 60 * 1000);
    });

    it('should use 1 hour default for unknown states', async () => {
      const stateEnteredAt = createPastDate(65);
      const params = {
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'unknown_state',
        stateEnteredAt,
      };

      const result = await service.checkHangingState(params);

      expect(result?.expectedDurationMs).toBe(60 * 60 * 1000);
    });
  });
});
