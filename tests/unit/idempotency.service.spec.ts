import { IdempotencyDefaults } from '../../src/core/event-bus/event-bus.constants';
import { IdempotencyService } from '../../src/core/event-bus/services/idempotency.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  const baseTime = new Date('2024-01-01T00:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(baseTime);
    service = new IdempotencyService();
  });

  afterEach(() => {
    service.onModuleDestroy();
    service.clear();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('isProcessed', () => {
    it('should return false for new event', () => {
      const result = service.isProcessed('event-123');

      expect(result).toBe(false);
    });

    it('should return true for processed event', () => {
      service.markAsProcessed('event-123');

      const result = service.isProcessed('event-123');

      expect(result).toBe(true);
    });

    it('should return false for different event IDs', () => {
      service.markAsProcessed('event-123');

      expect(service.isProcessed('event-456')).toBe(false);
    });
  });

  describe('markAsProcessed', () => {
    it('should mark event as processed', () => {
      service.markAsProcessed('event-123');

      expect(service.isProcessed('event-123')).toBe(true);
    });

    it('should handle marking the same event multiple times', () => {
      service.markAsProcessed('event-123');
      service.markAsProcessed('event-123');

      expect(service.isProcessed('event-123')).toBe(true);
      expect(service.getProcessedCount()).toBe(1);
    });
  });

  describe('checkAndMark', () => {
    it('should return false and mark for new event', () => {
      const isDuplicate = service.checkAndMark('event-123');

      expect(isDuplicate).toBe(false);
      expect(service.isProcessed('event-123')).toBe(true);
    });

    it('should return true for duplicate event', () => {
      service.markAsProcessed('event-123');

      const isDuplicate = service.checkAndMark('event-123');

      expect(isDuplicate).toBe(true);
    });

    it('should correctly detect duplicates in sequence', () => {
      expect(service.checkAndMark('event-1')).toBe(false);
      expect(service.checkAndMark('event-2')).toBe(false);
      expect(service.checkAndMark('event-1')).toBe(true);
      expect(service.checkAndMark('event-3')).toBe(false);
      expect(service.checkAndMark('event-2')).toBe(true);
    });
  });

  describe('remove', () => {
    it('should remove processed event', () => {
      service.markAsProcessed('event-123');
      expect(service.isProcessed('event-123')).toBe(true);

      service.remove('event-123');

      expect(service.isProcessed('event-123')).toBe(false);
    });

    it('should handle removing non-existent event', () => {
      expect(() => service.remove('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all processed events', () => {
      service.markAsProcessed('event-1');
      service.markAsProcessed('event-2');
      service.markAsProcessed('event-3');

      service.clear();

      expect(service.getProcessedCount()).toBe(0);
      expect(service.isProcessed('event-1')).toBe(false);
    });
  });

  describe('getProcessedCount', () => {
    it('should return correct count', () => {
      expect(service.getProcessedCount()).toBe(0);

      service.markAsProcessed('event-1');
      expect(service.getProcessedCount()).toBe(1);

      service.markAsProcessed('event-2');
      expect(service.getProcessedCount()).toBe(2);

      service.remove('event-1');
      expect(service.getProcessedCount()).toBe(1);
    });
  });

  describe('duplicate detection scenarios', () => {
    it('should detect duplicate within the same batch', () => {
      const eventIds = ['evt-1', 'evt-2', 'evt-3', 'evt-1', 'evt-4', 'evt-2'];
      const duplicates: string[] = [];

      for (const eventId of eventIds) {
        if (service.checkAndMark(eventId)) {
          duplicates.push(eventId);
        }
      }

      expect(duplicates).toEqual(['evt-1', 'evt-2']);
    });

    it('should handle high volume of unique events', () => {
      const eventCount = 1000;

      for (let i = 0; i < eventCount; i++) {
        service.markAsProcessed(`event-${i}`);
      }

      expect(service.getProcessedCount()).toBe(eventCount);

      for (let i = 0; i < eventCount; i++) {
        expect(service.isProcessed(`event-${i}`)).toBe(true);
      }
    });
  });

  describe('cleanup interval initialization', () => {
    it('should handle environments where setInterval result lacks unref', () => {
      service.onModuleDestroy();
      jest.clearAllTimers();

      const fakeInterval = {} as unknown as NodeJS.Timeout;
      const setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation(
        ((handler: (...args: unknown[]) => void, timeout?: number) => {
          expect(typeof handler).toBe('function');
          expect(timeout).toBe(IdempotencyDefaults.CLEANUP_INTERVAL_MS);
          return fakeInterval;
        }) as unknown as typeof setInterval,
      );
      const clearIntervalSpy = jest
        .spyOn(global, 'clearInterval')
        .mockImplementation(() => undefined);

      let customService: IdempotencyService | undefined;

      try {
        customService = new IdempotencyService();

        expect(setIntervalSpy).toHaveBeenCalledTimes(1);
        expect(
          (customService as unknown as { cleanupInterval: NodeJS.Timeout | null }).cleanupInterval,
        ).toBe(fakeInterval);

        customService.onModuleDestroy();

        expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
        expect(clearIntervalSpy).toHaveBeenCalledWith(fakeInterval);
      } finally {
        customService?.onModuleDestroy();
        setIntervalSpy.mockRestore();
        clearIntervalSpy.mockRestore();
      }
    });

    it('should call unref on cleanup interval when available', () => {
      service.onModuleDestroy();
      jest.clearAllTimers();

      const unref = jest.fn();
      const fakeInterval = { unref } as unknown as NodeJS.Timeout;
      const setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation(
        ((handler: (...args: unknown[]) => void, timeout?: number) => {
          expect(typeof handler).toBe('function');
          expect(timeout).toBe(IdempotencyDefaults.CLEANUP_INTERVAL_MS);
          return fakeInterval;
        }) as unknown as typeof setInterval,
      );
      const clearIntervalSpy = jest
        .spyOn(global, 'clearInterval')
        .mockImplementation(() => undefined);

      let customService: IdempotencyService | undefined;

      try {
        customService = new IdempotencyService();

        expect(unref).toHaveBeenCalledTimes(1);

        customService.onModuleDestroy();

        expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
        expect(clearIntervalSpy).toHaveBeenCalledWith(fakeInterval);
      } finally {
        customService?.onModuleDestroy();
        setIntervalSpy.mockRestore();
        clearIntervalSpy.mockRestore();
      }
    });
  });

  describe('ttl and cleanup behavior', () => {
    it('should return false for expired entries when TTL is exceeded', () => {
      service.markAsProcessed('event-expired');

      jest.advanceTimersByTime(IdempotencyDefaults.TTL_MS + 1);

      expect(service.isProcessed('event-expired')).toBe(false);
      expect(service.getProcessedCount()).toBe(0);
    });

    it('should treat entries at TTL boundary as processed', () => {
      service.markAsProcessed('event-ttl-boundary');

      jest.advanceTimersByTime(IdempotencyDefaults.TTL_MS);

      expect(service.isProcessed('event-ttl-boundary')).toBe(true);
      expect(service.getProcessedCount()).toBe(1);
    });

    it('cleanup should remove expired entries', () => {
      const internalService = service as unknown as { cleanup: () => void };
      service.markAsProcessed('event-cleanup');

      jest.advanceTimersByTime(IdempotencyDefaults.TTL_MS + 1);

      expect(service.getProcessedCount()).toBe(1);

      internalService.cleanup();

      expect(service.getProcessedCount()).toBe(0);
    });

    it('cleanup should remove only expired entries while preserving valid ones', () => {
      const internalService = service as unknown as { cleanup: () => void };
      const ttl = IdempotencyDefaults.TTL_MS;

      jest.setSystemTime(new Date(baseTime.getTime() - ttl - 1000));
      service.markAsProcessed('event-expired');

      jest.setSystemTime(baseTime);
      service.markAsProcessed('event-valid');

      jest.setSystemTime(new Date(baseTime.getTime() + ttl - 10));

      internalService.cleanup();

      expect(service.isProcessed('event-expired')).toBe(false);
      expect(service.isProcessed('event-valid')).toBe(true);

      jest.setSystemTime(baseTime);
    });

    it('cleanup task runs on interval and removes stale entries automatically', () => {
      const internalService = service as unknown as { cleanup: () => void };
      const cleanupSpy = jest.spyOn(internalService, 'cleanup');

      try {
        service.markAsProcessed('event-interval');

        expect(service.getProcessedCount()).toBe(1);

        jest.advanceTimersByTime(
          IdempotencyDefaults.TTL_MS + IdempotencyDefaults.CLEANUP_INTERVAL_MS,
        );

        expect(cleanupSpy).toHaveBeenCalled();
        expect(service.getProcessedCount()).toBe(0);
        expect(service.isProcessed('event-interval')).toBe(false);
      } finally {
        cleanupSpy.mockRestore();
      }
    });

    it('should execute cleanup on multiple intervals', () => {
      const internalService = service as unknown as { cleanup: () => void };
      const cleanupSpy = jest.spyOn(internalService, 'cleanup');

      try {
        jest.advanceTimersByTime(IdempotencyDefaults.CLEANUP_INTERVAL_MS * 3);

        expect(cleanupSpy).toHaveBeenCalledTimes(3);
      } finally {
        cleanupSpy.mockRestore();
      }
    });

    it('should stop the cleanup interval when onModuleDestroy is called', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      try {
        service.markAsProcessed('event-keep');

        service.onModuleDestroy();

        jest.advanceTimersByTime(
          IdempotencyDefaults.TTL_MS + IdempotencyDefaults.CLEANUP_INTERVAL_MS,
        );

        expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
        expect(service.getProcessedCount()).toBe(1);
      } finally {
        clearIntervalSpy.mockRestore();
      }
    });

    it('should not attempt to clear interval when cleanup already stopped', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      try {
        service.onModuleDestroy();
        expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

        clearIntervalSpy.mockClear();

        service.onModuleDestroy();

        expect(clearIntervalSpy).not.toHaveBeenCalled();
      } finally {
        clearIntervalSpy.mockRestore();
      }
    });
  });
});
