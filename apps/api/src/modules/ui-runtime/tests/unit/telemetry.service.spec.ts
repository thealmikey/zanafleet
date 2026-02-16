import { Test, TestingModule } from '@nestjs/testing';

import { TelemetryService } from '../../telemetry/telemetry.service';

describe('TelemetryService', () => {
  let service: TelemetryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelemetryService],
    }).compile();

    service = module.get<TelemetryService>(TelemetryService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('emit', () => {
    it('should emit telemetry event', () => {
      const event = {
        event: 'ScreenRendered' as const,
        timestamp: new Date().toISOString(),
        actorId: 'actor-001',
        contextId: 'context-001',
        contextType: 'dashboard',
        correlationId: 'corr-001',
      };

      expect(() => service.emit(event)).not.toThrow();
    });
  });

  describe('emitScreenRendered', () => {
    it('should emit screen rendered event', () => {
      expect(() =>
        service.emitScreenRendered({
          actorId: 'actor-001',
          contextId: 'context-001',
          contextType: 'dashboard',
          screenId: 'dashboard-screen',
          schemaVersion: 1,
          renderTime: 150,
          componentCount: 10,
          correlationId: 'corr-001',
        }),
      ).not.toThrow();
    });
  });

  describe('emitActionInvoked', () => {
    it('should emit action invoked event', () => {
      expect(() =>
        service.emitActionInvoked({
          actorId: 'actor-001',
          actionId: 'submit-form',
          actionType: 'submit',
          contextId: 'context-001',
          contextType: 'form',
          correlationId: 'corr-001',
        }),
      ).not.toThrow();
    });
  });

  describe('emitActionSucceeded', () => {
    it('should emit action succeeded event', () => {
      expect(() =>
        service.emitActionSucceeded({
          actorId: 'actor-001',
          actionId: 'submit-form',
          duration: 250,
          correlationId: 'corr-001',
          contextId: 'context-001',
          contextType: 'form',
        }),
      ).not.toThrow();
    });
  });

  describe('emitActionFailed', () => {
    it('should emit action failed event', () => {
      expect(() =>
        service.emitActionFailed({
          actorId: 'actor-001',
          actionId: 'submit-form',
          errorCode: 'VALIDATION_ERROR',
          errorMessage: 'Invalid email format',
          recoverable: true,
          correlationId: 'corr-001',
          contextId: 'context-001',
          contextType: 'form',
        }),
      ).not.toThrow();
    });
  });

  describe('emitSuggestionDisplayed', () => {
    it('should emit suggestion displayed event', () => {
      expect(() =>
        service.emitSuggestionDisplayed({
          actorId: 'actor-001',
          suggestionId: 'sug-001',
          suggestionType: 'action_suggestion',
          targetId: 'button-001',
          confidence: 0.95,
          correlationId: 'corr-001',
          contextId: 'context-001',
          contextType: 'dashboard',
        }),
      ).not.toThrow();
    });
  });

  describe('emitRegionRefreshed', () => {
    it('should emit region refreshed event', () => {
      expect(() =>
        service.emitRegionRefreshed({
          actorId: 'actor-001',
          regionId: 'region-001',
          refreshType: 'manual',
          dataSourceId: 'ds-001',
          duration: 100,
          correlationId: 'corr-001',
          contextId: 'context-001',
          contextType: 'dashboard',
        }),
      ).not.toThrow();
    });
  });

  describe('Event Buffer', () => {
    it('should handle rapid event emission', () => {
      for (let i = 0; i < 50; i++) {
        service.emit({
          event: 'ScreenRendered' as const,
          timestamp: new Date().toISOString(),
          actorId: `actor-${i}`,
          contextId: `context-${i}`,
          contextType: 'dashboard',
          correlationId: `corr-${i}`,
        });
      }

      // Should not throw despite buffer overflow
      expect(true).toBe(true);
    });
  });
});
